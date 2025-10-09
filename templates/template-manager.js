/**
 * Template Manager
 * Manage, search, and instantiate workflow templates
 */

const { TEMPLATES, TEMPLATE_CATEGORIES } = require('./template-library');

class TemplateManager {
  constructor() {
    this.templates = TEMPLATES;
    this.categories = TEMPLATE_CATEGORIES;
  }

  /**
   * Get all templates
   */
  getAllTemplates() {
    return Object.values(this.templates);
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId) {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template "${templateId}" not found`);
    }
    return template;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category) {
    return Object.values(this.templates).filter(t => t.category === category);
  }

  /**
   * Search templates by query
   */
  searchTemplates(query, options = {}) {
    const {
      category = null,
      difficulty = null,
      tags = [],
      maxSetupTime = null
    } = options;

    let results = Object.values(this.templates);

    // Filter by query (name, description, tags)
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(t => {
        return (
          t.name.toLowerCase().includes(lowerQuery) ||
          t.description.toLowerCase().includes(lowerQuery) ||
          t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      });
    }

    // Filter by category
    if (category) {
      results = results.filter(t => t.category === category);
    }

    // Filter by difficulty
    if (difficulty) {
      results = results.filter(t => t.difficulty === difficulty);
    }

    // Filter by tags
    if (tags.length > 0) {
      results = results.filter(t => {
        return tags.some(tag => t.tags.includes(tag));
      });
    }

    // Filter by setup time
    if (maxSetupTime) {
      results = results.filter(t => {
        const minutes = this.parseSetupTime(t.estimatedSetupTime);
        return minutes <= maxSetupTime;
      });
    }

    return results;
  }

  /**
   * Get templates by difficulty
   */
  getTemplatesByDifficulty(difficulty) {
    return Object.values(this.templates).filter(t => t.difficulty === difficulty);
  }

  /**
   * Get templates by tag
   */
  getTemplatesByTag(tag) {
    return Object.values(this.templates).filter(t => t.tags.includes(tag));
  }

  /**
   * Get templates that require specific credentials
   */
  getTemplatesByCredentials(credentialType) {
    return Object.values(this.templates).filter(t => {
      return t.requiredCredentials.includes(credentialType);
    });
  }

  /**
   * List all categories
   */
  listCategories() {
    return Object.keys(this.categories).map(key => ({
      id: this.categories[key],
      name: this.formatCategoryName(this.categories[key]),
      count: this.getTemplatesByCategory(this.categories[key]).length
    }));
  }

  /**
   * List all tags
   */
  listTags() {
    const tagsSet = new Set();
    Object.values(this.templates).forEach(t => {
      t.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }

  /**
   * List all required credentials
   */
  listCredentials() {
    const credentialsSet = new Set();
    Object.values(this.templates).forEach(t => {
      t.requiredCredentials.forEach(cred => credentialsSet.add(cred));
    });
    return Array.from(credentialsSet).sort();
  }

  /**
   * Get template statistics
   */
  getStats() {
    const templates = Object.values(this.templates);

    return {
      total: templates.length,
      byCategory: this.listCategories(),
      byDifficulty: {
        beginner: templates.filter(t => t.difficulty === 'beginner').length,
        intermediate: templates.filter(t => t.difficulty === 'intermediate').length,
        advanced: templates.filter(t => t.difficulty === 'advanced').length
      },
      totalTags: this.listTags().length,
      totalCredentialTypes: this.listCredentials().length,
      averageSetupTime: this.calculateAverageSetupTime(templates)
    };
  }

  /**
   * Instantiate template with custom values
   */
  instantiateTemplate(templateId, options = {}) {
    const template = this.getTemplate(templateId);
    const workflow = JSON.parse(JSON.stringify(template.workflow)); // Deep clone

    const {
      workflowName = null,
      credentials = {},
      parameters = {},
      position = null
    } = options;

    // Update workflow name
    if (workflowName) {
      workflow.name = workflowName;
    }

    // Update credentials
    if (Object.keys(credentials).length > 0) {
      workflow.nodes.forEach(node => {
        if (node.credentials) {
          Object.keys(node.credentials).forEach(credType => {
            if (credentials[credType]) {
              node.credentials[credType] = credentials[credType];
            }
          });
        }
      });
    }

    // Update parameters
    if (Object.keys(parameters).length > 0) {
      workflow.nodes.forEach((node, index) => {
        if (parameters[node.name]) {
          Object.assign(node.parameters, parameters[node.name]);
        }
      });
    }

    // Adjust positions
    if (position) {
      const offsetX = position[0] || 0;
      const offsetY = position[1] || 0;

      workflow.nodes.forEach(node => {
        if (node.position) {
          node.position[0] += offsetX;
          node.position[1] += offsetY;
        }
      });
    }

    return {
      workflow,
      metadata: {
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        difficulty: template.difficulty,
        requiredCredentials: template.requiredCredentials,
        customized: Object.keys(credentials).length > 0 || Object.keys(parameters).length > 0
      }
    };
  }

  /**
   * Validate template workflow
   */
  validateTemplate(templateId) {
    const template = this.getTemplate(templateId);
    const workflow = template.workflow;
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!workflow.name) {
      errors.push('Workflow name is missing');
    }
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow has no nodes');
    }
    if (!workflow.connections) {
      warnings.push('Workflow has no connections');
    }

    // Check nodes
    workflow.nodes.forEach((node, index) => {
      if (!node.name) {
        errors.push(`Node ${index} has no name`);
      }
      if (!node.type) {
        errors.push(`Node ${index} (${node.name}) has no type`);
      }
      if (!node.position || node.position.length !== 2) {
        errors.push(`Node ${index} (${node.name}) has invalid position`);
      }
      if (!node.parameters) {
        warnings.push(`Node ${index} (${node.name}) has no parameters`);
      }
    });

    // Check connections
    if (workflow.connections) {
      Object.keys(workflow.connections).forEach(sourceName => {
        const sourceNode = workflow.nodes.find(n => n.name === sourceName);
        if (!sourceNode) {
          errors.push(`Connection source node "${sourceName}" not found`);
        }

        const connections = workflow.connections[sourceName];
        if (connections.main) {
          connections.main.forEach((outputConnections, outputIndex) => {
            outputConnections.forEach(conn => {
              const targetNode = workflow.nodes.find(n => n.name === conn.node);
              if (!targetNode) {
                errors.push(`Connection target node "${conn.node}" not found`);
              }
            });
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      templateId: template.id,
      templateName: template.name
    };
  }

  /**
   * Get recommended templates based on user needs
   */
  recommendTemplates(userNeeds) {
    const {
      keywords = [],
      category = null,
      maxDifficulty = 'advanced',
      requiredCredentials = []
    } = userNeeds;

    let scores = Object.values(this.templates).map(template => {
      let score = 0;

      // Match keywords
      keywords.forEach(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        if (template.name.toLowerCase().includes(lowerKeyword)) score += 10;
        if (template.description.toLowerCase().includes(lowerKeyword)) score += 5;
        if (template.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))) score += 7;
      });

      // Match category
      if (category && template.category === category) {
        score += 15;
      }

      // Match difficulty
      const difficultyLevels = { beginner: 1, intermediate: 2, advanced: 3 };
      if (difficultyLevels[template.difficulty] <= difficultyLevels[maxDifficulty]) {
        score += 5;
      }

      // Match credentials
      if (requiredCredentials.length > 0) {
        const hasAllCredentials = template.requiredCredentials.every(cred =>
          requiredCredentials.includes(cred)
        );
        if (hasAllCredentials) {
          score += 20;
        }
      }

      return { template, score };
    });

    // Filter and sort by score
    return scores
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => ({
        ...item.template,
        relevanceScore: item.score
      }));
  }

  /**
   * Export template as JSON
   */
  exportTemplate(templateId, format = 'n8n') {
    const template = this.getTemplate(templateId);

    if (format === 'n8n') {
      return JSON.stringify(template.workflow, null, 2);
    } else if (format === 'full') {
      return JSON.stringify(template, null, 2);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Helper: Parse setup time to minutes
   */
  parseSetupTime(timeString) {
    const match = timeString.match(/(\d+)\s*(minute|hour)/i);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    return unit.startsWith('hour') ? value * 60 : value;
  }

  /**
   * Helper: Calculate average setup time
   */
  calculateAverageSetupTime(templates) {
    const totalMinutes = templates.reduce((sum, t) => {
      return sum + this.parseSetupTime(t.estimatedSetupTime);
    }, 0);
    return Math.round(totalMinutes / templates.length);
  }

  /**
   * Helper: Format category name
   */
  formatCategoryName(categoryId) {
    return categoryId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

module.exports = TemplateManager;