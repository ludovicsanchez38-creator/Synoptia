# 🧪 TESTS PRÉ-RELEASE - 20 Workflows Réels

**Date**: 13 Octobre 2025
**Objectif**: Valider le système avec des cas d'usage réels avant release open source
**Méthode**: Tests 1 par 1, envoi direct dans N8N

---

## 📊 CATÉGORIES TESTÉES (basées sur workflows populaires 2025)

- 🤖 **AI Agents & Chatbots** (6 tests)
- 📧 **Email Automation** (3 tests)
- 🔔 **Notifications & Alerts** (3 tests)
- 📊 **Data Processing / ETL** (3 tests)
- 🔒 **Security / Monitoring** (2 tests)
- 🎯 **CRM / Lead Management** (2 tests)
- 📝 **Content Generation** (1 test)

**Total**: 20 tests couvrant les 7 catégories les plus populaires

---

## 🧪 LISTE DES 20 TESTS

### 🟢 NIVEAU 1 : SIMPLE (1-5 nodes) - Tests 1-5

#### Test 1: Email auto-labeling avec AI
**Prompt**: "Créer un workflow qui reçoit les emails Gmail, utilise OpenAI pour suggérer des labels (Partnership, Inquiry, Support), et applique automatiquement le label"

**Nodes attendus**: Gmail Trigger, OpenAI Chat, Gmail Update
**Complexité**: 🟢 Simple (3-4 nodes)
**Catégorie**: 📧 Email + 🤖 AI

---

#### Test 2: Notification Slack pour nouveaux leads
**Prompt**: "Quand un nouveau lead arrive via webhook, envoyer une notification Slack formatée avec nom, email et message"

**Nodes attendus**: Webhook, Set, Slack Send
**Complexité**: 🟢 Simple (3 nodes)
**Catégorie**: 🔔 Notifications

---

#### Test 3: Backup automatique Google Drive
**Prompt**: "Chaque jour à minuit, récupérer les fichiers modifiés dans un dossier Google Drive et les sauvegarder dans un autre dossier"

**Nodes attendus**: Cron, Google Drive List, Loop, Google Drive Copy
**Complexité**: 🟢 Simple (4-5 nodes)
**Catégorie**: 📊 Data Processing

---

#### Test 4: Alert monitoring serveur
**Prompt**: "Vérifier l'état d'un serveur via HTTP Request toutes les 5 minutes, et envoyer un email si le serveur ne répond pas"

**Nodes attendus**: Cron, HTTP Request, IF, Email Send
**Complexité**: 🟢 Simple (4 nodes)
**Catégorie**: 🔒 Monitoring

---

#### Test 5: Résumé quotidien Telegram
**Prompt**: "Tous les matins à 8h, envoyer un message Telegram avec la météo du jour et un conseil motivant généré par AI"

**Nodes attendus**: Cron, HTTP Request (météo API), OpenAI Chat, Telegram Send
**Complexité**: 🟢 Simple (4 nodes)
**Catégorie**: 🔔 Notifications + 🤖 AI

---

### 🟡 NIVEAU 2 : MOYEN (6-10 nodes) - Tests 6-13

#### Test 6: Gmail auto-reply avec AI
**Prompt**: "Quand un email Gmail arrive, analyser le contenu avec OpenAI, générer un brouillon de réponse personnalisé et le sauvegarder comme draft"

**Nodes attendus**: Gmail Trigger, OpenAI Chat, Gmail Create Draft
**Complexité**: 🟡 Moyen (3-5 nodes mais logique complexe)
**Catégorie**: 📧 Email + 🤖 AI

---

#### Test 7: Lead scoring et CRM update
**Prompt**: "Réceptionner un lead via webhook, calculer un score en fonction de critères (budget, timeline, secteur), et créer/mettre à jour dans Airtable avec le score et statut"

**Nodes attendus**: Webhook, Code/Set (scoring), Airtable Search, IF, Airtable Create/Update
**Complexité**: 🟡 Moyen (6-7 nodes)
**Catégorie**: 🎯 CRM

---

#### Test 8: Chatbot Discord avec categorization
**Prompt**: "Créer un bot Discord qui reçoit les messages, utilise OpenAI pour catégoriser (Support, Sales, General), et route vers le bon channel"

**Nodes attendus**: Discord Trigger, OpenAI Chat, Switch, Discord Send (multiple)
**Complexité**: 🟡 Moyen (5-6 nodes)
**Catégorie**: 🤖 AI Chatbot

---

