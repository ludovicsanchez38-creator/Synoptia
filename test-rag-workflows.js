const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');
require('dotenv').config();

const client = new QdrantClient({ url: 'http://localhost:6333' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testRAGWithWorkflows(query) {
  console.log(`🔍 Recherche RAG: "${query}"\n`);

  // Créer l'embedding de la requête
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 3072
  });

  // Rechercher dans Qdrant
  const results = await client.search('synoptia_knowledge', {
    vector: embedding.data[0].embedding,
    limit: 10,
    filter: {
      must: [
        { key: 'type', match: { value: 'workflow_example' } }
      ]
    },
    with_payload: true
  });

  console.log(`✅ ${results.length} workflows trouvés\n`);

  results.forEach((result, i) => {
    console.log(`${i + 1}. ${result.payload.name} (score: ${result.score.toFixed(3)})`);
    console.log(`   Complexité: ${result.payload.complexity} | Nœuds: ${result.payload.nodeCount}`);
    console.log(`   Intégrations: ${result.payload.integrations.slice(0, 5).join(', ')}`);
    console.log(`   Description: ${result.payload.description.substring(0, 80)}...`);
    console.log('');
  });

  return results;
}

(async () => {
  try {
    // Test 1: Workflow avec OpenAI
    console.log('═'.repeat(60));
    console.log('TEST 1: Workflow avec OpenAI et génération d\'images');
    console.log('═'.repeat(60) + '\n');
    await testRAGWithWorkflows('créer des images avec GPT-4 et OpenAI');

    // Test 2: Workflow e-commerce
    console.log('\n' + '═'.repeat(60));
    console.log('TEST 2: Workflow e-commerce et Slack');
    console.log('═'.repeat(60) + '\n');
    await testRAGWithWorkflows('automatiser les notifications e-commerce avec Slack et Google Sheets');

    // Test 3: Workflow réseaux sociaux
    console.log('\n' + '═'.repeat(60));
    console.log('TEST 3: Workflow réseaux sociaux');
    console.log('═'.repeat(60) + '\n');
    await testRAGWithWorkflows('publier automatiquement sur LinkedIn et Twitter avec planification');

    // Test 4: Statistiques globales
    console.log('\n' + '═'.repeat(60));
    console.log('STATISTIQUES GLOBALES');
    console.log('═'.repeat(60) + '\n');

    const allWorkflows = await client.scroll('synoptia_knowledge', {
      filter: {
        must: [{ key: 'type', match: { value: 'workflow_example' } }]
      },
      limit: 100
    });

    console.log(`📊 Total workflows dans Qdrant: ${allWorkflows.points.length}+`);

    const integrationCounts = {};
    allWorkflows.points.forEach(p => {
      p.payload.integrations.forEach(i => {
        integrationCounts[i] = (integrationCounts[i] || 0) + 1;
      });
    });

    const topIntegrations = Object.entries(integrationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    console.log('\n🔝 Top 15 intégrations disponibles:');
    topIntegrations.forEach(([name, count]) => {
      console.log(`   ${name}: ${count} workflows`);
    });

  } catch(e) {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  }
})();
