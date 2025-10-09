/**
 * Workflow Context Retriever
 * Récupère le contexte pertinent de la knowledge base pour générer des workflows
 */

const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');
const Redis = require('ioredis');
const crypto = require('crypto');
const config = require('../config');

class WorkflowContextRetriever {
  constructor() {
    this.qdrant = new QdrantClient({
      url: config.qdrant.url,
      timeout: config.qdrant.timeout
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix
    });

    this.collectionName = config.qdrant.collectionName;
  }

  /**
   * Récupère le contexte pertinent pour générer un workflow
   */
  async getWorkflowContext(userRequest, options = {}) {
    const {
      limit = config.retrieval.defaultLimit,
      minScore = config.retrieval.minScore,
      includeTemplates = true,
      includeExamples = true
    } = options;

    try {
      console.log(`🔍 Récupération contexte pour: "${userRequest}"`);

      // 1. Analyser la requête pour détecter nodes/concepts
      const analysis = await this.analyzeRequest(userRequest);
      console.log(`  📊 Analyse:`, analysis);

      // 2. Embedder la requête
      const queryVector = await this.embed(userRequest);

      // 3. Construire filtres intelligents
      const filters = this.buildFilters(analysis);

      // 4. Recherche vectorielle AVEC filtres intelligents (mode "should")
      const results = await this.qdrant.search(this.collectionName, {
        vector: queryVector,
        limit: Math.floor(limit * 0.7), // 70% pour la doc
        score_threshold: minScore,
        filter: filters && filters.length > 0 ? {
          should: filters
        } : undefined,
        with_payload: true
      });

      console.log(`  ✅ ${results.length} documents (doc) trouvés`);

      // 5. Recherche d'exemples de workflows similaires (30% du limit)
      const workflowExamples = await this.qdrant.search(this.collectionName, {
        vector: queryVector,
        limit: Math.ceil(limit * 0.3),
        score_threshold: minScore * 0.9, // Légèrement moins strict
        filter: {
          must: [
            { key: 'type', match: { value: 'workflow_example' } }
          ]
        },
        with_payload: true
      });

      console.log(`  ✅ ${workflowExamples.length} exemples de workflows trouvés`);

      // Combiner les résultats
      const allResults = [...results, ...workflowExamples];

      // 6. Enrichir avec metadata
      const context = {
        request: userRequest,
        analysis,
        documents: allResults.map(r => ({
          content: r.payload.content || this.formatWorkflowAsDoc(r.payload),
          score: r.score,
          title: r.payload.title || r.payload.name,
          source: r.payload.source,
          category: r.payload.category,
          nodeType: r.payload.nodeType,
          url: r.payload.url,
          keywords: r.payload.keywords,
          type: r.payload.type, // 'workflow_example' ou autre
          // Metadata spécifique aux workflows
          workflowInfo: r.payload.type === 'workflow_example' ? {
            complexity: r.payload.complexity,
            nodeCount: r.payload.nodeCount,
            integrations: r.payload.integrations,
            description: r.payload.description
          } : null
        })),
        detectedNodes: analysis.nodes,
        suggestedFlow: analysis.suggestedFlow,
        complexity: analysis.complexity,
        workflowExamplesCount: workflowExamples.length
      };

      // 6. Ajouter templates similaires si demandé
      if (includeTemplates) {
        context.similarTemplates = await this.findSimilarTemplates(analysis);
      }

      // 7. Ajouter exemples si demandé
      if (includeExamples) {
        context.examples = this.extractExamples(context.documents);
      }

      return context;

    } catch (error) {
      console.error('❌ Erreur récupération contexte:', error.message);
      return {
        request: userRequest,
        error: error.message,
        documents: [],
        detectedNodes: [],
        fallback: true
      };
    }
  }

