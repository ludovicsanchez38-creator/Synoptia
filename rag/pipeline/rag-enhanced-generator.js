/**
 * RAG-Enhanced Workflow Generator
 * Génère des workflows n8n enrichis par le contexte de la documentation
 */

const OpenAI = require('openai');
const WorkflowContextRetriever = require('../retrieval/workflow-context-retriever');
const WorkflowValidator = require('../validation/workflow-validator');
const PlanningAgent = require('./planning-agent');
const SupervisorAgent = require('./supervisor-agent');
const { getNodeSchema } = require('../validation/node-schemas');
const config = require('../config');
const costTracker = require('../../utils/cost-tracker');

class RAGEnhancedGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: config.openai.timeout
    });

    this.retriever = new WorkflowContextRetriever();
    this.validator = new WorkflowValidator();
    this.planningAgent = new PlanningAgent(this.retriever);
    this.supervisorAgent = new SupervisorAgent(this.retriever);
    this.model = config.openai.generationModel;

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
   * Génère un workflow enrichi par RAG
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
          message: `Mode de raisonnement profond activé (GPT-5) - timeout 10min`,
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
        workflow = await this.generateWithGPT(newPrompt, sessionId, adaptiveTimeout);

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
   * Détecte si un trigger est nécessaire et lequel
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
            detected.suggestedTrigger = 'n8n-nodes-langchain.chatTrigger';
            detected.reason = 'Chatbot détecté';
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
   * Construit un prompt enrichi avec contexte RAG ET le plan
   */
  buildEnrichedPrompt(userRequest, context, plan = null) {
    const {previousErrors} = context;

    // Détecter besoin de trigger
    const triggerNeeds = this.detectTriggerNeeds(userRequest);

    // Contexte documentaire - ENRICHI pour éviter les nodes inventés
    let docsContext = '';
    if (context.documents && context.documents.length > 0) {
      docsContext = '\n\n📚 DOCUMENTATION N8N PERTINENTE (NODES DISPONIBLES):\n\n';

      // Prendre jusqu'à 15 documents (augmenté de 5 → 15)
      // Et 800 caractères par doc (augmenté de 400 → 800)
      context.documents.slice(0, 15).forEach((doc, i) => {
        docsContext += `[${i + 1}] ${doc.title || 'Document'}\n`;
        if (doc.nodeType) docsContext += `   🏷️  NodeType: ${doc.nodeType}\n`;
        if (doc.url) docsContext += `   🔗 URL: ${doc.url}\n`;

        // Workflow example ?
        if (doc.workflowInfo) {
          docsContext += `   📊 Workflow: ${doc.workflowInfo.complexity} (${doc.workflowInfo.nodeCount} nœuds)\n`;
          docsContext += `   🔧 Intégrations: ${doc.workflowInfo.integrations.slice(0, 5).join(', ')}\n`;
        }

        docsContext += `   ${doc.content.substring(0, 800)}...\n\n`;
      });

      docsContext += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      docsContext += `⚠️  IMPORTANT: Ces ${Math.min(15, context.documents.length)} documents ci-dessus contiennent\n`;
      docsContext += `les SEULS nodes que tu peux utiliser. Tout autre node sera considéré comme INVENTÉ.\n`;
      docsContext += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
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
    const systemPrompt = `Tu es un expert n8n qui génère des workflows JSON parfaitement formatés.

🎯 OBJECTIF:
Créer un workflow n8n fonctionnel et optimisé pour la demande utilisateur.

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
12. Inclure "typeVersion" (généralement 1) pour chaque node
13. Ajouter des notes (field "notes") pour documenter les nodes

⛔ INTERDICTION #2 - NE JAMAIS UTILISER LE CHAMP "authentication":
- ❌ "authentication": "oAuth2" (INVALIDE - n8n ne reconnaît pas ce champ)
- ❌ "authentication": "predefinedCredentialType" (INVALIDE)
- ✅ NE PAS mettre de credentials du tout (l'utilisateur les ajoutera manuellement dans n8n)
- ✅ Ajouter une note: "⚠️ Credentials à configurer manuellement dans n8n"

🔑 FORMAT CREDENTIALS (SI ABSOLUMENT NÉCESSAIRE):
Si un node nécessite des credentials (OAuth2, API Key, etc.), NE PAS inclure le champ "credentials" ou "authentication".
À LA PLACE: Ajouter une note explicative dans le champ "notes" du node.

Exemple CORRECT:
{
  "parameters": {
    "url": "https://api.linkedin.com/v2/posts",
    "responseFormat": "json"
  },
  "name": "HTTP Request (LinkedIn)",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [400, 200],
  "id": "unique-id",
  "notes": "⚠️ Credentials OAuth2 à configurer manuellement dans n8n pour LinkedIn API"
}

Exemple INVALIDE:
{
  "parameters": {...},
  "authentication": "oAuth2", ❌ CE CHAMP N'EXISTE PAS
  ...
}${triggerInstruction}${errorHandlingInstruction}

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
   * Génère le workflow avec GPT
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

      // Créer un client OpenAI avec le timeout adapté
      const openaiClient = timeout ? new (require('openai'))({
        apiKey: process.env.OPENAI_API_KEY,
        timeout
      }) : this.openai;

      while (retryCount <= maxRetries) {
        try {
          response = await openaiClient.chat.completions.create({
            model: this.model,
            messages: [{
              role: 'system',
              content: prompt
            }],
            // GPT-5 utilise max_completion_tokens au lieu de max_tokens
            max_completion_tokens: 128000, // GPT-5 MAX - workflows ultra-complexes
            response_format: { type: 'json_object' } // Force JSON
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
          response.usage.prompt_tokens,
          response.usage.completion_tokens
        );
      }

      const content = response.choices[0].message.content;

      if (global.broadcastSSE) {
        global.broadcastSSE('generation_progress', {
          agent: 'El Generator',
          icon: '🤖',
          message: 'Création des connexions entre nodes',
          timestamp: Date.now()
        });
      }

      // Parser le JSON
      let workflow = JSON.parse(content);

      // Vérifier que le workflow est valide
      if (!workflow || typeof workflow !== 'object') {
        throw new Error('Le workflow généré est invalide ou vide');
      }

      // Ajouter IDs manquants
      if (workflow.nodes) {
        workflow.nodes.forEach(node => {
          if (!node.id) {
            node.id = this.generateId();
          }
        });
      }

      // Post-processing: améliorer le workflow
      workflow = this.enhanceWorkflow(workflow);

      return workflow;

    } catch (error) {
      console.error('❌ Erreur génération GPT:', error.message);
      throw new Error(`Génération échouée: ${error.message}`);
    }
  }


  /**
   * Améliore le workflow généré avec best practices
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
   * Génère des notes pour un node
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
   * Génère un ID unique
   */
  generateId() {
    return require('crypto').randomUUID();
  }

  /**
   * Met à jour les stats
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
   * Récupère les statistiques
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
   * Détermine la complexité du workflow basée sur le plan
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
   * Ferme connexions
   */
  async close() {
    await this.retriever.close();
  }
}

module.exports = RAGEnhancedGenerator;