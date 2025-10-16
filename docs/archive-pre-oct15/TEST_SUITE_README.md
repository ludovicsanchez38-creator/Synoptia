# 🧪 Test Suite - 20 Tests de Difficulté Croissante

**Date**: 16 Octobre 2025
**Version**: 1.0.0
**Système**: RAG Optimisé (90/100)

---

## 📋 Vue d'Ensemble

Cette suite de tests évalue le système de génération de workflows n8n avec **20 cas d'usage réels** organisés par difficulté croissante.

### Objectifs

1. **Valider le système RAG optimisé** en production
2. **Mesurer la qualité** des workflows générés automatiquement
3. **Identifier les points faibles** pour amélioration continue
4. **Comparer évaluations automatiques vs manuelles** (Claude vs Humain)

---

## 🎯 Structure des Tests

### Difficulté Croissante (4 niveaux)

| Niveau | Range | Description | Nodes Attendus | Complexité |
|--------|-------|-------------|----------------|------------|
| **FACILE** | 1-5 | Workflows simples 1-2 nodes | 1-2 | Trigger + Action simple |
| **MOYEN** | 6-10 | Workflows 3-5 nodes avec logique | 3-5 | Triggers + Transformations |
| **AVANCÉ** | 11-15 | Multi-intégrations, conditions | 5-8 | Logique complexe, parallèle |
| **EXPERT** | 16-20 | AI Agents, RAG, multi-services | 7-10+ | LangChain, vectorstores, mémoire |

---

## 📊 Critères d'Évaluation Automatique

Chaque test est évalué sur **3 dimensions** avec scores pondérés:

### 1. **Nodes Attendus** (40% du score)
- Vérifie que tous les nodes requis sont présents
- Match exact ou partiel pour nodes LangChain
- Score: `(nodes trouvés / nodes attendus) × 100`

**Exemple**:
```json
{
  "expectedNodes": ["n8n-nodes-base.webhook", "n8n-nodes-base.gmail"],
  "foundNodes": ["n8n-nodes-base.webhook", "n8n-nodes-base.gmail"],
  "score": 100
}
```

### 2. **Architecture** (30% du score)
- ✅ Trigger présent si nécessaire
- ✅ Node count proche de l'attendu (±2 toléré)
- ✅ Complexité correspondante (simple/medium/complex)

**Pénalités**:
- Pas de trigger: -40 points
- Node count éloigné (>2): -30 points
- Complexité incorrecte: -20 points

### 3. **Validation Superviseur** (30% du score)
- ✅ Approuvé par le Supervisor Agent
- ❌ Nodes inventés détectés: 0 points
- ⚠️ Statut incertain: 50 points

---

## 🚀 Exécution des Tests

### Commande

```bash
node scripts/run-test-suite.js
```

### Configuration

- **API**: `http://localhost:3002`
- **Déploiement N8N**: ✅ Activé (simule checkbox cochée dans UI)
- **Timeout**: 10 minutes maximum
- **Pause entre tests**: 2 secondes

### Sortie

Les tests génèrent:

1. **Logs console** en temps réel
2. **Fichiers JSON individuels**: `test-results/test-01-result.json` à `test-20-result.json`
3. **Rapport final**: `test-results/report-final.json`
4. **Log complet**: `/tmp/test-suite-execution.log`

---

## 📈 Interprétation des Résultats

### Score Global

```
Score = (Nodes × 0.4) + (Architecture × 0.3) + (Validation × 0.3)
```

### Critères de Passage

Un test est considéré **PASSÉ** si:
- ✅ Nodes: ≥ 80/100
- ✅ Architecture: ≥ 70/100
- ✅ Validation: ≥ 70/100
- ✅ Score global: ≥ 75/100

### Indicateurs Clés

| KPI | Cible | Excellent |
|-----|-------|-----------|
| **Taux de passage** | ≥ 75% (15/20) | ≥ 90% (18/20) |
| **Score moyen** | ≥ 75/100 | ≥ 85/100 |
| **Durée moyenne** | < 60s | < 30s |
| **Tests FACILE** | 100% (5/5) | 100% (5/5) |
| **Tests EXPERT** | ≥ 60% (3/5) | ≥ 80% (4/5) |

---

## 🔍 Détails des 20 Tests

### FACILE (1-5)

1. **Webhook simple** - 1 node
2. **Webhook + Write File** - 2 nodes
3. **Webhook + Gmail** - 2 nodes
4. **Webhook + Slack** - 2 nodes
5. **Webhook + Google Sheets** - 2 nodes

### MOYEN (6-10)

6. **Google Sheets Trigger → Slack** - 2 nodes
7. **Webhook → HTTP Request → Airtable** - 3 nodes
8. **Webhook → Set → Notion** - 3 nodes
9. **Webhook → IF → Gmail** - 3 nodes (validation email)
10. **Schedule → Postgres → Email** - 3 nodes

