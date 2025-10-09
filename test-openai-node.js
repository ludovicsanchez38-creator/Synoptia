const axios = require('axios');

async function testOpenAINode() {
  console.log('🧪 Test de détection du node OpenAI\n');
  console.log('═'.repeat(70));
  console.log('Test: Workflow avec GPT-5 et génération d\'images');
  console.log('═'.repeat(70) + '\n');

  const request = "Créer un workflow qui utilise GPT-5 pour générer du texte et DALL-E pour créer des images, puis les envoyer par email";

  console.log(`📝 Requête: "${request}"\n`);

  try {
    // Appel API avec streaming
    const response = await axios.post('http://localhost:3002/api/generate',
      { request },
      {
        responseType: 'stream',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    let buffer = '';
    let planningData = null;
    let generatorData = null;
    let workflowId = null;

    response.data.on('data', (chunk) => {
      buffer += chunk.toString();

      // Parser les événements SSE
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // Garder la dernière ligne incomplète

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));

            // Event: context_retrieved
            if (data.event === 'context_retrieved') {
              console.log('📚 CONTEXTE RAG RÉCUPÉRÉ:');
              console.log(`   Documents totaux: ${data.documentsCount || 0}`);
              console.log(`   Exemples de workflows: ${data.workflowExamplesCount || 0}`);

              if (data.documents && data.documents.length > 0) {
                console.log('\n   📄 Top 5 documents trouvés:');
                data.documents.slice(0, 5).forEach((doc, i) => {
                  const type = doc.type === 'workflow_example' ? '🔧 Workflow' : '📖 Doc';
                  console.log(`   ${i + 1}. ${type} ${doc.title} (score: ${doc.score?.toFixed(3)})`);
                  if (doc.workflowInfo) {
                    console.log(`      → ${doc.workflowInfo.complexity} | ${doc.workflowInfo.nodeCount} nœuds | ${doc.workflowInfo.integrations?.slice(0,3).join(', ')}`);
                  }
                });
              }
              console.log('');
            }

            // Event: planning_complete
            if (data.event === 'planning_complete') {
              planningData = data;
              console.log('🤖 EL PLANIFICATOR - PLAN TERMINÉ:');
              console.log(`   Complexité: ${data.complexity}`);
              console.log(`   Nodes requis: ${data.requiredNodes?.length || 0}`);
              console.log(`   Nodes manquants: ${data.missingNodes?.length || 0}`);

              console.log('\n   ✅ Nodes disponibles:');
              if (data.availableNodes && data.availableNodes.length > 0) {
                data.availableNodes.forEach(node => {
                  console.log(`      - ${node.name || node}`);
                });
              } else {
                console.log('      Aucun node détecté comme disponible');
              }

              if (data.missingNodes && data.missingNodes.length > 0) {
                console.log('\n   ❌ Nodes manquants:');
                data.missingNodes.forEach(node => {
                  console.log(`      - ${node}`);
                });
              }
              console.log('');
            }

            // Event: generator_complete
            if (data.event === 'generator_complete') {
              generatorData = data;
              console.log('🏗️  EL GENERATOR - WORKFLOW GÉNÉRÉ:');
              console.log(`   Workflow créé avec ${data.nodesCount || 0} nœuds`);
              console.log('');
            }

            // Event: workflow_created
            if (data.event === 'workflow_created') {
              workflowId = data.workflowId;
              console.log('✅ WORKFLOW CRÉÉ:');
              console.log(`   ID: ${workflowId}`);
              console.log(`   URL: http://n8n.synoptia.fr/workflow/${workflowId}`);
              console.log('');
            }

          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        }
      }
    });

    // Attendre la fin du stream
    await new Promise((resolve, reject) => {
      response.data.on('end', resolve);
      response.data.on('error', reject);

      // Timeout de 5 minutes
      setTimeout(() => {
        response.data.destroy();
        reject(new Error('Timeout après 5 minutes'));
      }, 300000);
    });

    console.log('═'.repeat(70));
    console.log('RÉSUMÉ DU TEST');
    console.log('═'.repeat(70));

    if (planningData) {
      const hasOpenAI = planningData.availableNodes?.some(n =>
        (typeof n === 'string' ? n : n.name)?.toLowerCase().includes('openai')
      );

      console.log(`\n✅ Node OpenAI détecté: ${hasOpenAI ? 'OUI 🎉' : 'NON ❌'}`);

      if (!hasOpenAI && planningData.missingNodes?.some(n => n.toLowerCase().includes('openai'))) {
        console.log('⚠️  OpenAI marqué comme MANQUANT alors qu\'il devrait être disponible!');
      }
    }

    if (workflowId) {
      console.log(`\n🔍 Pour vérifier le workflow généré:`);
      console.log(`   curl -s http://localhost:5678/api/v1/workflows/${workflowId} | grep -o '"type":"[^"]*"' | sort | uniq`);
    }

    console.log('\n✅ Test terminé!\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Lancer le test
testOpenAINode();
