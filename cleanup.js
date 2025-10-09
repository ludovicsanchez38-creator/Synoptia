/**
 * Script de nettoyage des workflows archivés
 */

require('dotenv').config();
const N8nApi = require('./src/n8n-api');

async function cleanupArchivedWorkflows() {
    console.log('🧹 Nettoyage des workflows archivés...');

    const api = new N8nApi();

    try {
        // Tester la connexion
        const test = await api.testConnection();
        if (!test.success) {
            throw new Error('Impossible de se connecter à n8n');
        }

        console.log(`✅ Connecté à n8n (${test.workflowCount} workflows)`);

        // Récupérer tous les workflows
        const result = await api.listWorkflows();
        if (!result.success) {
            throw new Error('Erreur lors de la récupération des workflows');
        }

        const workflows = result.workflows;
        console.log(`📋 ${workflows.length} workflows trouvés`);

        // Filtrer les workflows archivés (si l'API le permet)
        // Pour l'instant on liste tous les workflows
        console.log('\n📝 Liste des workflows :');
        workflows.forEach((wf, index) => {
            console.log(`${index + 1}. ${wf.name} (ID: ${wf.id}) - ${wf.active ? 'Actif' : 'Inactif'}`);
        });

        // Pour supprimer, on peut soit :
        // 1. Supprimer tous les inactifs
        // 2. Demander confirmation pour chaque
        // 3. Supprimer par pattern de nom

        console.log('\n🤔 Options de nettoyage :');
        console.log('1. Supprimer tous les workflows inactifs');
        console.log('2. Supprimer les workflows de test (contenant "test" ou "Email Auto")');
        console.log('3. Tout garder');

        // Pour automatiser, supprimons les workflows de test
        const testWorkflows = workflows.filter(wf =>
            wf.name.includes('Email Auto') ||
            wf.name.includes('test') ||
            wf.name.includes('Test')
        );

        if (testWorkflows.length > 0) {
            console.log(`\n🗑️  Suppression de ${testWorkflows.length} workflows de test...`);

            for (const wf of testWorkflows) {
                try {
                    console.log(`   Suppression: ${wf.name}`);
                    await api.deleteWorkflow(wf.id);
                    console.log(`   ✅ Supprimé: ${wf.name}`);
                } catch (error) {
                    console.log(`   ❌ Erreur: ${wf.name} - ${error.message}`);
                }
            }
        } else {
            console.log('\n✨ Aucun workflow de test à supprimer');
        }

        console.log('\n🎉 Nettoyage terminé !');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        process.exit(1);
    }
}

// Lancer le nettoyage si ce fichier est exécuté directement
if (require.main === module) {
    cleanupArchivedWorkflows();
}

module.exports = cleanupArchivedWorkflows;