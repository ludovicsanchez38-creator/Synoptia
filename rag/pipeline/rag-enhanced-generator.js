/**
 * @fileoverview RAG-Enhanced Workflow Generator - Second stage of multi-agent pipeline
 *
 * This agent generates n8n workflows using context from the RAG database and execution plans
 * from the Planning Agent. It creates workflows with validated nodes, proper connections,
 * and follows n8n best practices. Uses Anthropic Claude Haiku 4.5 for fast generation.
 *
 * Multi-Agent Pipeline:
 * 1. Planning Agent → Creates execution plan with validated nodes
 * 2. **Generator Agent** → Constructs workflow JSON from plan + RAG context
 * 3. Supervisor Agent → Validates final workflow, detects invented nodes
 *
 * @module rag/pipeline/rag-enhanced-generator
 * @requires @anthropic-ai/sdk
 * @requires ../retrieval/workflow-context-retriever
 * @requires ../validation/workflow-validator
 * @requires ./planning-agent
 * @requires ./supervisor-agent
 * @author Synoptia Workflow Builder Team
 * @since v1.0.0
 * @lastModified 2025-10-16
 *
 * Key Features:
 * - RAG-enriched prompt construction with top-20 relevant docs
 * - Adaptive timeout based on workflow complexity
 * - LangChain type auto-correction (@n8n/n8n-nodes-langchain prefix)
 * - Auto-retry on supervisor rejection (max 3 attempts)
 * - JSON sanitization for malformed responses
 * - Rate limit handling with exponential backoff
 * - Cost tracking per session
 * - SSE progress broadcasting
 *
 * Optimizations (Oct 2025):
 * - Reduced RAG context: 35→20 docs (-43%)
 * - Character limit per doc: 1200→600 (-50%)
 * - Sort by adjustedScore before slicing (better relevance)
 * - MINIMAL workflow emphasis (reduce node bloat)
 */

const Anthropic = require('@anthropic-ai/sdk');
const WorkflowContextRetriever = require('../retrieval/workflow-context-retriever');
const WorkflowValidator = require('../validation/workflow-validator');
const PlanningAgent = require('./planning-agent');
const SupervisorAgent = require('./supervisor-agent');
const { getNodeSchema } = require('../validation/node-schemas');
const config = require('../config');
const costTracker = require('../../utils/cost-tracker');
const {
  TYPE_VERSION_RULES,
  LANGCHAIN_ARCHITECTURE,
  LANGCHAIN_EXAMPLES,
  FORBIDDEN_NODE_PATTERNS,
  VALIDATION_RULES
} = require('../../prompts/shared-rules');

/**
 * RAG-Enhanced Workflow Generator
 *
 * Second agent in the multi-agent pipeline. Responsible for:
 * - Constructing enriched prompts with RAG context + validated plan
 * - Generating n8n workflow JSON via Claude Haiku 4.5
 * - Auto-fixing LangChain node types
 * - Retrying on supervisor rejection with feedback
 * - Validating workflow structure
 * - Tracking generation statistics
 *
 * @class RAGEnhancedGenerator
 *
 * @example
 * const generator = new RAGEnhancedGenerator();
 * const result = await generator.generate(
 *   "créer un webhook et envoyer sur Slack",
 *   { autoFix: true, sessionId: 'abc-123' }
 * );
 * console.log(result.workflow); // n8n workflow JSON
 * console.log(result.validation); // { valid: true, errors: [], ... }
 */