  /**
   * Analyse la requête pour détecter nodes, patterns, complexité
   */
  async analyzeRequest(request) {
    const lowerRequest = request.toLowerCase();

    // Détecter nodes mentionnés
    const nodePatterns = {
      'webhook': ['Webhook', 'Webhook Trigger'],
      'email': ['Gmail', 'Send Email', 'IMAP Email'],
      'gmail': ['Gmail'],
      'slack': ['Slack'],
      'http': ['HTTP Request', 'HTTP Request Node'],
      'api': ['HTTP Request'],
      'schedule': ['Schedule Trigger', 'Cron'],
      'code': ['Code', 'Function', 'JavaScript'],
      'ai': ['AI Agent', 'OpenAI', 'Chat GPT'],
      'openai': ['OpenAI'],
      'gpt': ['OpenAI'],        // GPT-4, GPT-5, ChatGPT → OpenAI node
      'chatgpt': ['OpenAI'],
      'llm': ['OpenAI'],
      'claude': ['OpenAI'],     // Pas de node Claude natif, fallback OpenAI
      'linkedin': ['LinkedIn'], // Node LinkedIn natif
      'drive': ['Google Drive'],
      'google drive': ['Google Drive'],
      'notion': ['Notion'],
      'sheets': ['Google Sheets'],
      'google sheets': ['Google Sheets'],
      'database': ['Postgres', 'MySQL', 'MongoDB'],
      'file': ['Read/Write Files', 'Binary Files']
    };

    const detectedNodes = [];
    for (const [keyword, nodes] of Object.entries(nodePatterns)) {
      if (lowerRequest.includes(keyword)) {
        detectedNodes.push(...nodes);
      }
    }

    // Détecter type de workflow
    let workflowType = 'standard';
    let suggestedFlow = [];

    if (lowerRequest.match(/webhook|trigger/i)) {
      workflowType = 'webhook_triggered';
      suggestedFlow = ['Webhook', 'Processing', 'Action'];
    } else if (lowerRequest.match(/schedule|cron|quotidien|hebdo/i)) {
      workflowType = 'scheduled';
      suggestedFlow = ['Schedule', 'Fetch Data', 'Process', 'Notify'];
    } else if (lowerRequest.match(/email|mail/i)) {
      workflowType = 'email_automation';
      suggestedFlow = ['Trigger', 'Email Node', 'Response'];
    } else if (lowerRequest.match(/\bai\b|gpt|llm/i)) {
      workflowType = 'ai_powered';
      suggestedFlow = ['Input', 'AI Processing', 'Output'];
    } else if (lowerRequest.match(/sync|connect|integrate/i)) {
      workflowType = 'data_sync';
      suggestedFlow = ['Source', 'Transform', 'Destination'];
    }

    // Estimer complexité
    let complexity = 'simple';
    const words = request.split(/\s+/).length;
    const mentionedNodes = detectedNodes.length;

    if (words > 30 || mentionedNodes > 3) {
      complexity = 'complex';
    } else if (words > 15 || mentionedNodes > 1) {
      complexity = 'medium';
    }

    return {
      nodes: [...new Set(detectedNodes)], // Unique
      workflowType,
      suggestedFlow,
      complexity,
      keywords: this.extractKeywords(request)
    };
  }

  /**
   * Construit des filtres Qdrant basés sur l'analyse
   */
  buildFilters(analysis) {
    const filters = [];

    // 1. Filtrer par catégories pertinentes (flexible)
    const relevantCategories = [];

    if (analysis.workflowType === 'ai_powered') {
      relevantCategories.push('ai', 'advanced_ai');
    }

    if (analysis.workflowType === 'email_automation') {
      relevantCategories.push('integrations', 'builtin_nodes');
    }

    if (analysis.workflowType === 'webhook_triggered') {
      relevantCategories.push('core_nodes', 'builtin_nodes');
    }

    if (analysis.nodes.length > 0) {
      relevantCategories.push('integrations', 'workflows', 'builtin_nodes');
    }

    if (relevantCategories.length > 0) {
      // Dédupliquer
      const uniqueCategories = [...new Set(relevantCategories)];
      filters.push({
        key: 'category',
        match: { any: uniqueCategories }
      });
    }

    // 2. NodeType flexible avec OR logic - chaque node est un filtre séparé
    if (analysis.nodes.length > 0) {
      // Au lieu d'un seul filtre avec "any", on crée plusieurs filtres
      // Qdrant avec "should" fera automatiquement le OR
      filters.push({
        key: 'nodeType',
        match: { any: analysis.nodes }
      });
    }

    // 3. Timestamp flexible - 6 mois au lieu de 30 jours
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
    filters.push({
      key: 'timestamp',
      range: { gte: sixMonthsAgo }
    });

    return filters.length > 0 ? filters : null;
  }

