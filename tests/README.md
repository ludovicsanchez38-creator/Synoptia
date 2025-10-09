# 🧪 Tests & Benchmark

## Script de benchmark automatique

### Installation

```bash
# Installer les dépendances Python si nécessaire
pip3 install requests
```

### Utilisation

```bash
# Lancer les tests
python3 test-benchmark.py

# Ou directement
./test-benchmark.py
```

### Ce que fait le script

1. **Teste 10 prompts variés** couvrant différentes catégories :
   - Email automation
   - RSS & Automation
   - Web scraping
   - Chatbot
   - Database backup
   - Notifications
   - AI image generation
   - ETL pipelines
   - Sentiment analysis
   - Onboarding workflows

2. **Mesure les métriques** :
   - Taux de succès
   - JSON valide
   - Temps de génération
   - Score de qualité (/100)
   - Distribution des grades (A+ à F)

3. **Génère 2 fichiers** :
   - `benchmark_results_TIMESTAMP.json` - Résultats bruts
   - `benchmark_report_TIMESTAMP.md` - Rapport lisible

### Métriques attendues

| Métrique | Objectif |
|----------|----------|
| Taux de succès | >80% |
| JSON valide | 100% |
| Temps moyen | <10s |
| Score moyen | >85/100 |
| Grades A+/A | >70% |

### Exemple de sortie

```
🧪 SYNOPTIA WORKFLOW BUILDER - BENCHMARK
============================================================

🔄 Test #1: Email
   Prompt: Crée un workflow qui envoie un email tous les lundis matin à 9h
   ✅ Généré en 3.45s - Score: 92/100 (A)

🔄 Test #2: RSS & Automation
   Prompt: Automatise la veille : récupère un flux RSS, résume avec IA et envoie vers Notion
   ✅ Généré en 4.12s - Score: 88/100 (A)

[...]

📊 MÉTRIQUES GLOBALES
- Tests exécutés: 10/10 ✅
- Taux de succès: 90% ✅
- Score moyen: 87.5/100 ✅
- Temps moyen: 4.2s ✅
```

### Personnalisation

Pour ajouter vos propres prompts de test, modifiez la variable `TEST_PROMPTS` dans le script.
