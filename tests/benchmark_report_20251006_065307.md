# 📊 WORKFLOW BUILDER - RAPPORT DE TESTS

**Date:** 2025-10-06 06:53:07
**Durée totale:** 166.60s

---

## 📈 MÉTRIQUES GLOBALES

| Métrique | Valeur | Attendu | Status |
|----------|--------|---------|--------|
| **Tests exécutés** | 10/10 | 10/10 | ✅ |
| **Taux de succès** | 80.0% | >80% | ✅ |
| **Workflows générés** | 8/10 | 10/10 | ❌ |
| **JSON valides** | 8/10 | 10/10 | ❌ |
| **Temps moyen** | 15.66s | <10s | ⚠️ |
| **Score moyen** | 80.5/100 | >85/100 | ⚠️ |

---

## 🎯 DISTRIBUTION DES GRADES

| Grade | Nombre | Pourcentage |
|-------|--------|-------------|
| **A+** | 0 | 0.0% |
| **A** | 2 | 20.0% |
| **B** | 6 | 60.0% |
| **C** | 0 | 0.0% |
| **D** | 0 | 0.0% |
| **F** | 2 | 20.0% |

---

## 📋 RÉSULTATS DÉTAILLÉS

| # | Catégorie | Score | Grade | Durée | Status |
|---|-----------|-------|-------|-------|--------|
| 1 | Email | 88/100 | A | 8.15s | ✅ |
| 2 | RSS & Automation | 78/100 | B | 10.62s | ✅ |
| 3 | Scraping | 0/100 | F | 2.87s | ❌ |
| 4 | Chatbot | 78/100 | B | 28.94s | ✅ |
| 5 | Backup | 88/100 | A | 10.29s | ✅ |
| 6 | Notification | 78/100 | B | 25.95s | ✅ |
| 7 | AI Image | 0/100 | F | 3.10s | ❌ |
| 8 | ETL | 78/100 | B | 29.87s | ✅ |
| 9 | Sentiment Analysis | 78/100 | B | 11.83s | ✅ |
| 10 | Onboarding | 78/100 | B | 24.96s | ✅ |

---

## 🔍 ANALYSE PAR PROMPT


### Test #1: Email

**Prompt:** `Crée un workflow qui envoie un email tous les lundis matin à 9h`

**Résultat:**
- Status: ✅ Success
- Score: 88/100
- Grade: A
- Durée: 8.15s
- Nodes: 2

### Test #2: RSS & Automation

**Prompt:** `Automatise la veille : récupère un flux RSS, résume avec IA et envoie vers Notion`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 10.62s
- Nodes: 3
- ⚠️ Warnings: 1

### Test #3: Scraping

**Prompt:** `Scrape ce site web et stocke les données dans Google Sheets`

**Résultat:**
- Status: ❌ Failed
- Score: 0/100
- Grade: N/A
- Durée: 2.87s
- Nodes: 0

### Test #4: Chatbot

**Prompt:** `Chatbot support client avec base de connaissances`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 28.94s
- Nodes: 2
- ⚠️ Warnings: 1

### Test #5: Backup

**Prompt:** `Backup automatique MongoDB vers S3 tous les jours`

**Résultat:**
- Status: ✅ Success
- Score: 88/100
- Grade: A
- Durée: 10.29s
- Nodes: 3

### Test #6: Notification

**Prompt:** `Notification Slack quand nouvel email important arrive dans Gmail`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 25.95s
- Nodes: 2
- ⚠️ Warnings: 1

### Test #7: AI Image

**Prompt:** `Génère des images avec DALL-E et stocke sur Google Drive`

**Résultat:**
- Status: ❌ Failed
- Score: 0/100
- Grade: N/A
- Durée: 3.10s
- Nodes: 0

### Test #8: ETL

**Prompt:** `Pipeline ETL : récupère données API, transforme avec IA, stocke dans PostgreSQL`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 29.87s
- Nodes: 3
- ⚠️ Warnings: 1

### Test #9: Sentiment Analysis

**Prompt:** `Analyse le sentiment des commentaires réseaux sociaux et alerte si négatif`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 11.83s
- Nodes: 3
- ⚠️ Warnings: 1

### Test #10: Onboarding

**Prompt:** `Workflow d'onboarding client automatique avec emails et création de comptes`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 24.96s
- Nodes: 2
- ⚠️ Warnings: 1

---

## 💡 RECOMMANDATIONS

✅ **Excellent!** Le système fonctionne très bien.

⚠️ Score moyen (80.5) inférieur à l'objectif (85). Vérifier la qualité des workflows générés.

⚠️ Temps moyen (15.66s) supérieur à l'objectif (10s). Optimiser les performances.

---

## 📊 COMPARAISON AVEC OBJECTIFS

| Objectif | Valeur actuelle | Cible | Atteint? |
|----------|-----------------|-------|----------|
| Taux de succès | 80.0% | 80% | ✅ |
| Score moyen | 80.5/100 | 85/100 | ❌ |
| Temps moyen | 15.66s | <10s | ❌ |
| Grades A+/A | 2 | >70% | ❌ |

---

**Rapport généré par test-benchmark.py**
