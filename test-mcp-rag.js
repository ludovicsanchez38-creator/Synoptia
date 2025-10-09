/**
 * Script de test pour MCP Server avec RAG
 */

require('dotenv').config();
const axios = require('axios');

const MCP_URL = 'http://localhost:3000';

async function testWorkflowGeneration(request, autoExecute = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 TEST: "${request}"`);
  console.log('='.repeat(70));

  try {
    const startTime = Date.now();

    const response = await axios.post(`${MCP_URL}/api/create-workflow`, {
      request,
      autoExecute,
      preferences: {}
    });

    const duration = Date.now() - startTime;

    if (response.data.success) {
      console.log(`✅ Workflow créé avec succès en ${(duration / 1000).toFixed(1)}s`);
      console.log(`\n📄 Workflow:`);
      console.log(`   Nom: ${response.data.workflow.name}`);
      console.log(`   Description: ${response.data.workflow.description}`);
      console.log(`   Nodes: ${response.data.workflow.nodesCount}`);

      if (response.data.analysis.ragContext) {
        console.log(`\n🧠 Contexte RAG:`);
        console.log(`   Documents utilisés: ${response.data.analysis.ragContext.documentsUsed}`);
        console.log(`   Nodes détectés: ${response.data.analysis.ragContext.nodesDetected.join(', ')}`);
        console.log(`   Temps génération: ${(response.data.analysis.ragContext.generationTime / 1000).toFixed(1)}s`);
      }

      if (response.data.deployment) {
        console.log(`\n🚀 Déploiement:`);
        console.log(`   ID: ${response.data.deployment.id}`);
        console.log(`   URL: ${response.data.deployment.url}`);
      }

      return { success: true, data: response.data };
    } else {
      console.error(`❌ Échec: ${response.data.error}`);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Détails: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n🚀 TESTS MCP SERVER AVEC RAG\n');

  // Attendre que le serveur soit prêt
  console.log('⏳ Attente démarrage serveur...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const tests = [
    {
      name: 'Test 1: Webhook + Slack',
      request: 'Créer un workflow avec webhook qui envoie notification Slack'
    },
    {
      name: 'Test 2: Email automation',
      request: 'Workflow pour envoyer un email Gmail tous les jours à 9h'
    },
    {
      name: 'Test 3: Data sync',
      request: 'Synchroniser Google Sheets avec une base de données'
    }
  ];

  const results = [];

  for (const test of tests) {
    const result = await testWorkflowGeneration(test.request, false);
    results.push({ ...test, ...result });

    // Pause entre tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Statistiques finales
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 RÉSULTATS FINAUX');
  console.log('='.repeat(70));

  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Tests réussis: ${successCount}/${results.length}`);
  console.log(`❌ Tests échoués: ${results.length - successCount}/${results.length}`);

  if (successCount > 0) {
    console.log(`\n🎉 Le MCP Server avec RAG fonctionne !`);
  } else {
    console.log(`\n⚠️ Aucun test n'a réussi, vérifier la configuration`);
  }

  process.exit(successCount === results.length ? 0 : 1);
}

// Vérifier si serveur est lancé
async function checkServerReady() {
  try {
    await axios.get(`${MCP_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Vérification du serveur...');

  const isReady = await checkServerReady();

  if (!isReady) {
    console.error('❌ Le serveur MCP n\'est pas démarré !');
    console.log('\n💡 Lancez d\'abord le serveur avec:');
    console.log('   cd /home/ludo/synoptia-workflow-builder');
    console.log('   npm start');
    process.exit(1);
  }

  console.log('✅ Serveur prêt\n');
  await runTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  });
}

module.exports = { testWorkflowGeneration };