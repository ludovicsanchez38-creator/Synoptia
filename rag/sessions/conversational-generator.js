/**
 * Conversational Workflow Generator
 * Génère et modifie des workflows de manière conversationnelle
 * Support: créer, modifier, régénérer, optimiser workflows via dialogue
 */

const RAGEnhancedGenerator = require('../pipeline/rag-enhanced-generator');
const ConversationManager = require('./conversation-manager');
const OpenAI = require('openai');

class ConversationalGenerator {
  constructor() {
    this.generator = new RAGEnhancedGenerator();
    this.conversationManager = new ConversationManager();

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.intentModel = 'gpt-4o-mini'; // Fast model for intent detection
  }

  /**
   * Point d'entrée principal: traite un message utilisateur
   */
  async processMessage(message, sessionId = null, options = {}) {
    console.log(`\n💬 Message reçu: "${message}"`);

    // Créer ou récupérer session
    let session;
    if (!sessionId) {
      const created = this.conversationManager.createSession(options.userId, options.metadata);
      session = created.session;
      sessionId = created.sessionId;
    } else {
      // Try to get existing session, create if not found
      try {
        session = this.conversationManager.getSession(sessionId);
      } catch (error) {
        // Session doesn't exist, create it
        const created = this.conversationManager.createSession(options.userId, options.metadata);
        session = created.session;
        sessionId = created.sessionId;
      }
    }

    // Ajouter message user à l'historique
    this.conversationManager.addMessage(sessionId, 'user', message);

    // Détecter l'intention
    const intent = await this.detectIntent(message, session);
    console.log(`  🎯 Intent détecté: ${intent.action} (confiance: ${intent.confidence})`);

    // Router vers l'action appropriée
    let result;
    switch (intent.action) {
      case 'create':
        result = await this.handleCreate(message, sessionId, intent);
        break;

      case 'modify':
        result = await this.handleModify(message, sessionId, intent);
        break;

      case 'regenerate':
        result = await this.handleRegenerate(message, sessionId, intent);
        break;

      case 'explain':
        result = await this.handleExplain(sessionId, intent);
        break;

      case 'validate':
        result = await this.handleValidate(sessionId);
        break;

      case 'rollback':
        result = await this.handleRollback(sessionId);
        break;

      default:
        result = await this.handleGeneral(message, sessionId);
    }

    // Ajouter réponse assistant à l'historique
    this.conversationManager.addMessage(
      sessionId,
      'assistant',
      result.message,
      { intent: intent.action }
    );

    return {
      sessionId,
      intent: intent.action,
      ...result
    };
  }

