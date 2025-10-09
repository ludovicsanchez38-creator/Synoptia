# 📊 WORKFLOW BUILDER - RAPPORT DE TESTS

**Date:** 2025-10-06 06:32:57
**Durée totale:** 193.19s

---

## 📈 MÉTRIQUES GLOBALES

| Métrique | Valeur | Attendu | Status |
|----------|--------|---------|--------|
| **Tests exécutés** | 10/10 | 10/10 | ✅ |
| **Taux de succès** | 80.0% | >80% | ✅ |
| **Workflows générés** | 8/10 | 10/10 | ❌ |
| **JSON valides** | 8/10 | 10/10 | ❌ |
| **Temps moyen** | 18.32s | <10s | ⚠️ |
| **Score moyen** | 0.0/100 | >85/100 | ❌ |

---

## 🎯 DISTRIBUTION DES GRADES

| Grade | Nombre | Pourcentage |
|-------|--------|-------------|
| **A+** | 0 | 0.0% |
| **A** | 0 | 0.0% |
| **B** | 0 | 0.0% |
| **C** | 0 | 0.0% |
| **D** | 0 | 0.0% |
| **F** | 10 | 100.0% |

---

## 📋 RÉSULTATS DÉTAILLÉS

| # | Catégorie | Score | Grade | Durée | Status |
|---|-----------|-------|-------|-------|--------|
| 1 | Email | 0/100 | F | 7.30s | ✅ |
| 2 | RSS & Automation | 0/100 | F | 10.34s | ✅ |
| 3 | Scraping | 0/100 | F | 9.25s | ❌ |
| 4 | Chatbot | 0/100 | F | 27.38s | ✅ |
| 5 | Backup | 0/100 | F | 28.53s | ✅ |
| 6 | Notification | 0/100 | F | 6.19s | ✅ |
| 7 | AI Image | 0/100 | F | 47.31s | ❌ |
| 8 | ETL | 0/100 | F | 8.93s | ✅ |
| 9 | Sentiment Analysis | 0/100 | F | 31.37s | ✅ |
| 10 | Onboarding | 0/100 | F | 6.59s | ✅ |

---

## 🔍 ANALYSE PAR PROMPT


### Test #1: Email

**Prompt:** `Crée un workflow qui envoie un email tous les lundis matin à 9h`

**Résultat:**
- Status: ✅ Success
- Score: 0/100
- Grade: F
- Durée: 7.30s
- Nodes: 2
- ⚠️ Warnings: 2

### Test #2: RSS & Automation

**Prompt:** `Automatise la veille : récupère un flux RSS, résume avec IA et envoie vers Notion`

**Résultat:**
- Status: ✅ Success
- Score: 0/100
- Grade: F
- Durée: 10.34s
- Nodes: 3
- ⚠️ Warnings: 3

### Test #3: Scraping

**Prompt:** `Scrape ce site web et stocke les données dans Google Sheets`

**Résultat:**
- Status: ❌ Failed
- Score: 0/100
- Grade: N/A
- Durée: 9.25s
- Nodes: 0

### Test #4: Chatbot

**Prompt:** `Chatbot support client avec base de connaissances`

**Résultat:**
- Status: ✅ Success
- Score: 0/100
- Grade: F
- Durée: 27.38s
- Nodes: 2
- ⚠️ Warnings: 3

### Test #5: Backup

**Prompt:** `Backup automatique MongoDB vers S3 tous les jours`

**Résultat:**
- Status: ✅ Success
- Score: 0/100
- Grade: F
- Durée: 28.53s
- Nodes: 3
- ⚠️ Warnings: 4

### Test #6: Notification

**Prompt:** `Notification Slack quand nouvel email important arrive dans Gmail`

**Résultat:**
- Status: ✅ Success
- Score: 0/100
- Grade: F
- Durée: 6.19s
- Nodes: 2
- ⚠️ Warnings: 3

### Test #7: AI Image

**Prompt:** `Génère des images avec DALL-E et stocke sur Google Drive`

**Résultat:**
- Status: ❌ Failed
- Score: 0/100
- Grade: N/A
- Durée: 47.31s
- Nodes: 0

### Test #8: ETL

**Prompt:** `Pipeline ETL : récupère données API, transforme avec IA, stocke dans PostgreSQL`

**Résultat:**
- Status: ✅ Success
- Score: 0/100
- Grade: F
- Durée: 8.93s
- Nodes: 3
- ⚠️ Warnings: 4

### Test #9: Sentiment Analysis

**Prompt:** `Analyse le sentiment des commentaires réseaux sociaux et alerte si négatif`

**Résultat:**
- Status: ✅ Success
- Score: 0/100
- Grade: F
- Durée: 31.37s
- Nodes: 3
- ⚠️ Warnings: 4

### Test #10: Onboarding

**Prompt:** `Workflow d'onboarding client automatique avec emails et création de comptes`

**Résultat:**
- Status: ✅ Success
- Score: 0/100
- Grade: F
- Durée: 6.59s
- Nodes: 2
- ⚠️ Warnings: 3

---

## 💡 RECOMMANDATIONS

✅ **Excellent!** Le système fonctionne très bien.

⚠️ Score moyen (0.0) inférieur à l'objectif (85). Vérifier la qualité des workflows générés.

⚠️ Temps moyen (18.32s) supérieur à l'objectif (10s). Optimiser les performances.

---

## 📊 COMPARAISON AVEC OBJECTIFS

| Objectif | Valeur actuelle | Cible | Atteint? |
|----------|-----------------|-------|----------|
| Taux de succès | 80.0% | 80% | ✅ |
| Score moyen | 0.0/100 | 85/100 | ❌ |
| Temps moyen | 18.32s | <10s | ❌ |
| Grades A+/A | 0 | >70% | ❌ |

---

**Rapport généré par test-benchmark.py**
