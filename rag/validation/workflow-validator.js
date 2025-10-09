/**
 * Advanced Workflow Validator
 * Validation exhaustive des workflows n8n avec détection d'erreurs avancées
 */

const { validateNodeParameters, getNodeSchema } = require('./node-schemas');
const WorkflowTester = require('../testing/workflow-tester');

class WorkflowValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.tester = new WorkflowTester();
    this.stats = {
      validated: 0,
      passed: 0,
      failed: 0
    };
  }

  /**
   * Valide un workflow de manière exhaustive
   * Retourne: { valid, errors, warnings, suggestions, metadata }
   */
  validate(workflow, options = {}) {
    this.errors = [];
    this.warnings = [];
    const suggestions = [];

    const {
      validateNodeParams = true,
      validateConnections = true,
      validateLogic = true,
      strictMode = false
    } = options;

    this.stats.validated++;

    try {
      // 1. Structure de base
      this._validateStructure(workflow);

      if (this.errors.length > 0 && strictMode) {
        this.stats.failed++;
        return this._buildResult(workflow, suggestions);
      }

      // 2. Validation nodes basique
      const nodeNames = this._validateNodesBasic(workflow);

      // 3. Validation paramètres nodes (avancée)
      if (validateNodeParams && workflow.nodes) {
        this._validateNodesParameters(workflow.nodes, suggestions);
      }

      // 4. Validation connections
      if (validateConnections) {
        this._validateConnections(workflow, nodeNames);
      }

      // 5. Validation logique workflow
      if (validateLogic) {
        this._validateWorkflowLogic(workflow, nodeNames, suggestions);
      }

      // 6. Suggestions d'amélioration
      this._generateSuggestions(workflow, suggestions);

      // Stats
      if (this.errors.length === 0) {
        this.stats.passed++;
      } else {
        this.stats.failed++;
      }

      return this._buildResult(workflow, suggestions);

    } catch (error) {
      this.errors.push(`Erreur validation: ${error.message}`);
      this.stats.failed++;
      return this._buildResult(workflow, suggestions);
    }
  }

  /**
   * 1. Valide structure de base
   */
  _validateStructure(workflow) {
    if (!workflow) {
      this.errors.push('Workflow null ou undefined');
      return;
    }

    if (!workflow.name || typeof workflow.name !== 'string') {
      this.errors.push('Nom du workflow manquant ou invalide');
    } else if (workflow.name.length < 3) {
      this.warnings.push('Nom du workflow très court (< 3 caractères)');
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      this.errors.push('Nodes manquants ou invalides');
      return;
    }

    if (workflow.nodes.length === 0) {
      this.errors.push('Workflow vide (aucun node)');
    } else if (workflow.nodes.length > 100) {
      this.warnings.push(`Workflow très large (${workflow.nodes.length} nodes) - performances possiblement dégradées`);
    }
  }

  /**
   * 2. Valide nodes basique
   */
  _validateNodesBasic(workflow) {
    const nodeNames = new Set();
    const nodeIds = new Set();

    if (!workflow.nodes) return nodeNames;

    workflow.nodes.forEach((node, i) => {
      // Type
      if (!node.type) {
        this.errors.push(`Node ${i}: type manquant`);
      } else {
        // Format type n8n
        if (!node.type.startsWith('n8n-nodes-') && !node.type.startsWith('@')) {
          this.warnings.push(`Node ${i} "${node.name}": type suspect "${node.type}" (devrait commencer par "n8n-nodes-")`);
        }
      }

      // Name
      if (!node.name) {
        this.errors.push(`Node ${i}: nom manquant`);
      } else {
        if (nodeNames.has(node.name)) {
          this.errors.push(`Node ${i}: nom "${node.name}" déjà utilisé (doit être unique)`);
        }
        nodeNames.add(node.name);

        // Longueur nom
        if (node.name.length < 2) {
          this.warnings.push(`Node "${node.name}": nom très court`);
        }
      }

      // ID
      if (!node.id) {
        this.warnings.push(`Node ${i} "${node.name}": ID manquant`);
      } else {
        if (nodeIds.has(node.id)) {
          this.errors.push(`Node "${node.name}": ID "${node.id}" déjà utilisé`);
        }
        nodeIds.add(node.id);
      }

      // Position
      if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
        this.errors.push(`Node ${i} "${node.name}": position invalide`);
      } else {
        const [x, y] = node.position;
        if (typeof x !== 'number' || typeof y !== 'number') {
          this.errors.push(`Node "${node.name}": coordonnées position invalides`);
        }
        if (x < 0 || y < 0) {
          this.warnings.push(`Node "${node.name}": position négative [${x}, ${y}]`);
        }
      }

      // Parameters
      if (!node.parameters) {
        this.warnings.push(`Node "${node.name}": aucun paramètre défini`);
      } else if (typeof node.parameters !== 'object' || Array.isArray(node.parameters)) {
        this.errors.push(`Node "${node.name}": parameters doit être un object`);
      }

      // TypeVersion
      if (!node.typeVersion) {
        this.warnings.push(`Node "${node.name}": typeVersion manquant`);
      } else if (typeof node.typeVersion !== 'number') {
        this.errors.push(`Node "${node.name}": typeVersion doit être un number`);
      }
    });

    return nodeNames;
  }

  /**
   * 3. Valide paramètres nodes (avancé avec schémas)
   */
  _validateNodesParameters(nodes, suggestions) {
    nodes.forEach(node => {
      const result = validateNodeParameters(node);

      // Ajouter erreurs et warnings
      if (result.errors) {
        this.errors.push(...result.errors);
      }
      if (result.warnings) {
        this.warnings.push(...result.warnings);
      }

      // Suggestions basées sur le schéma
      if (result.schema) {
        // Suggérer paramètres optionnels intéressants
        if (result.schema.optionalParams && result.schema.optionalParams.length > 0) {
          const unusedOptional = result.schema.optionalParams.filter(p =>
            !node.parameters || !(p in node.parameters)
          );
          if (unusedOptional.length > 0 && unusedOptional.length <= 3) {
            suggestions.push({
              node: node.name,
              type: 'optional_params',
              message: `Paramètres optionnels disponibles: ${unusedOptional.join(', ')}`
            });
          }
        }
      }
    });
  }

  /**
   * 4. Valide connections
   */
  _validateConnections(workflow, nodeNames) {
    if (!workflow.connections) {
      this.warnings.push('Connections manquantes (workflow sans liens)');
      return;
    }

    if (typeof workflow.connections !== 'object') {
      this.errors.push('Connections invalides (doit être un object)');
      return;
    }

    for (const [sourceName, connections] of Object.entries(workflow.connections)) {
      // Source existe
      if (!nodeNames.has(sourceName)) {
        this.errors.push(`Connection: node source "${sourceName}" inexistant`);
        continue;
      }

      if (typeof connections !== 'object') {
        this.errors.push(`Connection source "${sourceName}": structure invalide`);
        continue;
      }

      // Valider chaque output
      for (const [outputKey, targets] of Object.entries(connections)) {
        if (!Array.isArray(targets)) {
          this.errors.push(`Connection "${sourceName}".${outputKey}: doit être un array`);
          continue;
        }

        // Valider chaque target
        targets.forEach((targetGroup, i) => {
          if (!Array.isArray(targetGroup)) {
            this.errors.push(`Connection "${sourceName}".${outputKey}[${i}]: doit être un array`);
            return;
          }

          targetGroup.forEach((targetObj, j) => {
            if (!targetObj || typeof targetObj !== 'object') {
              this.errors.push(`Connection "${sourceName}".${outputKey}[${i}][${j}]: format invalide`);
              return;
            }

            // Node destination existe
            if (!targetObj.node) {
              this.errors.push(`Connection "${sourceName}".${outputKey}[${i}][${j}]: node destination manquant`);
            } else if (!nodeNames.has(targetObj.node)) {
              this.errors.push(`Connection "${sourceName}" → "${targetObj.node}": node destination inexistant`);
            }

            // Type et index
            if (targetObj.type && targetObj.type !== 'main') {
              this.warnings.push(`Connection "${sourceName}" → "${targetObj.node}": type "${targetObj.type}" non-standard`);
            }
            if (typeof targetObj.index !== 'number' || targetObj.index < 0) {
              this.warnings.push(`Connection "${sourceName}" → "${targetObj.node}": index invalide`);
            }
          });
        });
      }
    }
  }

  /**
   * 5. Valide logique workflow
   */
  _validateWorkflowLogic(workflow, nodeNames, suggestions) {
    if (!workflow.nodes || workflow.nodes.length === 0) return;

    // 5.1 Triggers
    const triggers = workflow.nodes.filter(n =>
      n.type && (
        n.type.includes('Trigger') ||
        n.type.includes('trigger') ||
        n.type === 'n8n-nodes-base.webhook'
      )
    );

    if (triggers.length === 0) {
      this.warnings.push('Aucun trigger détecté - workflow devra être lancé manuellement');
      suggestions.push({
        type: 'missing_trigger',
        message: 'Ajoutez un trigger (Webhook, Cron, etc.) pour automatiser l\'exécution'
      });
    } else if (triggers.length > 1) {
      this.warnings.push(`${triggers.length} triggers détectés - seul le premier sera utilisé`);
    }

    // 5.2 Nodes isolés
    if (workflow.connections && workflow.nodes.length > 1) {
      const connectedNodes = new Set();

      // Collecter tous les nodes connectés
      for (const [source, conns] of Object.entries(workflow.connections)) {
        connectedNodes.add(source);
        for (const targets of Object.values(conns)) {
          if (Array.isArray(targets)) {
            targets.forEach(targetGroup => {
              if (Array.isArray(targetGroup)) {
                targetGroup.forEach(t => {
                  if (t && t.node) {
                    connectedNodes.add(t.node);
                  }
                });
              }
            });
          }
        }
      }

      // Détecter nodes isolés
      const isolatedNodes = [];
      workflow.nodes.forEach(node => {
        if (!connectedNodes.has(node.name)) {
          isolatedNodes.push(node.name);
        }
      });

      if (isolatedNodes.length > 0) {
        isolatedNodes.forEach(name => {
          this.warnings.push(`Node "${name}" isolé (non connecté au workflow)`);
        });
      }
    }

    // 5.3 Cycles détection (simple)
    if (workflow.connections) {
      const cycles = this._detectCycles(workflow);
      if (cycles.length > 0) {
        this.warnings.push(`${cycles.length} cycle(s) potentiel(s) détecté(s) - risque de boucle infinie`);
        cycles.forEach(cycle => {
          this.warnings.push(`  Cycle: ${cycle.join(' → ')}`);
        });
      }
    }

    // 5.4 Dead ends (nodes sans output)
    if (workflow.connections) {
      const nodesWithoutOutput = workflow.nodes
        .filter(n => !workflow.connections[n.name] || Object.keys(workflow.connections[n.name]).length === 0)
        .filter(n => !n.type.includes('Trigger')); // Ignore triggers

      if (nodesWithoutOutput.length > 0 && nodesWithoutOutput.length < workflow.nodes.length) {
        nodesWithoutOutput.forEach(node => {
          // C'est OK si c'est le dernier node
          suggestions.push({
            node: node.name,
            type: 'no_output',
            message: 'Node sans connexions sortantes - est-ce voulu?'
          });
        });
      }
    }
  }

  /**
   * 6. Génère suggestions d'amélioration
   */
  _generateSuggestions(workflow, suggestions) {
    if (!workflow.nodes) return;

    // Suggérer error handling
    const hasErrorHandler = workflow.nodes.some(n =>
      n.type === 'n8n-nodes-base.errorTrigger'
    );

    if (!hasErrorHandler && workflow.nodes.length > 3) {
      suggestions.push({
        type: 'error_handling',
        message: 'Ajoutez un Error Trigger pour gérer les erreurs'
      });
    }

    // Suggérer Set node pour debug
    const hasSetNode = workflow.nodes.some(n =>
      n.type === 'n8n-nodes-base.set'
    );

    if (!hasSetNode && workflow.nodes.length > 4) {
      suggestions.push({
        type: 'data_transformation',
        message: 'Utilisez un node Set pour structurer/nettoyer les données'
      });
    }

    // Détecter patterns communs
    const hasWebhook = workflow.nodes.some(n => n.type === 'n8n-nodes-base.webhook');
    const hasHttp = workflow.nodes.some(n => n.type === 'n8n-nodes-base.httpRequest');

    if (hasWebhook && hasHttp) {
      suggestions.push({
        type: 'pattern',
        message: 'Pattern détecté: API Proxy - pensez à gérer les erreurs HTTP'
      });
    }
  }

  /**
   * Détecte les cycles dans le graphe
   */
  _detectCycles(workflow) {
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();

    const dfs = (node, path = []) => {
      if (recStack.has(node)) {
        // Cycle détecté
        const cycleStart = path.indexOf(node);
        cycles.push([...path.slice(cycleStart), node]);
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recStack.add(node);
      path.push(node);

      const connections = workflow.connections[node];
      if (connections) {
        for (const targets of Object.values(connections)) {
          if (Array.isArray(targets)) {
            targets.forEach(targetGroup => {
              if (Array.isArray(targetGroup)) {
                targetGroup.forEach(t => {
                  if (t && t.node) {
                    dfs(t.node, [...path]);
                  }
                });
              }
            });
          }
        }
      }

      recStack.delete(node);
    };

    // Démarrer DFS depuis chaque node
    workflow.nodes.forEach(node => {
      if (!visited.has(node.name)) {
        dfs(node.name);
      }
    });

    return cycles;
  }

  /**
   * Construit le résultat final
   */
  _buildResult(workflow, suggestions) {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      suggestions,
      metadata: {
        nodeCount: workflow?.nodes?.length || 0,
        connectionCount: workflow?.connections ? Object.keys(workflow.connections).length : 0,
        hasErrors: this.errors.length > 0,
        hasWarnings: this.warnings.length > 0,
        hasSuggestions: suggestions.length > 0
      }
    };
  }

  /**
   * Validation avec score de qualité
   * Utilise le WorkflowTester pour une validation complète avec notation
   */
  async validateWithScore(workflow) {
    const testResults = await this.tester.testWorkflow(workflow);

    this.stats.validated++;
    if (testResults.valid && testResults.score >= 70) {
      this.stats.passed++;
    } else {
      this.stats.failed++;
    }

    return {
      valid: testResults.valid,
      score: testResults.score,
      grade: testResults.grade,
      recommendation: testResults.recommendation,
      errors: testResults.errors,
      warnings: testResults.warnings,
      suggestions: testResults.suggestions,
      tests: testResults.tests,
      metadata: {
        nodeCount: workflow?.nodes?.length || 0,
        testsPassed: Object.values(testResults.tests).filter(t => t.passed).length,
        testsTotal: Object.keys(testResults.tests).length,
        deploymentReady: testResults.score >= 80
      }
    };
  }

  /**
   * Génère un rapport de test formaté
   */
  generateTestReport(results) {
    return this.tester.generateReport(results);
  }

  /**
   * Récupère les stats
   */
  getStats() {
    return {
      ...this.stats,
      passRate: this.stats.validated > 0
        ? ((this.stats.passed / this.stats.validated) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      validated: 0,
      passed: 0,
      failed: 0
    };
  }
}

module.exports = WorkflowValidator;