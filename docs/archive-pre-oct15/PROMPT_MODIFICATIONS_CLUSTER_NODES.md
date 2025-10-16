# 🔧 Modifications Prompts - Support Cluster Nodes LangChain

**Date** : 11 octobre 2025
**Objectif** : Enseigner aux 3 agents l'architecture cluster nodes (AI Agent + sub-nodes)

---

## 📋 INSTRUCTIONS À AJOUTER

### Section commune aux 3 agents :

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ ARCHITECTURE CRITIQUE - CLUSTER NODES LANGCHAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ RÈGLE FONDAMENTALE - CLUSTER NODES:

Les nodes LangChain sont des **CLUSTER NODES** composés d'un ROOT NODE + SUB-NODES.
Ils ne fonctionnent PAS comme des nodes classiques.

🎯 TYPES DE NODES LANGCHAIN:

1️⃣ **ROOT NODES** (nodes principaux):
   - @n8n/n8n-nodes-langchain.agent (AI Agent) ← ROOT PRINCIPAL
   - @n8n/n8n-nodes-langchain.chainLlm (Basic LLM Chain)
   - @n8n/n8n-nodes-langchain.chainSummarization (Summarization Chain)
   - @n8n/n8n-nodes-langchain.informationExtractor (Information Extractor)
   - @n8n/n8n-nodes-langchain.textClassifier (Text Classifier)
   - @n8n/n8n-nodes-langchain.code (LangChain Code)
   - n8n-nodes-langchain.agent (format alternatif)
   - n8n-nodes-langchain.chainllm
   - n8n-nodes-langchain.chainsummarization
   - n8n-nodes-langchain.informationextractor
   - n8n-nodes-langchain.textclassifier

2️⃣ **SUB-NODES** (à connecter AUX root nodes):
   - @n8n/n8n-nodes-langchain.lmChatOpenAi (OpenAI Chat Model)
   - @n8n/n8n-nodes-langchain.embeddingsOpenAi (OpenAI Embeddings)
   - @n8n/n8n-nodes-langchain.memoryBufferWindow (Simple Memory)
   - @n8n/n8n-nodes-langchain.memoryPostgresChat (Postgres Memory)
   - @n8n/n8n-nodes-langchain.memoryMongoDbChat (MongoDB Memory)
   - @n8n/n8n-nodes-langchain.vectorStoreInMemory (In-Memory Vector Store)
   - @n8n/n8n-nodes-langchain.vectorStoreQdrant (Qdrant Vector Store)
   - @n8n/n8n-nodes-langchain.outputParserStructured (Structured Output Parser)
   - @n8n/n8n-nodes-langchain.documentDefaultDataLoader (Document Loader)
   - @n8n/n8n-nodes-langchain.textSplitterRecursiveCharacter (Text Splitter)
   - @n8n/n8n-nodes-langchain.toolCalculator (Calculator Tool)
   - @n8n/n8n-nodes-langchain.toolCode (Code Tool)
   - n8n-nodes-langchain.lmchatopenai (format alternatif)
   - n8n-nodes-langchain.embeddingsopenai
   - n8n-nodes-langchain.memorypostgreschat
   - n8n-nodes-langchain.vectorstoreqdrant
   - n8n-nodes-langchain.outputparserstructured

🚨 RÈGLES STRICTES - CLUSTER NODES:

1. **SUB-NODES ONT TOUJOURS parameters: {}**
   ✅ CORRECT: {"parameters": {}, "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi"}
   ❌ FAUX: {"parameters": {"model": "gpt-4"}, "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi"}

2. **ROOT NODES peuvent avoir des parameters**
   ✅ CORRECT: {"parameters": {"promptType": "define", "text": "..."}, "type": "@n8n/n8n-nodes-langchain.agent"}

3. **CONNEXIONS SPÉCIALES** (PAS "main" pour sub→root):
   - ai_languageModel : Pour connecter LLM au root
   - ai_memory : Pour connecter Memory au root
   - ai_tool : Pour connecter Tools au root
   - ai_outputParser : Pour connecter Output Parsers au root
   - ai_embedding : Pour connecter Embeddings au root
   - ai_vectorStore : Pour connecter Vector Stores au root
   - ai_retriever : Pour connecter Retrievers au root

4. **FLUX D'EXÉCUTION**:
   Webhook/Trigger → AI Agent (root)
                         ↑ (ai_languageModel) OpenAI Model
                         ↑ (ai_memory) Memory
                         ↑ (ai_tool) Tools
                     → Node suivant (main)

📝 EXEMPLE COMPLET ET CORRECT:

