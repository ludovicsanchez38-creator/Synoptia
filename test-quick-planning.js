/**
 * Test rapide du Planning Agent
 */

require('dotenv').config();
const RAGEnhancedGenerator = require('./rag/pipeline/rag-enhanced-generator');

async function quickTest() {
  console.log('🧪 Test Rapide - Planning Agent avec GPT-5\n');

  const generator = new RAGEnhancedGenerator();

  try {
    console.log('Demande: "Create a webhook that sends to Slack"\n');

    const result = await generator.generate('Create a webhook that sends to Slack', {
      autoFix: false,
      maxRetries: 0
    });

    console.log('\n✅ RÉSULTAT:');
    console.log(`   Workflow: ${result.workflow.name}`);
    console.log(`   Nodes: ${result.workflow.nodes.length}`);
    console.log(`   Valide: ${result.validation.valid ? 'Oui ✅' : 'Non ❌'}`);
    console.log(`   Durée: ${(result.metadata.duration / 1000).toFixed(1)}s`);

    console.log('\n📋 NODES UTILISÉS:');
    result.workflow.nodes.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.name} (${node.type})`);
    });

    if (!result.validation.valid) {
      console.log('\n❌ ERREURS:');
      result.validation.errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err}`);
      });
    }

    await generator.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
}

quickTest();