  /**
   * Trouve des templates similaires
   */
  async findSimilarTemplates(analysis) {
    // TODO: Implémenter recherche dans templates internes
    // Pour l'instant retour vide, à implémenter phase 2
    return [];
  }

  /**
   * Extrait des exemples de code des documents
   */
  extractExamples(documents) {
    const examples = [];

    for (const doc of documents) {
      // Chercher blocks de code dans le contenu
      const codeBlocks = doc.content.match(/```[\s\S]*?```/g) || [];

      for (const block of codeBlocks) {
        const code = block.replace(/```\w*\n?/g, '').trim();
        if (code.length > 20 && code.length < 1000) {
          examples.push({
            code,
            source: doc.title,
            url: doc.url
          });
        }
      }

      if (examples.length >= 3) break; // Max 3 exemples
    }

    return examples;
  }

  /**
   * Formate un workflow en document texte pour le contexte
   */
  formatWorkflowAsDoc(workflowPayload) {
    return `
Exemple de workflow N8N: ${workflowPayload.name}

Description: ${workflowPayload.description}

Complexité: ${workflowPayload.complexity}
Nombre de nœuds: ${workflowPayload.nodeCount}
Connexions: ${workflowPayload.connections}

Intégrations utilisées: ${workflowPayload.integrations.join(', ')}

Ce workflow démontre comment: ${workflowPayload.description}
    `.trim();
  }

  /**
   * Extrait keywords de la requête
   */
  extractKeywords(text) {
    const stopwords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'je', 'tu', 'il', 'elle',
      'nous', 'vous', 'ils', 'elles', 'de', 'du', 'à', 'et', 'ou', 'pour',
      'avec', 'dans', 'sur', 'par', 'comment', 'quoi', 'que', 'qui'
    ]);

    // Mapping des alias vers noms officiels des nodes
    const aliasMapping = {
      'gpt': 'openai',
      'gpt-4': 'openai',
      'gpt-5': 'openai',
      'chatgpt': 'openai',
      'claude': 'anthropic',
      'sonnet': 'anthropic',
      'sheets': 'google sheets',
      'drive': 'google drive',
      'gmail': 'google gmail',
      'calendar': 'google calendar',
      'docs': 'google docs',
      'airtable': 'airtable',
      'notion': 'notion',
      'trello': 'trello',
      'asana': 'asana',
      'jira': 'jira',
      'hubspot': 'hubspot',
      'salesforce': 'salesforce',
      'postgresql': 'postgres',
      'mysql': 'mysql',
      'mongodb': 'mongodb',
      'redis': 'redis'
    };

    let keywords = text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopwords.has(word));

    // Remplacer les alias par les noms officiels
    keywords = keywords.map(word => aliasMapping[word] || word);

    // Dédupliquer et limiter
    return [...new Set(keywords)].slice(0, 15); // Augmenté de 10 à 15
  }

  /**
   * Génère embedding pour un texte
   */
  async embed(text) {
    // Check cache
    const cacheKey = this.getCacheKey(text);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Generate embedding
    const response = await this.openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: text,
      dimensions: config.openai.embeddingDimensions
    });

    const embedding = response.data[0].embedding;

    // Cache
    await this.redis.setex(
      cacheKey,
      config.redis.ttl.embeddings,
      JSON.stringify(embedding)
    );

    return embedding;
  }

  /**
   * Génère clé de cache
   */
  getCacheKey(text) {
    const hash = crypto
      .createHash('sha256')
      .update(text)
      .digest('hex')
      .substring(0, 16);

    return `embed:${hash}`;
  }

  /**
   * Ferme connexions
   */
  async close() {
    await this.redis.quit();
  }
}

module.exports = WorkflowContextRetriever;