### AVANCÉ (11-15)

11. **Webhook HMAC → Airtable + Slack** - 5 nodes (sécurité)
12. **Contact enrichment → CRM** - 4 nodes (API externe + filtres)
13. **Bot WhatsApp** - 3 nodes (switch keywords)
14. **Pipedrive → Sheets + Calendar** - 3 nodes (sync multi-apps)
15. **Shopify orders → Email + Discord** - 4 nodes (e-commerce)

### EXPERT (16-20)

16. **Chatbot AI GPT-4o-mini + Telegram** - 4 nodes LangChain
17. **RAG Qdrant + Agent conversationnel** - 5 nodes LangChain
18. **Pipeline documents → Embeddings → Pinecone** - 5 nodes
19. **E-commerce complet multi-apps** - 7 nodes (Shopify, Stripe, Airtable, Gmail, Slack, ClickUp)
20. **Support client intelligent Discord + AI + Jira** - 9 nodes (sentiment, routing, RAG, memory)

---

## 🤝 Comparaison Claude vs Humain

### Processus

1. **Claude évalue automatiquement** chaque test (scores, architecture, validation)
2. **Humain évalue manuellement** les workflows générés dans n8n
3. **Comparaison des divergences** pour identifier:
   - Faux positifs (Claude trop optimiste)
   - Faux négatifs (Claude trop sévère)
   - Critères manquants (qualité du code, UX, etc.)

### Métriques de Divergence

```
Divergence = |Score_Claude - Score_Humain| / 100
```

- **Divergence acceptable**: < 15% (< 15 points d'écart)
- **Divergence significative**: ≥ 20% (≥ 20 points d'écart)

### Ajustements

Si divergence ≥ 20% sur ≥ 3 tests:
→ Revoir les critères d'évaluation automatique
→ Ajouter métriques manquantes (qualité code, nommage, notes, etc.)
→ Ré-exécuter les tests avec critères améliorés

---

## 📊 Rapport Final

Le rapport final (`test-results/report-final.json`) contient:

```json
{
  "summary": {
    "total": 20,
    "passed": 18,
    "failed": 2,
    "passRate": 0.90,
    "avgScore": 87.3,
    "avgDuration": 28500
  },
  "byDifficulty": {
    "facile": { "total": 5, "passed": 5, "avgScore": 95.2 },
    "moyen": { "total": 5, "passed": 5, "avgScore": 89.8 },
    "avancé": { "total": 5, "passed": 5, "avgScore": 84.1 },
    "expert": { "total": 5, "passed": 3, "avgScore": 78.6 }
  },
  "results": [ /* détails 20 tests */ ]
}
```

---

## 🎯 Utilisation des Résultats

### 1. Identifier Points Faibles

```bash
# Tests échoués
jq '.results[] | select(.passed == false)' test-results/report-final.json

# Scores < 70
jq '.results[] | select(.score < 70)' test-results/report-final.json
```

### 2. Analyser par Difficulté

```bash
# Scores EXPERT
jq '.byDifficulty.expert' test-results/report-final.json
```

### 3. Durées Anomalies

```bash
# Tests > 60s
jq '.results[] | select(.duration > 60000)' test-results/report-final.json
```

---

## 🔧 Debug d'un Test Spécifique

```bash
# Voir résultat complet Test 17
cat test-results/test-17-result.json | jq '.'

# Voir nodes détectés
jq '.result.metadata.nodesDetected' test-results/test-17-result.json

# Voir workflow généré
jq '.result.workflow.nodes[].type' test-results/test-17-result.json
```

---

## 📝 Notes Importantes

### Limites de l'Évaluation Automatique

L'évaluation automatique **NE MESURE PAS**:
- ❌ Qualité du code JavaScript dans nodes Code
- ❌ Pertinence des notes ajoutées
- ❌ Nommage des nodes (clarté)
- ❌ Configuration optimale des paramètres
- ❌ Gestion d'erreurs avancée
- ❌ Performance runtime du workflow

→ **C'est pourquoi la comparaison humaine est essentielle!**

### Nodes Inventés

Si le Supervisor détecte des **nodes inventés** malgré la whitelist de 117 nodes:
→ Vérifier que le serveur a bien chargé la whitelist (restart si nécessaire)
→ Vérifier les logs: "Nodes détectés: X (texte: Y, docs: Z)" - Z doit être > 0
→ Ajouter le node manquant à la whitelist si vraiment valide

---

## 🚀 Prochaines Étapes

1. ✅ **Exécuter les 20 tests** (en cours)
2. ⏳ **Évaluation manuelle par l'humain** (workflows dans n8n)
3. ⏳ **Comparaison divergences** Claude vs Humain
4. ⏳ **Amélioration critères** si divergence > 20%
5. ⏳ **Documentation finale** des résultats

---

**Version**: 1.0.0
**Date**: 16 Oct 2025
**Statut**: ✅ En Exécution
