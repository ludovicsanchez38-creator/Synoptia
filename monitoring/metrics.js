/**
 * Prometheus Metrics
 * Collecte et expose des métriques pour monitoring temps réel
 */

const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// ============================================================================
// WORKFLOW GENERATION METRICS
// ============================================================================

// Counter: Total workflows generated
const workflowsGeneratedTotal = new client.Counter({
  name: 'workflows_generated_total',
  help: 'Total number of workflows generated',
  labelNames: ['action', 'success', 'model'],
  registers: [register]
});

// Histogram: Workflow generation duration
const workflowGenerationDuration = new client.Histogram({
  name: 'workflow_generation_duration_seconds',
  help: 'Time taken to generate a workflow',
  labelNames: ['action', 'complexity'],
  buckets: [0.5, 1, 2, 5, 10, 30], // seconds
  registers: [register]
});

// Gauge: Active workflow sessions
const activeWorkflowSessions = new client.Gauge({
  name: 'active_workflow_sessions',
  help: 'Number of active workflow sessions',
  registers: [register]
});

// Counter: Workflow validation results
const workflowValidations = new client.Counter({
  name: 'workflow_validations_total',
  help: 'Total workflow validations',
  labelNames: ['valid', 'has_errors', 'has_warnings'],
  registers: [register]
});

// ============================================================================
// RAG METRICS
// ============================================================================

// Counter: RAG retrievals
const ragRetrievalsTotal = new client.Counter({
  name: 'rag_retrievals_total',
  help: 'Total RAG document retrievals',
  labelNames: ['fallback', 'source'],
  registers: [register]
});

// Histogram: RAG retrieval duration
const ragRetrievalDuration = new client.Histogram({
  name: 'rag_retrieval_duration_seconds',
  help: 'Time taken for RAG retrieval',
  buckets: [0.05, 0.1, 0.2, 0.5, 1],
  registers: [register]
});

// Histogram: Documents retrieved per query
const ragDocumentsRetrieved = new client.Histogram({
  name: 'rag_documents_retrieved',
  help: 'Number of documents retrieved per RAG query',
  buckets: [1, 3, 5, 10, 20],
  registers: [register]
});

// Histogram: RAG similarity scores
const ragSimilarityScores = new client.Histogram({
  name: 'rag_similarity_scores',
  help: 'Similarity scores of retrieved documents',
  buckets: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
  registers: [register]
});

// ============================================================================
// CONVERSATION METRICS
// ============================================================================

// Counter: Conversation messages
const conversationMessagesTotal = new client.Counter({
  name: 'conversation_messages_total',
  help: 'Total conversation messages',
  labelNames: ['intent', 'role'],
  registers: [register]
});

// Histogram: Intent detection confidence
const intentDetectionConfidence = new client.Histogram({
  name: 'intent_detection_confidence',
  help: 'Confidence scores for intent detection',
  labelNames: ['intent'],
  buckets: [0.5, 0.6, 0.7, 0.8, 0.9, 0.95],
  registers: [register]
});

// Counter: Workflow modifications
const workflowModifications = new client.Counter({
  name: 'workflow_modifications_total',
  help: 'Total workflow modifications',
  labelNames: ['type'], // modify, regenerate, rollback
  registers: [register]
});

// ============================================================================
// API METRICS
// ============================================================================

// Counter: API calls
const apiCallsTotal = new client.Counter({
  name: 'api_calls_total',
  help: 'Total API calls',
  labelNames: ['provider', 'endpoint', 'status'],
  registers: [register]
});

// Histogram: API call duration
const apiCallDuration = new client.Histogram({
  name: 'api_call_duration_seconds',
  help: 'Time taken for API calls',
  labelNames: ['provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// Counter: API tokens used
const apiTokensUsed = new client.Counter({
  name: 'api_tokens_used_total',
  help: 'Total API tokens consumed',
  labelNames: ['provider', 'model'],
  registers: [register]
});

// Counter: API costs
const apiCosts = new client.Counter({
  name: 'api_costs_total',
  help: 'Total API costs in USD',
  labelNames: ['provider'],
  registers: [register]
});

// ============================================================================
// SECURITY METRICS
// ============================================================================

// Counter: Security events
const securityEvents = new client.Counter({
  name: 'security_events_total',
  help: 'Total security events',
  labelNames: ['type', 'severity'], // xss, injection, rate_limit, secrets
  registers: [register]
});

// Counter: Rate limit hits
const rateLimitHits = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total rate limit hits',
  labelNames: ['endpoint', 'limit_type'],
  registers: [register]
});

// ============================================================================
// ERROR METRICS
// ============================================================================

// Counter: Errors
const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total errors',
  labelNames: ['type', 'operation'],
  registers: [register]
});

// ============================================================================
// BUSINESS METRICS
// ============================================================================

