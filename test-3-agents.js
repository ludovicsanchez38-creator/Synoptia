/**
 * Test du système 3-agents avec supervision Claude
 */

require('dotenv').config();
const RAGEnhancedGenerator = require('./rag/pipeline/rag-enhanced-generator');

async function test3Agents() {
  console.log('🧪 Test Système 3-Agents: Planning + Generation + Supervision\n');
  console.log('=' .repeat(70));
  console.log('Architecture:');
  console.log('  🧠 Agent 1: Planning Agent (GPT-5) → Planification');
  console.log('  🤖 Agent 2: Generator Agent (GPT-5) → Génération');
  console.log('  🔍 Agent 3: Supervisor Agent (Claude Sonnet 4.5) → Validation stricte');
  console.log('=' .repeat(70));

  const generator = new RAGEnhancedGenerator();

  // Test avec une demande simple
  console.log('\n\n📋 TEST: "Create a webhook that sends notifications to Slack"\n');

  try {
    const result = await generator.generate(
      'Create a webhook that sends notifications to Slack',
      {
        autoFix: false,
        maxRetries: 0
      }
    );

    console.log('\n' + '='.repeat(70));
    console.log('✅ RÉSULTAT FINAL');
    console.log('='.repeat(70));
    console.log(`Workflow: ${result.workflow.name}`);
    console.log(`Nodes: ${result.workflow.nodes.length}`);
    console.log(`Valide (validator): ${result.validation.valid ? 'Oui ✅' : 'Non ❌'}`);
    console.log(`Durée totale: ${(result.metadata.duration / 1000).toFixed(1)}s`);

    console.log('\n📋 NODES GÉNÉRÉS:');
    result.workflow.nodes.forEach((node, i) => {
      console.log(`   ${i + 1}. ${node.name}`);
      console.log(`      Type: ${node.type}`);
      console.log(`      Version: ${node.typeVersion || 'N/A'}`);
    });

    console.log('\n📊 STATISTIQUES:');
    const genStats = generator.getStats();
    const supStats = generator.supervisorAgent.getStats();

    console.log(`\n  Planning Agent:`);
    console.log(`    - Plans créés: ${genStats.generated}`);

    console.log(`\n  Generator Agent:`);
    console.log(`    - Workflows générés: ${genStats.generated}`);
    console.log(`    - Avec RAG: ${genStats.ragUsageRate}`);

    console.log(`\n  Supervisor Agent (Claude):`);
    console.log(`    - Validations: ${supStats.validations}`);
    console.log(`    - Approuvés: ${supStats.approved}`);
    console.log(`    - Rejetés: ${supStats.rejected}`);
    console.log(`    - Taux d'approbation: ${supStats.approvalRate}`);

    if (!result.validation.valid) {
      console.log('\n❌ ERREURS DÉTECTÉES:');
      result.validation.errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err}`);
      });
    }

    await generator.close();

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test terminé avec succès !');
    console.log('='.repeat(70));

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

test3Agents();
