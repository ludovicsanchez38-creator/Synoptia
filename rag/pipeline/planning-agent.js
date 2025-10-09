/**
 * Planning Agent - Force le raisonnement avant génération
 * Vérifie que tous les nodes existent dans la RAG avant de générer
 */

const OpenAI = require('openai');
const config = require('../config');
const costTracker = require('../../utils/cost-tracker');

class PlanningAgent {
  constructor(retriever) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: config.openai.timeout // Timeout par défaut
    });

    this.retriever = retriever;
    this.model = config.openai.generationModel;
  }

  /**
   * Retourne le timeout adapté à la complexité
   */
  getTimeoutForComplexity(complexity) {
    const timeouts = config.openai.timeouts;
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
          response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [{
              role: 'system',
              content: planningPrompt
            }],
            // GPT-5 n'accepte que temperature: 1 (défaut)
            response_format: { type: 'json_object' }
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

      const plan = JSON.parse(response.choices[0].message.content);

      // Track API costs
      if (sessionId && response.usage) {
        costTracker.recordCall(
          sessionId,
          'planning',
          this.model,
          response.usage.prompt_tokens,
          response.usage.completion_tokens
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

      ragContext.documents.forEach(doc => {
        // Extraire les types exacts depuis le contenu
        if (doc.content) {
          const nodeTypeMatches = doc.content.match(/n8n-nodes-(?:base|langchain)\.[\w]+/g);
          if (nodeTypeMatches) {
            nodeTypeMatches.forEach(type => {
              const name = doc.nodeType || doc.title || type;
              nodeTypesMap.set(name, type);
            });
          }
        }

        // Ou utiliser le nodeType si disponible
        if (doc.nodeType) {
          // Essayer de deviner le type complet
          const guessedType = `n8n-nodes-base.${doc.nodeType.toLowerCase().replace(/\s+/g, '')}`;
          nodeTypesMap.set(doc.nodeType, guessedType);
        }

        // Workflow examples
        if (doc.workflowInfo && doc.workflowInfo.integrations) {
          doc.workflowInfo.integrations.forEach(integration => {
            if (integration.startsWith('@n8n/')) {
              const cleanName = integration.replace('@n8n/', '');
              const type = `n8n-nodes-langchain.${cleanName.toLowerCase()}`;
              nodeTypesMap.set(cleanName, type);
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

    return `Tu es un expert n8n chargé de PLANIFIER un workflow AVANT de le générer.

🎯 MISSION CRITIQUE:
Analyser la demande utilisateur et créer un plan DÉTAILLÉ qui liste TOUS les nodes nécessaires.
Tu DOIS UTILISER EN PRIORITÉ les nodes documentés ci-dessous.

${docsContext}

📋 NODES SUGGÉRÉS PAR RAG (À UTILISER EN PRIORITÉ):
${availableNodesList}

⚠️ RÈGLES ABSOLUES:

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

🔍 PROCESSUS DE DÉCISION:

1. **COMPRENDRE** la demande utilisateur
2. **IDENTIFIER** les fonctionnalités requises (ex: "appel LLM", "récupération LinkedIn")
3. **CHERCHER DANS LA DOCUMENTATION** : Pour chaque fonctionnalité, regarder si un node existe dans "NODES DOCUMENTÉS DISPONIBLES"
4. **DÉCISION** :
   - Node trouvé dans la doc → ✅ UTILISER CE NODE NATIF
   - Node absent de la doc → ⚠️ Utiliser HTTP Request en alternative
5. **LISTER** tous les nodes sélectionnés avec leur justification
6. **CRÉER** le flux d'exécution étape par étape
7. **VALIDER** que les nodes natifs documentés sont bien utilisés

DEMANDE UTILISATEUR:
"${userRequest}"

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
}

GÉNÈRE LE PLAN (JSON UNIQUEMENT):`;
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
