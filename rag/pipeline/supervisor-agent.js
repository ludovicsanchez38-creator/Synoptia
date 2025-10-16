/**
 * @fileoverview Supervisor Agent - Third stage of multi-agent workflow validation
 *
 * This agent performs strict validation of generated workflows, detecting invented nodes,
 * validating node types, and ensuring structural coherence. Uses dual validation:
 * - JavaScript validation (blacklist, typeVersions)
 * - LLM validation (pattern matching, coherence via Claude Sonnet 4.5)
 *
 * Multi-Agent Pipeline:
 * 1. Planning Agent → Creates execution plan
 * 2. Generator Agent → Constructs workflow JSON
 * 3. **Supervisor Agent** → Validates workflow, detects invented nodes, rejects if needed
 *
 * @module rag/pipeline/supervisor-agent
 * @requires @anthropic-ai/sdk
 * @requires ../validation/node-type-versions
 * @author Synoptia Workflow Builder Team
 * @since v1.0.0
 * @lastModified 2025-10-16
 *
 * Key Features:
 * - ZERO tolerance for invented nodes
 * - Dual validation (JavaScript + LLM)
 * - Core nodes whitelist (150+ validated nodes)
 * - Auto-retry with feedback (max 3 attempts)
 * - JSON sanitization + Claude repair fallback
 * - LangChain cluster nodes validation
 * - Cost tracking per session
 *
 * Validation Process:
 * 1. Extract nodes from workflow
 * 2. JavaScript validation (blacklist, typeVersion, forbidden fields)
 * 3. LLM validation (pattern matching against RAG docs + whitelist)
 * 4. Reject if invented nodes or critical errors
 * 5. Retry with detailed feedback if attempts remaining
 *
 * Key Fixes (Oct 2025):
 * - Line 550: Fixed sendemail node (lowercase) in whitelist
 * - Increased MAX_DOCS from 50 to 100 for better coverage
 */

const Anthropic = require('@anthropic-ai/sdk');
const costTracker = require('../../utils/cost-tracker');
const {
  validateTypeVersion,
  isBlacklisted,
  getAlternativeForBlacklistedNode
} = require('../validation/node-type-versions');

/**
 * Supervisor Agent - Validates workflows and detects invented nodes
 *
 * Third and final agent in the pipeline. Responsible for:
 * - Strict node type validation against whitelist + RAG docs
 * - JavaScript validation (blacklist, typeVersion)
 * - LLM validation (pattern matching, coherence)
 * - Detecting invented nodes (e.g., "n8n-nodes-base.googleDrive")
 * - Rejecting workflows with critical errors
 * - Providing feedback for regeneration
 *
 * @class SupervisorAgent
 *
 * @example
 * const supervisor = new SupervisorAgent(retriever);
 * const result = await supervisor.supervise(
 *   workflow,
 *   "webhook → Slack",
 *   ragContext,
 *   1, // attempt
 *   3, // maxAttempts
 *   'session-123'
 * );
 * console.log(result.approved); // true or false
 * console.log(result.inventedNodes); // []
 */
class SupervisorAgent {
  /**
   * Creates a new Supervisor Agent instance
   *
   * Initializes:
   * - Anthropic client (Claude Sonnet 4.5 for validation)
   * - RAG retriever reference (for documented nodes list)
   * - Statistics tracker
   *
   * @constructor
   * @param {WorkflowContextRetriever} retriever - RAG retriever instance
   * @throws {Error} If ANTHROPIC_API_KEY is not set in environment
   */
  constructor(retriever) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.retriever = retriever;
    this.model = 'claude-sonnet-4-20250514'; // Claude Sonnet 4.5