// Gauge: Average workflow quality score
const workflowQualityScore = new client.Gauge({
  name: 'workflow_quality_score',
  help: 'Average quality score of generated workflows (0-1)',
  registers: [register]
});

// Gauge: User satisfaction
const userSatisfaction = new client.Gauge({
  name: 'user_satisfaction',
  help: 'User satisfaction score (0-5)',
  registers: [register]
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Record workflow generation
 */
function recordWorkflowGeneration(data) {
  const { action, success, model, duration, complexity } = data;

  workflowsGeneratedTotal.inc({
    action: action || 'create',
    success: success ? 'true' : 'false',
    model: model || 'unknown'
  });

  if (duration) {
    workflowGenerationDuration.observe(
      { action, complexity: complexity || 'medium' },
      duration / 1000 // Convert ms to seconds
    );
  }
}

/**
 * Record workflow validation
 */
function recordWorkflowValidation(data) {
  const { valid, errorsCount, warningsCount } = data;

  workflowValidations.inc({
    valid: valid ? 'true' : 'false',
    has_errors: errorsCount > 0 ? 'true' : 'false',
    has_warnings: warningsCount > 0 ? 'true' : 'false'
  });
}

/**
 * Record RAG retrieval
 */
function recordRAGRetrieval(data) {
  const { fallback, source, duration, documentsCount, topScore } = data;

  ragRetrievalsTotal.inc({
    fallback: fallback ? 'true' : 'false',
    source: source || 'qdrant'
  });

  if (duration) {
    ragRetrievalDuration.observe(duration / 1000);
  }

  if (documentsCount !== undefined) {
    ragDocumentsRetrieved.observe(documentsCount);
  }

  if (topScore !== undefined) {
    ragSimilarityScores.observe(topScore);
  }
}

/**
 * Record conversation message
 */
function recordConversationMessage(data) {
  const { intent, role, confidence } = data;

  conversationMessagesTotal.inc({
    intent: intent || 'unknown',
    role: role || 'user'
  });

  if (confidence !== undefined && intent) {
    intentDetectionConfidence.observe({ intent }, confidence);
  }
}

/**
 * Record workflow modification
 */
function recordWorkflowModification(type) {
  workflowModifications.inc({ type });
}

/**
 * Record API call
 */
function recordAPICall(data) {
  const { provider, endpoint, status, duration, tokensUsed, cost } = data;

  apiCallsTotal.inc({
    provider: provider || 'unknown',
    endpoint: endpoint || 'unknown',
    status: status || 'unknown'
  });

  if (duration) {
    apiCallDuration.observe({ provider }, duration / 1000);
  }

  if (tokensUsed) {
    apiTokensUsed.inc({
      provider,
      model: data.model || 'unknown'
    }, tokensUsed);
  }

  if (cost) {
    apiCosts.inc({ provider }, cost);
  }
}

/**
 * Record security event
 */
function recordSecurityEvent(type, severity = 'medium') {
  securityEvents.inc({ type, severity });
}

/**
 * Record rate limit hit
 */
function recordRateLimitHit(endpoint, limitType) {
  rateLimitHits.inc({ endpoint, limitType });
}

/**
 * Record error
 */
function recordError(type, operation) {
  errorsTotal.inc({ type, operation });
}

/**
 * Update active sessions
 */
function setActiveSessions(count) {
  activeWorkflowSessions.set(count);
}

/**
 * Update workflow quality score
 */
function setWorkflowQualityScore(score) {
  workflowQualityScore.set(score);
}

/**
 * Update user satisfaction
 */
function setUserSatisfaction(score) {
  userSatisfaction.set(score);
}

/**
 * Get metrics for Prometheus
 */
async function getMetrics() {
  return await register.metrics();
}

/**
 * Get content type for Prometheus
 */
function getContentType() {
  return register.contentType;
}

/**
 * Reset all metrics (useful for testing)
 */
function resetMetrics() {
  register.resetMetrics();
}

module.exports = {
  // Metrics registry
  register,

  // Recording functions
  recordWorkflowGeneration,
  recordWorkflowValidation,
  recordRAGRetrieval,
  recordConversationMessage,
  recordWorkflowModification,
  recordAPICall,
  recordSecurityEvent,
  recordRateLimitHit,
  recordError,

  // Gauge setters
  setActiveSessions,
  setWorkflowQualityScore,
  setUserSatisfaction,

  // Export functions
  getMetrics,
  getContentType,
  resetMetrics,

  // Direct access to metrics (for advanced usage)
  metrics: {
    workflowsGeneratedTotal,
    workflowGenerationDuration,
    activeWorkflowSessions,
    workflowValidations,
    ragRetrievalsTotal,
    ragRetrievalDuration,
    conversationMessagesTotal,
    apiCallsTotal,
    apiTokensUsed,
    apiCosts,
    securityEvents,
    errorsTotal
  }
};