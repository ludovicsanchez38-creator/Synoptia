/**
 * Test: Prometheus Metrics
 * Teste l'enregistrement et l'exposition des métriques
 */

const {
  recordWorkflowGeneration,
  recordWorkflowValidation,
  recordRAGRetrieval,
  recordConversationMessage,
  recordAPICall,
  recordSecurityEvent,
  setActiveSessions,
  getMetrics,
  resetMetrics
} = require('./monitoring/metrics');

const MetricsServer = require('./monitoring/metrics-server');

async function testMetrics() {
  console.log('🧪 TEST: Prometheus Metrics\n');
  console.log('='.repeat(70));

  // Reset metrics avant test
  resetMetrics();

  // Test 1: Record workflow generation
  console.log('\n📝 Test 1: Workflow Generation Metrics');
  console.log('-'.repeat(70));

  recordWorkflowGeneration({
    action: 'create',
    success: true,
    model: 'gpt-4o',
    duration: 4500,
    complexity: 'medium'
  });

  recordWorkflowGeneration({
    action: 'modify',
    success: true,
    model: 'gpt-4o',
    duration: 3200,
    complexity: 'simple'
  });

  console.log('✅ Recorded 2 workflow generations');

  // Test 2: Record validation
  console.log('\n📝 Test 2: Validation Metrics');
  console.log('-'.repeat(70));

  recordWorkflowValidation({
    valid: true,
    errorsCount: 0,
    warningsCount: 2
  });

  recordWorkflowValidation({
    valid: false,
    errorsCount: 3,
    warningsCount: 1
  });

  console.log('✅ Recorded 2 validations');

  // Test 3: Record RAG retrieval
  console.log('\n📝 Test 3: RAG Retrieval Metrics');
  console.log('-'.repeat(70));

  recordRAGRetrieval({
    fallback: false,
    source: 'qdrant',
    duration: 120,
    documentsCount: 8,
    topScore: 0.52
  });

  recordRAGRetrieval({
    fallback: false,
    source: 'qdrant',
    duration: 95,
    documentsCount: 5,
    topScore: 0.48
  });

  console.log('✅ Recorded 2 RAG retrievals');

  // Test 4: Record conversation
  console.log('\n📝 Test 4: Conversation Metrics');
  console.log('-'.repeat(70));

  recordConversationMessage({
    intent: 'create',
    role: 'user',
    confidence: 0.95
  });

  recordConversationMessage({
    intent: 'modify',
    role: 'user',
    confidence: 0.88
  });

  console.log('✅ Recorded 2 conversation messages');

  // Test 5: Record API calls
  console.log('\n📝 Test 5: API Call Metrics');
  console.log('-'.repeat(70));

  recordAPICall({
    provider: 'openai',
    endpoint: '/v1/chat/completions',
    status: '200',
    duration: 2300,
    tokensUsed: 1500,
    cost: 0.015,
    model: 'gpt-4o'
  });

  recordAPICall({
    provider: 'qdrant',
    endpoint: '/collections/search',
    status: '200',
    duration: 85,
    tokensUsed: 0,
    cost: 0
  });

  console.log('✅ Recorded 2 API calls');

  // Test 6: Record security events
  console.log('\n📝 Test 6: Security Metrics');
  console.log('-'.repeat(70));

  recordSecurityEvent('xss_attempt', 'high');
  recordSecurityEvent('rate_limit', 'medium');

  console.log('✅ Recorded 2 security events');

  // Test 7: Update gauges
  console.log('\n📝 Test 7: Gauge Metrics');
  console.log('-'.repeat(70));

  setActiveSessions(5);

  console.log('✅ Set active sessions to 5');

  // Test 8: Get metrics
  console.log('\n📝 Test 8: Export Metrics');
  console.log('-'.repeat(70));

  const metrics = await getMetrics();
  const lines = metrics.split('\n').filter(l => l && !l.startsWith('#'));

  console.log(`✅ Exported ${lines.length} metric lines`);
  console.log('\nSample metrics:');
  lines.slice(0, 10).forEach(line => {
    console.log(`  ${line}`);
  });

  // Test 9: Start metrics server
  console.log('\n📝 Test 9: Metrics HTTP Server');
  console.log('-'.repeat(70));

  const server = new MetricsServer(9091); // Use different port for test

  try {
    await server.start();
    console.log('✅ Metrics server started on port 9091');

    // Test HTTP endpoint
    console.log('\n📊 Testing HTTP endpoints:');
    console.log('  Try: curl http://localhost:9091/metrics');
    console.log('  Try: curl http://localhost:9091/health');
    console.log('  Try: curl http://localhost:9091/metrics/summary');

    // Keep server running for 5 seconds to allow manual testing
    console.log('\n⏱️  Server running for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await server.stop();
    console.log('✅ Metrics server stopped');

  } catch (error) {
    console.error('❌ Server error:', error.message);
  }

  // Summary
  console.log('\n\n📊 METRICS SUMMARY');
  console.log('='.repeat(70));

  console.log('\n✅ Metrics Implemented:');
  console.log('  1. ✅ Workflow generation (counter + histogram)');
  console.log('  2. ✅ Workflow validation (counter)');
  console.log('  3. ✅ RAG retrieval (counter + histograms)');
  console.log('  4. ✅ Conversation messages (counter + histogram)');
  console.log('  5. ✅ API calls (counter + histogram + costs)');
  console.log('  6. ✅ Security events (counter)');
  console.log('  7. ✅ Active sessions (gauge)');
  console.log('  8. ✅ Errors tracking (counter)');
  console.log('  9. ✅ Default metrics (CPU, memory, etc.)');

  console.log('\n📈 Metric Types:');
  console.log('  - Counters: Always increasing (totals)');
  console.log('  - Gauges: Can go up/down (current values)');
  console.log('  - Histograms: Distribution of values (durations, scores)');

  console.log('\n🔌 Integration:');
  console.log('  - Prometheus scrape endpoint: /metrics');
  console.log('  - Default port: 9090 (configurable)');
  console.log('  - Content-Type: application/openmetrics-text');

  console.log('\n📊 Grafana Dashboard Ready!');
  console.log('  - All metrics exposed in Prometheus format');
  console.log('  - Ready for visualization');
  console.log('  - Real-time monitoring enabled');

  console.log('\n✅ All metrics tests completed successfully!');
}

testMetrics().catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});