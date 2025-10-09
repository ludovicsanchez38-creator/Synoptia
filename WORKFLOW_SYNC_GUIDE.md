# 🔄 WORKFLOW SYNC - GUIDE COMPLET

Système automatique de récupération et indexation de workflows n8n depuis les meilleures sources communautaires.

---

## 🎯 VUE D'ENSEMBLE

Ce système permet de :
- ✅ **Récupérer** automatiquement des milliers de workflows n8n
- ✅ **Indexer** dans le système RAG (Qdrant + embeddings OpenAI)
- ✅ **Rechercher** par similarité sémantique
- ✅ **Enrichir** la base de connaissance du Workflow Builder

---

## 📦 SOURCES DE WORKFLOWS

### **Sources officielles**
- **n8n.io** - ~6000 workflows officiels
- **n8n Community** - Workflows communautaires

### **GitHub Repositories**
- **Zie619/n8n-workflows** - 2057 workflows
- **wassupjay/n8n-free-templates** - 200+ templates
- **enescingoz/awesome-n8n-templates** - Collection organisée
- **Marvomatic/n8n-templates** - Templates SEO

### **Collections spécialisées**
- Creative Tim - Templates open-source
- Reddit Collection - 250+ templates
- WAHA - WhatsApp workflows

---

## 🚀 UTILISATION RAPIDE

### **Option 1 : Sync complet (Recommandé)**

```bash
# Lancer le sync all-in-one
cd /home/ludo/synoptia-workflow-builder
./scripts/sync-workflows.sh
```

**Ce script va :**
1. Récupérer les workflows depuis toutes les sources
2. Les stocker dans `data/n8n-workflows/`
3. Générer les embeddings OpenAI
4. Indexer dans Qdrant
5. Afficher un rapport complet

### **Option 2 : Étape par étape**

```bash
# 1. Fetch workflows
node scripts/fetch-workflows.js

# 2. Index to RAG
node scripts/index-workflows-to-rag.js
```

---

## ⚙️ CONFIGURATION

### **Variables d'environnement requises**

```bash
# OpenAI API Key (OBLIGATOIRE)
export OPENAI_API_KEY=sk-proj-...

# Qdrant URL (optionnel, défaut: localhost:6333)
export QDRANT_URL=http://localhost:6333

# Redis (pour cache)
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

### **Configuration avancée**

Éditer `scripts/fetch-workflows.js` :

```javascript
const CONFIG = {
  dataDir: './data/n8n-workflows',
  maxWorkflowsPerSource: 100,    // ← Augmenter si besoin
  timeout: 30000,                 // ← Timeout HTTP
  sources: {
    // Ajouter/retirer des sources
  }
};
```

---

## 📊 STRUCTURE DES DONNÉES

### **Format de stockage**

Chaque workflow est stocké comme :

```json
{
  "workflow": {
    "id": "123",
    "name": "Send Email Notification",
    "nodes": [...],
    "connections": {...}
  },
  "metadata": {
    "id": "abc123",
    "name": "Send Email Notification",
    "description": "Automatically send emails",
    "nodes": 3,
    "connections": 2,
    "tags": ["email", "notification"],
    "source": "github:Zie619/n8n-workflows",
    "fetchedAt": "2025-10-07T16:00:00Z",
    "hash": "md5_hash"
  }
}
```

### **Index Qdrant**

Chaque workflow devient un point vectoriel :

```json
{
  "id": "md5_hash",
  "vector": [0.123, 0.456, ...],  // 1536 dimensions
  "payload": {
    "name": "Send Email Notification",
    "description": "...",
    "nodes": 3,
    "nodeTypes": ["Webhook", "Gmail", "If"],
    "tags": ["email", "notification"],
    "source": "github:Zie619/n8n-workflows",
    "workflowJson": "{...}",
    "searchText": "Name: Send Email..."
  }
}
```

---

## 🔍 RECHERCHE DE WORKFLOWS

### **Via API**

```bash
# Rechercher workflows similaires
curl -X POST http://localhost:3002/api/search-workflows \
  -H "Content-Type: application/json" \
  -d '{"query": "send email when form submitted"}'

# Résultat :
{
  "success": true,
  "workflows": [
    {
      "name": "Gmail Form Notification",
      "score": 0.92,
      "nodes": 3,
      "source": "n8n.io"
    }
  ]
}
```

### **Via code**

```javascript
const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');

// Générer embedding de la requête
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'send email notification'
});

// Rechercher dans Qdrant
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
const results = await qdrant.search('n8n_workflows', {
  vector: response.data[0].embedding,
  limit: 5
});

console.log(results);
```

---

## 📈 STATISTIQUES

### **Voir les stats de fetch**

```bash
node scripts/fetch-workflows.js
```

Output :
```
📊 FETCH REPORT
═════════════════════════════════════════════════
✅ Total workflows fetched: 487
❌ Failed fetches: 3
♻️  Duplicates skipped: 12

📂 By source:
   n8n.io: 100
   github:Zie619/n8n-workflows: 200
   github:wassupjay/n8n-free-templates: 150
   github:enescingoz/awesome-n8n-templates: 37

💾 Workflows saved to: data/n8n-workflows
```

### **Voir les stats Qdrant**

```bash
# Via curl
curl http://localhost:6333/collections/n8n_workflows

