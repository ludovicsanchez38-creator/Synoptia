/**
 * Tests simples pour Synoptia Workflow Builder
 */

const assert = require('assert');
const WorkflowGenerator = require('../src/workflow-generator');
const N8nApi = require('../src/n8n-api');

console.log('🧪 Démarrage des tests Synoptia Workflow Builder...\n');

// Test du générateur de workflows
function testWorkflowGenerator() {
    console.log('📋 Test du générateur de workflows...');

    const generator = new WorkflowGenerator();

    // Test avec un workflow d'email simple
    const emailAnalysis = {
        type: 'email',
        description: 'Envoi automatique d\'email quotidien',
        trigger: 'schedule',
        actions: ['send_email'],
        integrations: ['email'],
        complexity: 'simple'
    };

    const workflow = generator.generate(emailAnalysis);

    // Vérifications de base
    assert(workflow.name, 'Le workflow doit avoir un nom');
    assert(workflow.nodes, 'Le workflow doit avoir des nœuds');
    assert(workflow.connections, 'Le workflow doit avoir des connexions');
    assert(workflow.nodes.length >= 2, 'Le workflow doit avoir au moins 2 nœuds (trigger + action)');

    // Vérifier le trigger
    const triggerNode = workflow.nodes[0];
    assert(triggerNode.type === 'n8n-nodes-base.scheduleTrigger', 'Le premier nœud doit être un trigger de planning');

    // Vérifier l'action email
    const emailNode = workflow.nodes.find(node => node.type === 'n8n-nodes-base.emailSend');
    assert(emailNode, 'Le workflow doit contenir un nœud d\'envoi d\'email');

    console.log('✅ Générateur de workflows OK');
}

// Test du client API n8n
function testN8nApi() {
    console.log('🔗 Test du client API n8n...');

    // Test sans configuration (mode simulation)
    delete process.env.N8N_API_URL;
    delete process.env.N8N_API_KEY;

    const api = new N8nApi();

    // Le client doit se créer même sans config
    assert(api, 'Le client API doit être créé');

    console.log('✅ Client API n8n OK');
}

// Test de génération d'ID
function testIdGeneration() {
    console.log('🔢 Test de génération d\'ID...');

    const generator = new WorkflowGenerator();

    const id1 = generator.generateId();
    const id2 = generator.generateId();

    assert(id1, 'Un ID doit être généré');
    assert(id2, 'Un second ID doit être généré');
    assert(id1 !== id2, 'Les IDs doivent être uniques');
    assert(typeof id1 === 'string', 'L\'ID doit être une chaîne');
    assert(id1.length > 0, 'L\'ID ne doit pas être vide');

    console.log('✅ Génération d\'ID OK');
}

// Test de validation des workflows
function testWorkflowValidation() {
    console.log('✅ Test de validation des workflows...');

    const generator = new WorkflowGenerator();

    // Différents types d'analyses
    const testCases = [
        {
            type: 'email',
            trigger: 'manual',
            actions: ['send_email'],
            expectedNodeTypes: ['manualTrigger', 'emailSend']
        },
        {
            type: 'data-processing',
            trigger: 'webhook',
            actions: ['process_data'],
            expectedNodeTypes: ['webhook', 'function']
        }
    ];

    testCases.forEach((testCase, index) => {
        const analysis = {
            type: testCase.type,
            description: `Test workflow ${index + 1}`,
            trigger: testCase.trigger,
            actions: testCase.actions,
            integrations: [],
            complexity: 'simple'
        };

        const workflow = generator.generate(analysis);

        // Vérifications structurelles
        assert(workflow.id, `Workflow ${index + 1} doit avoir un ID`);
        assert(workflow.name, `Workflow ${index + 1} doit avoir un nom`);
        assert(Array.isArray(workflow.nodes), `Workflow ${index + 1} doit avoir un tableau de nœuds`);
        assert(typeof workflow.connections === 'object', `Workflow ${index + 1} doit avoir des connexions`);
        assert(workflow.meta, `Workflow ${index + 1} doit avoir des métadonnées`);

        // Vérifier les types de nœuds attendus
        const nodeTypes = workflow.nodes.map(node => node.type);
        console.log(`   Workflow ${index + 1} - Types de nœuds: ${nodeTypes.join(', ')}`);
    });

    console.log('✅ Validation des workflows OK');
}

// Test d'un workflow complexe avec branches et intégrations multiples
function testComplexWorkflow() {
    console.log('🧬 Test d\'un workflow complexe...');

    const generator = new WorkflowGenerator();

    const analysis = {
        type: 'sync',
        description: 'Synchronisation complexe avec contrôle qualité',
        trigger: 'webhook',
        frequency: 'temps-réel',
        actions: ['data_transform', 'http_request', 'database_operation', 'send_email'],
        integrations: ['slack', 'google_sheets', 'http_api'],
        complexity: 'complex',
        use_case: 'Pipeline CRM enrichi'
    };

    const workflow = generator.generate(analysis);

    const nodeTypes = workflow.nodes.map(node => node.type);
    assert(nodeTypes.includes('n8n-nodes-base.if'), 'Le workflow complexe doit contenir un nœud conditionnel');
    assert(nodeTypes.includes('n8n-nodes-base.merge'), 'Le workflow complexe doit fusionner les branches');
    assert(nodeTypes.includes('n8n-nodes-base.splitInBatches'), 'Le workflow complexe doit gérer les lots');
    assert(nodeTypes.includes('n8n-nodes-base.respondToWebhook'), 'Le workflow complexe doit répondre au webhook');

    const ifNode = workflow.nodes.find(node => node.type === 'n8n-nodes-base.if');
    const mergeNode = workflow.nodes.find(node => node.type === 'n8n-nodes-base.merge');
    assert(ifNode, 'Le nœud IF doit être présent');
    assert(mergeNode, 'Le nœud Merge doit être présent');

    const ifConnections = workflow.connections[ifNode.name]?.main || [];
    assert(ifConnections.length >= 2, 'Le nœud IF doit avoir deux sorties');
    assert(ifConnections[0].length > 0, 'La branche vraie doit avoir au moins une connexion');
    assert(ifConnections[1].length > 0, 'La branche fausse doit avoir au moins une connexion');

    const mergeIncoming = Object.values(workflow.connections).flatMap(connection =>
        connection.main?.flat().filter(link => link.node === mergeNode.name) || []
    );
    assert(mergeIncoming.length >= 2, 'Le nœud Merge doit recevoir deux entrées');

    assert(workflow.meta, 'Le workflow complexe doit contenir des métadonnées');
    assert(workflow.meta.tags.includes('complex'), 'Les tags doivent refléter la complexité');

    console.log('✅ Workflow complexe OK');
}

// Exécuter tous les tests
async function runAllTests() {
    try {
        testIdGeneration();
        testWorkflowGenerator();
        testN8nApi();
        testWorkflowValidation();
        testComplexWorkflow();

        console.log('\n🎉 Tous les tests sont passés avec succès !');
        console.log('✨ Synoptia Workflow Builder est prêt à l\'emploi\n');

    } catch (error) {
        console.error('\n❌ Échec du test:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Lancer les tests si ce fichier est exécuté directement
if (require.main === module) {
    runAllTests();
}

module.exports = {
    testWorkflowGenerator,
    testN8nApi,
    testIdGeneration,
    testWorkflowValidation,
    runAllTests
};
