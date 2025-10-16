# 📚 Documentation Complète - Synoptia Workflow Builder

**Version** : 1.0.0
**Date** : 9 octobre 2025
**Auteur** : Ludovic Sanchez @ Synoptia

---

# Table des matières

1. [Introduction](#introduction)
2. [Architecture Multi-Agent](#architecture-multi-agent)
3. [Installation & Setup](#installation--setup)
4. [Utilisation](#utilisation)
5. [Architecture Technique](#architecture-technique)
6. [RAG System](#rag-system)
7. [Cost Tracking](#cost-tracking)
8. [API Reference](#api-reference)
9. [Contribuer](#contribuer)
10. [Sécurité](#sécurité)
11. [FAQ](#faq)

---

# Introduction

## 🤖 Qu'est-ce que Synoptia Workflow Builder ?

Synoptia Workflow Builder est un système multi-agent qui génère des workflows n8n production-ready en quelques minutes à partir d'une simple demande en français naturel.

### Exemple concret

**Input** : "Gérer automatiquement ma base RGPD à l'envoi d'un devis"

**Output** :
- 17 nodes n8n configurés
- Pipeline complet avec pseudonymisation, extraction IA, classification légale
- Vectorisation et export Google Sheets
- **Temps** : 5 minutes
- **Coût** : 17 centimes
- **Qualité** : Grade A (89/100)

### Pourquoi c'est différent ?

❌ **Agents simples** : Peuvent halluciner, manquent de spécialisation
✅ **Multi-agent** : 3 agents collaboratifs avec feedback loop

---

# Architecture Multi-Agent

## Les 3 Agents

### 1. 🧠 El Planificator (GPT-5)
**Rôle** : Agent de planning et analyse stratégique

**Responsabilités** :
- Analyse la demande utilisateur
- Identifie les nodes n8n nécessaires
- Détecte les intégrations requises
- Évalue la complexité (simple/medium/complex)
- Recherche dans le RAG (2509 embeddings : 1800 workflows + 709 docs)
- Propose des alternatives si nodes manquants

**Output** :
```json
{
  "requiredNodes": ["Gmail", "OpenAI", "Google Sheets"],
  "availableNodes": ["Gmail", "OpenAI", "Google Sheets"],
  "missingNodes": [],
  "complexity": "medium",
  "estimatedTime": "10-15 minutes"
}
```

### 2. ⚡ El Generator (GPT-5)
**Rôle** : Expert en génération de workflows JSON

**Responsabilités** :
- Génère le JSON n8n complet
- Configure tous les paramètres des nodes
- Établit les connexions entre nodes
- Ajoute la gestion d'erreurs (`continueOnFail`)
- Utilise uniquement des nodes documentés

**Output** :
```json
{
  "name": "Gmail RGPD Analyzer",
  "nodes": [...],
  "connections": {...},
  "settings": {...}
}
```

### 3. 🔍 El Supervisor (Claude Sonnet 4.5)
**Rôle** : Validateur strict et implacable

**Responsabilités** :
- Valide chaque node (0 tolérance pour les nodes inventés)
- Vérifie les types exacts n8n
- Contrôle la structure JSON
- Détecte les champs invalides
- Approuve ou rejette avec feedback détaillé

**Output** :
```json
{
  "approved": true,
  "inventedNodes": [],
  "invalidFields": [],
  "errors": 0,
  "warnings": 0,
  "score": 89
}
```

## Feedback Loop

```
┌─────────────────┐
│  Planificator   │
└────────┬────────┘
         ▼
┌─────────────────┐
│   Generator     │
└────────┬────────┘
         ▼
┌─────────────────┐
│   Supervisor    │◄─┐
└────────┬────────┘  │
         │           │
         ▼           │
    ✅ OK ───── ❌ Retry (max 3x)
```

**Avantages** :
- Auto-correction automatique
- Amélioration itérative
- Taux de succès : 100%
- Réduction coûts : -36%

---

# Installation & Setup

## Prérequis

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** (pour Qdrant)
- **Redis** (optionnel, pour le cache)

## Installation rapide

```bash
# 1. Clone le repo
git clone https://github.com/ludovicsanchez38-creator/Synoptia.git
cd Synoptia

# 2. Installe les dépendances
npm install

# 3. Configure l'environnement
cp .env.example .env

# Édite .env avec tes clés API :
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# N8N_API_URL=https://your-n8n.com/api/v1 (optionnel)
# N8N_API_KEY=your-key (optionnel)

# 4. Lance Qdrant (vector database)
docker run -d -p 6333:6333 qdrant/qdrant

# 5. Ingère la documentation n8n
npm run ingest

# 6. Lance le serveur
npm start
```

Le serveur démarre sur **http://localhost:3002**

## Configuration avancée

### Variables d'environnement

```bash
# API Keys (OBLIGATOIRE)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# n8n (OPTIONNEL - pour export automatique)
N8N_API_URL=https://n8n.synoptia.fr/api/v1
N8N_API_KEY=your-key

# Server
PORT=3002
NODE_ENV=development

# RAG System
QDRANT_URL=http://localhost:6333
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Feature Flags
ENABLE_RAG=true
```

### Installation systemd (production)

Voir [INSTALL_SYSTEMD.md](INSTALL_SYSTEMD.md) pour configurer le service en production.

---

# Utilisation

## Interface Web

1. Ouvre **http://localhost:3002**
2. Entre ta demande en français dans le champ texte
3. Clique sur "Générer le workflow"
4. Observe les 3 agents travailler en temps réel
5. Télécharge le workflow JSON généré
6. Importe-le dans n8n

## Exemples de demandes

### Simple
```
"Envoyer un email tous les lundis matin"
```

### Moyen
```
"Analyser les emails Gmail avec OpenAI et créer des tâches dans Notion"
```

### Complexe
```
"Gérer automatiquement ma base RGPD :
- Pseudonymiser les données clients
- Extraire les infos avec IA
- Classifier selon la loi
- Vectoriser et stocker dans Qdrant
- Exporter vers Google Sheets"
```

## API REST

### POST /api/generate

Génère un workflow à partir d'une demande.

**Request** :
```bash
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Créer un workflow qui analyse des emails"
  }'
```

**Response** :
```json
{
  "success": true,
  "sessionId": "abc123",
  "workflow": {
    "name": "Email Analyzer",
    "nodes": [...],
    "connections": {...}
  },
  "costs": {
    "planning": "5.33c€",
    "generator": "9.72c€",
    "supervisor": "2.86c€",
    "total": "17.91c€"
  },
  "duration": "5min 47s"
}
```

### GET /api/reasoning-stream

Stream SSE pour suivre la génération en temps réel.

```javascript
const eventSource = new EventSource('/api/reasoning-stream');

eventSource.addEventListener('planning_complete', (e) => {
  const data = JSON.parse(e.data);
  console.log('Planning done:', data);
});

eventSource.addEventListener('workflow_generated', (e) => {
  const data = JSON.parse(e.data);
  console.log('Workflow ready:', data);
});
```

---

# Architecture Technique

## Stack Technologique

**Backend** :
- Node.js 18+
- Express.js
- OpenAI GPT-5 API
- Anthropic Claude Sonnet 4.5 API

**Vector Database** :
- Qdrant (embeddings)
- 2000+ workflows indexés
- 365 intégrations documentées

**Cache** :
- Redis (optionnel)
- Cache des embeddings

**Frontend** :
- HTML5 + CSS3 + Vanilla JS
- Server-Sent Events (SSE)
- Real-time updates

## Structure du projet

```
synoptia-workflow-builder/
├── rag/
│   ├── pipeline/
│   │   ├── planning-agent.js      # El Planificator
│   │   ├── rag-enhanced-generator.js  # El Generator
│   │   └── supervisor-agent.js    # El Supervisor
│   ├── retrieval/
│   │   └── workflow-context-retriever.js
│   └── validation/
│       └── workflow-validator.js
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── utils/
│   ├── logger.js
│   └── cost-tracker.js
├── middleware/
│   └── security.js
├── data/
│   └── n8n-docs/              # 365 nodes documentés
├── scripts/
│   └── ingest-all.js          # Script d'ingestion
└── server.js                  # Entry point
```

## Flux de données

```
User Request
    ↓
Server.js (SSE setup)
    ↓
ConversationalGenerator
    ↓
┌──────────────────┐
│ El Planificator  │
│   (GPT-5)        │
│                  │
│ 1. Analyze query │
│ 2. Search RAG    │
│ 3. Create plan   │
└────────┬─────────┘
         ↓
    RAG Search
         ↓
┌──────────────────┐
│ El Generator     │
│   (GPT-5)        │
│                  │
│ 1. Read plan     │
│ 2. Generate JSON │
│ 3. Add safety    │
└────────┬─────────┘
         ↓
┌──────────────────┐
│ El Supervisor    │
│ (Claude 4.5)     │
│                  │
│ 1. Validate all  │
│ 2. Check types   │
│ 3. Approve/Retry │
└────────┬─────────┘
         ↓
    Workflow JSON
         ↓
      Client
```

---

# RAG System

## Vue d'ensemble

Le système RAG (Retrieval Augmented Generation) est au cœur de Synoptia.

**Données indexées** :
- 1800 workflows n8n réels (GitHub n8n-workflows-github)
- 709 docs officiels N8N (562 nodes enrichis avec metadata isRootNode/isSubNode)
- Total : 2509 embeddings
- Types exacts de nodes extraits

**Vector Database** : Qdrant
**Embeddings** : OpenAI `text-embedding-3-large` (3072 dimensions)

## Sources de données

### Workflows GitHub (1800 embeddings)
- **Source** : Repository GitHub n8n-workflows-github
- **Mise à jour** : Via `scripts/sync-workflows.sh`
- **Contenu** : Workflows communautaires réels avec descriptions et nodes
- **Utilité** : Exemples concrets d'implémentations

### Documentation N8N (709 embeddings)
- **Source** : Docs officielles N8N (docs.n8n.io)
- **Mise à jour** : Via `scripts/update-rag-docs.sh`
- **Enrichissement** : 562 docs avec metadata `isRootNode`/`isSubNode`
- **Utilité** :
  - Validation des types de nodes exacts
  - Détection sub-nodes (OpenAI Chat Model, etc.)
  - Prévention d'usage standalone de sub-nodes

## Recherche hybride

**70% Documentation** + **30% Workflow Examples**

```javascript
// 21 documents de documentation
const docs = await qdrant.search({
  vector: queryVector,
  limit: 21,
  filter: { source: 'n8n-docs' }
});

// 9 exemples de workflows
const examples = await qdrant.search({
  vector: queryVector,
  limit: 9,
  filter: { source: 'n8n-workflows-github' }
});
```

## Extraction des types exacts

Innovation clé qui élimine l'invention de nodes :

```javascript
// Extrait "n8n-nodes-langchain.openai" depuis la doc
const nodeTypeMatches = doc.content.match(
  /n8n-nodes-(?:base|langchain)\.[\w]+/g
);

// Map les alias vers types officiels
const aliasMapping = {
  'gpt': 'openai',
  'gpt-5': 'openai',
  'chatgpt': 'openai'
};
```

**Résultat** : 0 nodes inventés (100% de nodes valides)

## Performance

- **Temps de recherche** : ~100-200ms
- **Accuracy** : 95%+ sur détection de nodes
- **Cache** : Redis (optionnel) pour embeddings

---

# Cost Tracking

## Système de tracking

Tous les appels API sont trackés en temps réel avec conversion USD → EUR.

### Pricing

**GPT-5** :
- Input : $1.25 / 1M tokens
- Output : $10.00 / 1M tokens

**Claude Sonnet 4.5** :
- Input : $3.00 / 1M tokens
- Output : $15.00 / 1M tokens

**Taux de change** : 1 USD = 0.91 EUR

### Coûts moyens par workflow

| Complexité | Planning | Generator | Supervisor | Total |
|------------|----------|-----------|------------|-------|
| Simple     | 3-5c€    | 5-8c€     | 2-3c€      | 10-16c€ |
| Medium     | 5-7c€    | 8-12c€    | 2-4c€      | 15-23c€ |
| Complex    | 7-10c€   | 12-18c€   | 3-5c€      | 22-33c€ |

### Affichage temps réel

L'interface web affiche les coûts en direct pour chaque agent :

```javascript
// SSE Event
{
  "event": "agent_cost",
  "data": {
    "agentId": "planning",
    "costFormatted": "5.33c€",
    "totalCostFormatted": "5.33c€",
    "inputTokens": 1343,
    "outputTokens": 5728
  }
}
```

---

# API Reference

## Endpoints

### POST /api/generate

Génère un workflow n8n.

**Headers** :
```
Content-Type: application/json
```

**Body** :
```json
{
  "message": "string (required, 5-1000 chars)",
  "sessionId": "string (optional, 32 hex chars)",
  "options": {
    "autoFix": "boolean (default: true)",
    "maxRetries": "number (0-5, default: 2)"
  }
}
```

**Response** :
```json
{
  "success": true,
  "sessionId": "abc123",
  "workflow": { ... },
  "costs": {
    "planning": "5.33c€",
    "generator": "9.72c€",
    "supervisor": "2.86c€",
    "total": "17.91c€"
  },
  "duration": "347s",
  "retries": 0
}
```

**Errors** :
```json
{
  "success": false,
  "error": "Validation Error",
  "details": [
    {
      "field": "message",
      "message": "Le message doit contenir au moins 5 caractères"
    }
  ]
}
```

### GET /api/reasoning-stream

Stream SSE des événements de génération.

**Events** :
- `workflow_request` : Nouvelle demande
- `planning_start` : Planning démarré
- `planning_complete` : Planning terminé
- `context_retrieved` : RAG recherche terminée
- `generation_start` : Génération démarrée
- `generation_complete` : Génération terminée
- `supervision_start` : Validation démarrée
- `supervision_complete` : Validation terminée
- `supervision_retry` : Retry nécessaire
- `workflow_generated` : Workflow final
- `agent_cost` : Mise à jour coût
- `error` : Erreur

**Example** :
```javascript
const eventSource = new EventSource('/api/reasoning-stream');

eventSource.addEventListener('planning_complete', (e) => {
  const data = JSON.parse(e.data);
  console.log(`Plan créé: ${data.nodesCount} nodes`);
});
```

### GET /health

Health check endpoint.

**Response** :
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

---

# Contribuer

## Process

1. **Fork** le repo
2. **Clone** ton fork
3. **Branch** : `git checkout -b feature/ma-feature`
4. **Code** : Fais tes modifications
5. **Test** : `npm test`
6. **Commit** : `git commit -m "✨ feat: Add feature"`
7. **Push** : `git push origin feature/ma-feature`
8. **PR** : Ouvre une Pull Request

## Standards de code

**Style** :
- Indentation : 2 espaces
- Quotes : Single quotes `'`
- Semicolons : Oui
- Naming : camelCase (variables), PascalCase (classes)

**Commits** :
```
✨ feat: Nouvelle feature
🐛 fix: Bug fix
📝 docs: Documentation
♻️ refactor: Refactoring
🧪 test: Tests
🔒 security: Sécurité
```

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour le guide complet.

---

# Sécurité

## Best Practices

**1. Ne jamais committer de secrets**
```bash
# ❌ JAMAIS
git add .env

# ✅ TOUJOURS
echo ".env" >> .gitignore
```

**2. Clés API**
- Variables d'environnement uniquement
- Régénérez si exposées
- Rotation régulière

**3. Validation des inputs**
- Sanitization automatique
- Joi schemas
- Express-validator

**4. Rate limiting**
- 20 req/15min (génération)
- 100 req/15min (standard)
- 300 req/15min (public endpoints)

## Reporter une vulnérabilité

**Ne créez PAS d'issue publique.**

Contact : **ludo@synoptia.fr**

Voir [SECURITY.md](SECURITY.md) pour la politique complète.

---

# FAQ

## Général

**Q: Quel est le coût moyen par workflow ?**
R: Entre 17 et 50 centimes d'euro selon la complexité.

**Q: Combien de temps prend la génération ?**
R: 5-25 minutes selon la complexité du workflow.

**Q: Peut-on utiliser d'autres LLMs ?**
R: Actuellement GPT-5 et Claude Sonnet 4.5. Support d'autres LLMs prévu.

## Technique

**Q: Pourquoi Qdrant et pas une autre vector DB ?**
R: Performance, simplicité d'installation (Docker), et support des filtres avancés.

**Q: Peut-on désactiver le cache Redis ?**
R: Oui, Redis est optionnel. Le système fonctionne sans.

**Q: Comment ajouter de nouveaux workflows au RAG ?**
R: Placez vos workflows JSON dans `data/workflows/` et relancez `npm run ingest`.

## Dépannage

**Q: "Error: Qdrant connection failed"**
R: Vérifiez que Qdrant tourne : `docker ps | grep qdrant`

**Q: "Error: OpenAI API key invalid"**
R: Vérifiez votre `.env` et que la clé est valide sur platform.openai.com

**Q: Le workflow généré a des erreurs dans n8n**
R: Vérifiez que vous utilisez la même version de n8n que dans la doc (>=1.0.0)

---

# Ressources

## Liens utiles

- **GitHub** : https://github.com/ludovicsanchez38-creator/Synoptia
- **Website** : https://synoptia.fr
- **LinkedIn** : https://www.linkedin.com/in/ludovic-sanchez-658b2854/
- **Email** : ludo@synoptia.fr

## Documentation externe

- **n8n** : https://docs.n8n.io
- **OpenAI** : https://platform.openai.com/docs
- **Anthropic** : https://docs.anthropic.com
- **Qdrant** : https://qdrant.tech/documentation

---

# Changelog

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique complet des versions.

---

# License

MIT License - Copyright (c) 2025 Ludovic Sanchez - Synoptia

Voir [LICENSE](LICENSE) pour les détails.

---

**Dernière mise à jour** : 9 octobre 2025
**Version** : 1.0.0
**Auteur** : Ludovic Sanchez @ Synoptia
