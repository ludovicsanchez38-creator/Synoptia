/**
 * Structured Logger - Winston
 * Logging centralisé pour le Workflow Builder
 * Formats: JSON, Console coloré, Rotation quotidienne
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Configuration
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Format personnalisé pour la console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}] ${message}`;

    // Ajouter metadata si présente
    if (Object.keys(meta).length > 0) {
      const cleanMeta = { ...meta };
      delete cleanMeta[Symbol.for('level')];
      delete cleanMeta[Symbol.for('splat')];

      if (Object.keys(cleanMeta).length > 0) {
        log += ` ${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }

    return log;
  })
);

// Format JSON pour les fichiers
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Transports
const transports = [];

// Console (toujours actif en développement)
if (NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: LOG_LEVEL
    })
  );
}

// Fichier: Tous les logs (rotation quotidienne)
transports.push(
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'workflow-builder-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d', // Garder 30 jours
    maxSize: '20m',  // Max 20MB par fichier
    format: fileFormat,
    level: LOG_LEVEL
  })
);

// Fichier: Erreurs seulement
transports.push(
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'errors-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '90d', // Garder 90 jours pour les erreurs
    maxSize: '20m',
    format: fileFormat,
    level: 'error'
  })
);

// Fichier: Workflows générés (analytics)
transports.push(
  new DailyRotateFile({
    filename: path.join(LOG_DIR, 'workflows-%DATE%.jsonl'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '90d',
    maxSize: '50m',
    format: winston.format.json()
  })
);

// Créer le logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: fileFormat,
  transports,
  exitOnError: false
});

// Helper: Log workflow generation
logger.logWorkflow = function(event) {
  const workflowLog = {
    timestamp: new Date().toISOString(),
    type: 'workflow_generation',
    sessionId: event.sessionId,
    userId: event.userId,
    action: event.action, // create, modify, regenerate
    success: event.success,
    duration: event.duration,
    workflowName: event.workflowName,
    nodeCount: event.nodeCount,
    connectionCount: event.connectionCount,
    validation: {
      valid: event.validation?.valid,
      errors: event.validation?.errors?.length || 0,
      warnings: event.validation?.warnings?.length || 0
    },
    rag: {
      used: event.ragUsed,
      documentsCount: event.documentsCount,
      fallback: event.ragFallback
    },
    model: event.model,
    cost: event.cost,
    error: event.error
  };

  this.info('Workflow generated', workflowLog);
};

// Helper: Log validation
logger.logValidation = function(event) {
  const validationLog = {
    timestamp: new Date().toISOString(),
    type: 'workflow_validation',
    sessionId: event.sessionId,
    workflowName: event.workflowName,
    valid: event.valid,
    errors: event.errors,
    warnings: event.warnings,
    suggestions: event.suggestions?.length || 0
  };

  if (event.valid) {
    this.info('Workflow validation passed', validationLog);
  } else {
    this.warn('Workflow validation failed', validationLog);
  }
};

// Helper: Log conversation
logger.logConversation = function(event) {
  const conversationLog = {
    timestamp: new Date().toISOString(),
    type: 'conversation',
    sessionId: event.sessionId,
    userId: event.userId,
    message: event.message,
    intent: event.intent,
    confidence: event.confidence,
    action: event.action,
    duration: event.duration
  };

  this.info('Conversation message', conversationLog);
};

// Helper: Log RAG retrieval
logger.logRAG = function(event) {
  const ragLog = {
    timestamp: new Date().toISOString(),
    type: 'rag_retrieval',
    sessionId: event.sessionId,
    query: event.query,
    documentsFound: event.documentsCount,
    topScore: event.topScore,
    avgScore: event.avgScore,
    duration: event.duration,
    fallback: event.fallback
  };

  this.debug('RAG retrieval', ragLog);
};

// Helper: Log error avec contexte
logger.logError = function(error, context = {}) {
  this.error('Application error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context
  });
};

// Helper: Log performance
logger.logPerformance = function(event) {
  const perfLog = {
    timestamp: new Date().toISOString(),
    type: 'performance',
    operation: event.operation,
    duration: event.duration,
    memoryUsed: process.memoryUsage().heapUsed / 1024 / 1024, // MB
    ...event.metadata
  };

  if (event.duration > 5000) {
    this.warn('Slow operation detected', perfLog);
  } else {
    this.debug('Performance metric', perfLog);
  }
};

// Helper: Log API call
logger.logAPI = function(event) {
  const apiLog = {
    timestamp: new Date().toISOString(),
    type: 'api_call',
    provider: event.provider, // openai, qdrant, redis
    endpoint: event.endpoint,
    method: event.method,
    statusCode: event.statusCode,
    duration: event.duration,
    tokensUsed: event.tokensUsed,
    cost: event.cost,
    error: event.error
  };

  if (event.error) {
    this.error('API call failed', apiLog);
  } else {
    this.debug('API call', apiLog);
  }
};

// Graceful shutdown - Fixed to prevent "write after end" errors
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received, shutting down gracefully...`);

  // Wait for pending logs to flush (500ms)
  await new Promise(resolve => setTimeout(resolve, 500));

  // Close logger transports
  logger.end();

  // Exit cleanly
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = logger;