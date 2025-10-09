/**
 * Test: Structured Logging with Winston
 * Teste tous les types de logs
 */

const logger = require('./utils/logger');

async function testLogger() {
  console.log('🧪 TEST: Structured Logging\n');
  console.log('='.repeat(70));

  // 1. Test basic logging
  console.log('\n📝 Test 1: Basic Logging Levels');
  console.log('-'.repeat(70));

  logger.debug('This is a debug message', { details: 'extra info' });
  logger.info('Application started', { version: '1.0.0', environment: 'test' });
  logger.warn('This is a warning', { resource: 'memory', usage: '85%' });
  logger.error('This is an error', { code: 'ERR_TEST', severity: 'high' });

  // 2. Test workflow logging
  console.log('\n📝 Test 2: Workflow Generation Logging');
  console.log('-'.repeat(70));

  logger.logWorkflow({
    sessionId: 'test-session-123',
    userId: 'user-456',
    action: 'create',
    success: true,
    duration: 4500,
    workflowName: 'Test Webhook Workflow',
    nodeCount: 3,
    connectionCount: 2,
    validation: {
      valid: true,
      errors: [],
      warnings: ['Missing credentials']
    },
    ragUsed: true,
    documentsCount: 5,
    ragFallback: false,
    model: 'gpt-4o',
    cost: 0.025
  });

  logger.info('✅ Workflow logged successfully');

  // 3. Test validation logging
  console.log('\n📝 Test 3: Validation Logging');
  console.log('-'.repeat(70));

  logger.logValidation({
    sessionId: 'test-session-123',
    workflowName: 'Test Webhook Workflow',
    valid: true,
    errors: [],
    warnings: ['Node "Webhook": credentials recommended'],
    suggestions: ['Add error handler', 'Use Set node for data cleanup']
  });

  logger.info('✅ Validation logged successfully');

  // 4. Test conversation logging
  console.log('\n📝 Test 4: Conversation Logging');
  console.log('-'.repeat(70));

  logger.logConversation({
    sessionId: 'test-session-123',
    userId: 'user-456',
    message: 'Create a webhook that sends to Slack',
    intent: 'create',
    confidence: 0.95,
    action: 'workflow_generation',
    duration: 150
  });

  logger.info('✅ Conversation logged successfully');

  // 5. Test RAG logging
  console.log('\n📝 Test 5: RAG Retrieval Logging');
  console.log('-'.repeat(70));

  logger.logRAG({
    sessionId: 'test-session-123',
    query: 'webhook slack notification',
    documentsCount: 8,
    topScore: 0.52,
    avgScore: 0.47,
    duration: 120,
    fallback: false
  });

  logger.info('✅ RAG retrieval logged successfully');

  // 6. Test performance logging
  console.log('\n📝 Test 6: Performance Logging');
  console.log('-'.repeat(70));

  logger.logPerformance({
    operation: 'workflow_generation',
    duration: 3200,
    metadata: {
      nodeCount: 5,
      ragDocs: 10,
      retries: 1
    }
  });

  // Test slow operation warning
  logger.logPerformance({
    operation: 'slow_workflow_generation',
    duration: 7500,
    metadata: {
      nodeCount: 15,
      complexity: 'high'
    }
  });

  logger.info('✅ Performance logged successfully');

  // 7. Test API call logging
  console.log('\n📝 Test 7: API Call Logging');
  console.log('-'.repeat(70));

  logger.logAPI({
    provider: 'openai',
    endpoint: '/v1/chat/completions',
    method: 'POST',
    statusCode: 200,
    duration: 2300,
    tokensUsed: 1500,
    cost: 0.015
  });

  logger.logAPI({
    provider: 'qdrant',
    endpoint: '/collections/synoptia_knowledge/points/search',
    method: 'POST',
    statusCode: 200,
    duration: 85,
    tokensUsed: 0,
    cost: 0
  });

  logger.info('✅ API calls logged successfully');

  // 8. Test error logging
  console.log('\n📝 Test 8: Error Logging');
  console.log('-'.repeat(70));

  try {
    throw new Error('Test error for logging');
  } catch (error) {
    logger.logError(error, {
      sessionId: 'test-session-123',
      operation: 'workflow_generation',
      userInput: 'invalid input'
    });
  }

  logger.info('✅ Error logged successfully');

  // 9. Info sur les fichiers de logs
  console.log('\n📊 Log Files Location');
  console.log('-'.repeat(70));
  console.log('Logs are written to:');
  console.log('  - logs/workflow-builder-YYYY-MM-DD.log (all logs)');
  console.log('  - logs/errors-YYYY-MM-DD.log (errors only)');
  console.log('  - logs/workflows-YYYY-MM-DD.jsonl (workflows analytics)');
  console.log('\nLog retention:');
  console.log('  - Standard logs: 30 days');
  console.log('  - Error logs: 90 days');
  console.log('  - Analytics logs: 90 days');
  console.log('\nLog format: JSON (structured) + colorized console in dev mode');

  console.log('\n✅ All logging tests completed successfully!');
  console.log('\nCheck logs/ directory for generated log files.');
}

testLogger().catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});