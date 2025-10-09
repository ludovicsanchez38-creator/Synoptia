const { EventSource } = require('eventsource');
const axios = require('axios');

async function testOpenAIDetection() {
  console.log('🧪 Test de détection du node OpenAI avec RAG\n');
  console.log('═'.repeat(70));
  console.log('Workflow: GPT-5 + génération d\'images + email');
  console.log('═'.repeat(70) + '\n');

  const request = "Créer un workflow qui utilise GPT-5 pour générer du texte et DALL-E pour créer des images, puis les envoyer par email";

  console.log(`📝 Requête: "${request}"\n`);

  // 1. Connecter au stream SSE
  console.log('📡 Connexion au stream SSE...\n');
  const eventSource = new EventSource('http://localhost:3002/api/reasoning-stream');

  let contextData = null;
  let planningData = null;
  let generatorData = null;
  let workflowId = null;
  let testComplete = false;

  // Event listeners
  eventSource.addEventListener('context_retrieved', (e) => {
    const data = JSON.parse(e.data);
    contextData = data;

    console.log('📚 CONTEXTE RAG RÉCUPÉRÉ:');
    console.log(`   Documents totaux: ${data.documentsCount || data.documents?.length || 0}`);
    console.log(`   Exemples de workflows: ${data.workflowExamplesCount || 0}`);
    console.log(`   Nodes détectés: ${data.detectedNodes?.join(', ') || 'aucun'}`);

    if (data.documents && data.documents.length > 0) {
      console.log('\n   📄 Top 5 documents trouvés:');
      data.documents.slice(0, 5).forEach((doc, i) => {
        const type = doc.type === 'workflow_example' ? '🔧 Workflow' : '📖 Doc';
        const score = doc.score ? ` (score: ${doc.score.toFixed(3)})` : '';
        console.log(`   ${i + 1}. ${type} ${doc.title}${score}`);
        if (doc.workflowInfo) {
          const info = doc.workflowInfo;
          const integrations = info.integrations?.slice(0, 3).join(', ') || '';
          console.log(`      → ${info.complexity} | ${info.nodeCount} nœuds${integrations ? ' | ' + integrations : ''}`);
        }
        if (doc.nodeType) {
          console.log(`      → NodeType: ${doc.nodeType}`);
        }
      });
    }
    console.log('');
  });

  eventSource.addEventListener('planning_complete', (e) => {
    const data = JSON.parse(e.data);
    planningData = data;

    console.log('🤖 EL PLANIFICATOR - PLAN TERMINÉ:');
    console.log(`   Complexité: ${data.complexity}`);
    console.log(`   Nodes requis: ${data.requiredNodes?.length || 0}`);
    console.log(`   Nodes disponibles: ${data.availableNodes?.length || 0}`);
    console.log(`   Nodes manquants: ${data.missingNodes?.length || 0}`);

    if (data.availableNodes && data.availableNodes.length > 0) {
      console.log('\n   ✅ Nodes DISPONIBLES (détectés dans le RAG):');
      data.availableNodes.forEach(node => {
        const nodeName = typeof node === 'string' ? node : node.name;
        console.log(`      - ${nodeName}`);
      });
    } else {
      console.log('\n   ⚠️  Aucun node détecté comme disponible');
    }

    if (data.missingNodes && data.missingNodes.length > 0) {
      console.log('\n   ❌ Nodes MANQUANTS (non trouvés dans le RAG):');
      data.missingNodes.forEach(node => {
        console.log(`      - ${node}`);
      });
    }

    if (data.requiredNodes && data.requiredNodes.length > 0) {
      console.log('\n   📋 Nodes REQUIS (total):');
      data.requiredNodes.forEach(node => {
        console.log(`      - ${node}`);
      });
    }
    console.log('');
  });

  eventSource.addEventListener('generator_complete', (e) => {
    const data = JSON.parse(e.data);
    generatorData = data;

    console.log('🏗️  EL GENERATOR - WORKFLOW GÉNÉRÉ:');
    console.log(`   Nodes créés: ${data.nodesCount || 0}`);
    console.log('');
  });

  eventSource.addEventListener('workflow_created', (e) => {
    const data = JSON.parse(e.data);
    workflowId = data.workflowId;

    console.log('✅ WORKFLOW CRÉÉ ET DÉPLOYÉ:');
    console.log(`   ID: ${workflowId}`);
    console.log(`   URL: http://n8n.synoptia.fr/workflow/${workflowId}`);
    console.log('');
  });

  eventSource.addEventListener('generation_complete', () => {
    testComplete = true;
  });

  eventSource.onerror = (error) => {
    console.error('❌ Erreur SSE:', error.message || 'Connection error');
  };

  // Attendre que la connexion soit établie
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. Envoyer la requête de génération
  console.log('📤 Envoi de la requête de génération...\n');

  try {
    const response = await axios.post('http://localhost:3002/api/create-workflow', {
      message: request,
      preferences: {
        includeErrorHandling: true
      }
    });

    if (!response.data.success) {
      console.error('❌ Erreur génération:', response.data.error);
      eventSource.close();
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erreur requête:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    eventSource.close();
    process.exit(1);
  }

  // 3. Attendre la fin (max 3 minutes)
  console.log('⏳ Génération en cours...\n');

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('⚠️  Timeout après 3 minutes');
      resolve();
    }, 180000);

    const checkComplete = setInterval(() => {
      if (testComplete || workflowId) {
        clearTimeout(timeout);
        clearInterval(checkComplete);
        resolve();
      }
    }, 1000);
  });

  eventSource.close();

  // 4. Analyse des résultats
  console.log('═'.repeat(70));
  console.log('ANALYSE DES RÉSULTATS');
  console.log('═'.repeat(70) + '\n');

  // Vérifier présence OpenAI dans RAG
  if (contextData) {
    const hasOpenAIDoc = contextData.documents?.some(d =>
      d.title?.toLowerCase().includes('openai') ||
      d.nodeType?.toLowerCase().includes('openai')
    );

    console.log(`📚 RAG - Docs OpenAI trouvés: ${hasOpenAIDoc ? '✅ OUI' : '❌ NON'}`);

    if (contextData.workflowExamplesCount > 0) {
      console.log(`🔧 RAG - Exemples de workflows: ✅ ${contextData.workflowExamplesCount} trouvés`);
    }
  }

  // Vérifier détection par Planning Agent
  if (planningData) {
    const hasOpenAIAvailable = planningData.availableNodes?.some(n => {
      const nodeName = typeof n === 'string' ? n : n.name;
      return nodeName?.toLowerCase().includes('openai');
    });

    const hasOpenAIMissing = planningData.missingNodes?.some(n =>
      n.toLowerCase().includes('openai')
    );

    console.log(`🤖 Planning Agent - OpenAI disponible: ${hasOpenAIAvailable ? '✅ OUI' : '❌ NON'}`);

    if (hasOpenAIMissing) {
      console.log(`⚠️  Planning Agent - OpenAI marqué comme MANQUANT`);
      console.log(`   → Problème: Le RAG a trouvé des docs OpenAI mais l'agent ne les reconnaît pas`);
    }

    console.log(`\n📊 Statistiques Planning:`);
    console.log(`   Nodes requis: ${planningData.requiredNodes?.length || 0}`);
    console.log(`   Nodes disponibles: ${planningData.availableNodes?.length || 0}`);
    console.log(`   Nodes manquants: ${planningData.missingNodes?.length || 0}`);
  }

  // Vérifier le workflow généré
  if (workflowId) {
    console.log(`\n🔍 Inspection du workflow ${workflowId}...`);
    try {
      // Note: Cette commande nécessiterait l'accès à l'API n8n
      // Pour l'instant on affiche juste l'info
      console.log(`   URL API: http://localhost:5678/api/v1/workflows/${workflowId}`);
    } catch (e) {
      // Ignore
    }
  }

  console.log('\n✅ Test terminé!\n');
  process.exit(0);
}

// Lancer le test
testOpenAIDetection().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
