/**
 * Workflow Builder Web Server
 * Interface web pour générer des workflows n8n avec IA
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const ConversationalGenerator = require('./rag/sessions/conversational-generator');
const ConversationManager = require('./rag/sessions/conversation-manager');
const WorkflowValidator = require('./rag/validation/workflow-validator');
const TemplateManager = require('./templates/template-manager');
const FeedbackCollector = require('./learning/feedback-collector');
const N8nApi = require('./src/n8n-api');
const securityMiddleware = require('./middleware/security');
const logger = require('./utils/logger');
const { recordWorkflowGeneration, recordAPICall } = require('./monitoring/metrics');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// Security - Use helmet for basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// Initialize services
const conversationManager = new ConversationManager();
const conversationalGenerator = new ConversationalGenerator(conversationManager);
const validator = new WorkflowValidator();
const templateManager = new TemplateManager();
const feedbackCollector = new FeedbackCollector();
const n8nApi = new N8nApi();

// Initialize on startup
let isInitialized = true;

async function initialize() {
  try {
    // Initialize feedback collector if it has init method
    if (feedbackCollector.init) {
      await feedbackCollector.init();
    }
    logger.info('Workflow Builder initialized successfully');
  } catch (error) {
    logger.error('Initialization error:', error);
  }
}

initialize();

// SSE clients store
const sseClients = new Map();

// Routes

/**
 * GET / - Interface principale
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * GET /api/reasoning-stream - SSE endpoint pour le raisonnement en temps réel
 */
app.get('/api/reasoning-stream', (req, res) => {
  const clientId = require('crypto').randomUUID();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  sseClients.set(clientId, res);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });
});

/**
 * Broadcast SSE event to all clients
 */
function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(payload);
    } catch (err) {
      logger.error('SSE broadcast error', { error: err.message });
    }
  });
}

// Export broadcastSSE for use in generators
global.broadcastSSE = broadcastSSE;

/**
 * POST /api/generate - Générer workflow (API conversational)
 * POST /api/create-workflow - Générer workflow (API frontend)
 */
const handleWorkflowGeneration = async (req, res) => {
  const startTime = Date.now();

  try {
    // Support both API formats
    const message = req.body.message || req.body.request;
    const sessionId = req.body.sessionId;
    const options = req.body.options || req.body.preferences || {};

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message or request is required'
      });
    }

    logger.logWorkflow({
      sessionId,
      action: 'generate_request',
      message
    });

    // Broadcast start event
    broadcastSSE('generation_start', {
      message,
      timestamp: Date.now()
    });

    // Generate workflow
    const result = await conversationalGenerator.processMessage(message, sessionId, options);

    const duration = Date.now() - startTime;

    // Record metrics
    recordWorkflowGeneration({
      action: result.action || 'create',
      success: !!result.workflow,
      model: 'gpt-4o',
      duration,
      complexity: result.workflow?.nodes?.length > 5 ? 'complex' : 'simple'
    });

    logger.logWorkflow({
      sessionId: result.sessionId,
      action: 'generate_success',
      success: true,
      duration,
      nodeCount: result.workflow?.nodes?.length
    });

    // Deploy to n8n if autoExecute is enabled
    let deployment = null;
    if (req.body.autoExecute && result.workflow) {
      try {
        deployment = await n8nApi.createWorkflow(result.workflow);
        logger.info('Workflow deployed to n8n', { workflowId: deployment.id });
      } catch (deployError) {
        logger.error('Failed to deploy workflow', { error: deployError.message });
        deployment = {
          success: false,
          error: deployError.message
        };
      }
    }

    // Format response for frontend compatibility
    res.json({
      success: true,
      workflow: result.workflow,
      workflowData: result.workflow,
      message: result.message,
      sessionId: result.sessionId,
      validation: result.validation,
      metadata: result.metadata,
      deployment: deployment,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.logError(error, {
      endpoint: req.path,
      sessionId: req.body.sessionId
    });

    recordWorkflowGeneration({
      action: 'create',
      success: false,
      model: 'gpt-4o',
      duration
    });

    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate workflow'
    });
  }
};