#### Test 9: Data extraction et enrichissement
**Prompt**: "Scraper une page web, extraire les données structurées avec AI, enrichir avec des infos externes (API), et sauvegarder dans Google Sheets"

**Nodes attendus**: HTTP Request (scraping), HTML Extract/Code, OpenAI Chat, HTTP Request (enrichment), Google Sheets Append
**Complexité**: 🟡 Moyen (7-8 nodes)
**Catégorie**: 📊 Data Processing + 🤖 AI

---

#### Test 10: Incident response automation
**Prompt**: "Surveiller les logs d'erreur, détecter les patterns critiques avec AI, créer un ticket Jira automatiquement et notifier l'équipe sur Slack"

**Nodes attendus**: Trigger (webhook/cron), Code (parse logs), OpenAI Chat (analyze), IF, Jira Create, Slack Send
**Complexité**: 🟡 Moyen (7-8 nodes)
**Catégorie**: 🔒 Security + 🤖 AI

---

#### Test 11: Content generation pour blog
**Prompt**: "Générer un article de blog à partir d'un mot-clé, créer le brouillon dans WordPress avec image générée par DALL-E"

**Nodes attendus**: Manual Trigger/Webhook, OpenAI Chat (article), OpenAI Image, WordPress Create
**Complexité**: 🟡 Moyen (4-5 nodes mais contenu riche)
**Catégorie**: 📝 Content Generation + 🤖 AI

---

#### Test 12: Multi-channel notification system
**Prompt**: "Quand un événement critique arrive, envoyer des notifications sur Slack, Discord, Email et SMS (Twilio) simultanément"

**Nodes attendus**: Webhook, Set, Slack Send, Discord Send, Email Send, Twilio SMS
**Complexité**: 🟡 Moyen (6-7 nodes)
**Catégorie**: 🔔 Notifications

---

#### Test 13: Customer support AI triage
**Prompt**: "Recevoir les tickets support via webhook, analyser avec AI pour détecter urgence et catégorie, assigner automatiquement à la bonne équipe"

**Nodes attendus**: Webhook, OpenAI Chat (analyze), Code (scoring), Switch (routing), HTTP Request (assign)
**Complexité**: 🟡 Moyen (6-7 nodes)
**Catégorie**: 🤖 AI + 🎯 CRM

---

### 🔴 NIVEAU 3 : COMPLEXE (11+ nodes) - Tests 14-20

#### Test 14: Chatbot Telegram avec mémoire persistante
**Prompt**: "Créer un chatbot Telegram avec AI Agent, mémoire PostgreSQL, qui se souvient des conversations précédentes et génère des réponses contextuelles"

**Nodes attendus**: Telegram Trigger, AI Agent, OpenAI Chat Model, Memory PostgreSQL, Telegram Send
**Complexité**: 🔴 Complexe (5-7 nodes cluster)
**Catégorie**: 🤖 AI Chatbot

---

#### Test 15: RAG system avec Qdrant
**Prompt**: "Créer un système RAG avec deux endpoints : un pour ingérer des documents (chunking + embeddings + Qdrant), un autre pour rechercher (query + similarity search)"

**Nodes attendus**: Webhook (x2), Document Loader, Text Splitter, OpenAI Embeddings, Qdrant Insert/Search, HTTP Response
**Complexité**: 🔴 Complexe (10-12 nodes)
**Catégorie**: 🤖 AI + 📊 Data

---

#### Test 16: RGPD compliance workflow
**Prompt**: "Pipeline RGPD : webhook reçoit demande, extrait PII avec AI, pseudonymise avec HMAC-SHA256, vectorise pour historique, log dans Google Sheets, répond avec accusé"

**Nodes attendus**: Webhook, Code/AI Extract, Code (crypto), OpenAI Embeddings, Qdrant, Google Sheets, Respond to Webhook
**Complexité**: 🔴 Complexe (14+ nodes)
**Catégorie**: 🔒 Security + 🤖 AI

---

#### Test 17: ETL pipeline avancé
**Prompt**: "ETL quotidien : extraire données de 3 APIs différentes, transformer avec règles métier, déduplication, enrichissement AI, charger dans PostgreSQL avec upsert"

**Nodes attendus**: Cron, HTTP Request (x3), Merge, Code (transform), OpenAI Chat, Deduplicate, PostgreSQL Insert/Update
**Complexité**: 🔴 Complexe (12-15 nodes)
**Catégorie**: 📊 Data Processing

---

