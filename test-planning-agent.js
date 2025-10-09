/**
 * Test du Planning Agent avec raisonnement strict
 */

require('dotenv').config();
const ConversationalGenerator = require('./rag/sessions/conversational-generator');

async function testPlanningAgent() {
  console.log('🧪 Test du Planning Agent avec Chain-of-Thought\n');

  const generator = new ConversationalGenerator();

  // Test 1: Demande simple avec nodes qui existent
  console.log('═'.repeat(60));
  console.log('TEST 1: Webhook vers Slack (nodes existants)');
  console.log('═'.repeat(60));

  try {
    const result1 = await generator.processMessage(
      'Create a webhook that sends notifications to Slack'
    );

    console.log('\n✅ Résultat Test 1:');
    console.log(`   - Action: ${result1.action}`);
    console.log(`   - Nodes: ${result1.workflow?.nodes?.length || 0}`);
    console.log(`   - Valide: ${result1.validation?.valid ? 'Oui' : 'Non'}`);

    if (result1.validation && !result1.validation.valid) {
      console.log(`   - Erreurs: ${result1.validation.errors.length}`);
      result1.validation.errors.slice(0, 3).forEach(err => {
        console.log(`     • ${err}`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur Test 1:', error.message);
  }

  // Test 2: Demande avec node qui n'existe probablement pas
  console.log('\n' + '═'.repeat(60));
  console.log('TEST 2: Integration fictive (test fallback vers HTTP Request)');
  console.log('═'.repeat(60));

  let sessionId = null;
  try {
    // Récupérer sessionId du test 1 s'il existe
    if (typeof result1 !== 'undefined' && result1.sessionId) {
      sessionId = result1.sessionId;
    }
  } catch (e) {
    console.log('   ℹ️ Pas de session du test 1, création nouvelle session');
  }

  try {
    const result2 = await generator.processMessage(
      'Create a workflow that sends data to WhatsApp Business API',
      sessionId
    );

    console.log('\n✅ Résultat Test 2:');
    console.log(`   - Action: ${result2.action}`);
    console.log(`   - Nodes: ${result2.workflow?.nodes?.length || 0}`);
    console.log(`   - Valide: ${result2.validation?.valid ? 'Oui' : 'Non'}`);

    // Vérifier si HTTP Request est utilisé
    const hasHttpRequest = result2.workflow?.nodes?.some(
      node => node.type.toLowerCase().includes('httprequest')
    );
    console.log(`   - Utilise HTTP Request: ${hasHttpRequest ? 'Oui ✅' : 'Non ❌'}`);

    if (result2.validation && result2.validation.warnings.length > 0) {
      console.log(`   - Warnings: ${result2.validation.warnings.length}`);
      result2.validation.warnings.slice(0, 2).forEach(warn => {
        console.log(`     • ${warn}`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur Test 2:', error.message);
  }

  // Cleanup
  await generator.close();

  console.log('\n' + '═'.repeat(60));
  console.log('Tests terminés !');
  console.log('═'.repeat(60));
}

// Exécuter les tests
testPlanningAgent()
  .then(() => {
    console.log('\n✅ Tous les tests sont terminés');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
