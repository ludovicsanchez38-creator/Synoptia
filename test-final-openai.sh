#!/bin/bash

echo "🧪 TEST FINAL - Détection OpenAI avec RAG"
echo "════════════════════════════════════════"
echo ""

# Test simple qui attend juste les événements clés
node -e "
const { EventSource } = require('eventsource');
const axios = require('axios');

const es = new EventSource('http://localhost:3002/api/reasoning-stream');

let contextReceived = false;
let planningDone = false;
let supervisorResult = null;
let workflowCreated = false;

es.addEventListener('context_retrieved', (e) => {
  const data = JSON.parse(e.data);
  contextReceived = true;
  console.log('✅ RAG:', data.documentsCount, 'docs +', data.workflowExamplesCount, 'workflows');
  console.log('   Nodes détectés:', data.detectedNodes?.join(', ') || 'aucun');
});

es.addEventListener('planning_complete', (e) => {
  const data = JSON.parse(e.data);
  planningDone = true;
  console.log('✅ Planning:', data.nodesCount, 'nodes requis');
  console.log('   Disponibles:', data.availableNodes?.length || 0);
  console.log('   Manquants:', data.missingNodes?.length || 0);
});

es.addEventListener('supervision_start', (e) => {
  console.log('🔍 Supervision en cours...');
});

es.addEventListener('supervision_complete', (e) => {
  const data = JSON.parse(e.data);
  supervisorResult = data;
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('RÉSULTAT SUPERVISOR');
  console.log('══════════════════════════════════════════');
  console.log('Approuvé:', data.approved ? '✅ OUI' : '❌ NON');
  console.log('Nodes inventés:', data.inventedNodes?.length || 0);
  console.log('Champs invalides:', data.invalidFields?.length || 0);

  if (data.inventedNodes?.length > 0) {
    console.log('');
    console.log('❌ Nodes inventés détectés:');
    data.inventedNodes.forEach(n => {
      console.log('   -', n.name, '(' + n.type + ')');
    });
  }

  if (data.invalidFields?.length > 0) {
    console.log('');
    console.log('⚠️  Champs invalides:');
    data.invalidFields.forEach(f => {
      console.log('   -', f.nodeName + ':', f.field);
    });
  }

  if (data.approved) {
    console.log('');
    console.log('🎉 SUCCÈS! Le workflow est valide!');
  }
});

es.addEventListener('workflow_created', (e) => {
  const data = JSON.parse(e.data);
  workflowCreated = true;
  console.log('');
  console.log('✅ Workflow créé:', data.workflowId);
  console.log('   URL: http://n8n.synoptia.fr/workflow/' + data.workflowId);

  setTimeout(() => {
    es.close();
    process.exit(0);
  }, 1000);
});

// Timeout global
setTimeout(() => {
  console.log('');
  console.log('⏱️  Timeout après 3 minutes');
  es.close();
  process.exit(supervisorResult?.approved ? 0 : 1);
}, 180000);

// Attendre 1s puis envoyer la requête
setTimeout(async () => {
  console.log('📤 Envoi de la requête...');
  console.log('');

  try {
    await axios.post('http://localhost:3002/api/create-workflow', {
      message: 'Créer un workflow qui utilise OpenAI GPT-4 pour générer du texte et DALL-E pour créer une image, puis envoyer par email',
      preferences: { includeErrorHandling: true }
    });
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    es.close();
    process.exit(1);
  }
}, 1000);
"
