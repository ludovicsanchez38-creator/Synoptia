/**
 * @fileoverview Planning Agent - First stage of multi-agent workflow generation
 *
 * This agent analyzes user requests and creates detailed execution plans before generation.
 * It verifies that all required nodes exist in the RAG database and proposes alternatives
 * for missing nodes. Uses Anthropic Claude Haiku 4.5 for fast, cost-effective planning.
 *
 * @module rag/pipeline/planning-agent
 * @requires @anthropic-ai/sdk
 * @author Synoptia Workflow Builder Team
 * @since v1.0.0
 * @lastModified 2025-10-16
 *
 * Key improvements (Oct 2025):
 * - XML tags in user messages (Anthropic best practices)
 * - Hardcoded email node rules (sendemail lowercase)
 * - Rate limiting with exponential backoff
 * - JSON extraction with regex fallback
 */

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const costTracker = require('../../utils/cost-tracker');
const { LANGCHAIN_ARCHITECTURE, FORBIDDEN_NODE_PATTERNS } = require('../../prompts/shared-rules');

/**
 * Planning Agent - Analyzes user requests and creates execution plans
 *
 * First agent in the multi-agent pipeline. Responsible for:
 * - Understanding user intent
 * - Identifying required nodes from RAG database
 * - Detecting missing nodes and proposing alternatives
 * - Creating execution flow
 * - Determining workflow complexity
 *
 * @class PlanningAgent
 * @example
 * const retriever = new WorkflowContextRetriever();
 * const planningAgent = new PlanningAgent(retriever);
 * const plan = await planningAgent.createPlan(
 *   "créer un webhook et envoyer sur Slack",
 *   ragContext,
 *   sessionId
 * );
 */
