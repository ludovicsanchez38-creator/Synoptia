/**
 * Système de Tests Automatiques pour Workflows N8N
 * Validation pré-déploiement avec score de qualité
 */

class WorkflowTester {
  constructor() {
    this.knownNodes = this.loadKnownNodes();
    this.testResults = [];
  }

  /**
   * Liste des nodes n8n connus (builtin + langchain)
   */
  loadKnownNodes() {
    return new Set([
      // Core Nodes
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.httprequest',
      'n8n-nodes-base.code',
      'n8n-nodes-base.function',
      'n8n-nodes-base.if',
      'n8n-nodes-base.switch',
      'n8n-nodes-base.merge',
      'n8n-nodes-base.set',
      'n8n-nodes-base.split',
      'n8n-nodes-base.loop',
      'n8n-nodes-base.executeworkflow',
      'n8n-nodes-base.aggregate',
      'n8n-nodes-base.datetime',
      'n8n-nodes-base.filter',
      'n8n-nodes-base.sort',
      'n8n-nodes-base.wait',
      'n8n-nodes-base.sticky',
      'n8n-nodes-base.errortrigger',

      // Communication
      'n8n-nodes-base.gmail',
      'n8n-nodes-base.slack',
      'n8n-nodes-base.discord',
      'n8n-nodes-base.telegram',
      'n8n-nodes-base.twilio',
      'n8n-nodes-base.sendgrid',
      'n8n-nodes-base.microsoftteams',

      // Productivity
      'n8n-nodes-base.googlesheets',
      'n8n-nodes-base.googledrive',
      'n8n-nodes-base.notion',
      'n8n-nodes-base.airtable',
      'n8n-nodes-base.dropbox',

      // Databases
      'n8n-nodes-base.postgres',
      'n8n-nodes-base.mysql',
      'n8n-nodes-base.mongodb',
      'n8n-nodes-base.redis',
      'n8n-nodes-base.sqlite',

      // CRM & Sales
      'n8n-nodes-base.hubspot',
      'n8n-nodes-base.salesforce',
      'n8n-nodes-base.pipedrive',
      'n8n-nodes-base.stripe',

      // Project Management
      'n8n-nodes-base.trello',
      'n8n-nodes-base.asana',
      'n8n-nodes-base.jira',
      'n8n-nodes-base.github',
      'n8n-nodes-base.gitlab',

      // AI & LangChain
      'n8n-nodes-langchain.agent',
      'n8n-nodes-langchain.chainllm',
      'n8n-nodes-langchain.openai',
      'n8n-nodes-langchain.chattrigger',
      'n8n-nodes-base.openai',

      // Triggers
      'n8n-nodes-base.cron',
      'n8n-nodes-base.manualtrigger',
      'n8n-nodes-base.emailtrigger'
    ]);
  }

  /**
   * Test complet d'un workflow
   */
  async testWorkflow(workflow, options = {}) {
    const results = {
      valid: true,
      score: 0,
      maxScore: 100,
      tests: {},
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Test 1: Validation JSON (20 points)
      results.tests.jsonValid = this.testJSONValidity(workflow);
      if (results.tests.jsonValid.passed) {
        results.score += 20;
      } else {
        results.valid = false;
        results.errors.push(...results.tests.jsonValid.errors);
      }

      // Test 2: Structure du workflow (15 points)
      results.tests.structure = this.testStructure(workflow);
      if (results.tests.structure.passed) {
        results.score += 15;
      } else {
        results.errors.push(...results.tests.structure.errors);
      }

      // Test 3: Nodes valides (20 points)
      results.tests.nodes = this.testNodes(workflow);
      if (results.tests.nodes.passed) {
        results.score += 20;
      } else {
        results.errors.push(...results.tests.nodes.errors);
      }

      // Test 4: Connexions (20 points)
      results.tests.connections = this.testConnections(workflow);
      if (results.tests.connections.passed) {
        results.score += 20;
      } else {
        results.errors.push(...results.tests.connections.errors);
      }

      // Test 5: Trigger présent (10 points)
      results.tests.trigger = this.testTrigger(workflow);
      if (results.tests.trigger.passed) {
        results.score += 10;
      } else {
        results.warnings.push(...results.tests.trigger.warnings);
      }

      // Test 6: Gestion d'erreurs (10 points)
      results.tests.errorHandling = this.testErrorHandling(workflow);
      if (results.tests.errorHandling.passed) {
        results.score += 10;
      }

      // Test 7: Best practices (5 points)
      results.tests.bestPractices = this.testBestPractices(workflow);
      results.score += results.tests.bestPractices.score;
      results.suggestions.push(...results.tests.bestPractices.suggestions);

      // Calcul du grade
      results.grade = this.calculateGrade(results.score);
      results.recommendation = this.getRecommendation(results.score);

    } catch (error) {
      results.valid = false;
      results.errors.push(`Fatal error: ${error.message}`);
      results.score = 0;
    }

    return results;
  }