    this.stats = {
      validations: 0,
      approved: 0,
      rejected: 0,
      averageRetries: 0
    };
  }

  /**
   * Supervises and validates generated workflow with dual validation (JS + LLM)
   *
   * Validation pipeline:
   * 1. Extract nodes from workflow
   * 2. JavaScript validation: blacklist, typeVersion, forbidden fields
   * 3. If JS errors → Reject with feedback (if retries available)
   * 4. LLM validation: pattern matching, coherence, invented nodes detection
   * 5. Decision: Approve OR Reject with feedback OR Final rejection
   *
   * Detection examples:
   * - ❌ "n8n-nodes-base.googleDrive" → REJECTED (not in whitelist/RAG)
   * - ❌ "n8n-nodes-base.jiraSoftwareCloud" → REJECTED (use "jira")
   * - ✅ "n8n-nodes-base.slack" → APPROVED (in whitelist)
   * - ✅ "@n8n/n8n-nodes-langchain.agent" → APPROVED (in whitelist)
   *
   * @async
   * @param {Object} workflow - Generated workflow to validate
   * @param {Array} workflow.nodes - Workflow nodes
   * @param {Object} workflow.connections - Node connections
   * @param {string} userRequest - Original user request
   * @param {Object} ragContext - RAG context with documented nodes
   * @param {Array} ragContext.documents - Retrieved documentation
   * @param {Array} ragContext.nodeDocs - Node documentation
   * @param {number} [attempt=1] - Current attempt number
   * @param {number} [maxAttempts=3] - Maximum retry attempts
   * @param {string} [sessionId=null] - Session ID for cost tracking
   *
   * @returns {Promise<Object>} Supervision result
   * @returns {boolean} return.approved - Whether workflow is approved
   * @returns {boolean} [return.needsRegeneration] - Whether to retry generation
   * @returns {string} [return.feedback] - Feedback for improvement
   * @returns {Array} [return.inventedNodes] - List of invented nodes detected
   * @returns {number} return.attempts - Current attempt number
   * @returns {Object} [return.workflow] - Approved workflow (if approved)
   * @returns {Object} [return.analysis] - LLM analysis details
   *
   * @throws {Error} If Anthropic API call fails
   *
   * @example
   * const result = await supervisor.supervise(workflow, "webhook → Slack", ragContext);
   * if (result.approved) {
   *   console.log("✅ Workflow approved!");
   * } else if (result.needsRegeneration) {
   *   console.log("🔄 Regenerating with feedback:", result.feedback);
   * } else {
   *   console.error("❌ Final rejection:", result.finalError);
   * }
   */
  async supervise(workflow, userRequest, ragContext, attempt = 1, maxAttempts = 3, sessionId = null) {
    console.log(`\n🔍 Supervisor Agent (Claude) - Validation (tentative ${attempt}/${maxAttempts})...`);

    if (global.broadcastSSE) {
      global.broadcastSSE('supervision_start', {
        agent: 'El Supervisor',
        icon: '🔍',
        message: 'Validation stricte de chaque node',
        attempt,
        maxAttempts,
        timestamp: Date.now()
      });
    }

    this.stats.validations++;

    // 1. Extraire et valider les nodes avec JavaScript
    const usedNodes = this.extractUsedNodes(workflow);
    const jsValidationErrors = usedNodes.filter(n => n.hasInvalidFields && n.hasInvalidFields.length > 0);

    // 2. Si erreurs JavaScript critiques, rejeter immédiatement
    if (jsValidationErrors.length > 0) {
      console.warn(`  ⚠️ ERREURS JAVASCRIPT DÉTECTÉES:`);
      jsValidationErrors.forEach(node => {
        console.warn(`     - ${node.name} (${node.type}):`);
        node.hasInvalidFields.forEach(field => {
          console.warn(`       → ${field.field}: ${field.reason}`);
        });
      });

      // Si tentatives restantes, feedback pour régénération
      if (attempt < maxAttempts) {
        const feedback = this.buildJSValidationFeedback(jsValidationErrors);
        console.warn(`  🔄 Workflow REJETÉ - Erreurs de validation...`);

        if (global.broadcastSSE) {
          global.broadcastSSE('supervision_retry', {
            agent: 'El Supervisor',
            icon: '🔄',
            message: `Erreurs détectées - Relance ${attempt + 1}/${maxAttempts}`,
            timestamp: Date.now()
          });
        }

        return {
          approved: false,
          needsRegeneration: true,
          feedback,
          inventedNodes: [],
          attempts: attempt
        };
      }
    }

    // 3. Validation LLM pour pattern matching + cohérence
    const supervisionPrompt = this.buildSupervisionPrompt(
      workflow,
      userRequest,
      ragContext,
      usedNodes
    );

    try {
      if (global.broadcastSSE) {
        global.broadcastSSE('supervision_progress', {
          agent: 'El Supervisor',
          icon: '🔍',
          message: `Vérification de ${usedNodes.length} nodes contre la documentation`,
          timestamp: Date.now()
        });
      }

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: supervisionPrompt
        }]
      });

      // Track API costs
      if (sessionId && response.usage) {
        costTracker.recordCall(
          sessionId,
          'supervisor',
          'claude-sonnet-4.5',
          response.usage.input_tokens,
          response.usage.output_tokens
        );
      }

      // Parse JSON avec gestion robuste des markdown code blocks + sanitization
      let responseText = response.content[0].text.trim();

      // Méthode 1: Essayer de parser directement
      let analysis;
      try {
        analysis = JSON.parse(responseText);
      } catch (e) {
        // Méthode 2: Nettoyer les backticks markdown (```json ou ```)
        // Regex amélioré qui capture tout le contenu entre les backticks
        const patterns = [
          /```(?:json)?\s*([\s\S]+?)```/,  // ```json ... ``` ou ``` ... ```
          /`{3,}(?:json)?\s*([\s\S]+?)`{3,}/,  // Multiple backticks
          /<code>\s*([\s\S]+?)<\/code>/,  // Balises HTML <code>
        ];

        let cleanedText = null;
        for (const pattern of patterns) {
          const match = responseText.match(pattern);
          if (match) {
            cleanedText = match[1].trim();
            break;
          }
        }

        // Méthode 3: Si pattern trouvé, sanitize puis essayer de parser
        if (cleanedText) {
          // ✅ Sanitization ultra-robuste
          cleanedText = this.sanitizeJSON(cleanedText);

          try {
            analysis = JSON.parse(cleanedText);
          } catch (e2) {
            console.error('❌ Impossible de parser le JSON après sanitization:', e2.message);
            console.error('Texte nettoyé:', cleanedText.substring(0, 200));

            // ✅ RETRY avec Claude repair (1 seule tentative)
            try {
              analysis = await this.repairJSONWithClaude(cleanedText, e2, sessionId);
            } catch (repairError) {
              throw new Error(`JSON invalide après sanitization: ${e2.message}`);
            }
          }
        } else {
          // Méthode 4: Chercher le premier { et dernier } correspondant
          const firstBrace = responseText.indexOf('{');
          const lastBrace = responseText.lastIndexOf('}');

          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            let extractedJson = responseText.substring(firstBrace, lastBrace + 1);

            // ✅ Sanitization ultra-robuste
            extractedJson = this.sanitizeJSON(extractedJson);

            try {
              analysis = JSON.parse(extractedJson);
            } catch (e3) {
              console.error('❌ Impossible de parser le JSON après sanitization:', e3.message);
              console.error('Réponse brute:', responseText.substring(0, 500));

              // ✅ RETRY avec Claude repair (1 seule tentative)
              try {
                analysis = await this.repairJSONWithClaude(extractedJson, e3, sessionId);
              } catch (repairError) {
                throw new Error(`JSON invalide: ${e3.message}`);
              }
            }
          } else {
            console.error('❌ Aucun JSON trouvé dans la réponse');
            console.error('Réponse brute:', responseText.substring(0, 500));
            throw new Error('Aucun JSON trouvé dans la réponse du Supervisor');
          }
        }
      }

      console.log(`  📊 Analyse Supervisor:`);
      console.log(`     - Nodes analysés: ${usedNodes.length}`);
      console.log(`     - Nodes valides: ${analysis.validNodes?.length || 0}`);
      console.log(`     - Nodes inventés: ${analysis.inventedNodes?.length || 0}`);
      console.log(`     - Erreurs JS: ${jsValidationErrors.length}`);
      console.log(`     - Approuvé: ${analysis.approved ? 'Oui ✅' : 'Non ❌'}`);

      if (analysis.inventedNodes && analysis.inventedNodes.length > 0) {
        console.warn(`  ⚠️ NODES INVENTÉS DÉTECTÉS:`);
        analysis.inventedNodes.forEach(node => {
          console.warn(`     - ${node.name} (${node.type})`);
          console.warn(`       → ${node.reason}`);
        });
      }

      // Décision
      if (analysis.approved && jsValidationErrors.length === 0) {
        this.stats.approved++;
        console.log(`  ✅ Workflow APPROUVÉ`);

        if (global.broadcastSSE) {
          global.broadcastSSE('supervision_complete', {
            agent: 'El Supervisor',
            icon: '✅',
            message: 'Workflow approuvé !',
            approved: true,
            timestamp: Date.now()
          });
        }

        return {
          approved: true,
          workflow,
          analysis,
          attempts: attempt
        };
      } else {
        this.stats.rejected++;

        if (attempt < maxAttempts) {
          console.warn(`  🔄 Workflow REJETÉ - Relance...`);

          if (global.broadcastSSE) {
            global.broadcastSSE('supervision_retry', {
              agent: 'El Supervisor',
              icon: '🔄',
              message: `Rejeté - Relance ${attempt + 1}/${maxAttempts}`,
              timestamp: Date.now()
            });
          }

          return {
            approved: false,
            needsRegeneration: true,
            feedback: analysis.feedback,
            inventedNodes: analysis.inventedNodes,
            attempts: attempt
          };
        } else {
          console.error(`  ❌ Échec après ${maxAttempts} tentatives`);

          if (global.broadcastSSE) {
            global.broadcastSSE('supervision_error', {
              agent: 'El Supervisor',
              icon: '❌',
              message: `Échec après ${maxAttempts} tentatives`,
              timestamp: Date.now()
            });
          }

          return {
            approved: false,
            needsRegeneration: false,
            feedback: analysis.feedback,
            inventedNodes: analysis.inventedNodes,
            finalError: `Échec après ${maxAttempts} tentatives`,
            attempts: attempt
          };
        }
      }

    } catch (error) {
      console.error('❌ Erreur Supervisor:', error.message);

      if (global.broadcastSSE) {
        global.broadcastSSE('supervision_error', {
          agent: 'El Supervisor',
          icon: '❌',
          message: `Erreur: ${error.message}`,
          timestamp: Date.now()
        });
      }

      throw error;
    }
  }

  /**
   * Ultra-robust JSON sanitization to fix Claude-generated errors
   *
   * Common fixes (same as Generator):
   * - Incomplete properties (e.g., `"field":` at end of line)
   * - Unterminated strings (missing closing quotes)
   * - Orphan commas before closing braces/brackets
   * - Trailing commas
   * - Double commas
   * - Missing closing braces/brackets (auto-balances)
   *
   * @param {string} jsonText - Potentially malformed JSON string
   * @returns {string} Sanitized JSON string
   *
   * @example
   * const malformed = '{ "approved": true, "validNodes": }';
   * const fixed = sanitizeJSON(malformed);
   * // Returns: '{ "approved": true }'
   */
  sanitizeJSON(jsonText) {
    let sanitized = jsonText;

    // 1. Supprimer les lignes avec propriétés incomplètes (guillemet orphelin après virgule)
    // Pattern: ligne se terminant par ," ou :\s*"\s*$ sans fermeture
    sanitized = sanitized.replace(/,\s*"[^"]*$/gm, ',');  // Supprimer ligne incomplète après virgule
    sanitized = sanitized.replace(/:\s*"\s*$/gm, '');     // Supprimer propriété incomplète

    // 2. Réparer les unterminated strings (string non fermée en fin de ligne)
    sanitized = sanitized.replace(/:\s*"([^"]*?)$/gm, (match, content) => {
      return `: "${content}"`;
    });

    // 3. Réparer les unterminated strings avant une virgule
    sanitized = sanitized.replace(/:\s*"([^"]*?),/g, (match, content) => {
      return `: "${content}",`;
    });

    // 4. Supprimer les lignes vides ou avec seulement espaces/virgules
    sanitized = sanitized.split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && trimmed !== ',' && trimmed !== '"';
      })
      .join('\n');

    // 5. Supprimer les orphan commas (virgules avant } ou ])
    sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');

    // 6. Supprimer les trailing commas
    sanitized = sanitized.replace(/,(\s*\})/g, '$1');
    sanitized = sanitized.replace(/,(\s*\])/g, '$1');

    // 7. Réparer les doubles virgules
    sanitized = sanitized.replace(/,,+/g, ',');

    // 8. Réparer les espaces manquants après les :
    sanitized = sanitized.replace(/:(["{[])/g, ': $1');

    // 9. Fermer les objets/arrays non fermés (équilibrer les accolades)
    const openBraces = (sanitized.match(/\{/g) || []).length;
    const closeBraces = (sanitized.match(/\}/g) || []).length;
    const openBrackets = (sanitized.match(/\[/g) || []).length;
    const closeBrackets = (sanitized.match(/\]/g) || []).length;

    // Ajouter les accolades/crochets manquants
    if (openBraces > closeBraces) {
      sanitized += '\n' + '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      sanitized += '\n' + ']'.repeat(openBrackets - closeBrackets);
    }

    return sanitized;
  }

  /**
   * Repairs broken JSON using Claude Sonnet 4.5 as fallback (1 retry only)
   *
   * Called only when sanitizeJSON fails. Sends broken JSON to Claude with
   * repair instructions and expected structure.
   *
   * @async
   * @param {string} brokenJSON - Broken JSON string (max 5000 chars)
   * @param {Error} error - Original parsing error
   * @param {string} [sessionId=null] - Session ID for cost tracking
   *
   * @returns {Promise<Object>} Repaired and parsed JSON object
   * @throws {Error} If Claude repair fails or returned JSON is still invalid
   *
   * @example
   * const repaired = await repairJSONWithClaude('{ "approved": true,', error, 'session-123');
   * // Returns: { approved: true, validNodes: [], inventedNodes: [], feedback: "", reasoning: "" }
   */
  async repairJSONWithClaude(brokenJSON, error, sessionId = null) {
    console.log('  🔧 Tentative de réparation du JSON avec Claude...');

    const repairPrompt = `Tu es un expert en réparation de JSON cassé.

ERREUR: ${error.message}

JSON CASSÉ:
\`\`\`json
${brokenJSON.substring(0, 5000)}
\`\`\`

MISSION:
Répare ce JSON pour qu'il soit valide. Le JSON représente une analyse de workflow n8n.

STRUCTURE ATTENDUE:
{
  "approved": true|false,
  "validNodes": [...],
  "inventedNodes": [...],
  "feedback": "...",
  "reasoning": "..."
}

RÈGLES:
1. Fermer toutes les strings non terminées
2. Supprimer les propriétés incomplètes
3. Équilibrer les accolades {} et crochets []
4. Garder le maximum de contenu valide

RETOURNE UNIQUEMENT LE JSON RÉPARÉ (pas d'explication):`;

    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: repairPrompt
        }]
      });

      // Track API costs (repair counted as supervisor)
      if (sessionId && response.usage) {
        costTracker.recordCall(
          sessionId,
          'supervisor',
          'claude-sonnet-4.5',
          response.usage.input_tokens,
          response.usage.output_tokens
        );
      }

      let repairedText = response.content[0].text.trim();

      // Nettoyer les backticks si présents
      repairedText = repairedText.replace(/```(?:json)?\s*([\s\S]+?)```/g, '$1').trim();

      console.log('  ✅ JSON réparé avec succès par Claude');
      return JSON.parse(repairedText);

    } catch (repairError) {
      console.error('  ❌ Échec de la réparation:', repairError.message);
      throw new Error(`Réparation JSON échouée: ${repairError.message}`);
    }
  }

  /**
   * Extracts all nodes used in workflow with validation metadata
   *
   * @param {Object} workflow - Workflow object
   * @param {Array} workflow.nodes - Array of nodes
   *
   * @returns {Array<Object>} List of nodes with validation info
   * @returns {string} return[].name - Node name
   * @returns {string} return[].type - Node type
   * @returns {number} return[].typeVersion - Type version
   * @returns {Object} return[].parameters - Node parameters
   * @returns {Array} return[].hasInvalidFields - Invalid fields detected by JS validation
   *
   * @example
   * const nodes = extractUsedNodes(workflow);
   * // [{ name: "Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1, ... }]
   */
  extractUsedNodes(workflow) {
    if (!workflow || !workflow.nodes) {
      return [];
    }

    return workflow.nodes.map(node => ({
      name: node.name,
      type: node.type,
      typeVersion: node.typeVersion,
      parameters: node.parameters,
      hasInvalidFields: this.detectInvalidFields(node)
    }));
  }

  /**
   * Detects invalid fields using JavaScript validations (blacklist, typeVersions, forbidden fields)
   *
   * Automatic checks via node-type-versions.js:
   * - Blacklist validation
   * - Type version validation
   * - Forbidden fields (authentication, continueOnFail at root)
   *
   * @param {Object} node - Node to validate
   * @param {string} node.type - Node type
   * @param {number} [node.typeVersion] - Type version
   * @param {*} [node.authentication] - Should not exist (forbidden field)
   * @param {*} [node.continueOnFail] - Should be in parameters.options, not root
   * @param {Object} [node.parameters] - Node parameters
   *
   * @returns {Array<Object>} List of invalid fields detected
   * @returns {string} return[].field - Field name
   * @returns {*} return[].value - Field value
   * @returns {string} return[].reason - Reason why invalid
   * @returns {boolean} [return[].isBlacklisted] - Whether node is blacklisted
   * @returns {string} [return[].suggestedAlternative] - Suggested replacement
   * @returns {number} [return[].suggestedVersion] - Suggested type version
   *
   * @example
   * const errors = detectInvalidFields({ type: "n8n-nodes-base.openAi", typeVersion: 1 });
   * // [{ field: "type", value: "...", reason: "...", isBlacklisted: true, suggestedAlternative: "@n8n/n8n-nodes-langchain.lmChatOpenAi" }]
   */
  detectInvalidFields(node) {
    const invalidFields = [];

    // 1. Vérifier blacklist
    if (isBlacklisted(node.type)) {
      const alternative = getAlternativeForBlacklistedNode(node.type);
      invalidFields.push({
        field: 'type',
        value: node.type,
        reason: alternative.reason,
        isBlacklisted: true,
        suggestedAlternative: alternative.alternative
      });
    }

    // 2. Valider typeVersion
    if (node.typeVersion !== undefined && node.type) {
      const typeVersionValidation = validateTypeVersion(node.type, node.typeVersion);

      if (!typeVersionValidation.valid && !typeVersionValidation.isUnknown) {
        invalidFields.push({
          field: 'typeVersion',
          value: node.typeVersion,
          reason: typeVersionValidation.reason,
          suggestedVersion: typeVersionValidation.suggestedVersion
        });
      }
    }

    // 3. Champs interdits
    if (node.authentication) {
      invalidFields.push({
        field: 'authentication',
        value: node.authentication,
        reason: 'Le champ "authentication" n\'existe pas dans n8n. Utiliser "credentials" ou rien.'
      });
    }

    // 4. continueOnFail au mauvais endroit
    if (node.continueOnFail !== undefined && !node.parameters?.options?.continueOnFail) {
      invalidFields.push({
        field: 'continueOnFail',
        value: node.continueOnFail,
        reason: 'Le champ "continueOnFail" doit être dans parameters.options, pas au root.'
      });
    }

    return invalidFields;
  }

  /**
   * Builds human-readable feedback from JavaScript validation errors
   *
   * @param {Array<Object>} errors - Nodes with invalid fields
   * @param {string} errors[].name - Node name
   * @param {Array} errors[].hasInvalidFields - Invalid fields list
   *
   * @returns {string} Formatted feedback string for regeneration
   *
   * @example
   * const feedback = buildJSValidationFeedback(errors);
   * // "Erreurs de validation détectées:\n1. Remplacer \"n8n-nodes-base.openAi\" par \"@n8n/n8n-nodes-langchain.lmChatOpenAi\"\n2. ..."
   */
  buildJSValidationFeedback(errors) {
    const fixes = [];

    errors.forEach(node => {
      node.hasInvalidFields.forEach(field => {
        if (field.isBlacklisted) {
          fixes.push(`Remplacer "${node.type}" par "${field.suggestedAlternative}"`);
        } else if (field.field === 'typeVersion') {
          fixes.push(`Changer typeVersion de "${node.name}" à ${field.suggestedVersion}`);
        } else {
          fixes.push(`Corriger le champ "${field.field}" de "${node.name}": ${field.reason}`);
        }
      });
    });

    return `Erreurs de validation détectées:\n${fixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
  }

  /**
   * Constructs simplified supervision prompt for LLM validation
   *
   * Focuses on pattern matching + workflow coherence.
   * (Blacklist/typeVersions handled by JavaScript validation)
   *
   * Prompt structure:
   * - Mission: ZERO tolerance for invented nodes
   * - Whitelist: 150+ core nodes + RAG docs (max 100 docs)
   * - Validation rules: 3-step process (exact match → pattern → reject)
   * - Examples: Real invented nodes to reject
   * - LangChain cluster nodes rules
   *
   * @param {Object} workflow - Workflow to validate
   * @param {string} userRequest - Original user request
   * @param {Object} ragContext - RAG context with documented nodes
   * @param {Array} ragContext.documents - Retrieved docs (up to 100 used)
   * @param {Array} ragContext.nodeDocs - Node documentation
   * @param {Array<Object>} usedNodes - Extracted nodes from workflow
   *
   * @returns {string} Complete supervision prompt for Claude
   *
   * @example
   * const prompt = buildSupervisionPrompt(workflow, "webhook → Slack", ragContext, usedNodes);
   * // Returns 12000+ character prompt with whitelist, rules, examples
   */
  buildSupervisionPrompt(workflow, userRequest, ragContext, usedNodes) {
    // Extraire nodes documentés
    const documentedNodeTypes = new Set();

    // ✅ PRIORITÉ -1: WHITELIST STATIQUE - Nodes core TOUJOURS valides
    // Ces nodes sont garantis d'exister dans n8n, même s'ils ne sont pas dans les docs RAG
    const CORE_NODES_WHITELIST = [
      // Core nodes
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.httpRequest',
      'n8n-nodes-base.code',
      'n8n-nodes-base.set',
      'n8n-nodes-base.if',
      'n8n-nodes-base.switch',
      'n8n-nodes-base.merge',
      'n8n-nodes-base.split',
      'n8n-nodes-base.respondToWebhook',
      'n8n-nodes-base.wait',
      'n8n-nodes-base.executeWorkflow',
      // Email
      'n8n-nodes-base.gmail',
      'n8n-nodes-base.gmailTrigger',
      'n8n-nodes-base.emailReadImap',
      'n8n-nodes-base.sendemail',  // ✅ FIX OCT 2025: Correct node type (lowercase)
      // Communication
      'n8n-nodes-base.slack',
      'n8n-nodes-base.slackTrigger',
      'n8n-nodes-base.telegram',
      'n8n-nodes-base.telegramTrigger',
      'n8n-nodes-base.discord',
      // SaaS
      'n8n-nodes-base.airtable',
      'n8n-nodes-base.airtableTrigger',
      'n8n-nodes-base.googleSheets',
      'n8n-nodes-base.googleSheetsTrigger',
      'n8n-nodes-base.notion',
      'n8n-nodes-base.notionTrigger',
      'n8n-nodes-base.trello',
      'n8n-nodes-base.clickUp',
      'n8n-nodes-base.jira',
      'n8n-nodes-base.asana',
      'n8n-nodes-base.mondaycom',
      // Google
      'n8n-nodes-base.googleDrive',
      'n8n-nodes-base.googleDriveTrigger',
      'n8n-nodes-base.googleCalendar',
      'n8n-nodes-base.googleCalendarTrigger',
      // Database
      'n8n-nodes-base.postgres',
      'n8n-nodes-base.mysql',
      'n8n-nodes-base.mongoDb',
      'n8n-nodes-base.redis',
      // E-commerce
      'n8n-nodes-base.shopify',
      'n8n-nodes-base.shopifyTrigger',
      'n8n-nodes-base.wooCommerce',
      'n8n-nodes-base.wooCommerceTrigger',
      // CRM
      'n8n-nodes-base.hubspot',
      'n8n-nodes-base.hubspotTrigger',
      'n8n-nodes-base.salesforce',
      'n8n-nodes-base.pipedrive',
      // LangChain - AI Agents
      '@n8n/n8n-nodes-langchain.agent',
      '@n8n/n8n-nodes-langchain.lmChatOpenAi',
      '@n8n/n8n-nodes-langchain.lmChatAnthropic',
      '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
      '@n8n/n8n-nodes-langchain.lmChatOllama',
      '@n8n/n8n-nodes-langchain.lmChatGroq',
      '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
      '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
      '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
      '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
      '@n8n/n8n-nodes-langchain.lmOpenAi',
      '@n8n/n8n-nodes-langchain.lmOllama',
      '@n8n/n8n-nodes-langchain.openAi',
      '@n8n/n8n-nodes-langchain.openAiAssistant',
      // LangChain - Memory
      '@n8n/n8n-nodes-langchain.memoryBufferWindow',
      '@n8n/n8n-nodes-langchain.memoryPostgresChat',
      '@n8n/n8n-nodes-langchain.memoryRedisChat',
      '@n8n/n8n-nodes-langchain.memoryMongoDbChat',
      '@n8n/n8n-nodes-langchain.memoryManager',
      // LangChain - Vector Stores
      '@n8n/n8n-nodes-langchain.vectorStoreQdrant',
      '@n8n/n8n-nodes-langchain.vectorStorePinecone',
      '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
      '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
      '@n8n/n8n-nodes-langchain.vectorStorePGVector',
      '@n8n/n8n-nodes-langchain.vectorStoreMilvus',
      '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas',
      // LangChain - Embeddings
      '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
      '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
      '@n8n/n8n-nodes-langchain.embeddingsOllama',
      '@n8n/n8n-nodes-langchain.embeddingsMistralCloud',
      '@n8n/n8n-nodes-langchain.embeddingsCohere',
      '@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
      // LangChain - Document Loaders & Text Splitters
      '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
      '@n8n/n8n-nodes-langchain.documentJsonInputLoader',
      '@n8n/n8n-nodes-langchain.documentBinaryInputLoader',
      '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
      '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter',
      '@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter',
      // LangChain - Tools
      '@n8n/n8n-nodes-langchain.toolWorkflow',
      '@n8n/n8n-nodes-langchain.toolHttpRequest',
      '@n8n/n8n-nodes-langchain.toolWikipedia',
      '@n8n/n8n-nodes-langchain.toolVectorStore',
      '@n8n/n8n-nodes-langchain.toolCalculator',
      '@n8n/n8n-nodes-langchain.toolCode',
      '@n8n/n8n-nodes-langchain.toolSerpApi',
      '@n8n/n8n-nodes-langchain.toolWolframAlpha',
      '@n8n/n8n-nodes-langchain.toolThink',
      '@n8n/n8n-nodes-langchain.mcpClientTool',
      // LangChain - Chains
      '@n8n/n8n-nodes-langchain.chainLlm',
      '@n8n/n8n-nodes-langchain.chainSummarization',
      '@n8n/n8n-nodes-langchain.chainRetrievalQa',
      // LangChain - Retrievers
      '@n8n/n8n-nodes-langchain.retrieverVectorStore',
      '@n8n/n8n-nodes-langchain.retrieverWorkflow',
      // LangChain - Output Parsers
      '@n8n/n8n-nodes-langchain.outputParserStructured',
      '@n8n/n8n-nodes-langchain.outputParserAutofixing',
      '@n8n/n8n-nodes-langchain.outputParserItemList',
      // LangChain - Triggers
      '@n8n/n8n-nodes-langchain.chatTrigger',
      '@n8n/n8n-nodes-langchain.manualChatTrigger',
      '@n8n/n8n-nodes-langchain.mcpTrigger',
      // LangChain - Advanced
      '@n8n/n8n-nodes-langchain.informationExtractor',
      '@n8n/n8n-nodes-langchain.textClassifier',
      '@n8n/n8n-nodes-langchain.sentimentAnalysis',
      '@n8n/n8n-nodes-langchain.code'
    ];

    CORE_NODES_WHITELIST.forEach(type => documentedNodeTypes.add(type));

    // ✅ PRIORITÉ 0: Ajouter nodes depuis nodeDocs (workflow-node-docs.json - SOURCE DE VÉRITÉ)
    if (ragContext.nodeDocs && ragContext.nodeDocs.length > 0) {
      ragContext.nodeDocs.forEach(nodeDoc => {
        if (nodeDoc.nodeType) {
          documentedNodeTypes.add(nodeDoc.nodeType);
        }
      });
    }

    // ⬆️ OPTIMISATION OCT 2025: Augmenté de 50 à 100 pour matcher l'upgrade retrieval
    const MAX_DOCS = 100;

    if (ragContext.documents && ragContext.documents.length > 0) {
      ragContext.documents.slice(0, MAX_DOCS).forEach(doc => {
        // ✅ PRIORITÉ 1: doc.nodeType (type exact)
        if (doc.nodeType) {
          if (doc.nodeType.startsWith('n8n-nodes-base.') || doc.nodeType.startsWith('@n8n/')) {
            documentedNodeTypes.add(doc.nodeType);
          }
        }

        // ✅ PRIORITÉ 2: regex sur content
        if (doc.content) {
          const matches = doc.content.match(/(?:@n8n\/)?n8n-nodes-(?:base|langchain)\.[\w]+/g);
          if (matches) {
            matches.forEach(type => documentedNodeTypes.add(type));
          }
        }

        // ✅ PRIORITÉ 3: regex sur url
        if (doc.url) {
          const matches = doc.url.match(/(?:@n8n\/)?n8n-nodes-(?:base|langchain)\.[\w]+/g);
          if (matches) {
            matches.forEach(type => documentedNodeTypes.add(type));
          }
        }
      });
    }

    const documentedTypesList = Array.from(documentedNodeTypes).join('\n  - ');

    return `Tu es El Supervisor, le gardien IMPLACABLE de la qualité des workflows n8n.

🎯 MISSION CRITIQUE:
REJETER IMMÉDIATEMENT tout workflow contenant des nodes INVENTÉS ou NON DOCUMENTÉS.

ZÉRO TOLÉRANCE. UN SEUL NODE INVENTÉ = REJET TOTAL.

📋 DEMANDE UTILISATEUR:
"${userRequest}"

📦 NODES DOCUMENTÉS (LISTE EXHAUSTIVE - SEULE SOURCE DE VÉRITÉ):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${documentedTypesList || '⚠️ AUCUN NODE DOCUMENTÉ - REJETER TOUS LES NODES'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 NODES À VALIDER:
${usedNodes.map((n, i) => `  ${i + 1}. ${n.name} (${n.type})`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 RÈGLE #1 - VÉRIFICATION STRICTE CONTRE LA LISTE (PRIORITÉ ABSOLUE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ INTERDICTION ABSOLUE: NE JAMAIS APPROUVER UN NODE QUI N'EST PAS EXPLICITEMENT DANS LA LISTE CI-DESSUS

📋 PROCESSUS DE VALIDATION EN 3 ÉTAPES (OBLIGATOIRE):

ÉTAPE 1 - RECHERCHE EXACTE:
  Pour chaque node utilisé, chercher SON TYPE EXACT dans la liste "NODES DOCUMENTÉS" ci-dessus.
  ✅ Type trouvé dans la liste → VALID Node
  ❌ Type PAS trouvé → PASSER À L'ÉTAPE 2

ÉTAPE 2 - PATTERN MATCHING (FALLBACK):
  Si le type exact n'est pas trouvé ET que le type match un pattern officiel:
  - ✅ @n8n/n8n-nodes-langchain.* → POTENTIELLEMENT VALIDE
  - ✅ n8n-nodes-base.* → POTENTIELLEMENT VALIDE

  MAIS ATTENTION: Vérifier la CASSE et le FORMAT:
  - ❌ @n8n/n8n-nodes-langchain.lmchatopenai → INVALIDE (casse incorrecte)
  - ✅ @n8n/n8n-nodes-langchain.lmChatOpenAi → VALIDE (camelCase correct)

ÉTAPE 3 - DÉCISION FINALE:
  - Si trouvé à l'ÉTAPE 1 → Ajouter à validNodes[]
  - Si validé à l'ÉTAPE 2 → Ajouter à validNodes[] AVEC warning de vérification
  - Sinon → Ajouter à inventedNodes[] et REJETER le workflow

🚨 CAS RÉELS D'INVENTION À DÉTECTER ET REJETER IMMÉDIATEMENT:

❌ "n8n-nodes-base.moveBinaryData" → INVENTÉ (n'existe pas)
❌ "n8n-nodes-base.openAi" → INVENTÉ (n'existe pas, OpenAI n'est pas standalone)
❌ "n8n-nodes-base.convertToFile" → INVENTÉ (n'existe pas)
❌ "n8n-nodes-base.googleDrive" → INVENTÉ (n'existe pas)
❌ "n8n-nodes-base.linkedin" → INVENTÉ (n'existe pas)
❌ "n8n-nodes-base.veo" → INVENTÉ (n'existe pas)
❌ "n8n-nodes-base.binaryDataManager" → INVENTÉ (n'existe pas)
❌ "n8n-nodes-base.jiraSoftwareCloud" → INVENTÉ (n'existe pas, utiliser "jira")
❌ "n8n-nodes-base.createJiraIssue" → INVENTÉ (utiliser "jira" avec operation)
❌ "n8n-nodes-base.telegramSendMessage" → INVENTÉ (utiliser "telegram" avec operation)
❌ "n8n-nodes-base.mondayCreateItem" → INVENTÉ (utiliser "mondaycom" avec operation)

✅ CES TYPES SONT VALIDES (référence):
- n8n-nodes-base.httpRequest ✅ (TOUJOURS valide pour API calls)
- n8n-nodes-base.code ✅ (pour JavaScript custom)
- n8n-nodes-base.webhook ✅
- n8n-nodes-base.set ✅
- n8n-nodes-base.if ✅
- n8n-nodes-base.merge ✅
- n8n-nodes-base.jira ✅ (PAS jiraSoftwareCloud!)
- n8n-nodes-base.telegram ✅ (PAS telegramSendMessage!)
- n8n-nodes-base.mondaycom ✅ (PAS monday ou mondayCreateItem!)
- @n8n/n8n-nodes-langchain.agent ✅
- @n8n/n8n-nodes-langchain.lmChatOpenAi ✅ (PAS openAi!)
- @n8n/n8n-nodes-langchain.lmChatAnthropic ✅
- @n8n/n8n-nodes-langchain.lmChatGoogleGemini ✅
- @n8n/n8n-nodes-langchain.memoryBufferWindow ✅
- @n8n/n8n-nodes-langchain.outputParserStructured ✅

⚠️ ATTENTION: Le pattern matching seul NE SUFFIT PAS!
Un type comme "n8n-nodes-base.inventedNode" match le pattern MAIS n'existe pas → REJETER!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ RÈGLE #2 - CLUSTER NODES LANGCHAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Sub-nodes (lmChatOpenAi, memoryBufferWindow, etc.):**
- Doivent avoir parameters = {} vide
- OU seulement { options: { continueOnFail } }
- ❌ PAS de parameters fonctionnels (model, temperature, etc.)

**Connexions sub→root:**
- ❌ PAS "main"
- ✅ Utiliser ai_languageModel, ai_memory, ai_tool, etc.

**Exemples:**
✅ VALIDE:
{
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "parameters": {}
}

❌ INVALIDE:
{
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "parameters": {
    "model": "gpt-4",
    "temperature": 0.7
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 VALIDATION:
- Si un node match un pattern officiel → VALIDE (l'ajouter à validNodes[])
- Si un node ne match aucun pattern ET n'est pas dans la doc → INVENTÉ (l'ajouter à inventedNodes[])
- Si connexions "main" pour sub-nodes LangChain → REJETER

⚠️ NOTE: Les validations blacklist/typeVersions sont gérées automatiquement par le système.
Tu ne dois PAS les vérifier. Focus sur le pattern matching.

📤 FORMAT DE RÉPONSE (JSON):
{
  "approved": true|false,
  "validNodes": [
    {
      "name": "Node Name",
      "type": "n8n-nodes-base.nodeType",
      "verified": true
    }
  ],
  "inventedNodes": [
    {
      "name": "Node Name",
      "type": "invalid-type",
      "reason": "Ne match aucun pattern officiel N8N"
    }
  ],
  "feedback": "Feedback pour amélioration",
  "reasoning": "Explication du raisonnement"
}

ANALYSE LE WORKFLOW (JSON UNIQUEMENT):
${JSON.stringify(workflow, null, 2)}`;
  }

  /**
   * Retrieves current supervisor statistics
   *
   * @returns {Object} Statistics object
   * @returns {number} return.validations - Total validations performed
   * @returns {number} return.approved - Workflows approved
   * @returns {number} return.rejected - Workflows rejected
   * @returns {number} return.averageRetries - Average retry count
   * @returns {string} return.approvalRate - Approval percentage (e.g., "85.0%")
   *
   * @example
   * const stats = supervisor.getStats();
   * console.log(stats.approvalRate); // "90.5%"
   * console.log(stats.validations); // 42
   */
  getStats() {
    return {
      ...this.stats,
      approvalRate: this.stats.validations > 0
        ? ((this.stats.approved / this.stats.validations) * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

module.exports = SupervisorAgent;
