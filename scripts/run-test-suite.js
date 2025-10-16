#!/usr/bin/env node

/**
 * 🧪 TEST SUITE RUNNER - 20 Tests de Difficulté Croissante
 *
 * Exécute les 20 tests et génère un rapport d'évaluation complet
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const TEST_SUITE_PATH = path.join(__dirname, '../TEST_SUITE_20.json');
const RESULTS_DIR = path.join(__dirname, '../test-results');
const DEPLOY_TO_N8N = true; // Simulate UI checkbox checked

// Créer dossier de résultats
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Exécuter un test unique
 */
async function runTest(test) {
  const startTime = Date.now();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TEST ${test.id}/20 - ${test.difficulty.toUpperCase()} (niveau ${test.difficultyLevel})`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📝 Prompt: "${test.prompt}"\n`);

  try {
    // Appel API
    const response = await fetch(`${API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: test.prompt,
        autoExecute: DEPLOY_TO_N8N  // Server expects 'autoExecute', not 'deployToN8n'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const duration = Date.now() - startTime;

    // Évaluation automatique
    const evaluation = evaluateResult(test, result);

    const testResult = {
      test,
      result,
      evaluation,
      duration,
      timestamp: new Date().toISOString()
    };

    // Sauvegarder résultat
    const resultFile = path.join(RESULTS_DIR, `test-${test.id.toString().padStart(2, '0')}-result.json`);
    fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));

    // Afficher résultat
    displayEvaluation(test.id, evaluation, duration);

    return testResult;

  } catch (error) {
    console.error(`❌ ERREUR: ${error.message}`);

    const errorResult = {
      test,
      error: error.message,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    const resultFile = path.join(RESULTS_DIR, `test-${test.id.toString().padStart(2, '0')}-error.json`);
    fs.writeFileSync(resultFile, JSON.stringify(errorResult, null, 2));

    return errorResult;
  }
}

/**
 * Évaluer le résultat d'un test
 */
function evaluateResult(test, result) {
  const evaluation = {
    testId: test.id,
    difficulty: test.difficulty,
    scores: {},
    details: {},
    globalScore: 0,
    passed: false
  };

  // 1. Vérifier si le workflow a été généré
  if (!result.workflow || !result.workflow.nodes) {
    evaluation.scores.generation = 0;
    evaluation.details.generation = "Échec de génération - pas de workflow";
    evaluation.globalScore = 0;
    return evaluation;
  }

  evaluation.scores.generation = 100;
  evaluation.details.generation = "✅ Workflow généré";

  const workflow = result.workflow;
  const nodes = workflow.nodes || [];
  const nodeTypes = nodes.map(n => n.type);

  // 2. Vérifier les nodes attendus (40 points)
  const expectedNodes = test.expectedNodes || [];
  const foundNodes = expectedNodes.filter(expectedType => {
    return nodeTypes.some(nodeType => {
      // Match exact ou partial (pour LangChain nodes)
      return nodeType === expectedType || nodeType.includes(expectedType.split('.').pop());
    });
  });

  const nodeMatchRate = expectedNodes.length > 0 ? (foundNodes.length / expectedNodes.length) : 1;
  evaluation.scores.nodes = Math.round(nodeMatchRate * 100);
  evaluation.details.nodes = `${foundNodes.length}/${expectedNodes.length} nodes attendus trouvés`;
  evaluation.details.expectedNodes = expectedNodes;
  evaluation.details.foundNodes = foundNodes;
  evaluation.details.actualNodes = nodeTypes;

  // 3. Vérifier l'architecture (30 points)
  const archExpected = test.expectedArchitecture || {};
  let archScore = 100;
  const archDetails = [];

  // Trigger présent?
  if (archExpected.trigger) {
    const hasTrigger = nodes.some(n =>
      n.type.includes('Trigger') ||
      n.type.includes('webhook') ||
      n.type.includes('chatTrigger')
    );
    if (!hasTrigger) {
      archScore -= 40;
      archDetails.push("❌ Pas de trigger détecté");
    } else {
      archDetails.push("✅ Trigger présent");
    }
  }

  // Node count proche?
  if (archExpected.nodeCount) {
    const diff = Math.abs(nodes.length - archExpected.nodeCount);
    if (diff === 0) {
      archDetails.push(`✅ Node count exact (${nodes.length})`);
    } else if (diff <= 2) {
      archScore -= 10;
      archDetails.push(`⚠️ Node count proche (${nodes.length} vs ${archExpected.nodeCount} attendu)`);
    } else {
      archScore -= 30;
      archDetails.push(`❌ Node count éloigné (${nodes.length} vs ${archExpected.nodeCount} attendu)`);
    }
  }

  // Complexity matching?
  if (archExpected.complexity && result.metadata?.complexity) {
    if (archExpected.complexity === result.metadata.complexity) {
      archDetails.push(`✅ Complexité correcte (${result.metadata.complexity})`);
    } else {
      archScore -= 20;
      archDetails.push(`⚠️ Complexité différente (${result.metadata.complexity} vs ${archExpected.complexity})`);
    }
  }

  evaluation.scores.architecture = Math.max(0, archScore);
  evaluation.details.architecture = archDetails.join(', ');

  // 4. Vérifier l'absence de nodes inventés (30 points)
  const supervisorApproved = result.supervisorApproved !== false;
  const hasInventedNodes = result.inventedNodes && result.inventedNodes.length > 0;

  if (supervisorApproved && !hasInventedNodes) {
    evaluation.scores.validation = 100;
    evaluation.details.validation = "✅ Approuvé par superviseur, pas de nodes inventés";
  } else if (hasInventedNodes) {
    evaluation.scores.validation = 0;
    evaluation.details.validation = `❌ ${result.inventedNodes.length} nodes inventés détectés`;
    evaluation.details.inventedNodes = result.inventedNodes;
  } else {
    evaluation.scores.validation = 50;
    evaluation.details.validation = "⚠️ Workflow généré mais statut superviseur incertain";
  }

  // Score global (moyenne pondérée)
  evaluation.globalScore = Math.round(
    (evaluation.scores.nodes * 0.4) +
    (evaluation.scores.architecture * 0.3) +
    (evaluation.scores.validation * 0.3)
  );

  // Critères de passage
  evaluation.passed =
    evaluation.scores.nodes >= 80 &&
    evaluation.scores.architecture >= 70 &&
    evaluation.scores.validation >= 70 &&
    evaluation.globalScore >= 75;

  return evaluation;
}

/**
 * Afficher l'évaluation
 */
function displayEvaluation(testId, evaluation, duration) {
  console.log(`\n📊 ÉVALUATION TEST ${testId}:`);
  console.log(`   Génération:     ${evaluation.scores.generation || 0}/100`);
  console.log(`   Nodes:          ${evaluation.scores.nodes}/100 - ${evaluation.details.nodes}`);
  console.log(`   Architecture:   ${evaluation.scores.architecture}/100 - ${evaluation.details.architecture}`);
  console.log(`   Validation:     ${evaluation.scores.validation}/100 - ${evaluation.details.validation}`);
  console.log(`   ─────────────────────────────────────────────`);
  console.log(`   SCORE GLOBAL:   ${evaluation.globalScore}/100`);
  console.log(`   STATUT:         ${evaluation.passed ? '✅ PASSÉ' : '❌ ÉCHOUÉ'}`);
  console.log(`   Durée:          ${(duration / 1000).toFixed(1)}s`);
}

/**
 * Générer rapport final
 */
function generateReport(results) {
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📋 RAPPORT FINAL - TEST SUITE 20`);
  console.log(`${'='.repeat(80)}\n`);

  const total = results.length;
  const passed = results.filter(r => r.evaluation?.passed).length;
  const failed = total - passed;

  const avgScore = results.reduce((sum, r) => sum + (r.evaluation?.globalScore || 0), 0) / total;
  const avgDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0) / total;

  console.log(`✅ Tests passés:    ${passed}/${total} (${(passed / total * 100).toFixed(1)}%)`);
  console.log(`❌ Tests échoués:   ${failed}/${total} (${(failed / total * 100).toFixed(1)}%)`);
  console.log(`📊 Score moyen:     ${avgScore.toFixed(1)}/100`);
  console.log(`⏱️  Durée moyenne:   ${(avgDuration / 1000).toFixed(1)}s`);
  console.log(`⏱️  Durée totale:    ${(results.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(1)}s`);

  console.log(`\n📈 SCORES PAR DIFFICULTÉ:\n`);

  const byDifficulty = {
    facile: results.filter(r => r.test.difficulty === 'facile'),
    moyen: results.filter(r => r.test.difficulty === 'moyen'),
    avancé: results.filter(r => r.test.difficulty === 'avancé'),
    expert: results.filter(r => r.test.difficulty === 'expert')
  };

  Object.entries(byDifficulty).forEach(([diff, tests]) => {
    if (tests.length === 0) return;
    const avgScoreDiff = tests.reduce((sum, r) => sum + (r.evaluation?.globalScore || 0), 0) / tests.length;
    const passedDiff = tests.filter(r => r.evaluation?.passed).length;
    console.log(`   ${diff.toUpperCase().padEnd(10)} ${passedDiff}/${tests.length} passés - Score moyen: ${avgScoreDiff.toFixed(1)}/100`);
  });

  console.log(`\n📋 DÉTAILS PAR TEST:\n`);

  results.forEach(r => {
    const status = r.evaluation?.passed ? '✅' : '❌';
    const score = r.evaluation?.globalScore || 0;
    console.log(`   ${status} Test ${r.test.id.toString().padStart(2, '0')} [${r.test.difficulty}] - ${score}/100 - ${r.test.prompt.substring(0, 60)}...`);
  });

  // Sauvegarder rapport
  const report = {
    summary: {
      total,
      passed,
      failed,
      passRate: passed / total,
      avgScore,
      avgDuration
    },
    byDifficulty: Object.fromEntries(
      Object.entries(byDifficulty).map(([diff, tests]) => [
        diff,
        {
          total: tests.length,
          passed: tests.filter(r => r.evaluation?.passed).length,
          avgScore: tests.reduce((sum, r) => sum + (r.evaluation?.globalScore || 0), 0) / tests.length
        }
      ])
    ),
    results: results.map(r => ({
      testId: r.test.id,
      difficulty: r.test.difficulty,
      prompt: r.test.prompt,
      passed: r.evaluation?.passed,
      score: r.evaluation?.globalScore,
      duration: r.duration
    })),
    timestamp: new Date().toISOString()
  };

  const reportFile = path.join(RESULTS_DIR, 'report-final.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log(`\n💾 Rapport sauvegardé: ${reportFile}`);
  console.log(`📁 Résultats individuels: ${RESULTS_DIR}/\n`);
}

/**
 * Main
 */
async function main() {
  console.log(`\n🚀 DÉMARRAGE TEST SUITE - 20 Tests de Difficulté Croissante\n`);
  console.log(`📍 API: ${API_URL}`);
  console.log(`📁 Résultats: ${RESULTS_DIR}`);
  console.log(`🚀 Déploiement N8N: ${DEPLOY_TO_N8N ? 'OUI ✅' : 'NON'}\n`);

  // Charger suite de tests
  const testSuite = JSON.parse(fs.readFileSync(TEST_SUITE_PATH, 'utf8'));
  console.log(`📋 ${testSuite.length} tests chargés\n`);

  // Exécuter tous les tests
  const results = [];

  for (const test of testSuite) {
    const result = await runTest(test);
    results.push(result);

    // Pause entre tests pour ne pas surcharger
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Générer rapport final
  generateReport(results);
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { runTest, evaluateResult, generateReport };