  /**
   * Test 1: Validation JSON
   */
  testJSONValidity(workflow) {
    const result = { passed: true, errors: [] };

    try {
      // Vérifier structure de base
      if (typeof workflow !== 'object' || workflow === null) {
        throw new Error('Workflow must be an object');
      }

      // Vérifier présence des champs requis
      const requiredFields = ['name', 'nodes'];
      for (const field of requiredFields) {
        if (!workflow[field]) {
          result.passed = false;
          result.errors.push(`Missing required field: ${field}`);
        }
      }

      // Vérifier que nodes est un array
      if (!Array.isArray(workflow.nodes)) {
        result.passed = false;
        result.errors.push('workflow.nodes must be an array');
      }

    } catch (error) {
      result.passed = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Test 2: Structure du workflow
   */
  testStructure(workflow) {
    const result = { passed: true, errors: [] };

    // Vérifier qu'il y a au moins 1 node
    if (!workflow.nodes || workflow.nodes.length === 0) {
      result.passed = false;
      result.errors.push('Workflow must have at least one node');
    }

    // Vérifier structure de chaque node
    if (workflow.nodes) {
      workflow.nodes.forEach((node, index) => {
        if (!node.type) {
          result.passed = false;
          result.errors.push(`Node ${index} missing 'type' field`);
        }
        if (!node.name) {
          result.passed = false;
          result.errors.push(`Node ${index} missing 'name' field`);
        }
        if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
          result.passed = false;
          result.errors.push(`Node ${index} has invalid 'position' field`);
        }
      });
    }

    return result;
  }

  /**
   * Test 3: Nodes valides
   */
  testNodes(workflow) {
    const result = { passed: true, errors: [], warnings: [] };

    if (!workflow.nodes) return result;

    workflow.nodes.forEach(node => {
      // Vérifier si le node existe
      if (!this.knownNodes.has(node.type)) {
        result.warnings.push(`Unknown node type: ${node.type} (may be a community node)`);
      }

      // Vérifier parameters
      if (node.type.includes('trigger') && !node.parameters) {
        result.errors.push(`Trigger node '${node.name}' missing parameters`);
      }
    });

    if (result.errors.length > 0) {
      result.passed = false;
    }

    return result;
  }

  /**
   * Test 4: Connexions entre nodes
   */
  testConnections(workflow) {
    const result = { passed: true, errors: [] };

    if (!workflow.nodes || workflow.nodes.length <= 1) {
      return result; // Pas besoin de connexions si 0 ou 1 node
    }

    const nodeNames = new Set(workflow.nodes.map(n => n.name));

    // Vérifier que connections existe
    if (!workflow.connections) {
      result.passed = false;
      result.errors.push('Workflow with multiple nodes must have connections');
      return result;
    }

    // Vérifier chaque connexion
    Object.keys(workflow.connections).forEach(sourceName => {
      // Vérifier que le source node existe
      if (!nodeNames.has(sourceName)) {
        result.passed = false;
        result.errors.push(`Connection references non-existent node: ${sourceName}`);
        return;
      }

      const connections = workflow.connections[sourceName];
      if (!connections || !connections.main) return;

      connections.main.forEach((outputConnections, outputIndex) => {
        if (!Array.isArray(outputConnections)) return;

        outputConnections.forEach(connection => {
          if (!connection.node) {
            result.passed = false;
            result.errors.push(`Invalid connection from ${sourceName}`);
            return;
          }

          // Vérifier que le target node existe
          if (!nodeNames.has(connection.node)) {
            result.passed = false;
            result.errors.push(`Connection references non-existent target node: ${connection.node}`);
          }
        });
      });
    });

    // Vérifier qu'il n'y a pas de nodes isolés (sauf trigger)
    const connectedNodes = new Set();
    Object.keys(workflow.connections).forEach(source => {
      connectedNodes.add(source);
      const connections = workflow.connections[source];
      if (connections && connections.main) {
        connections.main.forEach(outputConnections => {
          if (Array.isArray(outputConnections)) {
            outputConnections.forEach(conn => {
              if (conn.node) connectedNodes.add(conn.node);
            });
          }
        });
      }
    });

    workflow.nodes.forEach(node => {
      const isTrigger = node.type.toLowerCase().includes('trigger');
      if (!isTrigger && !connectedNodes.has(node.name)) {
        result.warnings = result.warnings || [];
        result.warnings.push(`Node '${node.name}' appears to be isolated (not connected)`);
      }
    });

    return result;
  }

  /**
   * Test 5: Trigger présent
   */
  testTrigger(workflow) {
    const result = { passed: false, warnings: [] };

    if (!workflow.nodes) return result;

    // Liste des patterns qui identifient un trigger
    const triggerPatterns = [
      'trigger',
      'webhook',
      'cron',
      'schedule',
      'form',
      'chat'
    ];

    const hasTrigger = workflow.nodes.some(node => {
      const typeLC = node.type.toLowerCase();
      return triggerPatterns.some(pattern => typeLC.includes(pattern));
    });

    if (hasTrigger) {
      result.passed = true;
    } else {
      result.warnings.push('Workflow has no trigger node. It can only be executed manually or called from another workflow.');
    }

    return result;
  }

  /**
   * Test 6: Gestion d'erreurs
   */
  testErrorHandling(workflow) {
    const result = { passed: false, score: 0 };

    if (!workflow.nodes) return result;

    const hasErrorHandling = workflow.nodes.some(node =>
      node.type === 'n8n-nodes-base.errortrigger' ||
      node.continueOnFail === true ||
      (node.parameters && node.parameters.continueOnFail)
    );

    if (hasErrorHandling) {
      result.passed = true;
      result.score = 10;
    }

    return result;
  }

  /**
   * Test 7: Best practices
   */
  testBestPractices(workflow) {
    const result = { score: 0, suggestions: [] };

    if (!workflow.nodes) return result;

    // Noms descriptifs
    const hasDescriptiveNames = workflow.nodes.every(node =>
      node.name && node.name.length > 3
    );
    if (hasDescriptiveNames) {
      result.score += 2;
    } else {
      result.suggestions.push('Use descriptive names for all nodes');
    }

    // Notes/documentation
    const hasNotes = workflow.nodes.some(node => node.notes || node.description);
    if (hasNotes) {
      result.score += 1;
    } else {
      result.suggestions.push('Add notes to document complex nodes');
    }

    // Pas trop de nodes (maintenabilité)
    if (workflow.nodes.length <= 15) {
      result.score += 1;
    } else if (workflow.nodes.length > 30) {
      result.suggestions.push('Consider splitting into multiple workflows for better maintainability');
    }

    // Version du workflow
    if (workflow.version || workflow.meta) {
      result.score += 1;
    }

    return result;
  }

  /**
   * Calcule le grade basé sur le score
   */
  calculateGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Recommandation basée sur le score
   */
  getRecommendation(score) {
    if (score >= 90) {
      return 'Excellent workflow! Ready for production deployment.';
    } else if (score >= 80) {
      return 'Good workflow. Consider addressing minor issues before deployment.';
    } else if (score >= 70) {
      return 'Acceptable workflow. Fix errors and warnings before deploying to production.';
    } else if (score >= 60) {
      return 'Needs improvement. Address all errors before deployment.';
    } else {
      return 'Major issues detected. Do NOT deploy. Fix critical errors first.';
    }
  }

  /**
   * Génère un rapport formaté
   */
  generateReport(results) {
    const lines = [];

    lines.push('='.repeat(60));
    lines.push('WORKFLOW TEST REPORT');
    lines.push('='.repeat(60));
    lines.push('');

    // Score
    lines.push(`📊 SCORE: ${results.score}/${results.maxScore} (${results.grade})`);
    lines.push(`✅ VALID: ${results.valid ? 'Yes' : 'No'}`);
    lines.push('');

    // Résultats des tests
    lines.push('TEST RESULTS:');
    lines.push('-'.repeat(60));
    Object.keys(results.tests).forEach(testName => {
      const test = results.tests[testName];
      const status = test.passed ? '✅' : '❌';
      lines.push(`${status} ${testName}: ${test.passed ? 'PASSED' : 'FAILED'}`);
    });
    lines.push('');

    // Erreurs
    if (results.errors.length > 0) {
      lines.push('🚨 ERRORS:');
      results.errors.forEach(err => lines.push(`   - ${err}`));
      lines.push('');
    }

    // Warnings
    if (results.warnings.length > 0) {
      lines.push('⚠️  WARNINGS:');
      results.warnings.forEach(warn => lines.push(`   - ${warn}`));
      lines.push('');
    }

    // Suggestions
    if (results.suggestions.length > 0) {
      lines.push('💡 SUGGESTIONS:');
      results.suggestions.forEach(sug => lines.push(`   - ${sug}`));
      lines.push('');
    }

    // Recommandation
    lines.push('RECOMMENDATION:');
    lines.push(results.recommendation);
    lines.push('');
    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}

module.exports = WorkflowTester;
