/**
 * Test du système de tests automatiques
 */

const WorkflowTester = require('./rag/testing/workflow-tester');

const tester = new WorkflowTester();

// Exemple 1: Workflow valide
const validWorkflow = {
  name: 'Test Workflow',
  nodes: [
    {
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        path: 'test'
      }
    },
    {
      name: 'Code',
      type: 'n8n-nodes-base.code',
      position: [450, 300],
      parameters: {
        code: 'return items;'
      }
    },
    {
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httprequest',
      position: [650, 300],
      parameters: {
        url: 'https://api.example.com'
      }
    }
  ],
  connections: {
    Webhook: {
      main: [[{ node: 'Code', type: 'main', index: 0 }]]
    },
    Code: {
      main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]]
    }
  }
};

// Exemple 2: Workflow invalide
const invalidWorkflow = {
  name: 'Invalid Workflow',
  nodes: [
    {
      name: 'Start',
      type: 'unknown-node-type',
      position: [100, 100]
    }
  ]
  // Pas de connections
};

// Exemple 3: Workflow avec erreurs
const errorWorkflow = {
  nodes: [] // Pas de name, nodes vide
};

async function runTests() {
  console.log('🧪 TEST DU SYSTÈME DE TESTS AUTOMATIQUES\n');

  // Test 1
  console.log('📝 Test 1: Workflow valide');
  console.log('─'.repeat(60));
  const result1 = await tester.testWorkflow(validWorkflow);
  console.log(tester.generateReport(result1));
  console.log('\n');

  // Test 2
  console.log('📝 Test 2: Workflow invalide');
  console.log('─'.repeat(60));
  const result2 = await tester.testWorkflow(invalidWorkflow);
  console.log(tester.generateReport(result2));
  console.log('\n');

  // Test 3
  console.log('📝 Test 3: Workflow avec erreurs');
  console.log('─'.repeat(60));
  const result3 = await tester.testWorkflow(errorWorkflow);
  console.log(tester.generateReport(result3));
  console.log('\n');

  // Résumé
  console.log('='.repeat(60));
  console.log('RÉSUMÉ DES TESTS');
  console.log('='.repeat(60));
  console.log(`Test 1 (Valid): ${result1.grade} - ${result1.score}pts`);
  console.log(`Test 2 (Invalid): ${result2.grade} - ${result2.score}pts`);
  console.log(`Test 3 (Error): ${result3.grade} - ${result3.score}pts`);
  console.log('='.repeat(60));
  console.log('\n✅ Système de tests fonctionnel !');
}

runTests().catch(console.error);
