/**
 * Test: Mode Conversationnel
 * Teste l'expérience ChatGPT-like pour créer et modifier des workflows
 */

const ConversationalGenerator = require('./rag/sessions/conversational-generator');
require('dotenv').config();

async function testConversational() {
  console.log('🧪 TEST: Mode Conversationnel - ChatGPT-like Experience\n');
  console.log('='.repeat(70));

  const generator = new ConversationalGenerator();
  let sessionId;

  try {
    // 1. Créer un workflow
    console.log('\n💬 USER: "Create a simple webhook that sends a message to Slack"');
    console.log('-'.repeat(70));

    const result1 = await generator.processMessage(
      'Create a simple webhook that sends a message to Slack',
      null,
      { userId: 'test-user' }
    );

    sessionId = result1.sessionId;

    console.log(`\n📋 Session ID: ${sessionId}`);
    console.log(`🎯 Intent: ${result1.intent}`);
    console.log(`\n🤖 ASSISTANT:\n${result1.message}`);

    // 2. Modifier le workflow
    console.log('\n\n💬 USER: "Add a node to send an email notification"');
    console.log('-'.repeat(70));

    const result2 = await generator.processMessage(
      'Add a node to send an email notification',
      sessionId
    );

    console.log(`🎯 Intent: ${result2.intent}`);
    console.log(`\n🤖 ASSISTANT:\n${result2.message}`);

    // 3. Valider
    console.log('\n\n💬 USER: "Is my workflow valid?"');
    console.log('-'.repeat(70));

    const result3 = await generator.processMessage(
      'Is my workflow valid?',
      sessionId
    );

    console.log(`🎯 Intent: ${result3.intent}`);
    console.log(`\n🤖 ASSISTANT:\n${result3.message}`);

    // 4. Expliquer
    console.log('\n\n💬 USER: "Explain this workflow to me"');
    console.log('-'.repeat(70));

    const result4 = await generator.processMessage(
      'Explain this workflow to me',
      sessionId
    );

    console.log(`🎯 Intent: ${result4.intent}`);
    console.log(`\n🤖 ASSISTANT:\n${result4.message}`);

    // 5. Régénérer
    console.log('\n\n💬 USER: "Can you regenerate it with better error handling?"');
    console.log('-'.repeat(70));

    const result5 = await generator.processMessage(
      'Can you regenerate it with better error handling?',
      sessionId
    );

    console.log(`🎯 Intent: ${result5.intent}`);
    console.log(`\n🤖 ASSISTANT:\n${result5.message}`);

    // Stats session
    console.log('\n\n📊 SESSION STATS');
    console.log('='.repeat(70));

    const sessionStats = generator.getSessionStats(sessionId);
    console.log(`Messages: ${sessionStats.messagesCount}`);
    console.log(`Modifications: ${sessionStats.modificationsCount}`);
    console.log(`Régénérations: ${sessionStats.regenerationsCount}`);
    console.log(`Versions sauvegardées: ${sessionStats.versionsCount}`);
    console.log(`Durée session: ${(sessionStats.duration / 1000).toFixed(1)}s`);

    // Stats globales
    console.log('\n📊 GLOBAL STATS');
    console.log('-'.repeat(70));

    const globalStats = generator.getGlobalStats();
    console.log(`Sessions actives: ${globalStats.activeSessions}`);
    console.log(`Total messages: ${globalStats.totalMessages}`);
    console.log(`Total modifications: ${globalStats.totalModifications}`);
    console.log(`\nGénérateur:`);
    console.log(`  Workflows générés: ${globalStats.generator.generated}`);
    console.log(`  Avec RAG: ${globalStats.generator.ragUsageRate}`);
    console.log(`  Validation pass rate: ${globalStats.generator.validationPassRate}`);

    await generator.close();

    console.log('\n\n✅ Tests conversationnels terminés avec succès!');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testConversational().catch(error => {
  console.error('❌ Erreur globale:', error);
  process.exit(1);
});