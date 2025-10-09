/**
 * Agent Adapters
 * Provides unified interfaces for different agents
 */

class AgentAdapter {
  constructor(agent, type) {
    this.agent = agent;
    this.type = type;
  }

  async execute(request) {
    throw new Error('Must implement execute()');
  }

  getCapabilities() {
    throw new Error('Must implement getCapabilities()');
  }
}

/**
 * SAV Agent Adapter
 */
class SAVAgentAdapter extends AgentAdapter {
  constructor(agent) {
    super(agent, 'sav');
  }

  async execute(request) {
    const { message, context = {} } = request;

    try {
      // Call SAV agent
      const response = await this.agent.processMessage(message, {
        sessionId: context.sessionId,
        userId: context.userId,
        metadata: context.metadata
      });

      return {
        response: response.message || response.response || response,
        confidence: response.confidence || 0.7,
        metadata: {
          ragUsed: response.ragUsed || false,
          documentsUsed: response.documentsUsed || 0,
          fallback: response.fallback || false
        }
      };

    } catch (error) {
      return {
        response: null,
        confidence: 0,
        error: error.message,
        metadata: { error: true }
      };
    }
  }

  getCapabilities() {
    return {
      type: 'support',
      canAnswer: ['questions', 'troubleshooting', 'explanations', 'documentation'],
      cannotDo: ['create_workflows', 'modify_code'],
      strengths: ['n8n_knowledge', 'problem_solving', 'documentation_search'],
      limitations: ['cannot_execute_workflows', 'no_workflow_generation']
    };
  }
}

/**
 * Workflow Builder Agent Adapter
 */
class WorkflowBuilderAdapter extends AgentAdapter {
  constructor(agent) {
    super(agent, 'workflowBuilder');
  }

  async execute(request) {
    const { message, context = {} } = request;

    try {
      // Call Workflow Builder
      const response = await this.agent.generateWorkflow(message, {
        sessionId: context.sessionId,
        autoFix: context.autoFix !== false,
        maxRetries: context.maxRetries || 2
      });

      return {
        response: this.formatWorkflowResponse(response),
        confidence: response.validation?.valid ? 0.85 : 0.6,
        metadata: {
          workflow: response.workflow,
          validation: response.validation,
          ragUsed: response.ragUsed || false,
          documentsUsed: response.documentsRetrieved || 0
        }
      };

    } catch (error) {
      return {
        response: null,
        confidence: 0,
        error: error.message,
        metadata: { error: true }
      };
    }
  }

  formatWorkflowResponse(response) {
    if (!response.workflow) {
      return "I couldn't generate a workflow. Please provide more details about what you want to automate.";
    }

    let message = `✅ I've created a workflow: **${response.workflow.name}**\n\n`;

    if (response.workflow.nodes) {
      message += `📦 **Nodes:** ${response.workflow.nodes.length}\n`;
      const nodeTypes = [...new Set(response.workflow.nodes.map(n => n.type.split('.').pop()))];
      message += `🔧 **Types:** ${nodeTypes.slice(0, 5).join(', ')}${nodeTypes.length > 5 ? '...' : ''}\n\n`;
    }

    if (response.validation) {
      if (response.validation.valid) {
        message += "✅ Validation: Passed\n";
      } else {
        message += "⚠️ Validation: Some issues found\n";
        if (response.validation.errors?.length > 0) {
          message += `  Errors: ${response.validation.errors.length}\n`;
        }
      }
    }

    message += "\nThe workflow is ready to import into n8n!";

    return message;
  }

  getCapabilities() {
    return {
      type: 'workflow_generation',
      canDo: ['create_workflows', 'modify_workflows', 'validate_workflows'],
      cannotDo: ['answer_questions', 'troubleshoot_issues'],
      strengths: ['workflow_creation', 'node_configuration', 'automation_design'],
      limitations: ['requires_clear_requirements', 'limited_troubleshooting']
    };
  }
}

/**
 * Mock Agent for Testing
 */
class MockAgent {
  constructor(name, config = {}) {
    this.name = name;
    this.config = {
      responseTime: config.responseTime || 100,
      successRate: config.successRate || 0.9,
      confidence: config.confidence || 0.8,
      ...config
    };
  }

  async processMessage(message, options = {}) {
    await this.delay(this.config.responseTime);

    if (Math.random() > this.config.successRate) {
      throw new Error(`${this.name} failed to process message`);
    }

    return {
      response: `${this.name} processed: "${message}"`,
      confidence: this.config.confidence,
      ragUsed: Math.random() > 0.5,
      documentsUsed: Math.floor(Math.random() * 10)
    };
  }

  async generateWorkflow(message, options = {}) {
    await this.delay(this.config.responseTime);

    if (Math.random() > this.config.successRate) {
      throw new Error(`${this.name} failed to generate workflow`);
    }

    return {
      workflow: {
        name: `Generated Workflow for: ${message.substring(0, 30)}`,
        nodes: [
          { name: 'Start', type: 'n8n-nodes-base.start' },
          { name: 'Node1', type: 'n8n-nodes-base.httpRequest' },
          { name: 'Node2', type: 'n8n-nodes-base.set' }
        ],
        connections: {}
      },
      validation: {
        valid: Math.random() > 0.2,
        errors: [],
        warnings: []
      },
      confidence: this.config.confidence,
      ragUsed: true,
      documentsRetrieved: 5
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Adapter Factory
 */
class AdapterFactory {
  static create(agent, type) {
    switch (type) {
      case 'sav':
        return new SAVAgentAdapter(agent);
      case 'workflowBuilder':
        return new WorkflowBuilderAdapter(agent);
      case 'mock':
        return agent; // MockAgent doesn't need adapter
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }

  static createMockAgent(name, config) {
    return new MockAgent(name, config);
  }
}

module.exports = {
  AgentAdapter,
  SAVAgentAdapter,
  WorkflowBuilderAdapter,
  MockAgent,
  AdapterFactory
};