# Via script
node -e "
const { QdrantClient } = require('@qdrant/js-client-rest');
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
qdrant.getCollection('n8n_workflows').then(c => {
  console.log('Points count:', c.points_count);
  console.log('Vectors config:', c.config.params.vectors);
});
"
```

---

## 🔧 MAINTENANCE

### **Re-sync complet**

```bash
# Supprimer les anciens workflows
rm -rf data/n8n-workflows/*

# Re-fetch tout
./scripts/sync-workflows.sh
```

### **Ajouter une nouvelle source**

Éditer `scripts/fetch-workflows.js` :

```javascript
const CONFIG = {
  sources: {
    // ... sources existantes
    githubRepos: [
      // ... repos existants
      'nouveau-user/nouveau-repo'  // ← Ajouter ici
    ]
  }
};
```

### **Update uniquement les nouveaux workflows**

```bash
# Fetch ne télécharge que les nouveaux (dedup par hash)
node scripts/fetch-workflows.js

# Index seulement les nouveaux
node scripts/index-workflows-to-rag.js
```

---

## 🐛 DÉPANNAGE

### **Qdrant connection refused**

```bash
# Vérifier que Qdrant tourne
docker ps | grep qdrant

# Si absent, démarrer via docker-compose
cd /home/ludo/n8n-subpath
docker compose up -d qdrant
```

### **OpenAI rate limit errors**

```bash
# Réduire le batch size dans index-workflows-to-rag.js
const CONFIG = {
  batchSize: 5  // ← Réduire de 10 à 5
};

# Augmenter le délai entre batches
await new Promise(resolve => setTimeout(resolve, 2000)); // 2s
```

### **GitHub rate limit**

```bash
# Ajouter token GitHub (optionnel)
export GITHUB_TOKEN=ghp_...

# Modifier fetch-workflows.js pour utiliser le token :
headers: {
  'Authorization': `token ${process.env.GITHUB_TOKEN}`
}
```

### **Workflows invalides**

```bash
# Voir les erreurs détaillées
node scripts/fetch-workflows.js 2>&1 | grep "Failed"

# Ignorer les fichiers corrompus (déjà géré automatiquement)
```

---

## 📊 MONITORING

### **Cron job automatique**

```bash
# Ajouter au crontab
crontab -e

# Sync hebdomadaire (dimanche 2h du matin)
0 2 * * 0 cd /home/ludo/synoptia-workflow-builder && ./scripts/sync-workflows.sh >> logs/workflow-sync.log 2>&1
```

### **Logs de sync**

```bash
# Voir les derniers syncs
tail -f logs/workflow-sync.log

# Compter les workflows par source
jq '.metadata.source' data/n8n-workflows/*.json | sort | uniq -c
```

---

## 🎯 UTILISATION DANS LE WORKFLOW BUILDER

### **Intégration automatique**

Le Workflow Builder utilise automatiquement les workflows indexés :

```javascript
// rag/retrieval/workflow-context-retriever.js
const results = await this.qdrant.search('n8n_workflows', {
  vector: queryEmbedding,
  limit: 5,
  filter: {
    must: [
      { key: 'nodeTypes', match: { any: ['Gmail'] } }
    ]
  }
});
```

### **Exemple de génération enrichie**

```javascript
// Requête utilisateur
"Je veux envoyer un email quand quelqu'un remplit un formulaire"

// Le système :
1. Génère embedding de la requête
2. Cherche dans Qdrant (collection n8n_workflows)
3. Trouve 5 workflows similaires :
   - "Gmail Form Notification" (score: 0.92)
   - "Webhook to Email" (score: 0.89)
   - "Typeform to Gmail" (score: 0.87)
4. Enrichit le prompt GPT-4o avec ces exemples
5. Génère un workflow optimisé

// Résultat : Workflow de meilleure qualité basé sur patterns éprouvés
```

---

## 📚 RESSOURCES

### **Documentation sources**
- n8n API: https://docs.n8n.io/api/
- Qdrant: https://qdrant.tech/documentation/
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings

### **Scripts créés**
- `fetch-workflows.js` - Récupération workflows
- `index-workflows-to-rag.js` - Indexation RAG
- `sync-workflows.sh` - All-in-one sync

### **Collections Qdrant**
- `n8n_workflows` - Workflows indexés
- Vectors: 1536 dimensions (text-embedding-3-small)
- Distance: Cosine similarity

---

## ✅ CHECKLIST INSTALLATION

- [ ] Qdrant running : `docker ps | grep qdrant`
- [ ] OpenAI API key configurée : `echo $OPENAI_API_KEY`
- [ ] Dépendances installées : `npm install`
- [ ] Fetch workflows : `node scripts/fetch-workflows.js`
- [ ] Index to RAG : `node scripts/index-workflows-to-rag.js`
- [ ] Test search : `curl http://localhost:3002/api/templates`
- [ ] Vérifier Qdrant : `curl http://localhost:6333/collections/n8n_workflows`

---

## 🎬 CONCLUSION

**Le système est maintenant capable de :**
- ✅ Récupérer automatiquement 500+ workflows
- ✅ Les indexer avec embeddings sémantiques
- ✅ Rechercher par similarité
- ✅ Enrichir la génération GPT-4o

**Prochaines étapes :**
1. Lancer le sync initial : `./scripts/sync-workflows.sh`
2. Redémarrer le Workflow Builder
3. Tester la recherche enrichie

**Maintenance recommandée :**
- Sync hebdomadaire automatique (cron)
- Monitoring des logs
- Update sources régulièrement

---

**Guide créé : 7 octobre 2025**
**Version : 1.0**
**Auteur : Claude (Anthropic)**