  /**
   * Détecte l'intention de l'utilisateur
   */
  async detectIntent(message, session) {
    const hasWorkflow = !!session.currentWorkflow;

    const prompt = `Tu es un assistant qui analyse les intentions utilisateur pour un générateur de workflows n8n.

Contexte:
- L'utilisateur ${hasWorkflow ? 'A DÉJÀ' : 'N\'A PAS'} un workflow en cours
- Historique: ${session.history.length} messages

Message utilisateur: "${message}"

Détermine l'intention parmi:
- "create": Créer un nouveau workflow (ex: "create a webhook", "make a workflow that...")
- "modify": Modifier le workflow actuel (ex: "add a node", "change the trigger", "remove slack")
- "regenerate": Regénérer le workflow (ex: "try again", "regenerate", "make it better")
- "explain": Expliquer le workflow (ex: "explain this", "how does it work")
- "validate": Valider le workflow (ex: "is it valid", "check for errors")
- "rollback": Revenir en arrière (ex: "undo", "go back", "previous version")
- "general": Question générale (ex: "what can you do", "help")

Réponds en JSON:
{
  "action": "create|modify|regenerate|explain|validate|rollback|general",
  "confidence": 0-1,
  "details": "description courte de l'intention",
  "params": {} // paramètres extraits si applicable
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.intentModel,
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);

    } catch (error) {
      console.error('❌ Erreur détection intent:', error.message);
      // Fallback simple
      if (!hasWorkflow) {
        return { action: 'create', confidence: 0.8, details: 'Fallback to create' };
      }
      return { action: 'modify', confidence: 0.5, details: 'Fallback to modify' };
    }
  }

  /**
   * Crée un nouveau workflow
   */
  async handleCreate(message, sessionId, intent) {
    console.log('  📝 Création nouveau workflow...');

    const result = await this.generator.generate(message, {
      autoFix: true,
      maxRetries: 2,
      sessionId
    });

    // Stocker dans session
    this.conversationManager.updateWorkflow(
      sessionId,
      result.workflow,
      'create',
      result.validation
    );

    const responseMessage = this.formatWorkflowResponse(result, 'create');

    return {
      action: 'create',
      workflow: result.workflow,
      validation: result.validation,
      message: responseMessage,
      metadata: result.metadata
    };
  }

  /**
   * Modifie le workflow existant
   */
  async handleModify(message, sessionId, intent) {
    console.log('  ✏️ Modification workflow...');

    const context = this.conversationManager.getModificationContext(sessionId);

    if (!context || !context.currentWorkflow) {
      return {
        action: 'error',
        message: '❌ Aucun workflow à modifier. Créez d\'abord un workflow avec une commande comme "create a webhook workflow".'
      };
    }

    // Construire prompt de modification
    const modificationPrompt = this.buildModificationPrompt(message, context);

    // Générer workflow modifié
    const result = await this.generator.generate(modificationPrompt, {
      autoFix: true,
      maxRetries: 2,
      sessionId
    });

    // Stocker version modifiée
    this.conversationManager.updateWorkflow(
      sessionId,
      result.workflow,
      'modify',
      result.validation
    );

    const responseMessage = this.formatWorkflowResponse(result, 'modify');

    return {
      action: 'modify',
      workflow: result.workflow,
      validation: result.validation,
      message: responseMessage,
      previousVersion: context.currentWorkflow,
      metadata: result.metadata
    };
  }

  /**
   * Regénère le workflow
   */
  async handleRegenerate(message, sessionId, intent) {
    console.log('  🔄 Régénération workflow...');

    const context = this.conversationManager.getModificationContext(sessionId);

    if (!context || !context.currentWorkflow) {
      return await this.handleCreate(message, sessionId, intent);
    }

    // Récupérer la demande initiale depuis l'historique
    const history = this.conversationManager.getConversationHistory(sessionId, { maxMessages: 10 });
    const initialRequest = history.find(m => m.role === 'user')?.content || message;

    const result = await this.generator.generate(initialRequest, {
      autoFix: true,
      maxRetries: 2,
      sessionId
    });

    this.conversationManager.updateWorkflow(
      sessionId,
      result.workflow,
      'regenerate',
      result.validation
    );

    const responseMessage = this.formatWorkflowResponse(result, 'regenerate');

    return {
      action: 'regenerate',
      workflow: result.workflow,
      validation: result.validation,
      message: responseMessage,
      metadata: result.metadata
    };
  }

  /**
   * Explique le workflow
   */
  async handleExplain(sessionId, intent) {
    console.log('  📖 Explication workflow...');

    const session = this.conversationManager.getSession(sessionId);

    if (!session.currentWorkflow) {
      return {
        action: 'error',
        message: '❌ Aucun workflow à expliquer.'
      };
    }

    const explanation = this.generateWorkflowExplanation(session.currentWorkflow);

    return {
      action: 'explain',
      message: explanation,
      workflow: session.currentWorkflow
    };
  }

  /**
   * Valide le workflow
   */
  async handleValidate(sessionId) {
    console.log('  ✅ Validation workflow...');

    const session = this.conversationManager.getSession(sessionId);

    if (!session.currentWorkflow) {
      return {
        action: 'error',
        message: '❌ Aucun workflow à valider.'
      };
    }

    const validation = await this.generator.validator.validateWithScore(session.currentWorkflow);

    let message = `📊 **Validation du workflow**\n\n`;
    message += `Status: ${validation.valid ? '✅ Valide' : '❌ Invalide'}\n`;
    message += `Score: ${validation.score}/100 (${validation.grade})\n`;
    message += `Erreurs: ${validation.errors.length}\n`;
    message += `Warnings: ${validation.warnings.length}\n\n`;

    if (validation.errors.length > 0) {
      message += `**Erreurs:**\n${validation.errors.map(e => `- ${e}`).join('\n')}\n\n`;
    }

    if (validation.warnings.length > 0) {
      message += `**Warnings:**\n${validation.warnings.slice(0, 5).map(w => `- ${w}`).join('\n')}`;
    }

    return {
      action: 'validate',
      validation,
      message
    };
  }

  /**
   * Rollback vers version précédente
   */
  async handleRollback(sessionId) {
    console.log('  ⏪ Rollback workflow...');

    try {
      const result = this.conversationManager.rollbackWorkflow(sessionId);

      return {
        action: 'rollback',
        workflow: result.workflow,
        message: `✅ Workflow restauré à la version précédente (${new Date(result.restoredFrom).toLocaleTimeString()})`
      };

    } catch (error) {
      return {
        action: 'error',
        message: `❌ ${error.message}`
      };
    }
  }

  /**
   * Gère question générale
   */
  async handleGeneral(message, sessionId) {
    return {
      action: 'general',
      message: `Je peux vous aider à créer et modifier des workflows n8n. Voici quelques commandes:

**Créer:** "Create a webhook that sends to Slack"
**Modifier:** "Add a node to send email", "Remove the Slack node"
**Régénérer:** "Try again", "Regenerate with better error handling"
**Valider:** "Is my workflow valid?"
**Rollback:** "Go back to previous version"
**Expliquer:** "Explain this workflow"

Que souhaitez-vous faire?`
    };
  }

  /**
   * Construit prompt de modification
   */
  buildModificationPrompt(userRequest, context) {
    const workflowStr = JSON.stringify(context.currentWorkflow, null, 2);

    return `Modify the following n8n workflow according to the user request.

CURRENT WORKFLOW:
\`\`\`json
${workflowStr}
\`\`\`

USER REQUEST: "${userRequest}"

INSTRUCTIONS:
- Keep existing nodes that are not affected by the modification
- Maintain existing connections unless explicitly changed
- Add/remove/modify only what's requested
- Ensure all connections remain valid
- Return the complete modified workflow JSON

Generate the modified workflow:`;
  }

