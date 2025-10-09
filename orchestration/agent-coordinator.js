/**
 * Multi-Agent Coordinator
 * Orchestrates SAV Agent and Workflow Builder Agent
 * Handles routing, handoffs, and escalation
 */

const EventEmitter = require('events');

class AgentCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.agents = {
      sav: options.savAgent || null,
      workflowBuilder: options.workflowBuilder || null
    };

    this.config = {
      maxHandoffs: options.maxHandoffs || 3,
      escalationThreshold: options.escalationThreshold || 0.3,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      timeoutMs: options.timeoutMs || 30000
    };

    this.sessions = new Map(); // Active coordination sessions
    this.metrics = {
      totalRequests: 0,
      successfulRouting: 0,
      handoffs: 0,
      escalations: 0,
      averageConfidence: 0
    };
  }

  /**
   * Register agents
   */
  registerAgent(type, agent) {
    if (!['sav', 'workflowBuilder'].includes(type)) {
      throw new Error(`Invalid agent type: ${type}`);
    }
    this.agents[type] = agent;
    this.emit('agent:registered', { type, agent });
  }

  /**
   * Main coordination entry point
   */
  async coordinate(request) {
    this.metrics.totalRequests++;

    const session = this.createSession(request);

    try {
      // 1. Analyze request and determine initial agent
      const routing = await this.analyzeRequest(request);
      session.routing = routing;

      this.emit('coordination:start', { session, routing });

      // 2. Execute with primary agent
      let result = await this.executeWithAgent(
        routing.primaryAgent,
        request,
        session
      );

      // 3. Check if handoff needed
      if (this.shouldHandoff(result, session)) {
        result = await this.handleHandoff(result, session);
      }

      // 4. Check if escalation needed
      if (this.shouldEscalate(result, session)) {
        result = await this.handleEscalation(result, session);
      }

      // 5. Update metrics and return
      this.updateMetrics(result, session);
      this.emit('coordination:complete', { session, result });

      return {
        success: true,
        result: result.response,
        metadata: {
          sessionId: session.id,
          primaryAgent: routing.primaryAgent,
          handoffCount: session.handoffs.length,
          escalated: session.escalated,
          confidence: result.confidence,
          duration: Date.now() - session.startTime
        }
      };

    } catch (error) {
      this.emit('coordination:error', { session, error });
      throw error;
    } finally {
      this.cleanupSession(session.id);
    }
  }

  /**
   * Analyze request to determine routing
   */
  async analyzeRequest(request) {
    const { message, context = {} } = request;

    // Intent classification
    const intent = this.classifyIntent(message, context);

    // Determine primary agent based on intent
    let primaryAgent = 'sav'; // Default
    let confidence = 0.5;

    // Keywords for workflow builder
    const workflowKeywords = [
      'create workflow', 'build workflow', 'generate workflow',
      'make workflow', 'workflow for', 'automate',
      'n8n workflow', 'automation', 'integrate'
    ];

    // Keywords for SAV
    const savKeywords = [
      'help', 'support', 'issue', 'problem', 'error',
      'not working', 'how to', 'question', 'explain'
    ];

    const lowerMessage = message.toLowerCase();

    // Check workflow keywords
    const workflowMatches = workflowKeywords.filter(kw =>
      lowerMessage.includes(kw)
    ).length;

    // Check SAV keywords
    const savMatches = savKeywords.filter(kw =>
      lowerMessage.includes(kw)
    ).length;

    if (workflowMatches > savMatches) {
      primaryAgent = 'workflowBuilder';
      confidence = Math.min(0.95, 0.6 + (workflowMatches * 0.1));
    } else if (savMatches > 0) {
      primaryAgent = 'sav';
      confidence = Math.min(0.95, 0.6 + (savMatches * 0.1));
    }

    // Context-based adjustments
    if (context.hasWorkflow) {
      // User already has a workflow, might be SAV question or modification
      if (lowerMessage.includes('modify') || lowerMessage.includes('change') ||
          lowerMessage.includes('update') || lowerMessage.includes('add')) {
        primaryAgent = 'workflowBuilder';
        confidence = Math.max(confidence, 0.8);
      } else {
        primaryAgent = 'sav';
        confidence = Math.max(confidence, 0.7);
      }
    }

    return {
      primaryAgent,
      secondaryAgent: primaryAgent === 'sav' ? 'workflowBuilder' : 'sav',
      confidence,
      intent,
      reasoning: this.explainRouting(primaryAgent, confidence, workflowMatches, savMatches)
    };
  }

  /**
   * Classify intent
   */
  classifyIntent(message, context) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.match(/create|build|make|generate/)) return 'create';
    if (lowerMessage.match(/modify|change|update|edit/)) return 'modify';
    if (lowerMessage.match(/help|support|question|how/)) return 'support';
    if (lowerMessage.match(/error|issue|problem|not working/)) return 'troubleshoot';
    if (lowerMessage.match(/explain|what is|tell me/)) return 'explain';

    return 'general';
  }

  /**
   * Execute request with specific agent
   */
  async executeWithAgent(agentType, request, session) {
    const agent = this.agents[agentType];

    if (!agent) {
      throw new Error(`Agent not registered: ${agentType}`);
    }

    this.emit('agent:execute', { agentType, request, session });

    const startTime = Date.now();

    try {
      // Call agent with timeout
      const result = await Promise.race([
        this.callAgent(agent, agentType, request),
        this.timeout(this.config.timeoutMs)
      ]);

      const duration = Date.now() - startTime;

      return {
        agentType,
        response: result.response,
        confidence: result.confidence || 0.5,
        metadata: result.metadata || {},
        duration,
        success: true
      };

    } catch (error) {
      this.emit('agent:error', { agentType, error, session });

      return {
        agentType,
        response: null,
        confidence: 0,
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      };
    }
  }

  /**
   * Call specific agent based on type
   */
  async callAgent(agent, agentType, request) {
    if (agentType === 'sav') {
      // SAV Agent interface
      return await agent.processMessage(request.message, {
        sessionId: request.sessionId,
        context: request.context
      });

    } else if (agentType === 'workflowBuilder') {
      // Workflow Builder interface
      return await agent.generateWorkflow(request.message, {
        sessionId: request.sessionId,
        context: request.context
      });
    }

    throw new Error(`Unknown agent type: ${agentType}`);
  }

  /**
   * Check if handoff to another agent is needed
   */
  shouldHandoff(result, session) {
    // Don't handoff if already at max
    if (session.handoffs.length >= this.config.maxHandoffs) {
      return false;
    }

    // Don't handoff if current agent failed
    if (!result.success) {
      return false;
    }

    // Handoff if confidence is low
    if (result.confidence < this.config.confidenceThreshold) {
      return true;
    }

    // Handoff if response indicates need for other agent
    const response = (result.response || '').toLowerCase();

    if (result.agentType === 'sav') {
      // SAV might suggest creating workflow
      if (response.includes('create a workflow') ||
          response.includes('build a workflow') ||
          response.includes('i can help you create')) {
        return true;
      }
    } else if (result.agentType === 'workflowBuilder') {
      // Workflow Builder might need SAV for clarification
      if (response.includes('need more information') ||
          response.includes('can you clarify') ||
          response.includes('not sure what you mean')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handle handoff to secondary agent
   */
  async handleHandoff(primaryResult, session) {
    const secondaryAgent = session.routing.secondaryAgent;

    this.emit('handoff:start', {
      from: primaryResult.agentType,
      to: secondaryAgent,
      reason: 'low_confidence',
      session
    });

    this.metrics.handoffs++;

    // Create handoff context
    const handoffRequest = {
      message: session.originalRequest.message,
      context: {
        ...session.originalRequest.context,
        previousAgent: primaryResult.agentType,
        previousResponse: primaryResult.response,
        handoffReason: 'Requires specialized expertise'
      }
    };

    // Execute with secondary agent
    const secondaryResult = await this.executeWithAgent(
      secondaryAgent,
      handoffRequest,
      session
    );

    // Track handoff
    session.handoffs.push({
      from: primaryResult.agentType,
      to: secondaryAgent,
      timestamp: Date.now(),
      primaryConfidence: primaryResult.confidence,
      secondaryConfidence: secondaryResult.confidence
    });

    this.emit('handoff:complete', { session, secondaryResult });

    // Return better result
    if (secondaryResult.confidence > primaryResult.confidence) {
      return secondaryResult;
    }

    // Merge responses if both have value
    return {
      ...secondaryResult,
      response: this.mergeResponses(primaryResult, secondaryResult),
      confidence: Math.max(primaryResult.confidence, secondaryResult.confidence)
    };
  }

  /**
   * Check if escalation to human is needed
   */
  shouldEscalate(result, session) {
    // Escalate if confidence is very low
    if (result.confidence < this.config.escalationThreshold) {
      return true;
    }

    // Escalate if agent explicitly requests it
    if (result.metadata?.escalate) {
      return true;
    }

    // Escalate if max handoffs reached without success
    if (session.handoffs.length >= this.config.maxHandoffs &&
        result.confidence < this.config.confidenceThreshold) {
      return true;
    }

    return false;
  }

  /**
   * Handle escalation to human
   */
  async handleEscalation(result, session) {
    this.metrics.escalations++;
    session.escalated = true;

    this.emit('escalation:triggered', {
      session,
      result,
      reason: this.getEscalationReason(result, session)
    });

    return {
      ...result,
      response: this.createEscalationMessage(result, session),
      escalated: true,
      humanNeeded: true
    };
  }

  /**
   * Get escalation reason
   */
  getEscalationReason(result, session) {
    if (result.confidence < this.config.escalationThreshold) {
      return 'low_confidence';
    }
    if (session.handoffs.length >= this.config.maxHandoffs) {
      return 'max_handoffs_reached';
    }
    if (result.metadata?.escalate) {
      return 'agent_requested';
    }
    return 'unknown';
  }

  /**
   * Create escalation message
   */
  createEscalationMessage(result, session) {
    const reason = this.getEscalationReason(result, session);

    let message = "I've analyzed your request with multiple specialized agents, but I need human assistance to provide the best solution.\n\n";

    if (reason === 'low_confidence') {
      message += "The request requires expertise beyond my current capabilities.";
    } else if (reason === 'max_handoffs_reached') {
      message += "This is a complex scenario that would benefit from human judgment.";
    } else {
      message += "The agent determined that human expertise would be valuable here.";
    }

    message += "\n\nA support specialist will review your request shortly.";

    if (result.response) {
      message += "\n\nIn the meantime, here's what I found:\n" + result.response;
    }

    return message;
  }

  /**
   * Merge responses from multiple agents
   */
  mergeResponses(primary, secondary) {
    let merged = "";

    if (primary.response) {
      merged += `**${this.getAgentName(primary.agentType)} says:**\n`;
      merged += primary.response + "\n\n";
    }

    if (secondary.response) {
      merged += `**${this.getAgentName(secondary.agentType)} adds:**\n`;
      merged += secondary.response;
    }

    return merged;
  }

  /**
   * Get friendly agent name
   */
  getAgentName(agentType) {
    const names = {
      sav: 'Support Agent',
      workflowBuilder: 'Workflow Builder'
    };
    return names[agentType] || agentType;
  }

  /**
   * Explain routing decision
   */
  explainRouting(agent, confidence, workflowMatches, savMatches) {
    return {
      agent,
      confidence,
      factors: {
        workflowKeywords: workflowMatches,
        supportKeywords: savMatches
      }
    };
  }

  /**
   * Create coordination session
   */
  createSession(request) {
    const session = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      originalRequest: request,
      routing: null,
      handoffs: [],
      escalated: false
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Cleanup session
   */
  cleanupSession(sessionId) {
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 60000); // Keep for 1 minute
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return 'coord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Timeout promise
   */
  timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Agent timeout')), ms);
    });
  }

  /**
   * Update metrics
   */
  updateMetrics(result, session) {
    if (result.success) {
      this.metrics.successfulRouting++;
    }

    // Update average confidence
    const total = this.metrics.totalRequests;
    const current = this.metrics.averageConfidence;
    this.metrics.averageConfidence = (current * (total - 1) + result.confidence) / total;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeSessions: this.sessions.size,
      handoffRate: this.metrics.handoffs / this.metrics.totalRequests,
      escalationRate: this.metrics.escalations / this.metrics.totalRequests,
      successRate: this.metrics.successfulRouting / this.metrics.totalRequests
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRouting: 0,
      handoffs: 0,
      escalations: 0,
      averageConfidence: 0
    };
  }
}

module.exports = AgentCoordinator;