/**
 * Shared Prompt Rules
 * Centralise les règles communes entre Planning Agent et Generator
 * Évite la duplication de ~15K tokens de contenu redondant
 */

/**
 * RÈGLES TYPEVERSION
 * Utilisé par: Generator (primaire), Planning Agent (validation)
 * Taille: ~75 lignes / ~2K tokens
 */
const TYPE_VERSION_RULES = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔢 TYPEVERSIONS VALIDES - AMÉLIORATION OCT 2025 (CRITIQUE!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ATTENTION CRITIQUE: Utiliser un typeVersion incorrect = NODE AFFICHE "?" DANS N8N!
Chaque node a des typeVersion SPÉCIFIQUES. Tu DOIS utiliser le bon numéro.

📋 TYPEVERSIONS PAR NODE (LISTE EXHAUSTIVE):

**Triggers:**
- n8n-nodes-base.cron → typeVersion: 1 (UNIQUEMENT 1, PAS 2!)
- n8n-nodes-base.webhook → typeVersion: 1 ou 2 (recommandé: 1)
- n8n-nodes-base.emailReadImap → typeVersion: 1 ou 2
- n8n-nodes-base.manualTrigger → typeVersion: 1

**Actions Courantes:**
- n8n-nodes-base.httpRequest → typeVersion: 4 (versions valides: 1-4, RECOMMANDÉ: 4)
- n8n-nodes-base.code → typeVersion: 2 (versions valides: 1-2, RECOMMANDÉ: 2)
- n8n-nodes-base.set → typeVersion: 3 (versions valides: 1-3)
- n8n-nodes-base.if → typeVersion: 2 (versions valides: 1-2)
- n8n-nodes-base.switch → typeVersion: 3 (versions valides: 1-3)
- n8n-nodes-base.merge → typeVersion: 3 (versions valides: 1-3)
- n8n-nodes-base.respondToWebhook → typeVersion: 1
- n8n-nodes-base.noOp → typeVersion: 1
- n8n-nodes-base.stopAndError → typeVersion: 1

**Productivity & Collaboration:**
- n8n-nodes-base.googleSheets → typeVersion: 4 (versions valides: 4, RECOMMANDÉ: 4)
- n8n-nodes-base.notion → typeVersion: 1 ou 2 (recommandé: 2)
- n8n-nodes-base.airtable → typeVersion: 1 ou 2

**Communication:**
- n8n-nodes-base.gmail → typeVersion: 2 (versions valides: 1-2)
- n8n-nodes-base.slack → typeVersion: 2 (versions valides: 1-2)
- n8n-nodes-base.telegram → typeVersion: 1 ou 2
- n8n-nodes-base.sendEmail → typeVersion: 2

**LangChain AI:**
- @n8n/n8n-nodes-langchain.agent → typeVersion: 1.5 (versions valides: 1, 1.1-1.5, RECOMMANDÉ: 1.5)
- @n8n/n8n-nodes-langchain.lmChatOpenAi → typeVersion: 1 (UNIQUEMENT 1)
- @n8n/n8n-nodes-langchain.memoryBufferWindow → typeVersion: 1 (UNIQUEMENT 1)
- @n8n/n8n-nodes-langchain.embeddingsOpenAi → typeVersion: 1
- @n8n/n8n-nodes-langchain.vectorStoreQdrant → typeVersion: 1

**Databases:**
- n8n-nodes-base.postgres → typeVersion: 2 (versions valides: 1-2)
- n8n-nodes-base.mysql → typeVersion: 2
- n8n-nodes-base.mongodb → typeVersion: 1 ou 2

🚨 RÈGLES TYPEVERSION (ZÉRO TOLÉRANCE):
1. NE JAMAIS inventer un typeVersion (ex: cron avec typeVersion 2 → INVALIDE!)
2. TOUJOURS utiliser la version RECOMMANDÉE indiquée ci-dessus
3. En cas de doute → Utiliser typeVersion: 1 (valeur par défaut la plus sûre)
4. Si un node n'est pas dans cette liste → Utiliser typeVersion: 1

❌ EXEMPLES D'ERREURS À NE JAMAIS FAIRE:
{
  "type": "n8n-nodes-base.cron",
  "typeVersion": 2  ❌ INVALIDE! Cron n'a que typeVersion 1
}

{
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 5  ❌ INVALIDE! httpRequest va jusqu'à 4 max
}

{
  "type": "n8n-nodes-base.function",  ❌ INVALIDE! Ce node n'existe PAS! Utiliser "code"
  "typeVersion": 2
}

✅ EXEMPLES CORRECTS:
{
  "type": "n8n-nodes-base.cron",
  "typeVersion": 1  ✅ CORRECT
}

{
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4  ✅ CORRECT (version actuelle)
}

{
  "type": "n8n-nodes-base.code",  ✅ CORRECT (remplace "function")
  "typeVersion": 2
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

/**
 * ARCHITECTURE LANGCHAIN
 * Utilisé par: Planning Agent, Generator
 * Taille: ~300 lignes / ~8K tokens
 */
const LANGCHAIN_ARCHITECTURE = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ ARCHITECTURE CRITIQUE - CLUSTER NODES LANGCHAIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ RÈGLE FONDAMENTALE: Les nodes LangChain sont des **CLUSTER NODES** = ROOT + SUB-NODES

🎯 DÉTECTION AUTOMATIQUE - QUAND UTILISER AI AGENT:
Si la demande contient ces mots-clés → PLANIFIER AVEC AI AGENT:
- "chatbot", "assistant", "IA", "AI"
- "mémoire", "conversation", "contexte"
- "LLM", "GPT", "OpenAI", "Claude"
- "extraction", "classification", "analyse de texte"
- "RAG", "vector search", "embeddings"
- "summarization", "résumé"

📋 TYPES DE NODES LANGCHAIN:

1️⃣ ROOT NODES (principaux - peuvent avoir parameters):
   - @n8n/n8n-nodes-langchain.agent (AI Agent) ← ROOT PRINCIPAL
   - @n8n/n8n-nodes-langchain.chainLlm
   - @n8n/n8n-nodes-langchain.chainSummarization
   - @n8n/n8n-nodes-langchain.informationExtractor
   - @n8n/n8n-nodes-langchain.textClassifier

2️⃣ SUB-NODES (à connecter AU root - parameters vides ou options seulement):

   **Language Models (LLMs):**
   - @n8n/n8n-nodes-langchain.lmChatOpenAi (OpenAI Chat Model)
   - @n8n/n8n-nodes-langchain.lmChatAnthropic (Anthropic Claude)
   - @n8n/n8n-nodes-langchain.lmChatGoogleGemini (Google Gemini)
   - @n8n/n8n-nodes-langchain.lmChatOllama (Ollama)

   **Memory:**
   - @n8n/n8n-nodes-langchain.memoryBufferWindow (Simple Memory)
   - @n8n/n8n-nodes-langchain.memoryPostgresChat (Postgres Chat Memory)
   - @n8n/n8n-nodes-langchain.memoryMongoDbChat (MongoDB Chat Memory)

   **Embeddings:**
   - @n8n/n8n-nodes-langchain.embeddingsOpenAi (OpenAI Embeddings)

   **Vector Stores:**
   - @n8n/n8n-nodes-langchain.vectorStoreQdrant (Qdrant Vector Store)
   - @n8n/n8n-nodes-langchain.vectorStoreInMemory (In-Memory Vector Store)

   **Output Parsers:**
   - @n8n/n8n-nodes-langchain.outputParserStructured (Structured Output Parser)
     ⚠️ IMPORTANT: Ce node DOIT TOUJOURS avoir un JSON schema dans ses parameters!

   **Tools (se connectent avec ai_tool):**
   - @n8n/n8n-nodes-langchain.toolCalculator (Calculator)
   - @n8n/n8n-nodes-langchain.toolCode (Code Tool)
   - @n8n/n8n-nodes-langchain.toolHttpRequest (HTTP Request Tool)
   - @n8n/n8n-nodes-langchain.toolWorkflow (Call n8n Workflow Tool)
   - @n8n/n8n-nodes-langchain.toolWikipedia (Wikipedia Search)
   - @n8n/n8n-nodes-langchain.toolWolframAlpha (Wolfram|Alpha)

   **⚠️ NODES QUI NE SONT PAS DES SUB-NODES:**
   Ces nodes vont dans le flux "main" AVANT l'agent, PAS connectés à l'agent:
   - @n8n/n8n-nodes-langchain.documentDefaultDataLoader (Document Loader)
   - @n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter (Text Splitter)

⚠️ ATTENTION:
- Tous les types DOIVENT commencer par "@n8n/n8n-nodes-langchain." avec la bonne casse (camelCase)
- Sub-nodes peuvent avoir soit {} vide, soit seulement {options: {continueOnFail}}
- PAS de parameters fonctionnels (model, temperature, etc.) pour les sub-nodes

🚨 RÈGLES STRICTES:

1. **SUB-NODES ONT TOUJOURS parameters: {}** (VIDE!)
   ✅ CORRECT:
   {
     "parameters": {},
     "name": "OpenAI Chat Model",
     "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
     "typeVersion": 1,
     "position": [400, 200],
     "id": "llm-1",
     "notes": "⚠️ Credentials OpenAI à configurer dans n8n"
   }

   ❌ FAUX:
   {
     "parameters": {"model": "gpt-4o-mini", "temperature": 0.3},
     "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi"
   }

2. **ROOT NODES peuvent avoir des parameters**
   ✅ CORRECT:
   {
     "parameters": {
       "promptType": "define",
       "text": "Tu es un assistant utile...",
       "options": {}
     },
     "name": "AI Agent",
     "type": "@n8n/n8n-nodes-langchain.agent",
     "typeVersion": 1.5
   }

3. **CONNEXIONS SPÉCIALES** (PAS "main" pour sub→root):

   Type de connexion selon le sub-node:
   - ai_languageModel : OpenAI Chat Model, autres LLMs
   - ai_memory : Memory nodes (Buffer, Postgres, MongoDB)
   - ai_tool : Calculator, Code, Custom Tools
   - ai_outputParser : Structured Output Parser
   - ai_embedding : OpenAI Embeddings, autres embeddings
   - ai_vectorStore : Qdrant, In-Memory, MongoDB Vector Store
   - ai_retriever : Retrievers

   ✅ CORRECT (connexion sub→root):
   "connections": {
     "OpenAI Chat Model": {
       "ai_languageModel": [[{
         "node": "AI Agent",
         "type": "ai_languageModel",
         "index": 0
       }]]
     },
     "Simple Memory": {
       "ai_memory": [[{
         "node": "AI Agent",
         "type": "ai_memory",
         "index": 0
       }]]
     }
   }

   ❌ FAUX (connexion avec "main"):
   "OpenAI Chat Model": {
     "main": [[{"node": "AI Agent", ...}]]
   }

4. **FLUX D'EXÉCUTION CORRECT**:
   Webhook/Trigger
     → (main) AI Agent (root)
                  ↑ (ai_languageModel) OpenAI Model
                  ↑ (ai_memory) Memory
                  ↑ (ai_tool) Tools
     → (main) Node suivant

⛔ ERREURS À NE JAMAIS FAIRE:

❌ 1. Parameters dans sub-node:
   {"parameters": {"model": "gpt-4"}, "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi"}

❌ 2. Connexion "main" pour sub→root:
   "OpenAI Model": {"main": [[{"node": "AI Agent"}]]}

❌ 3. Sub-nodes connectés entre eux:
   "OpenAI Model": {"main": [[{"node": "Memory"}]]}

❌ 4. Oublier le root node (AI Agent):
   Webhook → OpenAI Model (SANS AI Agent entre deux)

❌ 5. Tool connecté avec "main" au lieu de "ai_tool":
   "Calculator Tool": {"main": [[{"node": "AI Agent"}]]}  ❌ FAUX
   "Calculator Tool": {"ai_tool": [[{"node": "AI Agent"}]]}  ✅ CORRECT

❌ 6. Oublier de configurer l'agent en mode "toolsAgent":
   {"parameters": {"promptType": "define"}}  ❌ INCOMPLET
   {"parameters": {"agent": "toolsAgent", "promptType": "define"}}  ✅ CORRECT

✅ QUAND UTILISER AI AGENT:
- Chatbots avec mémoire conversationnelle
- Classification de texte avec LLM
- Extraction d'informations structurées
- RAG (Retrieval Augmented Generation) - AVEC toolVectorStore
- Workflows IA nécessitant LLM + context
- Summarization avec contexte
- Q&A avec vector search

✅ QUAND NE PAS UTILISER AI AGENT:
- Simple appel API via HTTP Request
- Traitement de données sans IA
- Workflows basiques (email, webhook, etc.)
- Manipulation de fichiers
- Intégrations tierces classiques sans LLM

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 ARCHITECTURE RAG (RETRIEVAL AUGMENTED GENERATION)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ RÈGLE CRITIQUE RAG:
- ❌ "toolVectorStore" N'EXISTE PAS! C'est une hallucination courante!
- ✅ Utiliser vectorStoreQdrant avec "mode": "retrieve-as-tool"
- ✅ Embeddings OBLIGATOIRE connecté en ai_embedding au Vector Store

🎯 ARCHITECTURE CORRECTE - RAG avec AI Agent:

Option 1️⃣: RAG Query (chatbot qui cherche dans un vector store existant)
\`\`\`
Chat Trigger → AI Agent
                 ↑ (ai_languageModel) OpenAI/Claude
                 ↑ (ai_memory) MongoDB Chat Memory [persistant]
                 ↑ (ai_tool) Qdrant Vector Store (mode: "retrieve-as-tool")
                              ↑ (ai_embedding) OpenAI Embeddings
\`\`\`

Option 2️⃣: RAG Insert (indexer des documents dans le vector store)
\`\`\`
Trigger → Document Loader → Text Splitter → (main) → OpenAI Embeddings → (main) → Qdrant (mode: "insert")
          ↓ (ai_document)                                 ↓ (ai_embedding)
          └────────────────────────────────────────────────→ Qdrant Vector Store

⚠️ CONNEXIONS CRITIQUES POUR RAG INSERT:
1. Document Loader → (main) → Text Splitter
2. Document Loader → (ai_document) → Qdrant Vector Store
3. Text Splitter → (main) → OpenAI Embeddings  ← CRITICAL! Must go through embeddings!
4. OpenAI Embeddings → (main) → Qdrant Vector Store
5. OpenAI Embeddings → (ai_embedding) → Qdrant Vector Store
\`\`\`

Option 3️⃣: Workflow Hybride (Query ET Insert dans le même workflow)
\`\`\`
Trigger → AI Agent (génère du contenu avec contexte RAG)
             ↑ (ai_languageModel) Claude
             ↑ (ai_tool) Qdrant Vector Store (mode: "retrieve-as-tool") ← QUERY
                          ↑ (ai_embedding) OpenAI Embeddings
          → (main) Normalize → Text Splitter → Qdrant Vector Store (mode: "insert") ← INSERT
                                                 ↑ (ai_embedding) OpenAI Embeddings
\`\`\`

🔑 POINTS CLÉS CRITIQUES:

1. **Vector Store en mode "retrieve-as-tool"** = Pour QUERY un RAG
   - Type: @n8n/n8n-nodes-langchain.vectorStoreQdrant
   - Parameters: { "mode": "retrieve-as-tool", "qdrantCollection": {...}, "options": {} }
   - Connecté en ai_tool à l'AI Agent
   - DOIT avoir Embeddings connecté en ai_embedding

2. **Vector Store en mode "insert"** = Pour INSERT des documents
   - Type: @n8n/n8n-nodes-langchain.vectorStoreQdrant
   - Parameters: { "mode": "insert", "qdrantCollection": {...}, "options": {} }
   - Dans le flux main, PAS connecté à l'agent
   - DOIT avoir Embeddings (ai_embedding) + Document Loader (ai_document)

3. **Text Splitter** = Flux "main" pour découper texte avant insert
   - Type: @n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter
   - Dans le flux main, PAS connecté à l'agent

4. **AI Agent mode "toolsAgent"** = Obligatoire pour utiliser le Vector Store Tool

✅ EXEMPLE COMPLET #1 - CHATBOT RAG PERSISTANT (ARCHITECTURE DE RÉFÉRENCE):
\`\`\`json
{
  "name": "Chatbot RAG avec Mémoire MongoDB",
  "nodes": [
    {
      "name": "When chat message received",
      "type": "@n8n/n8n-nodes-langchain.chatTrigger",
      "typeVersion": 1,
      "parameters": {},
      "position": [200, 300]
    },
    {
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.5,
      "parameters": {},
      "position": [600, 300]
    },
    {
      "name": "OpenAI Chat Model",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1,
      "parameters": {},
      "position": [400, 200]
    },
    {
      "name": "MongoDB Chat Memory",
      "type": "@n8n/n8n-nodes-langchain.memoryMongoDbChat",
      "typeVersion": 1,
      "parameters": {},
      "position": [400, 400]
    },
    {
      "name": "Qdrant Vector Store",
      "type": "@n8n/n8n-nodes-langchain.vectorStoreQdrant",
      "typeVersion": 1,
      "parameters": {
        "mode": "retrieve-as-tool",
        "qdrantCollection": {"__rl": true, "mode": "list", "value": ""},
        "options": {}
      },
      "position": [200, 500]
    },
    {
      "name": "Embeddings OpenAI",
      "type": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
      "typeVersion": 1,
      "parameters": {},
      "position": [200, 600]
    }
  ],
  "connections": {
    "When chat message received": {
      "main": [[{"node": "AI Agent", "type": "main", "index": 0}]]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [[{"node": "AI Agent", "type": "ai_languageModel", "index": 0}]]
    },
    "MongoDB Chat Memory": {
      "ai_memory": [[{"node": "AI Agent", "type": "ai_memory", "index": 0}]]
    },
    "Qdrant Vector Store": {
      "ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]]
    },
    "Embeddings OpenAI": {
      "ai_embedding": [[{"node": "Qdrant Vector Store", "type": "ai_embedding", "index": 0}]]
    }
  }
}
\`\`\`

🔑 POINTS CLÉS EXEMPLE #1:
1. Chat Trigger (LangChain) pour chatbot interactif
2. MongoDB Chat Memory pour mémoire PERSISTANTE entre sessions
3. Qdrant Vector Store en mode "retrieve-as-tool" connecté en ai_tool
4. Embeddings connecté en ai_embedding AU Qdrant Vector Store
5. Architecture validée en production

✅ EXEMPLE COMPLET #2 - CHATBOT SIMPLE AVEC MÉMOIRE SESSION:
\`\`\`json
{
  "name": "Chatbot Simple avec Mémoire Buffer",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "parameters": {"httpMethod": "POST", "path": "chat"},
      "position": [200, 300]
    },
    {
      "name": "AI Agent (Chatbot)",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 1.5,
      "parameters": {
        "promptType": "define",
        "text": "Tu es un assistant conversationnel utile, concis et poli.",
        "options": {}
      },
      "position": [600, 300]
    },
    {
      "name": "OpenAI Chat Model",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1,
      "parameters": {},
      "position": [400, 200]
    },
    {
      "name": "Simple Memory (Buffer Window)",
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1,
      "parameters": {},
      "position": [400, 400]
    },
    {
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "parameters": {},
      "position": [800, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "AI Agent (Chatbot)", "type": "main", "index": 0}]]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [[{"node": "AI Agent (Chatbot)", "type": "ai_languageModel", "index": 0}]]
    },
    "Simple Memory (Buffer Window)": {
      "ai_memory": [[{"node": "AI Agent (Chatbot)", "type": "ai_memory", "index": 0}]]
    },
    "AI Agent (Chatbot)": {
      "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    }
  }
}
\`\`\`

🔑 POINTS CLÉS EXEMPLE #2:
1. Webhook normal (pas Chat Trigger) pour API REST
2. Memory Buffer Window pour mémoire TEMPORAIRE (session uniquement)
3. Respond to Webhook pour retourner la réponse
4. Architecture validée en production

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 STRUCTURED OUTPUT PARSER - RÈGLES CRITIQUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ RÈGLE ABSOLUE: Le Structured Output Parser DOIT TOUJOURS avoir un JSON schema!

❌ FAUX (parameters vide):
{
  "parameters": {},
  "type": "@n8n/n8n-nodes-langchain.outputParserStructured"
}

✅ CORRECT (avec schema):
{
  "parameters": {
    "schemaType": "fromJson",
    "jsonSchema": "{\\"type\\":\\"object\\",\\"properties\\":{\\"title\\":{\\"type\\":\\"string\\"},\\"content\\":{\\"type\\":\\"string\\"},\\"tags\\":{\\"type\\":\\"array\\",\\"items\\":{\\"type\\":\\"string\\"}}},\\"required\\":[\\"title\\",\\"content\\",\\"tags\\"]}"
  },
  "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
  "typeVersion": 1
}

🔑 Comment construire le JSON schema:
1. Définir la structure attendue (ex: {title, content, tags})
2. Créer le JSON schema (type, properties, required)
3. Stringify et escaper les guillemets (\\" au lieu de ")
4. Mettre dans parameters.jsonSchema

Exemple complet de schema pour output structuré:
\`\`\`json
{
  "type": "object",
  "properties": {
    "title": {"type": "string"},
    "content": {"type": "string"},
    "summary": {"type": "string"},
    "tags": {
      "type": "array",
      "items": {"type": "string"}
    }
  },
  "required": ["title", "content", "tags"]
}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

/**
 * EXEMPLES LANGCHAIN
 * Utilisé par: Generator (primaire)
 * Taille: ~200 lignes / ~4K tokens
 */
const LANGCHAIN_EXAMPLES = `📝 EXEMPLE COMPLET ET CORRECT (Chatbot avec mémoire):

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
      "notes": "⚠️ Credentials OpenAI à configurer"
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

📝 EXEMPLE COMPLET ET CORRECT #2 (AI Agent avec Tools):

{
  "name": "AI Agent avec Calculator Tool",
  "nodes": [
    {
      "parameters": {"httpMethod": "POST", "path": "calculate"},
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [200, 300],
      "id": "webhook-1"
    },
    {
      "parameters": {
        "agent": "toolsAgent",
        "promptType": "define",
        "text": "Tu es un assistant qui répond aux questions mathématiques. Utilise le Calculator tool pour les calculs complexes.",
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
      "notes": "⚠️ Credentials OpenAI à configurer"
    },
    {
      "parameters": {},
      "name": "Calculator Tool",
      "type": "@n8n/n8n-nodes-langchain.toolCalculator",
      "typeVersion": 1,
      "position": [400, 400],
      "id": "tool-calc-1"
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
    "Calculator Tool": {
      "ai_tool": [[{"node": "AI Agent", "type": "ai_tool", "index": 0}]]
    },
    "AI Agent": {
      "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
    }
  },
  "settings": {"executionOrder": "v1"}
}

🎯 POINTS CLÉS DE L'EXEMPLE #2:
1. AI Agent configuré en mode "toolsAgent"
2. Calculator Tool connecté avec type "ai_tool"
3. Le prompt de l'agent mentionne explicitement d'utiliser le tool
4. L'agent peut appeler le tool dynamiquement selon les besoins
5. Plusieurs tools peuvent être connectés simultanément

📝 EXEMPLE COMPLET ET CORRECT #3 (RAG INSERT - INDEXATION):

{
  "name": "RAG Insert - Indexer des documents dans Qdrant",
  "nodes": [
    {
      "parameters": {},
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [200, 300],
      "id": "trigger-1"
    },
    {
      "parameters": {},
      "name": "Create Documents from Text",
      "type": "@n8n/n8n-nodes-langchain.documentDefaultDataLoader",
      "typeVersion": 1,
      "position": [400, 300],
      "id": "loader-1"
    },
    {
      "parameters": {},
      "name": "Split Text into Chunks",
      "type": "@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter",
      "typeVersion": 1,
      "position": [600, 300],
      "id": "splitter-1"
    },
    {
      "parameters": {},
      "name": "OpenAI Embeddings",
      "type": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
      "typeVersion": 1,
      "position": [800, 300],
      "id": "embeddings-1",
      "notes": "⚠️ Credentials OpenAI à configurer"
    },
    {
      "parameters": {
        "mode": "insert",
        "qdrantCollection": {"__rl": true, "mode": "list", "value": ""},
        "options": {}
      },
      "name": "Insert into Qdrant",
      "type": "@n8n/n8n-nodes-langchain.vectorStoreQdrant",
      "typeVersion": 1,
      "position": [1000, 300],
      "id": "qdrant-1",
      "notes": "⚠️ Credentials Qdrant à configurer"
    }
  ],
  "connections": {
    "Manual Trigger": {
      "main": [[{"node": "Create Documents from Text", "type": "main", "index": 0}]]
    },
    "Create Documents from Text": {
      "main": [[{"node": "Split Text into Chunks", "type": "main", "index": 0}]],
      "ai_document": [[{"node": "Insert into Qdrant", "type": "ai_document", "index": 0}]]
    },
    "Split Text into Chunks": {
      "main": [[{"node": "OpenAI Embeddings", "type": "main", "index": 0}]]
    },
    "OpenAI Embeddings": {
      "main": [[{"node": "Insert into Qdrant", "type": "main", "index": 0}]],
      "ai_embedding": [[{"node": "Insert into Qdrant", "type": "ai_embedding", "index": 0}]]
    }
  },
  "settings": {"executionOrder": "v1"}
}

🎯 POINTS CLÉS DE L'EXEMPLE #3 (CRITIQUE POUR RAG INSERT):
1. Document Loader → (main) → Text Splitter
2. Document Loader → (ai_document) → Qdrant Vector Store
3. Text Splitter → (main) → OpenAI Embeddings ← CRITIQUE! Doit passer par embeddings!
4. OpenAI Embeddings → (main) → Qdrant Vector Store ← CRITIQUE! Double connexion!
5. OpenAI Embeddings → (ai_embedding) → Qdrant Vector Store ← CRITIQUE! Double connexion!
6. Qdrant en mode "insert", PAS connecté à AI Agent
7. Architecture validée - workflows générés sans cette structure NE S'OUVRENT PAS dans n8n`;

/**
 * NODES INTERDITS (HALLUCINATIONS COURANTES)
 * Utilisé par: Generator (primaire), Supervisor (validation)
 * Taille: ~50 lignes / ~1.5K tokens
 */
const FORBIDDEN_NODE_PATTERNS = `🚨 NODES INVENTÉS - NE JAMAIS UTILISER:

❌ EXEMPLES RÉELS D'ERREURS À NE JAMAIS REFAIRE:
- "type": "n8n-nodes-base.moveBinaryData" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.openAi" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.convertToFile" ❌ (existe mais rare, vérifie le plan)
- "type": "n8n-nodes-base.googleDrive" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.linkedin" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.veo" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.binaryDataManager" ❌ (INVENTÉ - n'existe pas)
- "type": "n8n-nodes-base.jiraSoftwareCloud" ❌ (INVENTÉ - n'existe pas, utiliser "n8n-nodes-base.jira")

🚨 CAS RÉEL D'HALLUCINATION - NE JAMAIS RÉPÉTER:
❌ ERREUR: Inventer "jiraSoftwareCloud" en confondant le nom du produit "Jira Software Cloud" avec le type de node
✅ CORRECT: Utiliser EXACTEMENT le type du plan → "n8n-nodes-base.jira"
⚠️ NE PAS inventer des variations basées sur des noms de produits ou services!

🛡️ ALTERNATIVES SÛRES - TOUJOURS VALIDES:
- n8n-nodes-base.httpRequest (pour tout appel API externe)
- n8n-nodes-base.code (pour manipulation de données)
- n8n-nodes-base.set (pour modifier/ajouter des champs)
- n8n-nodes-base.if (pour conditions)
- n8n-nodes-base.merge (pour combiner des données)

⚠️ CAS SPÉCIAL - CONVERSION BINAIRE:
Si tu as besoin de convertir base64 ↔ binaire:
  ❌ NE PAS utiliser: moveBinaryData, convertToFile, binaryDataManager
  ✅ UTILISER: "n8n-nodes-base.code" avec du JavaScript`;

/**
 * RÈGLES DE VALIDATION COMMUNES
 * Utilisé par: Planning Agent, Generator
 * Taille: ~30 lignes / ~800 tokens
 */
const VALIDATION_RULES = `🔒 RÈGLES TECHNIQUES COMMUNES:

1. Retourner UNIQUEMENT le JSON (format n8n valide)
2. Respecter la structure n8n: {name, nodes, connections, settings}
3. Nommer les nodes de manière descriptive (ex: "Send Welcome Email")
4. Positionner les nodes correctement (position: [x, y])
5. Créer des connexions valides entre nodes
6. Ajouter TOUS les paramètres REQUIS pour chaque node
7. Les nodes comme Slack, Gmail nécessitent "resource" et "operation"
8. Inclure "typeVersion" CORRECT pour chaque node
9. Ajouter des notes (field "notes") pour documenter les nodes

⛔ INTERDICTION - NE JAMAIS UTILISER LE CHAMP "authentication":
- ❌ "authentication": "oAuth2" (INVALIDE - n8n ne reconnaît pas ce champ)
- ❌ "authentication": "predefinedCredentialType" (INVALIDE)
- ✅ NE PAS mettre de credentials du tout (l'utilisateur les ajoutera manuellement dans n8n)
- ✅ Ajouter une note: "⚠️ Credentials à configurer manuellement dans n8n"

⚠️ GESTION D'ERREURS:
- IMPORTANT: Le champ "continueOnFail" doit être dans "parameters.options", PAS au niveau root du node
- Structure correcte: { "parameters": { "options": { "continueOnFail": true } } }
- Cela garantit que le workflow continue même en cas d'erreur partielle`;

// Exports
module.exports = {
  TYPE_VERSION_RULES,
  LANGCHAIN_ARCHITECTURE,
  LANGCHAIN_EXAMPLES,
  FORBIDDEN_NODE_PATTERNS,
  VALIDATION_RULES,

  /**
   * Retourne toutes les règles combinées (pour usage simple)
   */
  getAllRules() {
    return {
      typeVersions: TYPE_VERSION_RULES,
      langchainArchitecture: LANGCHAIN_ARCHITECTURE,
      langchainExamples: LANGCHAIN_EXAMPLES,
      forbiddenNodes: FORBIDDEN_NODE_PATTERNS,
      validation: VALIDATION_RULES
    };
  },

  /**
   * Retourne les règles essentielles pour le Planning Agent
   */
  getPlanningRules() {
    return {
      langchainArchitecture: LANGCHAIN_ARCHITECTURE,
      forbiddenNodes: FORBIDDEN_NODE_PATTERNS,
      validation: VALIDATION_RULES
    };
  },

  /**
   * Retourne les règles essentielles pour le Generator
   */
  getGeneratorRules() {
    return {
      typeVersions: TYPE_VERSION_RULES,
      langchainArchitecture: LANGCHAIN_ARCHITECTURE,
      langchainExamples: LANGCHAIN_EXAMPLES,
      forbiddenNodes: FORBIDDEN_NODE_PATTERNS,
      validation: VALIDATION_RULES
    };
  },

  /**
   * Retourne les règles essentielles pour le Supervisor
   */
  getSupervisorRules() {
    return {
      typeVersions: TYPE_VERSION_RULES,
      langchainArchitecture: LANGCHAIN_ARCHITECTURE,
      forbiddenNodes: FORBIDDEN_NODE_PATTERNS
    };
  }
};
