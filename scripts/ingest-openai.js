const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');
const crypto = require('crypto');
require('dotenv').config();

const client = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const docs = [
  {
    title: 'OpenAI Node - n8n Built-in Integration',
    content: `The OpenAI node is a built-in n8n node (n8n-nodes-langchain.openai) that allows you to interact with OpenAI's platform. Available Operations: Assistant operations, Audio operations, File operations, Image operations, Text operations including chat completions and text generation. Authentication requires OpenAI API credentials configured in n8n. Supports GPT-3.5, GPT-4, GPT-5 models. Use cases: chatbots, conversational AI, text summarization, content generation, image generation, audio transcription. The node integrates directly with OpenAI's API and handles authentication automatically once credentials are configured.`,
    category: 'ai',
    nodeType: 'OpenAI',
    source: 'n8n_docs',
    url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/'
  },
  {
    title: 'OpenAI Chat Model - Chat Completions',
    content: `The OpenAI Chat Model node (n8n-nodes-langchain.lmchatopenai) enables chat completions with OpenAI models in n8n workflows. Key Parameters: model (select from gpt-3.5-turbo, gpt-4, gpt-5), temperature (0.0 to 1.0 for randomness control), maxTokens (maximum response length), messages (array with role and content). Use for conversational AI, text generation, summarization. Configure OpenAI credentials in n8n credentials section. Supports function/tool calling and streaming responses. Best practices: use lower temperature for factual tasks, higher for creative; set appropriate maxTokens; configure system message for behavior control.`,
    category: 'ai',
    nodeType: 'OpenAI',
    source: 'n8n_docs',
    url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/'
  }
];

(async () => {
  try {
    console.log('🚀 Ingestion des documents OpenAI...\n');

    for (const doc of docs) {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: doc.content,
        dimensions: 3072
      });

      const id = crypto.randomUUID();

      await client.upsert('synoptia_knowledge', {
        points: [{
          id,
          vector: embedding.data[0].embedding,
          payload: {
            ...doc,
            timestamp: Date.now(),
            keywords: ['openai', 'gpt', 'gpt-4', 'gpt-5', 'ai', 'chat', 'completions', 'langchain', 'n8n', 'llm']
          }
        }]
      });

      console.log(`✅ Ingéré: ${doc.title}`);
    }

    console.log(`\n🎉 ${docs.length} documents OpenAI ingérés dans Qdrant!`);

    // Vérification
    const results = await client.scroll('synoptia_knowledge', {
      filter: {
        must: [
          { key: 'nodeType', match: { value: 'OpenAI' } }
        ]
      },
      limit: 5
    });

    console.log(`\n✅ Vérification: ${results.points.length} documents OpenAI dans Qdrant`);

  } catch(e) {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  }
})();