#### Test 18: Multi-agent customer journey
**Prompt**: "Workflow avec 3 AI agents : un pour qualifier le lead, un pour générer proposition personnalisée, un pour rédiger email de suivi. Tout automatisé avec décisions conditionnelles"

**Nodes attendus**: Webhook, AI Agent (x3), OpenAI Chat Models, Memory, IF nodes, Email Send, Google Sheets Log
**Complexité**: 🔴 Complexe (15+ nodes)
**Catégorie**: 🤖 AI + 🎯 CRM

---

#### Test 19: Security monitoring avec AI
**Prompt**: "Surveillance sécurité : aggréger logs de plusieurs sources, détecter anomalies avec AI, corréler événements, créer incidents automatiquement, escalade si critique"

**Nodes attendus**: Multiple Triggers, Merge, AI Analysis, Code (correlation), IF/Switch, Jira/ServiceNow, Slack/Email, PagerDuty
**Complexité**: 🔴 Complexe (16+ nodes)
**Catégorie**: 🔒 Security + 🤖 AI

---

#### Test 20: Content creation pipeline complet
**Prompt**: "Pipeline création contenu : keyword research, génération article SEO avec structure H1-H6, génération images DALL-E, optimisation meta tags, publication WordPress, promotion Twitter/LinkedIn"

**Nodes attendus**: Webhook, HTTP Request (keywords), OpenAI Chat (article + meta), OpenAI Image, WordPress Create, Twitter/LinkedIn Post
**Complexité**: 🔴 Complexe (12-14 nodes)
**Catégorie**: 📝 Content + 🤖 AI

---

## 📊 RÉPARTITION DES TESTS

### Par complexité
- 🟢 Simple (1-5 nodes): 5 tests (25%)
- 🟡 Moyen (6-10 nodes): 8 tests (40%)
- 🔴 Complexe (11+ nodes): 7 tests (35%)

### Par catégorie
- 🤖 AI / Chatbots: 6 tests
- 📧 Email: 3 tests
- 🔔 Notifications: 3 tests
- 📊 Data Processing: 3 tests
- 🔒 Security/Monitoring: 2 tests
- 🎯 CRM/Lead: 2 tests
- 📝 Content: 1 test

---

## 🎯 CRITÈRES DE SUCCÈS

Pour chaque test, on vérifie :

**✅ Génération** :
- [ ] Workflow généré en 1ère tentative
- [ ] Temps < 5 minutes
- [ ] Coût < 50 centimes
- [ ] 0 erreurs de validation

**✅ Qualité** :
- [ ] Tous les nodes existent
- [ ] Types corrects (avec @n8n/ pour LangChain)
- [ ] Connexions logiques
- [ ] Parameters cohérents
- [ ] 0 nodes inventés

**✅ Import N8N** :
- [ ] Import réussi sans erreur
- [ ] Workflow visible dans N8N
- [ ] Structure correcte
- [ ] Prêt à être configuré

**✅ Score** :
- [ ] Score Supervisor ≥ 85/100

---

## 🚀 PROCÉDURE D'EXÉCUTION

Pour chaque test :

1. **Lancer la génération**
   ```bash
   curl -X POST http://localhost:3002/api/generate \
     -H "Content-Type: application/json" \
     -d '{"request": "PROMPT_ICI", "deployToN8n": true}'
   ```

2. **Monitorer les logs**
   - Temps de génération
   - Coût API
   - Tentatives nécessaires

3. **Vérifier dans N8N**
   - Ouvrir le workflow créé
   - Vérifier la structure
   - Tester les connexions

4. **Logger les résultats**
   - Success/Fail
   - Temps/Coût
   - Problèmes rencontrés

---

## 📝 TEMPLATE RÉSULTAT

Pour chaque test, remplir :

```markdown
### Test X - [NOM]

**Status**: ✅ SUCCESS / ⚠️ PARTIAL / ❌ FAIL

**Métriques** :
- Temps: XXXs
- Coût: X.XXc€
- Tentatives: X
- Score: XX/100

**Workflow généré** :
- Nodes: X
- Types corrects: ✅/❌
- Import N8N: ✅/❌
- Workflow ID N8N: XXXXXXX

**Problèmes** :
- [Liste des problèmes rencontrés]

**Notes** :
- [Observations]
```

---

## 🎯 OBJECTIF GLOBAL

**Taux de succès attendu** : ≥ 90% (18/20 tests)

Si < 90%, identifier et corriger les problèmes avant release open source.

---

**Prêt à lancer le Test 1** ? 🚀
