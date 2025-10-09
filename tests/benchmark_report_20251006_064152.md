# 📊 WORKFLOW BUILDER - RAPPORT DE TESTS

**Date:** 2025-10-06 06:41:52
**Durée totale:** 168.86s

---

## 📈 MÉTRIQUES GLOBALES

| Métrique | Valeur | Attendu | Status |
|----------|--------|---------|--------|
| **Tests exécutés** | 10/10 | 10/10 | ✅ |
| **Taux de succès** | 80.0% | >80% | ✅ |
| **Workflows générés** | 8/10 | 10/10 | ❌ |
| **JSON valides** | 8/10 | 10/10 | ❌ |
| **Temps moyen** | 15.89s | <10s | ⚠️ |
| **Score moyen** | 78.0/100 | >85/100 | ⚠️ |

---

## 🎯 DISTRIBUTION DES GRADES

| Grade | Nombre | Pourcentage |
|-------|--------|-------------|
| **A+** | 0 | 0.0% |
| **A** | 0 | 0.0% |
| **B** | 8 | 80.0% |
| **C** | 0 | 0.0% |
| **D** | 0 | 0.0% |
| **F** | 2 | 20.0% |

---

## 📋 RÉSULTATS DÉTAILLÉS

| # | Catégorie | Score | Grade | Durée | Status |
|---|-----------|-------|-------|-------|--------|
| 1 | Email | 78/100 | B | 5.93s | ✅ |
| 2 | RSS & Automation | 78/100 | B | 16.76s | ✅ |
| 3 | Scraping | 0/100 | F | 2.10s | ❌ |
| 4 | Chatbot | 78/100 | B | 27.04s | ✅ |
| 5 | Backup | 78/100 | B | 9.27s | ✅ |
| 6 | Notification | 78/100 | B | 26.16s | ✅ |
| 7 | AI Image | 0/100 | F | 3.15s | ❌ |
| 8 | ETL | 78/100 | B | 27.61s | ✅ |
| 9 | Sentiment Analysis | 78/100 | B | 31.91s | ✅ |
| 10 | Onboarding | 78/100 | B | 8.92s | ✅ |

---

## 🔍 ANALYSE PAR PROMPT


### Test #1: Email

**Prompt:** `Crée un workflow qui envoie un email tous les lundis matin à 9h`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 5.93s
- Nodes: 2
- ⚠️ Warnings: 1

### Test #2: RSS & Automation

**Prompt:** `Automatise la veille : récupère un flux RSS, résume avec IA et envoie vers Notion`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 16.76s
- Nodes: 3
- ⚠️ Warnings: 1

### Test #3: Scraping

**Prompt:** `Scrape ce site web et stocke les données dans Google Sheets`

**Résultat:**
- Status: ❌ Failed
- Score: 0/100
- Grade: N/A
- Durée: 2.10s
- Nodes: 0

### Test #4: Chatbot

**Prompt:** `Chatbot support client avec base de connaissances`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 27.04s
- Nodes: 2
- ⚠️ Warnings: 1

### Test #5: Backup

**Prompt:** `Backup automatique MongoDB vers S3 tous les jours`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 9.27s
- Nodes: 3
- ⚠️ Warnings: 1

### Test #6: Notification

**Prompt:** `Notification Slack quand nouvel email important arrive dans Gmail`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 26.16s
- Nodes: 2
- ⚠️ Warnings: 1

### Test #7: AI Image

**Prompt:** `Génère des images avec DALL-E et stocke sur Google Drive`

**Résultat:**
- Status: ❌ Failed
- Score: 0/100
- Grade: N/A
- Durée: 3.15s
- Nodes: 0

### Test #8: ETL

**Prompt:** `Pipeline ETL : récupère données API, transforme avec IA, stocke dans PostgreSQL`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 27.61s
- Nodes: 3
- ⚠️ Warnings: 1

### Test #9: Sentiment Analysis

**Prompt:** `Analyse le sentiment des commentaires réseaux sociaux et alerte si négatif`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 31.91s
- Nodes: 3
- ⚠️ Warnings: 1

### Test #10: Onboarding

**Prompt:** `Workflow d'onboarding client automatique avec emails et création de comptes`

**Résultat:**
- Status: ✅ Success
- Score: 78/100
- Grade: B
- Durée: 8.92s
- Nodes: 2
- ⚠️ Warnings: 1

---

## 💡 RECOMMANDATIONS

✅ **Excellent!** Le système fonctionne très bien.

⚠️ Score moyen (78.0) inférieur à l'objectif (85). Vérifier la qualité des workflows générés.

⚠️ Temps moyen (15.89s) supérieur à l'objectif (10s). Optimiser les performances.

---

## 📊 COMPARAISON AVEC OBJECTIFS

| Objectif | Valeur actuelle | Cible | Atteint? |
|----------|-----------------|-------|----------|
| Taux de succès | 80.0% | 80% | ✅ |
| Score moyen | 78.0/100 | 85/100 | ❌ |
| Temps moyen | 15.89s | <10s | ❌ |
| Grades A+/A | 0 | >70% | ❌ |

---

**Rapport généré par test-benchmark.py**