  /**
   * Formate la réponse workflow
   */
  formatWorkflowResponse(result, action) {
    const { workflow, validation, metadata } = result;

    let message = `✅ **Workflow ${action === 'create' ? 'créé' : action === 'modify' ? 'modifié' : 'régénéré'}!**\n\n`;
    message += `📊 **Détails:**\n`;
    message += `- Nodes: ${workflow.nodes?.length || 0}\n`;
    message += `- Connections: ${Object.keys(workflow.connections || {}).length}\n`;
    message += `- Durée: ${(metadata.duration / 1000).toFixed(1)}s\n`;
    message += `- Validation: ${validation.valid ? '✅ Valide' : '⚠️ Warnings'}\n\n`;

    if (validation.errors.length > 0) {
      message += `❌ **${validation.errors.length} erreur(s):**\n`;
      message += validation.errors.slice(0, 3).map(e => `- ${e}`).join('\n') + '\n\n';
    }

    if (validation.warnings.length > 0 && validation.warnings.length <= 3) {
      message += `⚠️ **Warnings:**\n`;
      message += validation.warnings.map(w => `- ${w}`).join('\n') + '\n\n';
    }

    if (validation.suggestions.length > 0) {
      message += `💡 **Suggestions:**\n`;
      message += validation.suggestions.slice(0, 2).map(s => `- ${s.message}`).join('\n');
    }

    return message;
  }

  /**
   * Génère explication workflow
   */
  generateWorkflowExplanation(workflow) {
    let explanation = `📖 **Explication du workflow "${workflow.name}":**\n\n`;

    explanation += `**Nodes (${workflow.nodes?.length || 0}):**\n`;
    workflow.nodes?.forEach((node, i) => {
      explanation += `${i + 1}. **${node.name}** (${node.type})\n`;
    });

    explanation += `\n**Flux d'exécution:**\n`;
    const flow = this.traceWorkflowFlow(workflow);
    explanation += flow.map((step, i) => `${i + 1}. ${step}`).join('\n');

    return explanation;
  }

  /**
   * Trace le flux d'exécution
   */
  traceWorkflowFlow(workflow) {
    const flow = [];
    const connections = workflow.connections || {};

    // Trouver node de départ (trigger)
    const startNode = workflow.nodes?.find(n =>
      n.type.includes('Trigger') || n.type.includes('trigger')
    );

    if (!startNode) {
      return ['Pas de trigger détecté'];
    }

    flow.push(`Start: ${startNode.name}`);

    // Suivre les connections
    let currentNode = startNode.name;
    const visited = new Set();

    while (currentNode && !visited.has(currentNode)) {
      visited.add(currentNode);

      const nextConnections = connections[currentNode];
      if (!nextConnections || !nextConnections.main || !nextConnections.main[0]) {
        break;
      }

      const nextNode = nextConnections.main[0][0]?.node;
      if (nextNode) {
        flow.push(`→ ${nextNode}`);
        currentNode = nextNode;
      } else {
        break;
      }
    }

    return flow;
  }

  /**
   * Récupère stats session
   */
  getSessionStats(sessionId) {
    return this.conversationManager.getSessionStats(sessionId);
  }

  /**
   * Récupère stats globales
   */
  getGlobalStats() {
    return {
      ...this.conversationManager.getGlobalStats(),
      generator: this.generator.getStats()
    };
  }

  /**
   * Cleanup
   */
  async close() {
    this.conversationManager.destroy();
    await this.generator.close();
  }
}

module.exports = ConversationalGenerator;