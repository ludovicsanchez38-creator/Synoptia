/**
 * Configuration RAG pour Workflow Builder
 * Réutilise l'infrastructure Qdrant/Redis du SAV Agent
 */

module.exports = {
  // Qdrant Configuration (partagé avec SAV Agent)
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collectionName: 'synoptia_knowledge', // MÊME collection que SAV
    vectorSize: 3072,
    distance: 'Cosine',
    timeout: 10000
  },

  // Redis Configuration (partagé)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 2, // DB 2 pour Workflow Builder (DB 1 = SAV Agent)
    keyPrefix: 'wf:rag:',
    ttl: {
      embeddings: 7 * 24 * 60 * 60, // 7 jours
      workflows: 24 * 60 * 60, // 1 jour
      templates: 7 * 24 * 60 * 60 // 7 jours
    }
  },

  // OpenAI Configuration
  openai: {
    embeddingModel: 'text-embedding-3-large',
    embeddingDimensions: 3072,
    generationModel: 'gpt-5', // GPT-5 avec raisonnement unifié (Aug 2025)
    batchSize: 100,
    maxRetries: 2, // Réduit pour performances (était 3)
    // Timeouts adaptés à la complexité du workflow
    timeouts: {
      simple: 300000,      // 5 min - workflows simples (2-3 nodes)
      medium: 900000,      // 15 min - workflows intermédiaires (4-7 nodes, conditions)
      complex: 1500000     // 25 min - workflows experts (8+ nodes, branches multiples)
    },
    timeout: 900000 // 15min par défaut (pour rétrocompatibilité)
  },

  // Retrieval Configuration (spécifique workflows)
  retrieval: {
    defaultLimit: 30, // Maximum de contexte pour trouver tous les nodes (était 20)
    maxLimit: 30,
    minScore: 0.18, // Score encore plus permissif pour capturer nodes spécifiques
    // Filtres spécifiques workflows
    filters: {
      preferredCategories: ['integrations', 'workflows', 'ai'],
      preferredNodeTypes: [
        'Webhook', 'HTTP Request', 'Gmail', 'Slack', 'Code',
        'AI Agent', 'OpenAI', 'Google Sheets', 'Notion'
      ]
    }
  },

  // Workflow Templates Configuration
  templates: {
    // Templates internes Synoptia
    internalPath: './data/workflow-templates',
    // Exemples de la doc n8n
    examplesCategories: [
      'email_automation',
      'data_sync',
      'ai_workflows',
      'webhooks',
      'scheduled_tasks'
    ]
  },

  // Validation Configuration
  validation: {
    enabled: true,
    checks: [
      'syntax',           // Validation syntaxe JSON
      'nodes_exist',      // Nodes existent dans n8n
      'connections',      // Connexions valides
      'credentials',      // Credentials requis
      'parameters'        // Paramètres requis
    ],
    autoFix: true,        // Tenter auto-correction
    maxRetries: 1         // Retry génération si invalide (réduit pour perf, était 2)
  },

  // Génération Configuration
  generation: {
    strategy: 'rag_enhanced', // 'basic' ou 'rag_enhanced'
    includeExamples: true,    // Inclure exemples doc
    includeTemplates: true,   // Inclure templates similaires
    maxContextTokens: 8000,   // Contexte max pour prompt
    temperature: 0.1,         // Créativité faible (précision)
    topP: 0.95
  }
};