app.post('/api/generate', handleWorkflowGeneration);
app.post('/api/create-workflow', handleWorkflowGeneration);

/**
 * POST /api/validate - Valider workflow
 */
app.post('/api/validate', async (req, res) => {
  try {
    const { workflow } = req.body;

    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Workflow is required'
      });
    }

    const validation = validator.validate(workflow);

    res.json({
      success: true,
      validation
    });

  } catch (error) {
    logger.logError(error, { endpoint: '/api/validate' });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/templates - Liste templates
 */
app.get('/api/templates', (req, res) => {
  try {
    const { category, difficulty, tags } = req.query;

    let templates = templateManager.getAllTemplates();

    // Filter by category
    if (category) {
      templates = templateManager.getTemplatesByCategory(category);
    }

    // Filter by difficulty
    if (difficulty) {
      templates = templates.filter(t => t.difficulty === difficulty);
    }

    // Filter by tags
    if (tags) {
      const tagList = tags.split(',');
      templates = templates.filter(t =>
        tagList.some(tag => t.tags.includes(tag))
      );
    }

    res.json({
      success: true,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        estimatedSetupTime: t.estimatedSetupTime,
        tags: t.tags,
        requiredCredentials: t.requiredCredentials
      })),
      total: templates.length
    });

  } catch (error) {
    logger.logError(error, { endpoint: '/api/templates' });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/templates/:id - Get template details
 */
app.get('/api/templates/:id', (req, res) => {
  try {
    const template = templateManager.getTemplate(req.params.id);

    res.json({
      success: true,
      template
    });

  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/templates/:id/instantiate - Instantiate template
 */
app.post('/api/templates/:id/instantiate', async (req, res) => {
  try {
    const { credentials, parameters, workflowName } = req.body;

    const instance = templateManager.instantiateTemplate(req.params.id, {
      workflowName,
      credentials,
      parameters
    });

    res.json({
      success: true,
      workflow: instance.workflow,
      metadata: instance.metadata
    });

  } catch (error) {
    logger.logError(error, { endpoint: '/api/templates/instantiate' });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/feedback - Submit feedback
 */
app.post('/api/feedback', async (req, res) => {
  try {
    const feedback = req.body;

    const result = await feedbackCollector.collectFeedback(feedback);

    logger.info('Feedback collected', { feedbackId: result.feedbackId });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.logError(error, { endpoint: '/api/feedback' });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:id - Get session info
 */
app.get('/api/sessions/:id', (req, res) => {
  try {
    const session = conversationManager.getSession(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        messageCount: session.history.length,
        hasWorkflow: !!session.currentWorkflow,
        stats: session.stats
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/categories - List template categories
 */
app.get('/api/categories', (req, res) => {
  try {
    const categories = templateManager.listCategories();

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /health - Enhanced health check with service dependencies
 */
app.get('/health', async (req, res) => {
  const startTime = Date.now();

  const checks = {
    status: 'ok',
    service: 'workflow-builder',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    initialized: isInitialized,

    // Memory usage
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
    },

    // Services status
    services: {
      conversationManager: conversationManager ? 'ok' : 'error',
      templateManager: templateManager ? 'ok' : 'error',
      feedbackCollector: feedbackCollector ? 'ok' : 'error',
      n8nApi: n8nApi ? 'ok' : 'error'
    },

    // Response time
    responseTime: Date.now() - startTime + 'ms'
  };

  // Determine overall status
  const allServicesOk = Object.values(checks.services).every(s => s === 'ok');
  if (!allServicesOk || !isInitialized) {
    checks.status = 'degraded';
    return res.status(503).json(checks);
  }

  res.json(checks);
});

/**
 * GET /api/stats - Statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = {
      templates: templateManager.getStats(),
      feedback: feedbackCollector.getStats(),
      sessions: conversationManager.getActiveSessions().length
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  logger.logError(err, {
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Workflow Builder running on http://localhost:${PORT}`);
  console.log(`📝 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  logger.info(`Workflow Builder started on port ${PORT}`);
});

module.exports = app;