class PlanningAgent {
  /**
   * Creates a new Planning Agent instance
   *
   * @constructor
   * @param {WorkflowContextRetriever} retriever - RAG retriever instance
   * @throws {Error} If ANTHROPIC_API_KEY is not set in environment
   */
  constructor(retriever) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: config.anthropic.timeout // Timeout par défaut
    });

    this.retriever = retriever;
    this.model = config.anthropic.generationModel;
  }

  /**
   * Retourne le timeout adapté à la complexité
   */
  getTimeoutForComplexity(complexity) {
    const timeouts = config.anthropic.timeouts;
    return timeouts[complexity] || timeouts.medium;
  }

  /**
   * Analyse la demande et crée un plan détaillé
   * FORCE le raisonnement étape par étape
   */
  async createPlan(userRequest, ragContext, sessionId = null) {
    console.log('  🧠 Planning Agent - Analyse de la demande...');

    // Broadcast SSE start
    if (global.broadcastSSE) {
      global.broadcastSSE('planning_start', {
        agent: 'El Planificator',
        icon: '🧠',
        message: 'Analyse de la demande utilisateur...',
        timestamp: Date.now()
      });
    }

    const planningPrompt = this.buildPlanningPrompt(userRequest, ragContext);

    try {
      if (global.broadcastSSE) {
        global.broadcastSSE('planning_progress', {
          agent: 'El Planificator',
          icon: '🧠',
          message: 'Identification des fonctionnalités requises',
          timestamp: Date.now()
        });
      }

      let response;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount <= maxRetries) {
        try {
          response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: config.anthropic.maxTokens,
            system: planningPrompt,
            messages: [{
              role: 'user',
              content: `<user_request>${userRequest}</user_request>\n\nGénère le plan d'exécution pour cette demande utilisateur (JSON uniquement):`
            }],
            temperature: 0.3 // Haiku 4.5 supporte temperature (vs GPT-5)
          });
          break; // Success, sortir de la boucle
        } catch (error) {
          // Détecter rate limit 429
          if (error.status === 429 && retryCount < maxRetries) {
            // Extraire le délai depuis le message d'erreur
            const waitMatch = error.message.match(/try again in ([\d.]+)s/);
            const waitTime = waitMatch ? Math.ceil(parseFloat(waitMatch[1]) * 1000) : 5000;

            console.warn(`  ⏳ Rate limit atteint, retry ${retryCount + 1}/${maxRetries} dans ${waitTime/1000}s...`);

            if (global.broadcastSSE) {
              global.broadcastSSE('planning_progress', {
                agent: 'El Planificator',
                icon: '⏳',
                message: `Rate limit - Retry dans ${waitTime/1000}s`,
                timestamp: Date.now()
              });
            }

            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
          } else {
            throw error; // Autre erreur ou max retries atteint
          }
        }
      }

      let responseText = response.content[0].text;

      // Retirer markdown code blocks si présents (Claude Haiku 4.5 wrap souvent en ```json)
      responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();

      // ✅ FIX OCT 2025: Extraire UNIQUEMENT le premier objet JSON valide
      // Le modèle peut générer du texte après le JSON, causant "Unexpected non-whitespace character"
      let plan;
      try {
        plan = JSON.parse(responseText);
      } catch (parseError) {
        // Si le parsing échoue, essayer d'extraire le JSON avec une regex
        // REGEX AMÉLIORÉE: Mode NON-GREEDY pour capturer le premier objet JSON seulement
        // Match pattern: { ... } en s'arrêtant au premier } qui ferme le premier {
        let jsonMatch = responseText.match(/\{[\s\S]*?\}/);

        // Si ça ne marche pas, essayer greedy (pour les JSON très longs)
        if (!jsonMatch || jsonMatch[0].length < 50) {
          jsonMatch = responseText.match(/\{[\s\S]*\}/);
        }

        if (jsonMatch) {
          try {
            plan = JSON.parse(jsonMatch[0]);
            console.log('  ⚠️ JSON extrait avec regex (texte superflu détecté)');

            // DEBUG: Vérifier si le plan a les champs requis
            if (!plan.requiredNodes || plan.requiredNodes.length === 0) {
              console.error('  🚨 DEBUG: Plan extrait sans requiredNodes!');
              console.error(`  📄 JSON brut (premiers 500 chars): ${jsonMatch[0].substring(0, 500)}`);
              console.error(`  📄 Réponse complète (premiers 1000 chars): ${responseText.substring(0, 1000)}`);
            }
          } catch (regexError) {
            console.error(`  ❌ JSON invalide après extraction regex`);
            console.error(`  📄 JSON extrait (premiers 500 chars): ${jsonMatch[0].substring(0, 500)}`);
            throw new Error(`JSON invalide même après extraction: ${parseError.message}`);
          }
        } else {
          console.error(`  ❌ Aucun JSON trouvé dans la réponse`);
          console.error(`  📄 Réponse complète (premiers 1000 chars): ${responseText.substring(0, 1000)}`);
          throw new Error(`Impossible de trouver un objet JSON dans la réponse: ${parseError.message}`);
        }
      }

      // Track API costs
      if (sessionId && response.usage) {
        costTracker.recordCall(
          sessionId,
          'planning',
          this.model,
          response.usage.input_tokens,
          response.usage.output_tokens
        );
      }

      console.log(`  📋 Plan créé:`);
      console.log(`     - Nodes requis: ${plan.requiredNodes?.length || 0}`);
      console.log(`     - Nodes disponibles: ${plan.availableNodes?.length || 0}`);
      console.log(`     - Nodes manquants: ${plan.missingNodes?.length || 0}`);

      // ⛔ INTERRUPTION: Si aucun node n'est trouvé, ARRÊTER
      const availableCount = plan.availableNodes?.length || 0;
      const requiredCount = plan.requiredNodes?.length || 0;

      if (requiredCount > 0 && availableCount === 0) {
        const errorMsg = `❌ ÉCHEC: Aucun node n8n trouvé dans le RAG. Impossible de générer le workflow.`;
        console.error(`  ${errorMsg}`);
        console.error(`     - Nodes requis: ${requiredCount}`);
        console.error(`     - Documents RAG: ${ragContext.documents?.length || 0}`);
        console.error(`     - Exemples workflows: ${ragContext.workflowExamplesCount || 0}`);

        if (global.broadcastSSE) {
          global.broadcastSSE('planning_error', {
            agent: 'El Planificator',
            icon: '❌',
            message: errorMsg,
            details: {
              requiredNodes: plan.requiredNodes,
              ragDocuments: ragContext.documents?.length || 0,
              workflowExamples: ragContext.workflowExamplesCount || 0
            },
            timestamp: Date.now()
          });
        }

        throw new Error(errorMsg);
      }

      if (plan.missingNodes && plan.missingNodes.length > 0) {
        console.warn(`  ⚠️ ATTENTION: ${plan.missingNodes.length} nodes manquants!`);
        plan.missingNodes.forEach(node => {
          console.warn(`     - ${node.name}: ${node.alternative}`);
        });

        if (global.broadcastSSE) {
          global.broadcastSSE('planning_progress', {
            agent: 'Planning Agent',
            icon: '🧠',
            message: `Proposition d'alternatives pour ${plan.missingNodes.length} nodes manquants`,
            timestamp: Date.now()
          });
        }
      }

      // Déterminer la complexité pour l'UI (sera aussi calculée dans le generator)
      const nodeCount = plan.requiredNodes?.length || 0;
      const missingCount = plan.missingNodes?.length || 0;
      let complexity = 'medium';
      if (nodeCount <= 3 && missingCount === 0) {
        complexity = 'simple';
      } else if (nodeCount >= 8 || missingCount >= 2) {
        complexity = 'complex';
      }

      // Broadcast completion avec complexité
      if (global.broadcastSSE) {
        global.broadcastSSE('planning_complete', {
          agent: 'El Planificator',
          icon: '🧠',
          message: 'Plan créé avec succès',
          nodesCount: nodeCount,
          missingCount: missingCount,
          complexity: complexity,
          timestamp: Date.now()
        });
      }

      return plan;

    } catch (error) {
      console.error('❌ Erreur Planning Agent:', error.message);

      if (global.broadcastSSE) {
        global.broadcastSSE('planning_error', {
          agent: 'El Planificator',
          icon: '❌',
          message: `Erreur: ${error.message}`,
          timestamp: Date.now()
        });
      }

      throw error;
    }
  }

  /**
   * Construit le prompt de planification avec Chain-of-Thought
   */
  buildPlanningPrompt(userRequest, ragContext) {
    // Liste des nodes disponibles depuis la RAG
    const availableNodesList = ragContext.detectedNodes && ragContext.detectedNodes.length > 0
      ? ragContext.detectedNodes.join(', ')
      : 'Aucun node spécifique détecté';

    // Documentation disponible avec TYPES EXACTS
    let docsContext = '';
    const nodeTypesMap = new Map(); // nom → type exact

    if (ragContext.documents && ragContext.documents.length > 0) {
      docsContext = '\n\n📚 NODES DOCUMENTÉS DISPONIBLES (AVEC TYPES EXACTS):\n';
      docsContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

      // ⬇️ OPTIMISATION: 25 → 20 docs (moins de bruit avec SmartChunker)
      ragContext.documents.slice(0, 20).forEach(doc => {
        // ✅ FIX 1: Extraire les types depuis le contenu avec regex corrigé
        // Supporte BOTH formats: @n8n/n8n-nodes-langchain.* ET n8n-nodes-base.*
        if (doc.content) {
          // Regex corrigé pour capturer le préfixe @n8n/ aussi
          const nodeTypeMatches = doc.content.match(/(`?)(@n8n\/n8n-nodes-langchain\.[a-zA-Z0-9_]+|n8n-nodes-base\.[a-zA-Z0-9_]+)\1/g);
          if (nodeTypeMatches) {
            nodeTypeMatches.forEach(match => {
              // Enlever les backticks si présents
              const type = match.replace(/`/g, '');
              const name = doc.title || type;
              nodeTypesMap.set(name, type);
            });
          }
        }

        // ✅ FIX 2: Utiliser doc.nodeType TEL QUEL (sans guessing!)
        // Le champ doc.nodeType CONTIENT DÉJÀ le type complet et exact
        if (doc.nodeType) {
          // Vérifier que c'est un nodeType valide (commence par n8n-nodes-base. ou @n8n/)
          if (doc.nodeType.startsWith('n8n-nodes-base.') || doc.nodeType.startsWith('@n8n/')) {
            const name = doc.title || doc.nodeType;
            nodeTypesMap.set(name, doc.nodeType); // ✅ Utiliser TEL QUEL - pas de transformation!
          }
        }

        // Workflow examples (déjà correct)
        if (doc.workflowInfo && doc.workflowInfo.integrations) {
          doc.workflowInfo.integrations.forEach(integration => {
            if (integration.startsWith('@n8n/n8n-nodes-langchain.')) {
              // Garder le type exact avec @n8n/ et la casse correcte
              const cleanName = integration.replace('@n8n/n8n-nodes-langchain.', '');
              nodeTypesMap.set(cleanName, integration);
            }
          });
        }
      });

      // Afficher la liste avec types exacts
      Array.from(nodeTypesMap.entries()).forEach(([name, type]) => {
        docsContext += `  - ${name}\n`;
        docsContext += `    TYPE EXACT: "${type}"\n`;
      });

      docsContext += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    }

    return `Tu es un expert n8n chargé de PLANIFIER un workflow MINIMAL et EFFICACE.

🎯 MISSION CRITIQUE:
Analyser la demande utilisateur et créer un plan avec le MINIMUM de nodes nécessaires.
Privilégie la SIMPLICITÉ et l'EFFICACITÉ. Évite les nodes redondants.
Tu DOIS UTILISER EN PRIORITÉ les nodes documentés ci-dessous.

${docsContext}

📋 NODES SUGGÉRÉS PAR RAG (À UTILISER EN PRIORITÉ):
${availableNodesList}

⚠️ RÈGLES ABSOLUES:

0. **MINIMALISME** : Génère le MINIMUM de nodes nécessaires. N'ajoute PAS de nodes "Set" ou "Code" sauf si EXPLICITEMENT demandé.
   - ✅ CORRECT: Webhook → Slack (2 nodes)
   - ❌ INCORRECT: Webhook → Set → Code → Slack (4 nodes)

0bis. **TRIGGERS PRIORITAIRES** : Si la demande mentionne "quand", "trigger", "nouveau", "nouvelle", utilise le trigger natif correspondant:
   - "quand nouvelle ligne Google Sheets" → googleSheetsTrigger (PAS googleSheets)
   - "nouveau deal Pipedrive" → pipedriveTrigger (PAS pipedrive)
   - "trigger Discord" → discordTrigger (PAS discord)
   - "nouveau message Slack" → slackTrigger (PAS slack)

0ter. **NODES EMAIL** : Pour envoyer des emails via SMTP, utilise TOUJOURS:
   - TYPE EXACT: "n8n-nodes-base.sendemail" (tout en minuscules!)
   - ❌ INCORRECT: sendEmail, emailSend, SendEmail
   - ✅ CORRECT: sendemail (lowercase)

1. **PRIORITÉ ABSOLUE** : Si un node est listé dans "NODES DOCUMENTÉS DISPONIBLES" ci-dessus, tu DOIS l'utiliser
   - Exemple: Si OpenAI est documenté, utilise le node OpenAI natif (n8n-nodes-langchain.openai)
   - Exemple: Si LinkedIn est documenté, utilise le node LinkedIn natif
   - N'utilise HTTP Request QUE si le node natif n'existe pas dans la documentation

2. **VÉRIFICATION STRICTE** : Chaque node listé dans "NODES DOCUMENTÉS DISPONIBLES" existe et est utilisable
   - Ces nodes ont été récupérés depuis la base de documentation officielle n8n
   - Tu peux leur faire CONFIANCE à 100%

3. **HTTP Request = DERNIER RECOURS** : N'utilise HTTP Request que pour :
   - Les APIs sans node natif (ex: VEO 3, APIs custom)
   - Les services non couverts par la documentation

4. **EXEMPLES CONCRETS** :
   ✅ CORRECT : "OpenAI est documenté → J'utilise n8n-nodes-langchain.openai"
   ❌ INCORRECT : "OpenAI est documenté → J'utilise HTTP Request vers OpenAI API"

   ✅ CORRECT : "LinkedIn est documenté → J'utilise n8n-nodes-base.linkedIn"
   ❌ INCORRECT : "LinkedIn est documenté → J'utilise HTTP Request vers LinkedIn API"

${LANGCHAIN_ARCHITECTURE}

${FORBIDDEN_NODE_PATTERNS}

🔍 PROCESSUS DE DÉCISION:

1. **COMPRENDRE** la demande utilisateur (fournie dans le message utilisateur)
2. **IDENTIFIER** les fonctionnalités requises (ex: "appel LLM", "récupération LinkedIn")
3. **CHERCHER DANS LA DOCUMENTATION** : Pour chaque fonctionnalité, regarder si un node existe dans "NODES DOCUMENTÉS DISPONIBLES"
4. **DÉCISION** :
   - Node trouvé dans la doc → ✅ UTILISER CE NODE NATIF
   - Node absent de la doc → ⚠️ Utiliser HTTP Request en alternative
5. **LISTER** tous les nodes sélectionnés avec leur justification
6. **CRÉER** le flux d'exécution étape par étape
7. **VALIDER** que les nodes natifs documentés sont bien utilisés

⚠️ La demande utilisateur sera fournie dans le message utilisateur avec le tag <user_request>.
Analyse cette demande et génère le plan correspondant.

📤 FORMAT DE RÉPONSE (JSON UNIQUEMENT):
{
  "analysis": {
    "description": "Description courte de ce que fait le workflow",
    "functionalities": ["fonctionnalité 1", "fonctionnalité 2"],
    "complexity": "simple|medium|complex"
  },
  "reasoning": {
    "step1_understand": "Explication de la demande",
    "step2_identify": "Liste des fonctionnalités identifiées",
    "step3_nodes_needed": ["node1", "node2"],
    "step4_verification": "Vérification de disponibilité des nodes",
    "step5_alternatives": "Nodes remplacés par des alternatives si nécessaire",
    "step6_flow": "Description du flux d'exécution"
  },
  "requiredNodes": [
    {
      "name": "Node Name",
      "type": "n8n-nodes-base.nodeType",
      "purpose": "Pourquoi ce node",
      "exists": true|false,
      "verified": true|false
    }
  ],
  "availableNodes": [
    {
      "name": "Node Name",
      "type": "n8n-nodes-base.nodeType"
    }
  ],
  "missingNodes": [
    {
      "name": "Node Name Original",
      "reason": "Pourquoi manquant",
      "alternative": "Utiliser HTTP Request + API XXX"
    }
  ],
  "executionFlow": [
    "Étape 1: Trigger webhook",
    "Étape 2: Transformer données",
    "Étape 3: Envoyer email"
  ],
  "recommendations": [
    "Recommandation 1",
    "Recommandation 2"
  ],
  "readyToGenerate": true|false,
  "warnings": ["Warning si nodes manquants ou problèmes détectés"]
}`;
  }

  /**
   * Valide le plan créé
   */
  validatePlan(plan) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Vérifier que le plan est complet
    if (!plan.requiredNodes || plan.requiredNodes.length === 0) {
      validation.errors.push('Aucun node requis identifié dans le plan');
      validation.valid = false;
    }

    // Vérifier les nodes manquants
    if (plan.missingNodes && plan.missingNodes.length > 0) {
      validation.warnings.push(`${plan.missingNodes.length} nodes manquants - alternatives proposées`);
    }

    // Vérifier que tous les nodes sont vérifiés
    const unverifiedNodes = plan.requiredNodes?.filter(n => !n.verified) || [];
    if (unverifiedNodes.length > 0) {
      validation.warnings.push(`${unverifiedNodes.length} nodes non vérifiés`);
    }

    // Vérifier le flux d'exécution
    if (!plan.executionFlow || plan.executionFlow.length === 0) {
      validation.warnings.push('Aucun flux d\'exécution défini');
    }

    return validation;
  }
}

module.exports = PlanningAgent;
