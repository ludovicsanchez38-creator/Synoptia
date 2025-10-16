# 🔴 PROBLÈME IDENTIFIÉ : Cluster Nodes LangChain

**Date** : 11 octobre 2025
**Cause** : Mauvaise génération des nodes LangChain (cluster nodes)
**Impact** : 7/9 workflows cassés

---

## 🎯 CAUSE RACINE

Les **nodes LangChain** sont des **cluster nodes** (root + sub-nodes) qui fonctionnent différemment des nodes classiques.

### Différence fondamentale

| Type de node | Parameters dans JSON | Configuration |
|--------------|---------------------|---------------|
| **Node classique** | `{parameters: {model: "...", temp: 0.3}}` | Dans le JSON |
| **Cluster node** | `{parameters: {}}` | Via sub-nodes connectés |

---

## 📊 COMPARAISON

### ✅ Node LangChain qui fonctionne (existant)

```json
{
  "parameters": {},  // ← VIDE !
  "name": "OpenAI Chat Model",
  "type": "n8n-nodes-langchain.lmchatopenai",
  "typeVersion": 1,
  "position": [1440, -48],
  "id": "de3f71b2-5a1b-4f9e-9f40-b1b7196b31ef",
  "notes": "⚠️ Configurer la clé OpenAI dans n8n (Credentials)."
}
```

### ❌ Node LangChain généré (cassé)

```json
{
  "parameters": {
    "model": "gpt-4o-mini",           // ← CES PARAMÈTRES NE DOIVENT PAS ÊTRE LÀ !
    "temperature": 0.3,
    "systemMessage": "...",
    "input": "={{$json.input}}",
    "options": {"continueOnFail": true}
  },
  "name": "OpenAI Chat LLM",
  "type": "n8n-nodes-langchain.lmchatopenai",
  "typeVersion": 1,
  "position": [60, -200],
  "id": "f6f5d4a3-2c91-4b9f-8dbb-6f5a7b2d1c22",
  "notes": "⚠️ Clé API OpenAI à configurer manuellement."
}
```

**Résultat** : Node apparaît comme "?" dans N8N car il ne peut pas interpréter les paramètres.

---

## 📋 LISTE DES CLUSTER NODES AFFECTÉS

### Root Nodes LangChain

| Node | Type | Généré avec params | Doit être vide |
|------|------|-------------------|----------------|
| AI Agent | `n8n-nodes-langchain.agent` | ❌ | ✅ `{}` |
| Information Extractor | `n8n-nodes-langchain.informationextractor` | ❌ | ✅ `{}` |
| Text Classifier | `n8n-nodes-langchain.textclassifier` | ❌ | ✅ `{}` |
| Summarization Chain | `n8n-nodes-langchain.chainsummarization` | ❌ | ✅ `{}` |
| Basic LLM Chain | `n8n-nodes-langchain.chainllm` | ❌ | ✅ `{}` |
| Code | `n8n-nodes-langchain.code` | ❌ | ✅ `{}` |

### Sub-Nodes LangChain

| Node | Type | Généré avec params | Doit être vide |
|------|------|-------------------|----------------|
| OpenAI Chat Model | `n8n-nodes-langchain.lmchatopenai` | ❌ | ✅ `{}` |
| OpenAI Embeddings | `n8n-nodes-langchain.embeddingsopenai` | ❌ | ✅ `{}` |
| Memory Postgres Chat | `n8n-nodes-langchain.memorypostgreschat` | ❌ | ✅ `{}` |
| Vector Store Qdrant | `n8n-nodes-langchain.vectorstoreqdrant` | ❌ | ✅ `{}` |
| Text Splitter | `n8n-nodes-langchain.textsplitterrecursivecharactertextsplitter` | ❌ | ✅ `{}` |
| Structured Output Parser | `n8n-nodes-langchain.outputparserstructured` | ❌ | ✅ `{}` |
| Document Loader | `n8n-nodes-langchain.documentdefaultdataloader` | ❌ | ✅ `{}` |

---

## 🔧 COMMENT LES CLUSTER NODES FONCTIONNENT

### Architecture

```
┌─────────────────────────┐
│   ROOT NODE (Agent)     │  ← parameters: {}
│                         │
│  ┌───────────────────┐  │
│  │  SUB-NODE (LLM)   │  │  ← parameters: {}
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ SUB-NODE (Memory) │  │  ← parameters: {}
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ SUB-NODE (Tool)   │  │  ← parameters: {}
│  └───────────────────┘  │
└─────────────────────────┘
```

### Configuration

Les cluster nodes se configurent **uniquement via l'interface N8N** :
1. Drag & drop le root node
2. Connecter les sub-nodes nécessaires
3. Configurer chaque sub-node individuellement dans l'UI
4. Les paramètres sont stockés **en interne par N8N**, pas dans le JSON du workflow

---

## 📝 EXEMPLE DE WORKFLOW CORRECT

Voici un workflow RGPD existant qui fonctionne :

