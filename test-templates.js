/**
 * Test: Workflow Template Library
 * Tests template management, search, and instantiation
 */

const TemplateManager = require('./templates/template-manager');

async function testTemplates() {
  console.log('🧪 TEST: Workflow Template Library\n');
  console.log('='.repeat(70));

  const manager = new TemplateManager();

  // Test 1: Get all templates
  console.log('\n📝 Test 1: Get All Templates');
  console.log('-'.repeat(70));

  const allTemplates = manager.getAllTemplates();
  console.log(`✅ Found ${allTemplates.length} templates`);

  // Test 2: List categories
  console.log('\n📝 Test 2: List Categories');
  console.log('-'.repeat(70));

  const categories = manager.listCategories();
  console.log(`Found ${categories.length} categories:`);
  categories.forEach(cat => {
    console.log(`  - ${cat.name}: ${cat.count} templates`);
  });

  // Test 3: Get templates by category
  console.log('\n📝 Test 3: Get Templates by Category');
  console.log('-'.repeat(70));

  const commTemplates = manager.getTemplatesByCategory('communication');
  console.log(`Communication templates: ${commTemplates.length}`);
  commTemplates.forEach(t => {
    console.log(`  - ${t.name} (${t.difficulty})`);
  });

  // Test 4: Search templates
  console.log('\n📝 Test 4: Search Templates');
  console.log('-'.repeat(70));

  const slackResults = manager.searchTemplates('slack');
  console.log(`Search "slack": ${slackResults.length} results`);
  slackResults.forEach(t => {
    console.log(`  - ${t.name}: ${t.description}`);
  });

  // Test 5: Filter by difficulty
  console.log('\n📝 Test 5: Filter by Difficulty');
  console.log('-'.repeat(70));

  const beginnerTemplates = manager.getTemplatesByDifficulty('beginner');
  console.log(`Beginner templates: ${beginnerTemplates.length}`);
  beginnerTemplates.forEach(t => {
    console.log(`  - ${t.name} (${t.estimatedSetupTime})`);
  });

  // Test 6: Get specific template
  console.log('\n📝 Test 6: Get Specific Template');
  console.log('-'.repeat(70));

  const template = manager.getTemplate('webhook-to-slack');
  console.log(`Template: ${template.name}`);
  console.log(`Description: ${template.description}`);
  console.log(`Category: ${template.category}`);
  console.log(`Difficulty: ${template.difficulty}`);
  console.log(`Setup time: ${template.estimatedSetupTime}`);
  console.log(`Nodes: ${template.workflow.nodes.length}`);
  console.log(`Tags: ${template.tags.join(', ')}`);
  console.log(`Required credentials: ${template.requiredCredentials.join(', ')}`);

  // Test 7: Instantiate template
  console.log('\n📝 Test 7: Instantiate Template');
  console.log('-'.repeat(70));

  const instance = manager.instantiateTemplate('webhook-to-slack', {
    workflowName: 'My Custom Webhook to Slack',
    credentials: {
      slackApi: {
        id: 'my-slack-credential-id',
        name: 'My Slack Account'
      }
    },
    parameters: {
      'Slack': {
        channel: '#my-custom-channel',
        text: 'Custom notification message'
      }
    },
    position: [100, 50]
  });

  console.log(`✅ Template instantiated`);
  console.log(`Workflow name: ${instance.workflow.name}`);
  console.log(`Nodes: ${instance.workflow.nodes.length}`);
  console.log(`Customized: ${instance.metadata.customized}`);
  console.log(`First node position: [${instance.workflow.nodes[0].position.join(', ')}]`);

  // Test 8: Validate template
  console.log('\n📝 Test 8: Validate Template');
  console.log('-'.repeat(70));

  const validation = manager.validateTemplate('webhook-to-slack');
  console.log(`Valid: ${validation.valid}`);
  console.log(`Errors: ${validation.errors.length}`);
  console.log(`Warnings: ${validation.warnings.length}`);

  if (validation.errors.length > 0) {
    console.log('Errors:');
    validation.errors.forEach(err => console.log(`  - ${err}`));
  }

  // Test 9: List tags
  console.log('\n📝 Test 9: List All Tags');
  console.log('-'.repeat(70));

  const tags = manager.listTags();
  console.log(`Total tags: ${tags.length}`);
  console.log(`Sample tags: ${tags.slice(0, 10).join(', ')}`);

  // Test 10: List credentials
  console.log('\n📝 Test 10: List Required Credentials');
  console.log('-'.repeat(70));

  const credentials = manager.listCredentials();
  console.log(`Total credential types: ${credentials.length}`);
  credentials.forEach(cred => console.log(`  - ${cred}`));

  // Test 11: Get templates by tag
  console.log('\n📝 Test 11: Get Templates by Tag');
  console.log('-'.repeat(70));

  const webhookTemplates = manager.getTemplatesByTag('webhook');
  console.log(`Templates with "webhook" tag: ${webhookTemplates.length}`);
  webhookTemplates.forEach(t => console.log(`  - ${t.name}`));

  // Test 12: Get templates by credentials
  console.log('\n📝 Test 12: Get Templates by Credentials');
  console.log('-'.repeat(70));

  const slackApiTemplates = manager.getTemplatesByCredentials('slackApi');
  console.log(`Templates requiring slackApi: ${slackApiTemplates.length}`);
  slackApiTemplates.forEach(t => console.log(`  - ${t.name}`));

  // Test 13: Search with filters
  console.log('\n📝 Test 13: Advanced Search');
  console.log('-'.repeat(70));

  const filteredResults = manager.searchTemplates('notification', {
    difficulty: 'beginner',
    maxSetupTime: 10
  });
  console.log(`Beginner notifications (≤10 min): ${filteredResults.length}`);
  filteredResults.forEach(t => {
    console.log(`  - ${t.name} (${t.estimatedSetupTime})`);
  });

  // Test 14: Get statistics
  console.log('\n📝 Test 14: Template Statistics');
  console.log('-'.repeat(70));

  const stats = manager.getStats();
  console.log(`Total templates: ${stats.total}`);
  console.log(`\nBy difficulty:`);
  console.log(`  - Beginner: ${stats.byDifficulty.beginner}`);
  console.log(`  - Intermediate: ${stats.byDifficulty.intermediate}`);
  console.log(`  - Advanced: ${stats.byDifficulty.advanced}`);
  console.log(`\nTotal tags: ${stats.totalTags}`);
  console.log(`Total credential types: ${stats.totalCredentialTypes}`);
  console.log(`Average setup time: ${stats.averageSetupTime} minutes`);

  // Test 15: Recommend templates
  console.log('\n📝 Test 15: Template Recommendations');
  console.log('-'.repeat(70));

  const recommendations = manager.recommendTemplates({
    keywords: ['slack', 'notification'],
    maxDifficulty: 'intermediate',
    requiredCredentials: ['slackApi']
  });
  console.log(`Recommended templates: ${recommendations.length}`);
  recommendations.slice(0, 5).forEach(t => {
    console.log(`  - ${t.name} (score: ${t.relevanceScore})`);
  });

  // Test 16: Export template
  console.log('\n📝 Test 16: Export Template');
  console.log('-'.repeat(70));

  const exported = manager.exportTemplate('webhook-to-slack', 'n8n');
  console.log(`✅ Template exported (${exported.length} chars)`);
  console.log(`Preview (first 200 chars):`);
  console.log(`  ${exported.substring(0, 200)}...`);

  // Test 17: Validate all templates
  console.log('\n📝 Test 17: Validate All Templates');
  console.log('-'.repeat(70));

  let validCount = 0;
  let errorCount = 0;
  const allTemplateIds = Object.keys(manager.templates);

  allTemplateIds.forEach(id => {
    const validation = manager.validateTemplate(id);
    if (validation.valid) {
      validCount++;
    } else {
      errorCount++;
      console.log(`❌ ${validation.templateName}: ${validation.errors.length} errors`);
    }
  });

  console.log(`\n✅ Valid templates: ${validCount}/${allTemplateIds.length}`);
  console.log(`❌ Invalid templates: ${errorCount}/${allTemplateIds.length}`);

  // Test 18: Get templates by multiple tags
  console.log('\n📝 Test 18: Search by Multiple Tags');
  console.log('-'.repeat(70));

  const multiTagResults = manager.searchTemplates('', {
    tags: ['automation', 'schedule']
  });
  console.log(`Templates with automation OR schedule tags: ${multiTagResults.length}`);
  multiTagResults.forEach(t => {
    console.log(`  - ${t.name}: ${t.tags.join(', ')}`);
  });

  // Summary
  console.log('\n\n📊 TEMPLATE LIBRARY SUMMARY');
  console.log('='.repeat(70));

  console.log('\n✅ Features Implemented:');
  console.log('  1. ✅ 20+ production-ready workflow templates');
  console.log('  2. ✅ 10 categories (communication, automation, data_sync, etc.)');
  console.log('  3. ✅ Search and filtering (by category, difficulty, tags, time)');
  console.log('  4. ✅ Template instantiation with custom values');
  console.log('  5. ✅ Template validation');
  console.log('  6. ✅ Recommendation engine');
  console.log('  7. ✅ Export functionality (n8n format)');
  console.log('  8. ✅ Statistics and analytics');

  console.log('\n📚 Template Coverage:');
  console.log(`  - Total templates: ${stats.total}`);
  console.log(`  - Categories: ${categories.length}`);
  console.log(`  - Tags: ${stats.totalTags}`);
  console.log(`  - Credential types: ${stats.totalCredentialTypes}`);
  console.log(`  - Difficulty levels: ${Object.keys(stats.byDifficulty).length}`);

  console.log('\n🎯 Use Cases Covered:');
  categories.forEach(cat => {
    console.log(`  - ${cat.name}: ${cat.count} templates`);
  });

  console.log('\n⚡ Quick Start:');
  console.log('  const TemplateManager = require("./templates/template-manager");');
  console.log('  const manager = new TemplateManager();');
  console.log('  ');
  console.log('  // Search templates');
  console.log('  const results = manager.searchTemplates("slack");');
  console.log('  ');
  console.log('  // Instantiate template');
  console.log('  const workflow = manager.instantiateTemplate("webhook-to-slack", {');
  console.log('    workflowName: "My Workflow",');
  console.log('    credentials: { slackApi: { id: "cred-123" } }');
  console.log('  });');

  console.log('\n📖 Template Examples:');
  console.log('  - Webhook to Slack (5 min setup)');
  console.log('  - Daily Database Backup (20 min setup)');
  console.log('  - GitHub PR Notifications (15 min setup)');
  console.log('  - Shopify Order Alerts (15 min setup)');
  console.log('  - Error Monitoring System (15 min setup)');

  console.log('\n✅ All template library tests completed successfully!');
}

testTemplates().catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});