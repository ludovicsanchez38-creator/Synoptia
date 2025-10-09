/**
 * Test: Validation exhaustive des workflows
 * Teste les nouvelles fonctionnalités de validation avancée
 */

const RAGEnhancedGenerator = require('./rag/pipeline/rag-enhanced-generator');
require('dotenv').config();

async function testValidation() {
  console.log('🧪 TEST: Validation Exhaustive des Workflows\n');
  console.log('='.repeat(60));

  const generator = new RAGEnhancedGenerator();

  // Test 1: Workflow simple valide
  console.log('\n📋 TEST 1: Workflow Webhook → Slack (valide)');
  console.log('-'.repeat(60));

  try {
    const result1 = await generator.generate(
      'Create a webhook that sends a message to Slack when triggered',
      { autoFix: true, maxRetries: 2 }
    );

    console.log('\n✅ Résultat:');
    console.log(`   Valid: ${result1.validation.valid ? '✅' : '❌'}`);
    console.log(`   Errors: ${result1.validation.errors.length}`);
    console.log(`   Warnings: ${result1.validation.warnings.length}`);
    console.log(`   Suggestions: ${result1.validation.suggestions.length}`);

    if (result1.validation.errors.length > 0) {
      console.log('\n❌ Erreurs:');
      result1.validation.errors.slice(0, 3).forEach(err => console.log(`   - ${err}`));
    }

    if (result1.validation.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result1.validation.warnings.slice(0, 3).forEach(warn => console.log(`   - ${warn}`));
    }

    if (result1.validation.suggestions.length > 0) {
      console.log('\n💡 Suggestions:');
      result1.validation.suggestions.slice(0, 3).forEach(sug => {
        console.log(`   - ${sug.type}: ${sug.message}`);
      });
    }

    console.log('\n📊 Metadata validation:');
    console.log(`   Nodes: ${result1.validation.metadata.nodeCount}`);
    console.log(`   Connections: ${result1.validation.metadata.connectionCount}`);
    console.log(`   Has errors: ${result1.validation.metadata.hasErrors}`);
    console.log(`   Has warnings: ${result1.validation.metadata.hasWarnings}`);

  } catch (error) {
    console.error('❌ Test 1 échoué:', error.message);
  }

  // Test 2: Workflow complexe
  console.log('\n\n📋 TEST 2: Workflow Email Automation (complexe)');
  console.log('-'.repeat(60));

  try {
    const result2 = await generator.generate(
      'Create a workflow that checks Gmail every hour, extracts attachments, stores them in Google Drive, and sends a notification to Slack',
      { autoFix: true, maxRetries: 2 }
    );

    console.log('\n✅ Résultat:');
    console.log(`   Valid: ${result2.validation.valid ? '✅' : '❌'}`);
    console.log(`   Errors: ${result2.validation.errors.length}`);
    console.log(`   Warnings: ${result2.validation.warnings.length}`);
    console.log(`   Suggestions: ${result2.validation.suggestions.length}`);
    console.log(`   Nodes: ${result2.workflow.nodes.length}`);
    console.log(`   Duration: ${(result2.metadata.duration / 1000).toFixed(1)}s`);

    if (result2.validation.suggestions.length > 0) {
      console.log('\n💡 Top suggestions:');
      result2.validation.suggestions.slice(0, 3).forEach(sug => {
        console.log(`   - ${sug.type}: ${sug.message}`);
      });
    }

  } catch (error) {
    console.error('❌ Test 2 échoué:', error.message);
  }

  // Test 3: Workflow avec database
  console.log('\n\n📋 TEST 3: Database Sync Workflow');
  console.log('-'.repeat(60));

  try {
    const result3 = await generator.generate(
      'Create a workflow that reads data from PostgreSQL, transforms it, and inserts into MongoDB',
      { autoFix: true, maxRetries: 2 }
    );

    console.log('\n✅ Résultat:');
    console.log(`   Valid: ${result3.validation.valid ? '✅' : '❌'}`);
    console.log(`   Errors: ${result3.validation.errors.length}`);
    console.log(`   Warnings: ${result3.validation.warnings.length}`);
    console.log(`   Detected nodes: ${result3.context.nodesDetected.join(', ')}`);

    if (result3.validation.warnings.length > 0) {
      console.log('\n⚠️ Key warnings:');
      result3.validation.warnings.slice(0, 3).forEach(warn => console.log(`   - ${warn}`));
    }

  } catch (error) {
    console.error('❌ Test 3 échoué:', error.message);
  }

  // Stats finales
  console.log('\n\n📊 STATISTIQUES FINALES');
  console.log('='.repeat(60));

  const stats = generator.getStats();
  console.log(`\n🎯 Génération:`);
  console.log(`   Total workflows: ${stats.generated}`);
  console.log(`   Avec RAG: ${stats.withRAG} (${stats.ragUsageRate})`);
  console.log(`   Temps moyen: ${stats.avgGenerationTime}`);
  console.log(`   Docs moyen: ${stats.avgContextDocs}`);

  console.log(`\n✅ Validation:`);
  console.log(`   Passed: ${stats.validationPassed}`);
  console.log(`   Failed: ${stats.validationFailed}`);
  console.log(`   Pass rate: ${stats.validationPassRate}`);

  console.log(`\n📈 Validator stats:`);
  console.log(`   Total validated: ${stats.validatorStats.validated}`);
  console.log(`   Passed: ${stats.validatorStats.passed}`);
  console.log(`   Failed: ${stats.validatorStats.failed}`);
  console.log(`   Pass rate: ${stats.validatorStats.passRate}`);

  await generator.close();

  console.log('\n\n✅ Tests terminés avec succès!');
}

// Run tests
testValidation().catch(error => {
  console.error('❌ Erreur globale:', error);
  process.exit(1);
});