```json
{
  "name": "RGPD Register Update on Quote Sent",
  "nodes": [
    {
      "parameters": {},
      "name": "OpenAI Chat Model",
      "type": "n8n-nodes-langchain.lmchatopenai",
      "typeVersion": 1,
      "position": [1440, -48],
      "id": "de3f71b2-5a1b-4f9e-9f40-b1b7196b31ef"
    },
    {
      "parameters": {},
      "name": "Information Extractor (RGPD Fields)",
      "type": "n8n-nodes-langchain.informationextractor",
      "typeVersion": 1,
      "position": [1008, 400],
      "id": "e6a9a2cc-4f1c-4b92-b4a9-2f3c8f7c19a4"
    },
    {
      "parameters": {},
      "name": "Text Classifier (Consent & Legal Basis)",
      "type": "n8n-nodes-langchain.textclassifier",
      "typeVersion": 1,
      "position": [1312, 368],
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
    }
  ],
  "connections": {
    "Information Extractor (RGPD Fields)": {
      "main": [[{"node": "Text Classifier (Consent & Legal Basis)", "type": "main", "index": 0}]]
    }
  }
}
```

**Tous les nodes LangChain ont `parameters: {}`** !

---

## ✅ SOLUTION

### Fix 1 : Corriger le générateur (PRIORITAIRE)

Modifier `agents/generator.mjs` pour détecter les cluster nodes et forcer `parameters: {}`.

```javascript
// Liste des cluster nodes LangChain
const LANGCHAIN_CLUSTER_NODES = [
  'n8n-nodes-langchain.agent',
  'n8n-nodes-langchain.lmchatopenai',
  'n8n-nodes-langchain.informationextractor',
  'n8n-nodes-langchain.textclassifier',
  'n8n-nodes-langchain.chainsummarization',
  'n8n-nodes-langchain.chainllm',
  'n8n-nodes-langchain.embeddingsopenai',
  'n8n-nodes-langchain.memorypostgreschat',
  'n8n-nodes-langchain.vectorstoreqdrant',
  'n8n-nodes-langchain.textsplitterrecursivecharactertextsplitter',
  'n8n-nodes-langchain.outputparserstructured',
  'n8n-nodes-langchain.documentdefaultdataloader',
  // ... tous les autres
];

// Lors de la génération
nodes.forEach(node => {
  if (LANGCHAIN_CLUSTER_NODES.includes(node.type)) {
    // Forcer parameters vide + documenter dans notes
    node.parameters = {};
    node.notes = `⚠️ Ce node doit être configuré via l'interface N8N. Connectez les sub-nodes nécessaires (LLM, Memory, Tools, etc.).`;
  }
});
```

### Fix 2 : Enrichir le RAG

Ajouter des exemples de workflows **corrects** utilisant des cluster nodes dans le RAG :

1. **Extraire les workflows existants** de ton N8N qui fonctionnent
2. **Les indexer dans le RAG** comme exemples
3. **Le générateur apprendra** le bon format

```bash
# Extraire tes workflows existants
docker exec n8n-subpath-n8n-1 n8n export:workflow --all --output=/tmp/all-workflows.json

# Les indexer dans le RAG
cd /home/ludo/synoptia-workflow-builder
node scripts/index-real-n8n-workflows.js /tmp/all-workflows.json
```

### Fix 3 : Prompt du générateur

Ajouter dans le prompt du générateur :

```
IMPORTANT: Cluster nodes LangChain rules:
1. All n8n-nodes-langchain.* nodes MUST have empty parameters: {}
2. Configuration is done via N8N UI by connecting sub-nodes
3. Add detailed notes explaining what sub-nodes to connect
4. Example:
   {
     "parameters": {},
     "type": "n8n-nodes-langchain.agent",
     "notes": "Configure via UI: connect OpenAI Chat Model + Memory + Tools"
   }
```

---

## 🎯 PLAN D'ACTION

### Phase 1 : Fix immédiat (2h)

1. ✅ **Identifier le problème** : Cluster nodes avec parameters
2. ⏭️ **Créer script de correction** : Nettoyer les workflows importés
3. ⏭️ **Ré-importer workflows corrigés**
4. ⏭️ **Valider** : Les nodes apparaissent correctement

### Phase 2 : Fix générateur (4h)

1. ⏭️ **Liste complète cluster nodes** : Scraper docs N8N
2. ⏭️ **Modifier générateur** : Forcer parameters: {} pour cluster nodes
3. ⏭️ **Enrichir prompt** : Ajouter règles cluster nodes
4. ⏭️ **Tests** : Re-générer les 9 workflows

### Phase 3 : Enrichir RAG (6h)

1. ⏭️ **Exporter workflows existants** (61 workflows)
2. ⏭️ **Filtrer workflows avec LangChain** (bons exemples)
3. ⏭️ **Indexer dans RAG** : 50-100 nouveaux exemples réels
4. ⏭️ **Tests génération** : Qualité améliorée grâce aux vrais exemples

---

## 📊 IMPACT ATTENDU

| Avant | Après |
|-------|-------|
| 7/9 workflows cassés (78%) | 9/9 workflows fonctionnels (100%) |
| Nodes avec "?" | Nodes correctement affichés |
| Config impossible | Config via UI N8N |
| Score utilisateur : ❌ | Score utilisateur : ✅ |

---

## 🚀 PROCHAINE ÉTAPE IMMÉDIATE

**Option A** : Corriger les 9 workflows importés (script de nettoyage)
**Option B** : Fixer le générateur d'abord, puis re-générer
**Option C** : Les deux (recommandé)

---

**Quelle option tu préfères ?**
