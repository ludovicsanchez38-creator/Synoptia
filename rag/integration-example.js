/**
 * Exemple d'intégration RAG avec Workflow Builder existant
 * Montre comment utiliser le générateur enrichi
 */

require('dotenv').config();
const RAGEnhancedGenerator = require('./pipeline/rag-enhanced-generator');

/**
 * Test rapide du générateur RAG
 */
async function quickTest() {
  console.log('🧪 Test RAG-Enhanced Workflow Generator\n');

  const generator = new RAGEnhancedGenerator();

  try {
    // Exemple 1: Workflow email simple
    console.log('='.repeat(60));
    console.log('TEST 1: Workflow email automatique');
    console.log('='.repeat(60));

    const result1 = await generator.generate(
      "Créer un workflow qui envoie un email tous les jours à 9h avec un résumé"
    );

    console.log('\n📄 Workflow généré:');
    console.log(`  Nom: ${result1.workflow.name}`);
    console.log(`  Nodes: ${result1.workflow.nodes.length}`);
    console.log(`  Contexte: ${result1.context.documentsUsed} docs utilisés`);
    console.log(`  Durée: ${(result1.metadata.duration / 1000).toFixed(1)}s`);

    // Exemple 2: Workflow avec webhook
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Workflow webhook + Slack');
    console.log('='.repeat(60));

    const result2 = await generator.generate(
      "Créer un workflow avec un webhook qui reçoit des données et envoie une notification Slack"
    );

    console.log('\n📄 Workflow généré:');
    console.log(`  Nom: ${result2.workflow.name}`);
    console.log(`  Nodes: ${result2.workflow.nodes.length}`);
    console.log(`  Nodes détectés: ${result2.context.nodesDetected.join(', ')}`);
    console.log(`  Type: ${result2.context.workflowType}`);

    // Stats finales
    console.log('\n' + '='.repeat(60));
    console.log('📊 STATISTIQUES FINALES');
    console.log('='.repeat(60));

    const stats = generator.getStats();
    console.log(`  Workflows générés: ${stats.generated}`);
    console.log(`  Avec RAG: ${stats.withRAG} (${stats.ragUsageRate})`);
    console.log(`  Docs moyen/workflow: ${stats.avgContextDocs}`);
    console.log(`  Temps moyen: ${stats.avgGenerationTime}`);

    console.log('\n✅ Tests terminés avec succès !');

    await generator.close();

  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    await generator.close();
    process.exit(1);
  }
}

/**
 * Exemple d'intégration dans MCP Server existant
 */
class IntegratedWorkflowBuilder {
  constructor() {
    this.ragGenerator = new RAGEnhancedGenerator();
  }

  /**
   * Génère un workflow (compatible avec l'API existante)
   */
  async createWorkflow(request, options = {}) {
    const {
      autoExecute = true,
      useRAG = true // Flag pour activer/désactiver RAG
    } = options;

    try {
      let workflow;
      let metadata = {};

      if (useRAG) {
        // Utiliser générateur RAG
        const result = await this.ragGenerator.generate(request);
        workflow = result.workflow;
        metadata = {
          ...result.metadata,
          context: result.context,
          generationMethod: 'rag_enhanced'
        };
      } else {
        // Fallback sur générateur classique
        // workflow = await this.classicGenerator.generate(request);
        metadata = { generationMethod: 'classic' };
      }

      return {
        success: true,
        workflow,
        metadata
      };

    } catch (error) {
      console.error('❌ Erreur création workflow:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Compare génération avec/sans RAG
   */
  async compareGenerations(request) {
    console.log(`\n🔬 Comparaison génération pour: "${request}"\n`);

    // Avec RAG
    console.log('1️⃣ Génération AVEC RAG...');
    const withRAG = await this.createWorkflow(request, { useRAG: true });

    // Sans RAG (à implémenter)
    console.log('2️⃣ Génération SANS RAG...');
    // const withoutRAG = await this.createWorkflow(request, { useRAG: false });

    // Comparaison
    console.log('\n📊 RÉSULTATS:\n');

    console.log('Avec RAG:');
    console.log(`  • Nodes: ${withRAG.workflow.nodes.length}`);
    console.log(`  • Docs utilisés: ${withRAG.metadata.context.documentsUsed}`);
    console.log(`  • Durée: ${(withRAG.metadata.duration / 1000).toFixed(1)}s`);

    // console.log('\nSans RAG:');
    // console.log(`  • Nodes: ${withoutRAG.workflow.nodes.length}`);
    // console.log(`  • Durée: ${(withoutRAG.metadata.duration / 1000).toFixed(1)}s`);

    return { withRAG };
  }

  /**
   * Ferme connexions
   */
  async close() {
    await this.ragGenerator.close();
  }
}

// ============================================================================
// EXEMPLES D'UTILISATION
// ============================================================================

async function examples() {
  console.log('\n📚 EXEMPLES D\'UTILISATION\n');

  // Exemple 1: Test rapide
  if (process.argv.includes('--test')) {
    await quickTest();
    return;
  }

  // Exemple 2: Intégration complète
  const builder = new IntegratedWorkflowBuilder();

  const requests = [
    "Webhook qui traite des paiements Stripe et met à jour Google Sheets",
    "Automatisation email pour relancer les clients inactifs chaque semaine",
    "Workflow AI qui analyse des feedbacks et envoie un rapport sur Slack"
  ];

  for (const request of requests) {
    try {
      console.log('\n' + '='.repeat(70));
      console.log(`📝 Requête: "${request}"`);
      console.log('='.repeat(70));

      const result = await builder.createWorkflow(request, { useRAG: true });

      if (result.success) {
        console.log(`✅ Workflow créé: ${result.workflow.name}`);
        console.log(`   Nodes: ${result.workflow.nodes.length}`);
        console.log(`   Méthode: ${result.metadata.generationMethod}`);

        if (result.metadata.context) {
          console.log(`   Docs utilisés: ${result.metadata.context.documentsUsed}`);
          console.log(`   Nodes détectés: ${result.metadata.context.nodesDetected.join(', ')}`);
        }
      } else {
        console.error(`❌ Échec: ${result.error}`);
      }

      // Pause entre requêtes
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Erreur: ${error.message}`);
    }
  }

  // Stats finales
  console.log('\n' + '='.repeat(70));
  console.log('📊 STATISTIQUES GLOBALES');
  console.log('='.repeat(70));

  const stats = builder.ragGenerator.getStats();
  Object.entries(stats).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  await builder.close();
  console.log('\n✅ Exemples terminés !');
}

// Exécuter si lancé directement
if (require.main === module) {
  examples().catch(error => {
    console.error('\n❌ ERREUR FATALE:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { RAGEnhancedGenerator, IntegratedWorkflowBuilder };