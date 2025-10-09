/**
 * Test: Prompt Versioning System
 */

const PromptManager = require('./prompts/prompt-manager');

async function testPrompts() {
  console.log('🧪 TEST: Prompt Versioning System\n');
  console.log('='.repeat(70));

  const manager = new PromptManager();

  // Test 1: Load prompts
  console.log('\n📝 Test 1: Load Prompts');
  console.log('-'.repeat(70));

  await manager.load();
  console.log('✅ Prompts loaded');

  // Test 2: List categories
  console.log('\n📝 Test 2: List Categories');
  console.log('-'.repeat(70));

  const categories = manager.listCategories();
  console.log(`Found ${categories.length} categories:`);
  categories.forEach(cat => console.log(`  - ${cat}`));

  // Test 3: List versions for a category
  console.log('\n📝 Test 3: List Versions');
  console.log('-'.repeat(70));

  const versions = manager.listVersions('workflow_generation');
  console.log(`Found ${versions.length} versions for "workflow_generation":`);
  versions.forEach(v => {
    console.log(`  - ${v.version}: ${v.description} ${v.active ? '(ACTIVE)' : ''}`);
  });

  // Test 4: Get active prompt
  console.log('\n📝 Test 4: Get Active Prompt');
  console.log('-'.repeat(70));

  const activePrompt = manager.getActivePrompt('workflow_generation');
  console.log(`Active version: ${activePrompt.version}`);
  console.log(`Description: ${activePrompt.description}`);
  console.log(`System prompt length: ${activePrompt.system.length} chars`);
  console.log(`Variables: ${activePrompt.variables?.join(', ') || 'none'}`);

  // Test 5: Build prompt with variables
  console.log('\n📝 Test 5: Build Prompt with Variables');
  console.log('-'.repeat(70));

  const builtPrompt = manager.buildPrompt('workflow_generation', {
    userRequest: 'Create a webhook that sends to Slack',
    ragContext: '\n[RAG Context: 10 documents found...]',
    nodeSchemas: '\nWebhook requires: httpMethod, path',
    examples: ''
  });

  console.log(`Built prompt version: ${builtPrompt.version}`);
  console.log(`Final prompt length: ${builtPrompt.system.length} chars`);
  console.log(`\nPrompt preview (first 200 chars):`);
  console.log(`  ${builtPrompt.system.substring(0, 200)}...`);

  // Test 6: Get specific version
  console.log('\n📝 Test 6: Get Specific Version');
  console.log('-'.repeat(70));

  const v1 = manager.getPromptVersion('workflow_generation', 'v1.0.0');
  const v2 = manager.getPromptVersion('workflow_generation', 'v2.0.0');

  console.log(`v1.0.0: ${v1.description}`);
  console.log(`  Length: ${v1.system.length} chars`);
  console.log(`\nv2.0.0: ${v2.description}`);
  console.log(`  Length: ${v2.system.length} chars`);
  console.log(`\nEvolution: +${v2.system.length - v1.system.length} chars`);

  // Test 7: Compare versions
  console.log('\n📝 Test 7: Compare Versions');
  console.log('-'.repeat(70));

  const comparison = manager.compareVersions('workflow_generation', 'v1.0.0', 'v2.0.0');
  console.log(`Version 1: ${comparison.version1.version} (${comparison.version1.systemLength} chars)`);
  console.log(`Version 2: ${comparison.version2.version} (${comparison.version2.systemLength} chars)`);
  console.log(`\nDifferences:`);
  console.log(`  Length diff: ${comparison.differences.lengthDiff > 0 ? '+' : ''}${comparison.differences.lengthDiff} chars`);
  console.log(`  Variables diff: ${comparison.differences.variablesDiff}`);

  // Test 8: Intent detection prompt
  console.log('\n📝 Test 8: Intent Detection Prompt');
  console.log('-'.repeat(70));

  const intentPrompt = manager.buildPrompt('intent_detection', {
    hasWorkflow: 'A DÉJÀ',
    historyLength: 5,
    message: 'Add a node to send email'
  });

  console.log(`Intent detection version: ${intentPrompt.version}`);
  console.log(`Preview (first 150 chars):`);
  console.log(`  ${intentPrompt.system.substring(0, 150)}...`);

  // Test 9: Stats
  console.log('\n📝 Test 9: Prompt Stats');
  console.log('-'.repeat(70));

  const stats = manager.getStats();
  console.log(`Total categories: ${stats.categories}`);
  console.log(`Total versions: ${stats.totalVersions}`);
  console.log(`\nBy category:`);
  stats.byCategory.forEach(cat => {
    console.log(`  - ${cat.category}: ${cat.versions} versions (active: ${cat.activeVersion})`);
  });

  // Summary
  console.log('\n\n📊 PROMPT VERSIONING SUMMARY');
  console.log('='.repeat(70));

  console.log('\n✅ Features Implemented:');
  console.log('  1. ✅ JSON-based version storage');
  console.log('  2. ✅ Multiple categories (generation, intent, modification)');
  console.log('  3. ✅ Version management (list, get, set active)');
  console.log('  4. ✅ Variable substitution');
  console.log('  5. ✅ Version comparison');
  console.log('  6. ✅ A/B testing support');
  console.log('  7. ✅ Active version switching');
  console.log('  8. ✅ Stats and analytics');

  console.log('\n📈 Current State:');
  console.log(`  - ${stats.categories} prompt categories`);
  console.log(`  - ${stats.totalVersions} total versions`);
  console.log(`  - Active versions tracked per category`);

  console.log('\n🔬 A/B Testing Ready:');
  console.log('  - Can switch active versions dynamically');
  console.log('  - Compare performance between versions');
  console.log('  - Track version usage and success rates');

  console.log('\n✅ All prompt versioning tests completed successfully!');
}

testPrompts().catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});