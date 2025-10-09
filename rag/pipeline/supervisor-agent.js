/**
 * Supervisor Agent - Validation stricte avec Claude
 * Vérifie que TOUS les nodes existent et relance si nécessaire
 */

const Anthropic = require('@anthropic-ai/sdk');
const costTracker = require('../../utils/cost-tracker');

class SupervisorAgent {
  constructor(retriever) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.retriever = retriever;
    this.model = 'claude-sonnet-4-20250514'; // Claude Sonnet 4.5 (Oct 2024)

    this.stats = {
      validations: 0,
      approved: 0,
      rejected: 0,
      averageRetries: 0
    };
  }

  /**
   * Supervise et valide le workflow généré
   * RELANCE si des nodes sont inventés
   */
  async supervise(workflow, userRequest, ragContext, attempt = 1, maxAttempts = 3, sessionId = null) {
    console.log(`\n🔍 Supervisor Agent (Claude) - Validation (tentative ${attempt}/${maxAttempts})...`);

    // Broadcast supervision start
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

    // 1. Extraire tous les nodes utilisés
    const usedNodes = this.extractUsedNodes(workflow);

    // 2. Construire le prompt de supervision
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

        global.broadcastSSE('supervision_progress', {
          agent: 'El Supervisor',
          icon: '🧠',
          message: 'Analyse stricte avec Claude Sonnet 4.5 - détection des champs invalides',
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

      let responseText = response.content[0].text;

      // Extraire le JSON si dans un bloc markdown
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        responseText = jsonMatch[1];
      }

      const analysis = JSON.parse(responseText);

      if (global.broadcastSSE) {
        global.broadcastSSE('supervision_progress', {
          agent: 'El Supervisor',
          icon: '🔍',
          message: 'Analyse de la cohérence du workflow',
          timestamp: Date.now()
        });
      }

      // Détecter les champs invalides
      const nodesWithInvalidFields = usedNodes.filter(n => n.hasInvalidFields && n.hasInvalidFields.length > 0);

      console.log(`  📊 Analyse Supervisor:`);
      console.log(`     - Nodes analysés: ${usedNodes.length}`);
      console.log(`     - Nodes valides: ${analysis.validNodes?.length || 0}`);
      console.log(`     - Nodes inventés: ${analysis.inventedNodes?.length || 0}`);
      console.log(`     - Champs invalides: ${nodesWithInvalidFields.length}`);
      console.log(`     - Approuvé: ${analysis.approved ? 'Oui ✅' : 'Non ❌'}`);

      if (analysis.inventedNodes && analysis.inventedNodes.length > 0) {
        console.warn(`  ⚠️ NODES INVENTÉS DÉTECTÉS:`);
        analysis.inventedNodes.forEach(node => {
          console.warn(`     - ${node.name} (${node.type})`);
          console.warn(`       → Raison: ${node.reason}`);
          console.warn(`       → Alternative: ${node.suggestedFix}`);
        });
      }

      if (nodesWithInvalidFields.length > 0) {
        console.warn(`  ⚠️ CHAMPS INVALIDES DÉTECTÉS:`);
        nodesWithInvalidFields.forEach(node => {
          console.warn(`     - ${node.name}:`);
          node.hasInvalidFields.forEach(field => {
            console.warn(`       → Champ "${field.field}" = ${JSON.stringify(field.value)}`);
            console.warn(`       → Raison: ${field.reason}`);
          });
        });
      }

      // 3. Décision
      if (analysis.approved) {
        this.stats.approved++;
        console.log(`  ✅ Workflow APPROUVÉ par le superviseur`);

        if (global.broadcastSSE) {
          global.broadcastSSE('supervision_complete', {
            agent: 'El Supervisor',
            icon: '✅',
            message: 'Workflow approuvé par tous les agents !',
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

        // 4. Relance si tentatives restantes
        if (attempt < maxAttempts) {
          console.warn(`  🔄 Workflow REJETÉ - Relance avec feedback...`);

          if (global.broadcastSSE) {
            global.broadcastSSE('supervision_retry', {
              agent: 'El Supervisor',
              icon: '🔄',
              message: `Workflow rejeté - Relance ${attempt + 1}/${maxAttempts}`,
              inventedNodesCount: analysis.inventedNodes?.length || 0,
              timestamp: Date.now()
            });
          }

          return {
            approved: false,
            needsRegeneration: true,
            feedback: analysis.feedback,
            inventedNodes: analysis.inventedNodes,
            suggestedFixes: analysis.suggestedFixes,
            attempts: attempt
          };
        } else {
          console.error(`  ❌ Workflow REJETÉ après ${maxAttempts} tentatives`);

          if (global.broadcastSSE) {
            global.broadcastSSE('supervision_error', {
              agent: 'El Supervisor',
              icon: '❌',
              message: `Échec après ${maxAttempts} tentatives`,
              inventedNodes: analysis.inventedNodes?.map(n => n.name).join(', '),
              timestamp: Date.now()
            });
          }

          return {
            approved: false,
            needsRegeneration: false,
            feedback: analysis.feedback,
            inventedNodes: analysis.inventedNodes,
            finalError: `Échec après ${maxAttempts} tentatives - Nodes inventés: ${analysis.inventedNodes.map(n => n.name).join(', ')}`,
            attempts: attempt
          };
        }
      }

    } catch (error) {
      console.error('❌ Erreur Supervisor Agent:', error.message);

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
   * Extrait tous les nodes utilisés dans le workflow
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
   * Détecte les champs invalides dans un node
   */
  detectInvalidFields(node) {
    const invalidFields = [];

    // Champs interdits au niveau root du node
    if (node.authentication) {
      invalidFields.push({
        field: 'authentication',
        value: node.authentication,
        reason: 'Le champ "authentication" n\'existe pas dans n8n. Utiliser "credentials" ou rien du tout.'
      });
    }

    // continueOnFail doit être dans parameters.options, pas au root
    if (node.continueOnFail !== undefined && !node.parameters?.options?.continueOnFail) {
      invalidFields.push({
        field: 'continueOnFail',
        value: node.continueOnFail,
        reason: 'Le champ "continueOnFail" doit être dans parameters.options, pas au niveau root.'
      });
    }

    return invalidFields;
  }

  /**
   * Construit le prompt de supervision pour Claude
   */
  buildSupervisionPrompt(workflow, userRequest, ragContext, usedNodes) {
    // Liste des nodes documentés disponibles
    const documentedNodes = new Set();
    const documentedNodeTypes = new Set(); // Types exacts (n8n-nodes-base.xxx)

    if (ragContext.documents && ragContext.documents.length > 0) {
      ragContext.documents.forEach(doc => {
        // Ajouter le nodeType (nom simple comme "OpenAI")
        if (doc.nodeType) {
          documentedNodes.add(doc.nodeType);
        }

        // Extraire les types exacts depuis le contenu
        if (doc.content) {
          // Chercher les patterns n8n-nodes-base.xxx et n8n-nodes-langchain.xxx
          const nodeTypeMatches = doc.content.match(/n8n-nodes-(?:base|langchain)\.[\w]+/g);
          if (nodeTypeMatches) {
            nodeTypeMatches.forEach(type => documentedNodeTypes.add(type));
          }
        }

        // Si c'est un workflow example, ajouter ses intégrations
        if (doc.workflowInfo && doc.workflowInfo.integrations) {
          doc.workflowInfo.integrations.forEach(integration => {
            documentedNodes.add(integration);
            // Mapper les intégrations courantes vers leurs types
            if (integration.startsWith('@n8n/')) {
              // @n8n/lmChatOpenAi → n8n-nodes-langchain.lmchatopenai
              const cleanName = integration.replace('@n8n/', '').toLowerCase();
              documentedNodeTypes.add(`n8n-nodes-langchain.${cleanName}`);
            }
          });
        }
      });
    }

    // Nodes suggérés par la RAG
    const ragSuggestedNodes = ragContext.detectedNodes || [];

    const documentedNodesList = Array.from(documentedNodes).join('\n  - ');
    const documentedTypesList = Array.from(documentedNodeTypes).join('\n  - ');
    const ragNodesList = ragSuggestedNodes.join('\n  - ');

    return `Tu es un superviseur expert n8n chargé de VALIDER strictement les workflows générés.

🎯 MISSION CRITIQUE:
Analyser le workflow généré et détecter si des NODES ONT ÉTÉ INVENTÉS (nodes qui n'existent pas dans n8n).

📋 DEMANDE UTILISATEUR:
"${userRequest}"

📚 NODES DOCUMENTÉS DISPONIBLES (noms):
  - ${documentedNodesList || 'Aucun'}

📦 TYPES DE NODES DOCUMENTÉS (types exacts n8n):
  - ${documentedTypesList || 'Aucun'}

🎯 NODES SUGGÉRÉS PAR RAG:
  - ${ragNodesList || 'Aucun'}

🤖 WORKFLOW GÉNÉRÉ:
${JSON.stringify(workflow, null, 2)}

📊 NODES UTILISÉS DANS LE WORKFLOW:
${usedNodes.map((n, i) => `  ${i + 1}. ${n.name} (${n.type})`).join('\n')}

🔍 TA TÂCHE:
1. **VÉRIFIER** chaque node du workflow
2. **COMPARER** avec les nodes documentés disponibles ci-dessus
3. **IDENTIFIER** les nodes qui sont INVENTÉS (pas dans la documentation)
4. **PROPOSER** des alternatives réelles pour chaque node inventé

⚠️ RÈGLES DE VALIDATION STRICTES:
- Un node est VALIDE si son type exact apparaît dans la liste "TYPES DE NODES DOCUMENTÉS" ci-dessus
- Un node est AUSSI VALIDE si son nom apparaît dans "NODES DOCUMENTÉS DISPONIBLES"
- Les patterns valides: n8n-nodes-base.*, n8n-nodes-langchain.*, @n8n/*
- Un node est INVENTÉ SEULEMENT si ni son type ni son nom ne sont documentés
- Les nodes standards (httpRequest, set, if, code, etc.) sont TOUJOURS valides
- Si un node est vraiment inventé, proposer "HTTP Request" comme alternative

🔍 VALIDATION DU FORMAT JSON N8N:
- ❌ Le champ "authentication" est INTERDIT (n'existe pas dans n8n)
- ❌ Le champ "continueOnFail" doit être dans "parameters.options", PAS au niveau root
- ✅ Si credentials nécessaires, utiliser le champ "credentials" avec un objet {credentialType: {id: "...", name: "..."}}
- ✅ Ou ne rien mettre et laisser l'utilisateur configurer manuellement

Exemple INVALIDE:
{
  "authentication": "oAuth2",  ❌ CE CHAMP N'EXISTE PAS
  "continueOnFail": true,  ❌ MAUVAIS EMPLACEMENT
  ...
}

Exemple VALIDE:
{
  "parameters": {
    "options": {
      "continueOnFail": true  ✅ BON EMPLACEMENT
    }
  },
  ...
}

📤 FORMAT DE RÉPONSE (JSON STRICT):
{
  "approved": true|false,
  "validNodes": [
    {
      "name": "Node Name",
      "type": "n8n-nodes-base.nodeType",
      "verified": true,
      "foundInDocs": true|false
    }
  ],
  "inventedNodes": [
    {
      "name": "Node Name",
      "type": "n8n-nodes-base.invented",
      "reason": "Ce node n'existe pas dans n8n",
      "suggestedFix": "Remplacer par HTTP Request (n8n-nodes-base.httpRequest) + API XXX"
    }
  ],
  "feedback": "Feedback détaillé pour améliorer le workflow",
  "suggestedFixes": [
    "Fix 1: Remplacer le node X par Y",
    "Fix 2: Utiliser HTTP Request pour l'intégration Z"
  ],
  "qualityScore": 0-100,
  "reasoning": "Explication du raisonnement de validation"
}

ANALYSE LE WORKFLOW (JSON UNIQUEMENT):`;
  }

  /**
   * Récupère les statistiques
   */
  getStats() {
    const avgRetries = this.stats.validations > 0
      ? ((this.stats.rejected / this.stats.validations) * 100).toFixed(1)
      : 0;

    return {
      ...this.stats,
      approvalRate: this.stats.validations > 0
        ? ((this.stats.approved / this.stats.validations) * 100).toFixed(1) + '%'
        : '0%',
      averageRetries: avgRetries + '%'
    };
  }
}

module.exports = SupervisorAgent;