class RAGEnhancedGenerator {
  /**
   * Creates a new RAG-Enhanced Generator instance
   *
   * Initializes all required agents and services:
   * - Anthropic client (Claude Haiku 4.5)
   * - RAG retriever for documentation context
   * - Workflow validator for structure validation
   * - Planning Agent for execution plans
   * - Supervisor Agent for workflow review
   * - Statistics tracker for performance metrics
   *
   * @constructor
   * @throws {Error} If ANTHROPIC_API_KEY is not set in environment
   */
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: config.anthropic.timeout
    });

    this.retriever = new WorkflowContextRetriever();
    this.validator = new WorkflowValidator();
    this.planningAgent = new PlanningAgent(this.retriever);
    this.supervisorAgent = new SupervisorAgent(this.retriever);
    this.model = config.anthropic.generationModel;

    this.stats = {
      generated: 0,
      withRAG: 0,
      avgContextDocs: 0,
      avgGenerationTime: 0,
      validationPassed: 0,
      validationFailed: 0
    };
  }

  /**
   * Generates an n8n workflow enriched by RAG context and validated execution plan
   *
   * Full pipeline execution:
   * 1. Retrieve RAG context (top-20 relevant docs from Qdrant)
   * 2. Create execution plan via Planning Agent
   * 3. Construct enriched prompt with plan + RAG docs
   * 4. Generate workflow JSON via Claude Haiku 4.5
   * 5. Supervise workflow (max 3 retries with feedback)
   * 6. Validate structure and connections
   * 7. Track costs and statistics
   *
   * @async
   * @param {string} userRequest - Natural language workflow request
   * @param {Object} options - Generation options
   * @param {boolean} [options.autoFix=true] - Retry on validation failure
   * @param {number} [options.maxRetries=2] - Max retry attempts
   * @param {string} [options.sessionId=null] - Session ID for cost tracking
   * @param {Array<string>} [options.previousErrors] - Errors from previous attempt (for retry)
   *
   * @returns {Promise<Object>} Generation result
   * @returns {Object} result.workflow - Generated n8n workflow JSON
   * @returns {Object} result.validation - Validation results (errors, warnings, suggestions)
   * @returns {Object} result.context - RAG context used (documentsUsed, nodesDetected, complexity)
   * @returns {Object} result.metadata - Generation metadata (duration, model, costs)
   *
   * @throws {Error} If Planning Agent returns invalid plan
   * @throws {Error} If workflow generation fails after all retries
   * @throws {Error} If RAG retrieval fails
   *
   * @example
   * const generator = new RAGEnhancedGenerator();
   *
   * // Simple generation
   * const result = await generator.generate("créer un webhook");
   *
   * // With options
   * const result2 = await generator.generate(
   *   "webhook → Slack notification",
   *   { autoFix: true, sessionId: 'abc-123' }
   * );
   *
   * // Access results
   * console.log(result2.workflow.nodes.length); // e.g., 2
   * console.log(result2.validation.valid); // true
   * console.log(result2.metadata.duration); // 15234 ms
   */
  async generate(userRequest, options = {}) {
    const startTime = Date.now();
    const {
      autoFix = config.validation.autoFix,
      maxRetries = config.validation.maxRetries,
      sessionId = null
    } = options;

    // Initialiser le cost tracking pour cette session
    if (sessionId) {
      costTracker.startSession(sessionId);
    }

    try {
      console.log(`\n🤖 Génération workflow avec RAG pour: "${userRequest}"`);

      // 1. Récupérer contexte RAG
      const context = await this.retriever.getWorkflowContext(userRequest, {
        includeTemplates: config.generation.includeTemplates,
        includeExamples: config.generation.includeExamples
      });

      // Broadcast du contexte RAG récupéré
      if (global.broadcastSSE) {
        global.broadcastSSE('context_retrieved', {
          documentsCount: context.documents?.length || 0,
          workflowExamplesCount: context.workflowExamplesCount || 0,
          detectedNodes: context.detectedNodes || [],
          documents: context.documents?.slice(0, 10).map(d => ({
            title: d.title,
            score: d.score,
            type: d.type,
            nodeType: d.nodeType,
            workflowInfo: d.workflowInfo
          })) || [],
          timestamp: Date.now()
        });
      }

      if (context.fallback) {
        console.warn('⚠️ RAG fallback, génération sans contexte');
      }

      // 2. NOUVEAU: Créer plan avec Planning Agent
      const plan = await this.planningAgent.createPlan(userRequest, context, sessionId);
      const planValidation = this.planningAgent.validatePlan(plan);

      if (!planValidation.valid) {
        console.error('❌ Plan invalide:', planValidation.errors);
        throw new Error(`Plan invalide: ${planValidation.errors.join(', ')}`);
      }

      // Déterminer la complexité du workflow pour ajuster le timeout
      const workflowComplexity = this.determineComplexity(plan, context);
      const adaptiveTimeout = this.planningAgent.getTimeoutForComplexity(workflowComplexity);

      console.log(`  ⏱️  Timeout adapté: ${adaptiveTimeout/1000}s (complexité: ${workflowComplexity})`);

      if (planValidation.warnings.length > 0) {
        console.warn('⚠️ Warnings du plan:');
        planValidation.warnings.forEach(w => console.warn(`   - ${w}`));
      }

      // 3. Construire prompt enrichi AVEC le plan
      console.log('  📝 Construction du prompt enrichi...');
      const prompt = this.buildEnrichedPrompt(userRequest, context, plan);
      console.log('  ✅ Prompt enrichi construit');

      // 4. Générer workflow
      if (global.broadcastSSE) {
        global.broadcastSSE('generation_start', {
          agent: 'El Generator',
          icon: '🤖',
          message: 'Construction du workflow JSON avec les nodes validés',
          timestamp: Date.now()
        });

        // Montrer les détails du plan
        if (plan && plan.requiredNodes) {
          global.broadcastSSE('generation_progress', {
            agent: 'El Generator',
            icon: '🔍',
            message: `Analyse de ${plan.requiredNodes.length} nodes du plan (${plan.availableNodes || 0} disponibles)`,
            timestamp: Date.now()
          });
        }

        // Montrer la complexité
        global.broadcastSSE('generation_progress', {
          agent: 'El Generator',
          icon: '🧠',
          message: `Mode Haiku 4.5 activé (Sonnet 4 perf, 1/3 cost)`,
          timestamp: Date.now()
        });
      }

      let workflow = await this.generateWithGPT(prompt, sessionId, adaptiveTimeout);

      if (global.broadcastSSE) {
        global.broadcastSSE('generation_complete', {
          agent: 'El Generator',
          icon: '🤖',
          message: 'Workflow généré avec succès',
          nodesCount: workflow.nodes?.length || 0,
          timestamp: Date.now()
        });
      }

      // 5. NOUVEAU: Supervision par Claude (max 3 tentatives)
      let supervisionResult = await this.supervisorAgent.supervise(
        workflow,
        userRequest,
        context,
        1,
        3,
        sessionId
      );

      // 6. Relance si le superviseur rejette
      let supervisionAttempt = 1;
      while (!supervisionResult.approved && supervisionResult.needsRegeneration && supervisionAttempt < 3) {
        supervisionAttempt++;
        console.log(`\n🔄 RELANCE ${supervisionAttempt}/3 - Régénération avec feedback du superviseur...`);

        // Ajouter le feedback du superviseur au contexte
        const feedbackContext = {
          ...context,
          previousErrors: supervisionResult.suggestedFixes || [],
          supervisorFeedback: supervisionResult.feedback,
          inventedNodes: supervisionResult.inventedNodes?.map(n => n.name) || []
        };

        // Re-créer un plan avec le feedback
        const newPlan = await this.planningAgent.createPlan(userRequest, feedbackContext, sessionId);

        // Re-générer avec le nouveau plan
        const newPrompt = this.buildEnrichedPrompt(userRequest, feedbackContext, newPlan);

        // Broadcast generation_start pour le retry
        if (global.broadcastSSE) {
          global.broadcastSSE('generation_start', {
            agent: 'El Generator',
            icon: '🔄',
            message: `Régénération avec feedback du superviseur (tentative ${supervisionAttempt}/3)`,
            timestamp: Date.now()
          });
        }

        workflow = await this.generateWithGPT(newPrompt, sessionId, adaptiveTimeout);

        // Broadcast generation_complete après la régénération
        if (global.broadcastSSE) {
          global.broadcastSSE('generation_complete', {
            agent: 'El Generator',
            icon: '✅',
            message: `Workflow régénéré (tentative ${supervisionAttempt}/3)`,
            nodesCount: workflow.nodes?.length || 0,
            timestamp: Date.now()
          });
        }

        // Re-superviser
        supervisionResult = await this.supervisorAgent.supervise(
          workflow,
          userRequest,
          context,
          supervisionAttempt + 1,
          3,
          sessionId
        );
      }

      if (!supervisionResult.approved) {
        console.error('❌ Workflow rejeté par le superviseur après toutes les tentatives');
        if (supervisionResult.finalError) {
          console.error(`   Erreur: ${supervisionResult.finalError}`);
        }
        // Note: Workflow quand même déployé pour permettre correction manuelle par l'utilisateur
      }

      // 7. Valider (exhaustif)
      let validation = { valid: true, errors: [], warnings: [], suggestions: [] };

      if (config.validation.enabled) {
        validation = await this.validator.validateWithScore(workflow);

        console.log(`  🔍 Validation: ${validation.valid ? '✅' : '❌'}`);
        console.log(`     Erreurs: ${validation.errors.length}, Warnings: ${validation.warnings.length}, Suggestions: ${validation.suggestions.length}`);

        // Stats validation
        if (validation.valid) {
          this.stats.validationPassed++;
        } else {
          this.stats.validationFailed++;
        }

        // Auto-fix si échec et retry disponible
        if (!validation.valid && autoFix && maxRetries > 0) {
          console.log(`  🔧 Workflow invalide, retry avec corrections...`);
          console.log(`     Top 3 erreurs:`);
          validation.errors.slice(0, 3).forEach((err, i) => {
            console.log(`       ${i + 1}. ${err}`);
          });

          workflow = (await this.generate(userRequest, {
            ...options,
            maxRetries: maxRetries - 1,
            previousErrors: validation.errors.slice(0, 5) // Limiter à 5 erreurs
          })).workflow;

          // Re-valider après fix
          validation = await this.validator.validateWithScore(workflow);
        } else if (!validation.valid) {
          console.warn(`  ⚠️ Workflow généré avec ${validation.errors.length} erreur(s)`);
        }

        // Afficher warnings importants
        if (validation.warnings.length > 0) {
          console.log(`  ⚠️ Warnings importants:`);
          validation.warnings.slice(0, 3).forEach((warn, i) => {
            console.log(`     ${i + 1}. ${warn}`);
          });
        }
      }

      // 5. Stats
      const duration = Date.now() - startTime;
      this.updateStats(context, duration);

      console.log(`  ✅ Workflow généré en ${(duration / 1000).toFixed(1)}s`);
      console.log(`  📊 Contexte: ${context.documents.length} docs, ${context.detectedNodes.length} nodes détectés`);

      // 6. Rapport de coûts
      if (sessionId) {
        const costReport = costTracker.generateReport(sessionId);
        if (costReport) {
          console.log(costReport);
        }
      }

      return {
        workflow,
        validation, // Inclure résultats validation
        context: {
          documentsUsed: context.documents.length,
          nodesDetected: context.detectedNodes,
          complexity: context.complexity,
          workflowType: context.analysis?.workflowType
        },
        metadata: {
          generatedAt: Date.now(),
          duration,
          model: this.model,
          usedRAG: !context.fallback,
          validated: config.validation.enabled,
          isValid: validation.valid
        }
      };

    } catch (error) {
      console.error('❌ Erreur génération workflow:', error.message);
      throw error;
    }
  }

  /**
   * Detects if a workflow trigger is needed and suggests the appropriate type
   *
   * Analyzes user request keywords to identify automation needs:
   * - Schedule triggers (daily, weekly, etc.)
   * - Form submissions
   * - Webhook/API calls
   * - Email events
   * - Chatbot interactions
   *
   * @param {string} userRequest - User's natural language request
   *
   * @returns {Object} Trigger detection result
   * @returns {boolean} return.needsTrigger - Whether a trigger is required
   * @returns {string|null} return.suggestedTrigger - Suggested trigger node type (e.g., "n8n-nodes-base.webhook")
   * @returns {string} return.reason - Human-readable reason for suggestion
   *
   * @example
   * const result = detectTriggerNeeds("quand je reçois un email, envoyer sur Slack");
   * // { needsTrigger: true, suggestedTrigger: "n8n-nodes-base.emailReadImap", reason: "Réception email détectée" }
   *
   * const result2 = detectTriggerNeeds("tous les jours à 9h, scraper le site");
   * // { needsTrigger: true, suggestedTrigger: "n8n-nodes-base.cron", reason: "Exécution planifiée détectée" }
   */
  detectTriggerNeeds(userRequest) {
    const requestLC = userRequest.toLowerCase();

    // Patterns qui indiquent un besoin de trigger
    const triggerIndicators = [
      { keywords: ['quand', 'lorsque', 'dès que', 'si', 'when'], type: 'conditional' },
      { keywords: ['tous les', 'chaque', 'quotidien', 'hebdo', 'mensuel', 'every day', 'daily', 'weekly'], type: 'schedule' },
      { keywords: ['formulaire', 'form', 'soumission'], type: 'form' },
      { keywords: ['webhook', 'api', 'http request', 'requête'], type: 'webhook' },
      { keywords: ['email', 'gmail', 'outlook', 'mail'], type: 'email' },
      { keywords: ['chatbot', 'chat', 'conversation'], type: 'chat' },
      { keywords: ['automatique', 'auto', 'automatic'], type: 'auto' }
    ];

    const detected = {
      needsTrigger: false,
      suggestedTrigger: null,
      reason: ''
    };

    // Détecter le type de trigger nécessaire
    for (const indicator of triggerIndicators) {
      if (indicator.keywords.some(kw => requestLC.includes(kw))) {
        detected.needsTrigger = true;

        // Suggérer le trigger approprié
        switch (indicator.type) {
          case 'schedule':
            detected.suggestedTrigger = 'n8n-nodes-base.cron';
            detected.reason = 'Exécution planifiée détectée';
            break;
          case 'form':
            detected.suggestedTrigger = 'n8n-nodes-base.formTrigger';
            detected.reason = 'Soumission de formulaire détectée';
            break;
          case 'webhook':
            detected.suggestedTrigger = 'n8n-nodes-base.webhook';
            detected.reason = 'Webhook/API détecté';
            break;
          case 'email':
            if (requestLC.includes('quand') || requestLC.includes('lorsque') || requestLC.includes('nouveau')) {
              detected.suggestedTrigger = 'n8n-nodes-base.emailReadImap';
              detected.reason = 'Réception email détectée';
            } else {
              detected.suggestedTrigger = 'n8n-nodes-base.cron';
              detected.reason = 'Envoi email planifié détecté';
            }
            break;
          case 'chat':
            detected.suggestedTrigger = 'n8n-nodes-base.webhook';
            detected.reason = 'Chatbot détecté - utiliser webhook pour recevoir messages';
            break;
          case 'conditional':
          case 'auto':
            // Vérifier si c'est un email trigger
            if (requestLC.includes('email') || requestLC.includes('gmail')) {
              detected.suggestedTrigger = 'n8n-nodes-base.emailReadImap';
              detected.reason = 'Événement email détecté';
            } else {
              detected.suggestedTrigger = 'n8n-nodes-base.webhook';
              detected.reason = 'Événement détecté';
            }
            break;
        }

        if (detected.suggestedTrigger) {
          break; // Premier match gagne
        }
      }
    }

    return detected;
  }

  /**
   * Constructs enriched system prompt with RAG context and validated execution plan
   *
   * Prompt structure (Oct 2025 optimizations):
   * - System instructions (MINIMAL workflow emphasis, ZERO invented nodes)
   * - Validated plan from Planning Agent (✅ AUTORISÉ / ❌ INTERDIT nodes)
   * - Top-20 RAG documents by relevance (600 chars/doc max)
   * - Trigger detection rules
   * - Error handling instructions
   * - LangChain architecture patterns
   * - Type version rules
   *
   * @param {string} userRequest - User's natural language request
   * @param {Object} context - RAG context from retriever
   * @param {Array} context.documents - Retrieved documentation
   * @param {Array} context.detectedNodes - Detected node types
   * @param {Array} [context.previousErrors] - Errors from previous attempt (for retry)
   * @param {Object} [plan=null] - Validated execution plan from Planning Agent
   * @param {Array} plan.requiredNodes - List of validated nodes with types
   * @param {Array} plan.missingNodes - Nodes not in RAG with alternatives
   * @param {Array} plan.executionFlow - Suggested workflow steps
   *
   * @returns {string} Complete system prompt ready for Claude API
   *
   * @example
   * const prompt = buildEnrichedPrompt(
   *   "webhook → Slack",
   *   { documents: [...], detectedNodes: ['webhook', 'slack'] },
   *   { requiredNodes: [...], missingNodes: [] }
   * );
   * // Returns: 8000+ character enriched prompt
   */
  buildEnrichedPrompt(userRequest, context, plan = null) {
    const {previousErrors} = context;

    // Détecter besoin de trigger
    const triggerNeeds = this.detectTriggerNeeds(userRequest);

    // Contexte documentaire - OPTIMISÉ pour réduire tokens (-46%)
    let docsContext = '';
    if (context.documents && context.documents.length > 0) {
      docsContext = '\n\n📚 DOCUMENTATION N8N PERTINENTE (NODES DISPONIBLES):\n\n';

      // ✅ OPTIMISATION OCT 2025: 35 → 20 docs (-43%)
      // ✅ OPTIMISATION: 1200 → 600 chars/doc (-50%)
      // ✅ OPTIMISATION: Trier par relevance (adjustedScore) AVANT slice
      const topDocs = context.documents
        .sort((a, b) => (b.adjustedScore || b.score || 0) - (a.adjustedScore || a.score || 0))
        .slice(0, 20);

      topDocs.forEach((doc, i) => {
        docsContext += `[${i + 1}] ${doc.title || 'Document'}`;
        if (doc.adjustedScore) docsContext += ` (score: ${doc.adjustedScore.toFixed(2)})`;
        docsContext += `\n`;
        if (doc.nodeType) docsContext += `   🏷️  NodeType: ${doc.nodeType}\n`;
        if (doc.url) docsContext += `   🔗 URL: ${doc.url}\n`;

        // Workflow example ?
        if (doc.workflowInfo) {
          docsContext += `   📊 Workflow: ${doc.workflowInfo.complexity} (${doc.workflowInfo.nodeCount} nœuds)\n`;
          if (doc.workflowInfo.integrations && doc.workflowInfo.integrations.length > 0) {
            docsContext += `   🔧 Intégrations: ${doc.workflowInfo.integrations.slice(0, 5).join(', ')}\n`;
          }
        }

        docsContext += `   ${doc.content.substring(0, 600)}...\n\n`;
      });

      docsContext += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      docsContext += `⚠️  IMPORTANT: Ces ${topDocs.length} documents ci-dessus (top 20 par pertinence) contiennent\n`;
      docsContext += `les SEULS nodes que tu peux utiliser. Tout autre node sera considéré comme INVENTÉ.\n`;
      docsContext += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    let nodeDocsContext = '';
    if (context.nodeDocs && context.nodeDocs.length > 0) {
      nodeDocsContext = '\n\n📘 NODE DOCUMENTATION SUMMARY:\n\n';
      context.nodeDocs.slice(0, 10).forEach(doc => {
        nodeDocsContext += `• ${doc.displayName} (${doc.nodeType})\n`;
        if (doc.url) {
          nodeDocsContext += `  🔗 ${doc.url}\n`;
        }
        doc.summary.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed.length > 0) {
            nodeDocsContext += `  ${trimmed}\n`;
          }
        });
        nodeDocsContext += '\n';
      });
    }

    // Exemples de code
    let examplesContext = '';
    if (context.examples && context.examples.length > 0) {
      examplesContext = '\n\n💡 EXEMPLES DE CODE N8N:\n\n';

      context.examples.forEach((ex, i) => {
        examplesContext += `Exemple ${i + 1} (${ex.source}):\n\`\`\`json\n${ex.code}\n\`\`\`\n\n`;
      });
    }

    // Nodes détectés avec schémas
    let nodesHint = '';
    if (context.detectedNodes && context.detectedNodes.length > 0) {
      nodesHint = `\n\n🎯 NODES SUGGÉRÉS: ${context.detectedNodes.join(', ')}`;

      // Ajouter informations de schéma pour les nodes détectés
      const nodeSchemasInfo = context.detectedNodes
        .map(nodeName => {
          // Essayer de trouver le schéma
          const possibleTypes = [
            `n8n-nodes-base.${nodeName.toLowerCase()}`,
            `n8n-nodes-base.${nodeName.toLowerCase().replace(/\s+/g, '')}`,
            `n8n-nodes-base.${nodeName.toLowerCase().replace(/\s+trigger/i, 'Trigger')}`
          ];

          for (const type of possibleTypes) {
            const schema = getNodeSchema(type);
            if (schema) {
              return `\n  • ${nodeName} (${type}):\n    Required params: ${schema.requiredParams.join(', ') || 'none'}\n    Credentials: ${schema.credentialTypes.join(', ') || 'none'}`;
            }
          }
          return null;
        })
        .filter(Boolean);

      if (nodeSchemasInfo.length > 0) {
        nodesHint += '\n\n📋 PARAMÈTRES REQUIS PAR NODE:' + nodeSchemasInfo.join('');
      }
    }

    // Flow suggéré
    let flowHint = '';
    if (context.suggestedFlow && context.suggestedFlow.length > 0) {
      flowHint = `\n📋 STRUCTURE SUGGÉRÉE: ${context.suggestedFlow.join(' → ')}`;
    }

    // Erreurs précédentes si retry
    let errorsContext = '';
    if (previousErrors && previousErrors.length > 0) {
      errorsContext = '\n\n⚠️ ERREURS À CORRIGER:\n';
      previousErrors.forEach(err => {
        errorsContext += `- ${err}\n`;
      });
    }

    // NOUVEAU: Contexte du plan de l'agent planificateur
    let planContext = '';
    if (plan && plan.requiredNodes) {
      planContext = '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      planContext += '🧠 PLAN VALIDÉ PAR EL PLANIFICATOR - À SUIVRE STRICTEMENT\n';
      planContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

      planContext += `**Analyse:** ${plan.analysis?.description || 'N/A'}\n`;
      planContext += `**Complexité:** ${plan.analysis?.complexity || 'N/A'}\n\n`;

      planContext += `**LISTE EXHAUSTIVE DES NODES AUTORISÉS:**\n`;
      plan.requiredNodes.forEach((node, i) => {
        const status = node.exists ? '✅ AUTORISÉ' : '❌ INTERDIT';
        planContext += `\n  ${i + 1}. ${status}: ${node.name}\n`;
        planContext += `     TYPE À UTILISER: "${node.type}"\n`;
        planContext += `     PURPOSE: ${node.purpose}\n`;
        if (!node.exists) {
          planContext += `     ⚠️ CE NODE N'EXISTE PAS - Voir alternatives ci-dessous\n`;
        }
      });

      if (plan.missingNodes && plan.missingNodes.length > 0) {
        planContext += `\n\n⛔ NODES MANQUANTS - NE PAS UTILISER - VOICI LES ALTERNATIVES:\n`;
        planContext += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        plan.missingNodes.forEach((missing, i) => {
          planContext += `\n  ${i + 1}. ❌ NE PAS UTILISER: ${missing.name}\n`;
          planContext += `     RAISON: ${missing.reason}\n`;
          planContext += `     ✅ UTILISER À LA PLACE: ${missing.alternative}\n`;
          planContext += `     → TYPE CORRECT: "n8n-nodes-base.httpRequest"\n`;
        });
        planContext += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      }

      if (plan.executionFlow && plan.executionFlow.length > 0) {
        planContext += `\n**Flux d'exécution suggéré:**\n`;
        plan.executionFlow.forEach((step, i) => {
          planContext += `  ${i + 1}. ${step}\n`;
        });
      }

      if (plan.warnings && plan.warnings.length > 0) {
        planContext += `\n**⚠️ Avertissements critiques:**\n`;
        plan.warnings.forEach(w => planContext += `  - ${w}\n`);
      }

      planContext += `\n\n🔴🔴🔴 RAPPEL FINAL - LECTURE OBLIGATOIRE 🔴🔴🔴\n`;
      planContext += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      planContext += `\n⛔ RÈGLE #1 - ZÉRO NODE INVENTÉ:\n`;
      planContext += `   CHAQUE node du workflow DOIT être dans la liste "NODES AUTORISÉS" ci-dessus.\n`;
      planContext += `   Si tu ajoutes UN SEUL node qui n'est pas dans cette liste, le workflow sera REJETÉ.\n`;
      planContext += `\n⛔ RÈGLE #2 - RESPECTER LES TYPES EXACTS:\n`;
      planContext += `   Utilise le "TYPE À UTILISER" fourni EXACTEMENT tel quel (copier-coller).\n`;
      planContext += `   Ne pas modifier, ne pas inventer des variantes.\n`;
      planContext += `\n⛔ RÈGLE #3 - ALTERNATIVES OBLIGATOIRES:\n`;
      planContext += `   Si un node a "❌ INTERDIT" → Utilise l'alternative fournie\n`;
      planContext += `   En cas de doute → Utilise "n8n-nodes-base.httpRequest"\n`;
      planContext += `\n🚨 CONSÉQUENCE EN CAS DE VIOLATION:\n`;
      planContext += `   El Supervisor détectera IMMÉDIATEMENT le node inventé et REJETTERA le workflow.\n`;
      planContext += `   Tu devras tout recommencer. Ne perds pas de temps, suis le plan.\n`;
      planContext += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    }

    // Instructions trigger si détecté
    let triggerInstruction = '';
    if (triggerNeeds.needsTrigger && triggerNeeds.suggestedTrigger) {
      triggerInstruction = `

🚨 IMPORTANT - TRIGGER REQUIS:
La demande nécessite un TRIGGER pour fonctionner automatiquement.
- Type suggéré: ${triggerNeeds.suggestedTrigger}
- Raison: ${triggerNeeds.reason}
- Le workflow DOIT commencer par ce trigger node
- Assure-toi de configurer correctement ses paramètres`;
    }

    // Instructions gestion d'erreurs
    const errorHandlingInstruction = `

⚠️ GESTION D'ERREURS:
- IMPORTANT: Le champ "continueOnFail" doit être dans "parameters.options", PAS au niveau root du node
- Structure correcte: { "parameters": { "options": { "continueOnFail": true } } }
- Cela garantit que le workflow continue même en cas d'erreur partielle`;

    // Prompt système ULTRA-RENFORCÉ avec exemples concrets
    const systemPrompt = `Tu es un expert n8n qui génère des workflows JSON MINIMAUX et EFFICACES.

🎯 OBJECTIF:
Créer un workflow n8n fonctionnel et optimisé avec le MINIMUM de nodes nécessaires.
Privilégie la SIMPLICITÉ: évite les nodes redondants (Set, Code) sauf si EXPLICITEMENT requis.

🚨 RÈGLES ABSOLUES - AUCUNE EXCEPTION - LECTURE OBLIGATOIRE:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 INTERDICTION #1 - NE JAMAIS, JAMAIS INVENTER DE NODES 🔴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ RÈGLE ABSOLUE - ZÉRO TOLÉRANCE:
Tu ne dois JAMAIS, sous AUCUN prétexte, créer un node dont le type n'est PAS EXPLICITEMENT dans le PLAN VALIDÉ par El Planificator ci-dessous.

🚨 PÉNALITÉ SÉVÈRE:
Si tu inventes un seul node qui n'est pas dans la liste, le workflow sera IMMÉDIATEMENT REJETÉ par El Supervisor, et tu devras tout refaire. C'est une perte de temps et d'argent.

❌ EXEMPLES RÉELS D'ERREURS À NE JAMAIS REFAIRE:
- "type": "n8n-nodes-base.moveBinaryData" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.openAi" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.convertToFile" ❌ (existe mais rare, vérifie le plan)
- "type": "n8n-nodes-base.googleDrive" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.linkedin" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.veo" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.binaryDataManager" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.jiraSoftwareCloud" ❌ (INVENTÉ - n'existe pas, utiliser "n8n-nodes-base.jira")

🚨 CAS RÉEL D'HALLUCINATION - NE JAMAIS RÉPÉTER:
❌ ERREUR: Inventer "jiraSoftwareCloud" en confondant le nom du produit "Jira Software Cloud" avec le type de node
✅ CORRECT: Utiliser EXACTEMENT le type du plan → "n8n-nodes-base.jira"
⚠️ NE PAS inventer des variations basées sur des noms de produits ou services!

✅ LA SEULE MÉTHODE AUTORISÉE - PROCESSUS EN 3 ÉTAPES:

ÉTAPE 1 - CONSULTER LE PLAN:
  Regarde le PLAN VALIDÉ PAR EL PLANIFICATOR ci-dessous (section requiredNodes)

ÉTAPE 2 - VÉRIFIER L'EXISTENCE:
  Pour chaque node que tu veux utiliser:
  ✓ Est-il dans la liste "requiredNodes" ?
  ✓ A-t-il le statut "✅ AUTORISÉ" ?
  ✓ Le champ "type" est-il fourni ?

ÉTAPE 3 - APPLIQUER LA RÈGLE:
  • Si le node est "✅ AUTORISÉ" → Utilise le TYPE EXACT fourni
  • Si le node est "❌ INTERDIT" → Utilise l'ALTERNATIVE fournie
  • Si tu hésites → Utilise "n8n-nodes-base.httpRequest" (TOUJOURS valide)
  • Si pas dans la liste → NE L'UTILISE PAS (demande à El Planificator)

🛡️ ALTERNATIVES SÛRES - TOUJOURS VALIDES:
- n8n-nodes-base.httpRequest (pour tout appel API externe)
- n8n-nodes-base.code (pour manipulation de données)
- n8n-nodes-base.set (pour modifier/ajouter des champs)
- n8n-nodes-base.if (pour conditions)
- n8n-nodes-base.merge (pour combiner des données)

⚠️ CAS SPÉCIAL - CONVERSION BINAIRE:
Si tu as besoin de convertir base64 ↔ binaire:
  ❌ NE PAS utiliser: moveBinaryData, convertToFile, binaryDataManager
  ✅ UTILISER: "n8n-nodes-base.code" avec du JavaScript

🔒 RÈGLES TECHNIQUES:
5. Retourner UNIQUEMENT le JSON du workflow (format n8n valide)
6. Respecter la structure n8n: {name, nodes, connections, settings}
7. Nommer les nodes de manière descriptive (ex: "Send Welcome Email")
8. Positionner les nodes correctement (position: [x, y])
9. Créer des connexions valides entre nodes
10. Ajouter TOUS les paramètres REQUIS pour chaque node
11. Les nodes comme Slack, Gmail nécessitent "resource" et "operation"
12. Inclure "typeVersion" CORRECT pour chaque node (voir section ci-dessous)
13. Ajouter des notes (field "notes") pour documenter les nodes

${TYPE_VERSION_RULES}

${LANGCHAIN_ARCHITECTURE}

${LANGCHAIN_EXAMPLES}

${VALIDATION_RULES}${triggerInstruction}${errorHandlingInstruction}

📊 FORMAT ATTENDU:
\`\`\`json
{
  "name": "Nom du Workflow",
  "nodes": [
    {
      "parameters": {...},
      "name": "Node Name",
      "type": "n8n-nodes-base.nodeType",
      "typeVersion": 1,
      "position": [x, y],
      "id": "uuid"
    }
  ],
  "connections": {
    "Node1": {
      "main": [[{"node": "Node2", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
\`\`\`

${planContext}
${docsContext}
${nodeDocsContext}
${examplesContext}
${nodesHint}
${flowHint}
${errorsContext}

DEMANDE UTILISATEUR:
"${userRequest}"

⚠️ RAPPEL FINAL:
- Utilise UNIQUEMENT les nodes du PLAN VALIDÉ
- Si un node manque, utilise HTTP Request + API
- Vérifie chaque node avant de l'ajouter

GÉNÈRE LE WORKFLOW (JSON UNIQUEMENT, PAS D'EXPLICATION):`;

    return systemPrompt;
  }

  /**
   * Generates workflow JSON using Claude Haiku 4.5 via Anthropic API
   *
   * Features:
   * - Adaptive timeout based on workflow complexity
   * - Rate limit handling with exponential backoff (max 3 retries)
   * - JSON sanitization for malformed responses
   * - LangChain type auto-correction
   * - Cost tracking per session
   * - SSE progress broadcasting
   *
   * @async
   * @param {string} prompt - Complete enriched system prompt
   * @param {string} [sessionId=null] - Session ID for cost tracking
   * @param {number} [timeout=null] - Custom timeout in ms (default: 120000)
   *
   * @returns {Promise<Object>} Generated n8n workflow JSON
   * @returns {string} return.name - Workflow name
   * @returns {Array} return.nodes - Array of nodes with parameters, positions, IDs
   * @returns {Object} return.connections - Node connections map
   * @returns {Object} return.settings - Workflow settings
   *
   * @throws {Error} If API call fails after all retries
   * @throws {Error} If JSON parsing fails even after sanitization
   * @throws {Error} If workflow structure is invalid (no nodes)
   *
   * @example
   * const workflow = await generateWithGPT(enrichedPrompt, 'session-123', 90000);
   * console.log(workflow.nodes.length); // e.g., 3
   * console.log(workflow.connections); // { "Webhook": { "main": [[...]] } }
   */
  async generateWithGPT(prompt, sessionId = null, timeout = null) {
    try {
      if (global.broadcastSSE) {
        global.broadcastSSE('generation_progress', {
          agent: 'El Generator',
          icon: '🤖',
          message: 'Configuration des paramètres pour chaque node',
          timestamp: Date.now()
        });
      }

      let response;
      let retryCount = 0;
      const maxRetries = 3;

      // Créer un client Anthropic avec le timeout adapté
      const anthropicClient = timeout ? new (require('@anthropic-ai/sdk'))({
        apiKey: process.env.ANTHROPIC_API_KEY,
        timeout
      }) : this.anthropic;

      while (retryCount <= maxRetries) {
        try {
          response = await anthropicClient.messages.create({
            model: this.model,
            max_tokens: config.anthropic.maxTokens,
            system: prompt,
            messages: [{
              role: 'user',
              content: 'GÉNÈRE LE WORKFLOW (JSON UNIQUEMENT, PAS D\'EXPLICATION):'
            }],
            temperature: 0.1 // Précision maximale pour génération JSON
          });
          break; // Success
        } catch (error) {
          // Détecter rate limit 429
          if (error.status === 429 && retryCount < maxRetries) {
            const waitMatch = error.message.match(/try again in ([\d.]+)s/);
            const waitTime = waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) : 5000;

            console.warn(`  ⏳ Rate limit atteint, retry ${retryCount + 1}/${maxRetries} dans ${waitTime/1000}s...`);

            if (global.broadcastSSE) {
              global.broadcastSSE('generation_progress', {
                agent: 'El Generator',
                icon: '⏳',
                message: `Rate limit - Retry dans ${waitTime/1000}s`,
                timestamp: Date.now()
              });
            }

            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
          } else {
            throw error;
          }
        }
      }

      // Track API costs
      if (sessionId && response.usage) {
        costTracker.recordCall(
          sessionId,
          'generator',
          this.model,
          response.usage.input_tokens,
          response.usage.output_tokens
        );
      }

      let content = response.content[0].text;

      // Retirer markdown code blocks si présents (Claude Haiku 4.5 wrap souvent en ```json)
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

      if (global.broadcastSSE) {
        global.broadcastSSE('generation_progress', {
          agent: 'El Generator',
          icon: '🤖',
          message: 'Création des connexions entre nodes',
          timestamp: Date.now()
        });
      }

      // Parser le JSON avec validation stricte
      let workflow;
      try {
        workflow = JSON.parse(content);
      } catch (parseError) {
        console.error('❌ JSON invalide du Generator, tentative de sanitization...');

        // Utiliser la même sanitization que le Supervisor
        const sanitizedContent = this.sanitizeJSON(content);

        try {
          workflow = JSON.parse(sanitizedContent);
          console.log('✅ JSON réparé avec succès après sanitization');
        } catch (sanitizeError) {
          console.error('❌ JSON toujours invalide après sanitization:', sanitizeError.message);
          throw new Error(`JSON invalide du Generator (même après sanitization): ${sanitizeError.message}`);
        }
      }

      // Vérifier que le workflow est valide
      if (!workflow || typeof workflow !== 'object') {
        throw new Error('Le workflow généré est invalide ou vide');
      }

      // Validation stricte de la structure
      if (!workflow.nodes || !Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
        throw new Error('Le workflow ne contient aucun node');
      }

      if (!workflow.connections || typeof workflow.connections !== 'object') {
        console.warn('⚠️ Le workflow ne contient aucune connexion, ajout d\'un objet vide');
        workflow.connections = {};
      }

      // Ajouter IDs manquants
      if (workflow.nodes) {
        workflow.nodes.forEach(node => {
          if (!node.id) {
            node.id = this.generateId();
          }
        });
      }

      // NOUVEAU: Corriger les types LangChain incorrects AVANT validation
      workflow = this.fixLangChainTypes(workflow);

      // Post-processing: améliorer le workflow
      workflow = this.enhanceWorkflow(workflow);

      return workflow;

    } catch (error) {
      console.error('❌ Erreur génération GPT:', error.message);
      throw new Error(`Génération échouée: ${error.message}`);
    }
  }


  /**
   * Sanitizes malformed JSON with ultra-robust error correction
   *
   * Common fixes:
   * - Incomplete properties (e.g., `"field":` at end of line)
   * - Unterminated strings (missing closing quotes)
   * - Orphan commas before closing braces/brackets
   * - Trailing commas after last property
   * - Double commas (,,)
   * - Missing closing braces/brackets (auto-balances { } [ ])
   *
   * Same method used in Supervisor Agent for consistency.
   *
   * @param {string} jsonText - Potentially malformed JSON string
   * @returns {string} Sanitized JSON string (better chance of parsing)
   *
   * @example
   * const malformed = '{ "name": "Test", "value": }';
   * const fixed = sanitizeJSON(malformed);
   * // Returns: '{ "name": "Test" }'
   */
  sanitizeJSON(jsonText) {
    let sanitized = jsonText;

    // 1. Supprimer les lignes avec propriétés incomplètes
    sanitized = sanitized.replace(/,\s*"[^"]*$/gm, ',');  // Ligne incomplète après virgule
    sanitized = sanitized.replace(/:\s*"\s*$/gm, '');     // Propriété incomplète

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
   * Auto-corrects incorrect LangChain node types generated by LLM
   *
   * Common LLM errors:
   * - Missing @n8n/ prefix (e.g., `n8n-nodes-langchain.agent` → `@n8n/n8n-nodes-langchain.agent`)
   * - Incorrect casing (e.g., `chattrigger` → `chatTrigger`)
   * - Wrong package prefix
   *
   * Corrects all LangChain node categories:
   * - Root nodes (agent, chainLlm, chainRetrievalQa, etc.)
   * - Triggers (chatTrigger, manualChatTrigger)
   * - Sub-nodes (LLMs, Memory, Embeddings, Vector Stores, Tools, Document Loaders)
   *
   * @param {Object} workflow - Generated workflow object
   * @param {Array} workflow.nodes - Array of nodes to check/fix
   * @returns {Object} Workflow with corrected LangChain types
   *
   * @example
   * const workflow = {
   *   nodes: [
   *     { type: "n8n-nodes-langchain.agent" }, // Missing @n8n/
   *     { type: "@n8n/n8n-nodes-langchain.agent" } // Already correct
   *   ]
   * };
   * const fixed = fixLangChainTypes(workflow);
   * // Both nodes now have correct type: "@n8n/n8n-nodes-langchain.agent"
   */
  fixLangChainTypes(workflow) {
    if (!workflow || !workflow.nodes) return workflow;

    // Mapping des types incorrects vers les types corrects
    const langchainTypeFixes = {
      // Triggers
      'n8n-nodes-langchain.chattrigger': '@n8n/n8n-nodes-langchain.chatTrigger',
      'n8n-nodes-langchain.manualchattrigger': '@n8n/n8n-nodes-langchain.manualChatTrigger',

      // Root Nodes
      'n8n-nodes-langchain.agent': '@n8n/n8n-nodes-langchain.agent',
      'n8n-nodes-langchain.chainllm': '@n8n/n8n-nodes-langchain.chainLlm',
      'n8n-nodes-langchain.chainsummarization': '@n8n/n8n-nodes-langchain.chainSummarization',
      'n8n-nodes-langchain.chainretrievalqa': '@n8n/n8n-nodes-langchain.chainRetrievalQa',
      'n8n-nodes-langchain.informationextractor': '@n8n/n8n-nodes-langchain.informationExtractor',
      'n8n-nodes-langchain.textclassifier': '@n8n/n8n-nodes-langchain.textClassifier',
      'n8n-nodes-langchain.sentimentanalysis': '@n8n/n8n-nodes-langchain.sentimentAnalysis',

      // LLMs (Sub-nodes)
      'n8n-nodes-langchain.lmchatopenai': '@n8n/n8n-nodes-langchain.lmChatOpenAi',
      'n8n-nodes-langchain.lmchatanthropic': '@n8n/n8n-nodes-langchain.lmChatAnthropic',
      'n8n-nodes-langchain.lmchatolorma': '@n8n/n8n-nodes-langchain.lmChatOllama',
      'n8n-nodes-langchain.lmchatgroq': '@n8n/n8n-nodes-langchain.lmChatGroq',
      'n8n-nodes-langchain.lmchatmistralcloud': '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
      'n8n-nodes-langchain.lmchatgooglegemini': '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
      'n8n-nodes-langchain.lmopenai': '@n8n/n8n-nodes-langchain.lmOpenAi',

      // Memory (Sub-nodes)
      'n8n-nodes-langchain.memorybufferwindow': '@n8n/n8n-nodes-langchain.memoryBufferWindow',
      'n8n-nodes-langchain.memorypostgreschat': '@n8n/n8n-nodes-langchain.memoryPostgresChat',
      'n8n-nodes-langchain.memorymongodbchat': '@n8n/n8n-nodes-langchain.memoryMongoDbChat',
      'n8n-nodes-langchain.memoryredischat': '@n8n/n8n-nodes-langchain.memoryRedisChat',

      // Embeddings (Sub-nodes)
      'n8n-nodes-langchain.embeddingsopenai': '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
      'n8n-nodes-langchain.embeddingscohere': '@n8n/n8n-nodes-langchain.embeddingsCohere',
      'n8n-nodes-langchain.embeddingsgooglegemini': '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
      'n8n-nodes-langchain.embeddingsmistralcloud': '@n8n/n8n-nodes-langchain.embeddingsMistralCloud',

      // Vector Stores (Sub-nodes)
      'n8n-nodes-langchain.vectorstoreqdrant': '@n8n/n8n-nodes-langchain.vectorStoreQdrant',
      'n8n-nodes-langchain.vectorstoreinmemory': '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
      'n8n-nodes-langchain.vectorstoremongodbatlas': '@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas',
      'n8n-nodes-langchain.vectorstorepinecone': '@n8n/n8n-nodes-langchain.vectorStorePinecone',
      'n8n-nodes-langchain.vectorstorepgvector': '@n8n/n8n-nodes-langchain.vectorStorePGVector',

      // Tools (Sub-nodes)
      'n8n-nodes-langchain.toolcalculator': '@n8n/n8n-nodes-langchain.toolCalculator',
      'n8n-nodes-langchain.toolcode': '@n8n/n8n-nodes-langchain.toolCode',
      'n8n-nodes-langchain.toolhttprequest': '@n8n/n8n-nodes-langchain.toolHttpRequest',
      'n8n-nodes-langchain.toolworkflow': '@n8n/n8n-nodes-langchain.toolWorkflow',
      'n8n-nodes-langchain.toolvectorstore': '@n8n/n8n-nodes-langchain.toolVectorStore',

      // Document Loaders (Sub-nodes)
      'n8n-nodes-langchain.documentdefaultdataloader': '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
      'n8n-nodes-langchain.documentjsoninputloader': '@n8n/n8n-nodes-langchain.documentJsonInputLoader',

      // Text Splitters (Sub-nodes)
      'n8n-nodes-langchain.textsplitterrecursivecharactertextsplitter': '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
      'n8n-nodes-langchain.textsplittercharactertextsplitter': '@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter',
      'n8n-nodes-langchain.textsplittertokensplitter': '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter',

      // Output Parsers (Sub-nodes)
      'n8n-nodes-langchain.outputparserstructured': '@n8n/n8n-nodes-langchain.outputParserStructured',
      'n8n-nodes-langchain.outputparserautofixing': '@n8n/n8n-nodes-langchain.outputParserAutofixing',
      'n8n-nodes-langchain.outputparseritemlist': '@n8n/n8n-nodes-langchain.outputParserItemList'
    };

    let fixedCount = 0;

    workflow.nodes.forEach(node => {
      if (node.type && node.type.includes('langchain')) {
        const lowerType = node.type.toLowerCase();

        // Si le type est dans notre mapping de fixes
        if (langchainTypeFixes[lowerType]) {
          const oldType = node.type;
          node.type = langchainTypeFixes[lowerType];
          fixedCount++;
          console.log(`  🔧 Type corrigé: ${oldType} → ${node.type}`);
        }
        // Sinon, vérifier si c'est un type sans @n8n/ prefix
        else if (!node.type.startsWith('@n8n/')) {
          console.warn(`  ⚠️ Type LangChain non-standard détecté: ${node.type}`);
        }
      }
    });

    if (fixedCount > 0) {
      console.log(`  ✅ ${fixedCount} type(s) LangChain corrigé(s) automatiquement`);
    }

    return workflow;
  }

  /**
   * Enhances generated workflow with n8n best practices
   *
   * Automatic improvements:
   * - Adds `continueOnFail: true` to critical nodes (API calls, databases, emails)
   *   → Note: Placed in `parameters.options`, NOT at root level
   * - Generates contextual notes for each node based on type
   * - Ensures all nodes have valid structure
   *
   * Critical node types (auto-enhanced):
   * - Communication: gmail, slack, webhook, twilio, sendgrid
   * - Databases: postgres, mysql, mongodb
   * - APIs: httprequest, stripe, hubspot, salesforce
   * - AI: openai, code, function
   * - Data: googlesheets, notion, airtable
   *
   * @param {Object} workflow - Generated workflow object
   * @param {Array} workflow.nodes - Array of nodes to enhance
   * @returns {Object} Enhanced workflow with best practices applied
   *
   * @example
   * const workflow = { nodes: [{ type: "n8n-nodes-base.slack", parameters: {} }] };
   * const enhanced = enhanceWorkflow(workflow);
   * // Node now has: parameters.options.continueOnFail = true
   * // Node now has: notes = "💬 Notification - Nécessite configuration du channel/chat"
   */
  enhanceWorkflow(workflow) {
    if (!workflow || !workflow.nodes) return workflow;

    // Nodes qui nécessitent gestion d'erreurs
    const criticalNodeTypes = [
      'gmail', 'slack', 'webhook', 'httprequest', 'postgres', 'mysql', 'mongodb',
      'googlesheets', 'notion', 'airtable', 'stripe', 'twilio', 'sendgrid',
      'hubspot', 'salesforce', 'openai', 'code', 'function'
    ];

    workflow.nodes.forEach(node => {
      // 1. Ajouter continueOnFail sur nodes critiques (DANS parameters.options)
      const nodeTypeLC = node.type.toLowerCase();
      const isCritical = criticalNodeTypes.some(ct => nodeTypeLC.includes(ct));

      if (isCritical) {
        // Initialiser parameters si absent
        if (!node.parameters) {
          node.parameters = {};
        }

        // Initialiser options si absent
        if (!node.parameters.options) {
          node.parameters.options = {};
        }

        // Ajouter continueOnFail dans parameters.options (pas au root!)
        if (!node.parameters.options.continueOnFail) {
          node.parameters.options.continueOnFail = true;
        }
      }

      // 2. Enrichir les notes si manquantes
      if (!node.notes || node.notes.trim() === '') {
        node.notes = this.generateNodeNotes(node);
      }
    });

    return workflow;
  }

  /**
   * Generates contextual notes for a node based on its type
   *
   * @param {Object} node - Node object
   * @param {string} node.type - Node type (e.g., "n8n-nodes-base.slack")
   * @param {string} node.name - Node name
   * @returns {string} Human-readable note with emoji and guidance
   *
   * @example
   * generateNodeNotes({ type: "n8n-nodes-base.webhook", name: "Webhook" })
   * // Returns: "🚀 Point d'entrée du workflow - Déclenché automatiquement"
   */
  generateNodeNotes(node) {
    const typeLC = node.type.toLowerCase();

    // Notes contextuelles selon le type de node
    if (typeLC.includes('trigger') || typeLC.includes('webhook')) {
      return `🚀 Point d'entrée du workflow - Déclenché automatiquement`;
    }
    if (typeLC.includes('gmail') || typeLC.includes('email')) {
      return `📧 Opération email - Vérifier les credentials`;
    }
    if (typeLC.includes('slack') || typeLC.includes('discord') || typeLC.includes('telegram')) {
      return `💬 Notification - Nécessite configuration du channel/chat`;
    }
    if (typeLC.includes('code') || typeLC.includes('function')) {
      return `💻 Code personnalisé - Vérifier les inputs/outputs`;
    }
    if (typeLC.includes('http') || typeLC.includes('webhook')) {
      return `🌐 Requête API - Vérifier l'URL et les headers`;
    }
    if (typeLC.includes('database') || typeLC.includes('postgres') || typeLC.includes('mysql') || typeLC.includes('mongo')) {
      return `🗄️ Base de données - Vérifier les credentials et la requête`;
    }
    if (typeLC.includes('if') || typeLC.includes('switch')) {
      return `🔀 Logique conditionnelle - Définir les conditions`;
    }
    if (typeLC.includes('openai') || typeLC.includes('langchain')) {
      return `🤖 IA - Configurer le modèle et le prompt`;
    }

    return `📝 ${node.name}`;
  }

  /**
   * Generates a unique UUID for node identification
   *
   * @returns {string} UUID v4 string
   * @example
   * generateId() // "a3bb189e-8bf9-3888-9912-ace4e6543002"
   */
  generateId() {
    return require('crypto').randomUUID();
  }

  /**
   * Updates internal statistics after workflow generation
   *
   * @private
   * @param {Object} context - RAG context used
   * @param {boolean} context.fallback - Whether RAG fallback was used
   * @param {Array} context.documents - Retrieved documents
   * @param {number} duration - Generation duration in ms
   */
  updateStats(context, duration) {
    this.stats.generated++;

    if (!context.fallback) {
      this.stats.withRAG++;
      const prevAvg = this.stats.avgContextDocs;
      this.stats.avgContextDocs = (prevAvg * (this.stats.withRAG - 1) + context.documents.length) / this.stats.withRAG;
    }

    const prevTimeAvg = this.stats.avgGenerationTime;
    this.stats.avgGenerationTime = (prevTimeAvg * (this.stats.generated - 1) + duration) / this.stats.generated;
  }

  /**
   * Retrieves current generator statistics
   *
   * @returns {Object} Statistics object
   * @returns {number} return.generated - Total workflows generated
   * @returns {number} return.withRAG - Workflows using RAG context
   * @returns {string} return.ragUsageRate - RAG usage percentage (e.g., "92.5%")
   * @returns {number} return.validationPassed - Successful validations
   * @returns {number} return.validationFailed - Failed validations
   * @returns {string} return.validationPassRate - Validation pass rate (e.g., "85.0%")
   * @returns {string} return.avgGenerationTime - Average duration (e.g., "15.3s")
   * @returns {string} return.avgContextDocs - Average documents used (e.g., "18.2")
   * @returns {Object} return.validatorStats - Detailed validator statistics
   *
   * @example
   * const stats = generator.getStats();
   * console.log(stats.ragUsageRate); // "95.2%"
   * console.log(stats.avgGenerationTime); // "14.8s"
   */
  getStats() {
    const validationTotal = this.stats.validationPassed + this.stats.validationFailed;

    return {
      ...this.stats,
      ragUsageRate: this.stats.generated > 0
        ? ((this.stats.withRAG / this.stats.generated) * 100).toFixed(1) + '%'
        : '0%',
      validationPassRate: validationTotal > 0
        ? ((this.stats.validationPassed / validationTotal) * 100).toFixed(1) + '%'
        : 'N/A',
      avgGenerationTime: (this.stats.avgGenerationTime / 1000).toFixed(1) + 's',
      avgContextDocs: this.stats.avgContextDocs.toFixed(1),
      validatorStats: this.validator.getStats()
    };
  }

  /**
   * Determines workflow complexity based on execution plan
   *
   * Complexity levels:
   * - **simple**: 2-3 nodes, no conditions, no missing nodes → 60s timeout
   * - **medium**: 4-7 nodes, some conditions, 0-1 missing nodes → 90s timeout
   * - **complex**: 8+ nodes, multiple conditions, 2+ missing nodes → 120s timeout
   *
   * Used to adjust API timeout and manage expectations.
   *
   * @param {Object} plan - Execution plan from Planning Agent
   * @param {Array} plan.requiredNodes - Required nodes list
   * @param {Array} plan.missingNodes - Missing nodes list
   * @param {Object} context - RAG context (unused but kept for API compatibility)
   *
   * @returns {string} Complexity level: "simple" | "medium" | "complex"
   *
   * @example
   * const plan = { requiredNodes: [{}, {}], missingNodes: [] };
   * determineComplexity(plan, {}) // "simple"
   *
   * const complexPlan = { requiredNodes: Array(10).fill({}), missingNodes: [{}, {}] };
   * determineComplexity(complexPlan, {}) // "complex"
   */
  determineComplexity(plan, context) {
    const nodeCount = plan.requiredNodes?.length || 0;
    const missingCount = plan.missingNodes?.length || 0;
    const hasConditions = plan.requiredNodes?.some(n =>
      n.type?.includes('if') || n.type?.includes('switch') || n.type?.includes('merge')
    ) || false;

    // Simple : 2-3 nodes, pas de conditions, pas de nodes manquants
    if (nodeCount <= 3 && !hasConditions && missingCount === 0) {
      return 'simple';
    }

    // Complex : 8+ nodes OU 2+ nodes manquants OU conditions multiples
    if (nodeCount >= 8 || missingCount >= 2 || (hasConditions && nodeCount >= 6)) {
      return 'complex';
    }

    // Medium : tout le reste
    return 'medium';
  }

  /**
   * Closes all connections and cleans up resources
   *
   * Closes:
   * - RAG retriever (Qdrant vector DB connection)
   * - Planning Agent connections
   * - Supervisor Agent connections
   *
   * Should be called when generator is no longer needed.
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * const generator = new RAGEnhancedGenerator();
   * await generator.generate("webhook → Slack");
   * await generator.close(); // Clean up
   */
  async close() {
    await this.retriever.close();
  }
}

module.exports = RAGEnhancedGenerator;