```json
{
  "name": "Chatbot avec Mémoire",
  "nodes": [
    {
      "parameters": {"httpMethod": "POST", "path": "chat"},
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [200, 300],
      "id": "webhook-1"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "Tu es un assistant utile et concis.",
        "options": {}
      },
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.5,
      "position": [600, 300],
      "id": "agent-1"
    },
    {
      "parameters": {},
      "name": "OpenAI Chat Model",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1,
      "position": [400, 200],
      "id": "llm-1",
      "notes": "⚠️ Credentials OpenAI à configurer dans n8n"
    },
    {
      "parameters": {},
      "name": "Simple Memory",
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1,
      "position": [400, 400],
      "id": "memory-1"
    },
    {
      "parameters": {"options": {}},
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [800, 300],
      "id": "respond-1"
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "AI Agent", "type": "main", "index": 0}]]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]
    },
    "Simple Memory": {
      "ai_memory": [[{"node": "AI Agent", "type": "ai_memory", "index": 0}]]
    },
    "AI Agent": {
      "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    }
  },
  "settings": {"executionOrder": "v1"}
}
```

⛔ ERREURS À NE JAMAIS FAIRE:

❌ 1. Mettre des parameters dans un sub-node:
   {"parameters": {"model": "gpt-4"}, "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi"}

❌ 2. Connecter sub-nodes entre eux:
   "OpenAI Model": {"main": [[{"node": "Memory", ...}]]}

❌ 3. Utiliser "main" pour connecter sub→root:
   "OpenAI Model": {"main": [[{"node": "AI Agent", ...}]]}

❌ 4. Oublier le root node (AI Agent):
   Webhook → OpenAI Model → Memory (sans AI Agent)

✅ QUAND UTILISER AI AGENT:

- Chatbots avec mémoire conversationnelle
- Classification de texte via LLM
- Extraction d'informations structurées
- RAG (Retrieval Augmented Generation)
- Workflows IA nécessitant LLM + context
- Summarization avec contexte
- Q&A avec vector search

✅ QUAND NE PAS UTILISER AI AGENT:

- Simple appel HTTP Request vers API
- Traitement de données sans IA
- Workflows basiques (email, webhook, etc.)
- Manipulation de fichiers
- Intégrations tierces classiques

🔍 DÉTECTION AUTOMATIQUE:

Si la demande contient ces mots-clés → UTILISER AI AGENT:
- "chatbot", "assistant", "IA", "AI"
- "mémoire", "conversation", "contexte"
- "LLM", "GPT", "OpenAI", "Claude"
- "extraction", "classification", "analyse de texte"
- "RAG", "vector search", "embeddings"
- "summarization", "résumé"

Si ces fonctionnalités → SUB-NODES REQUIS:
- "mémoire" → Memory sub-node
- "OpenAI" → OpenAI Chat Model sub-node
- "embeddings" → Embeddings sub-node
- "Qdrant" → Qdrant Vector Store sub-node
- "tools" → Tool sub-nodes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 EMPLACEMENT DES MODIFICATIONS

### 1. Planning Agent (`planning-agent.js`)

**Ligne ~260** (après la ligne `Tu es un expert n8n chargé de PLANIFIER`):
- Ajouter la section complète sur les cluster nodes
- Modifier la logique de détection pour identifier les besoins AI Agent
- Ajouter dans `requiredNodes` le type de connexion requis

### 2. Generator Agent (`rag-enhanced-generator.js`)

**Ligne ~622** (après `12. Inclure "typeVersion"...`):
- Ajouter la section complète sur les cluster nodes
- Exemples concrets de structure correcte
- Warnings sur les erreurs courantes

### 3. Supervisor Agent (`supervisor-agent.js`)

**Dans le prompt de supervision** (à trouver):
- Ajouter validation spécifique cluster nodes
- Vérifier que sub-nodes ont parameters: {}
- Vérifier les types de connexion (ai_languageModel, etc.)
- Détecter les erreurs d'architecture

---

## 📊 IMPACT ATTENDU

| Avant | Après |
|-------|-------|
| Sub-nodes avec parameters pleins | Sub-nodes avec parameters: {} |
| Connexions "main" partout | Connexions spéciales (ai_*) |
| Pas de AI Agent root | AI Agent comme orchestrateur |
| 7/9 workflows cassés | 9/9 workflows fonctionnels |

---

## ✅ CHECKLIST

- [ ] Planning Agent modifié
- [ ] Generator Agent modifié
- [ ] Supervisor Agent modifié
- [ ] Tests avec workflow chatbot
- [ ] Tests avec workflow RAG
- [ ] Validation dans N8N réel

---

**Prochaine étape** : Appliquer les modifications aux 3 fichiers
