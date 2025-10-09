/**
 * Cross-Encoder Reranker
 * Improves RAG retrieval quality by reranking results using semantic similarity
 * Uses Cohere Rerank API or OpenAI embeddings for cross-encoding
 */

const OpenAI = require('openai');

class Reranker {
  constructor(options = {}) {
    this.config = {
      provider: options.provider || 'openai', // 'openai' or 'cohere'
      model: options.model || 'text-embedding-3-small',
      topK: options.topK || 5, // Return top K results after reranking
      enabled: options.enabled !== false,
      cacheResults: options.cacheResults !== false,
      minScoreThreshold: options.minScoreThreshold || 0.0
    };

    if (this.config.provider === 'openai') {
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
      } else {
        this.openai = null;
        this.config.enabled = false;
      }
    }

    this.cache = new Map();
    this.stats = {
      rerankCalls: 0,
      cacheHits: 0,
      averageScoreImprovement: 0,
      totalDocumentsReranked: 0
    };
  }

  /**
   * Rerank documents using cross-encoder approach
   */
  async rerank(query, documents, options = {}) {
    if (!this.config.enabled) {
      return documents.slice(0, this.config.topK);
    }

    if (!documents || documents.length === 0) {
      return [];
    }

    const topK = options.topK || this.config.topK;

    // Check cache
    const cacheKey = this.getCacheKey(query, documents);
    if (this.config.cacheResults && this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey);
    }

    this.stats.rerankCalls++;
    this.stats.totalDocumentsReranked += documents.length;

    try {
      let reranked;

      if (this.config.provider === 'openai') {
        reranked = await this.rerankWithOpenAI(query, documents);
      } else if (this.config.provider === 'cohere') {
        reranked = await this.rerankWithCohere(query, documents);
      } else {
        throw new Error(`Unknown reranker provider: ${this.config.provider}`);
      }

      // Calculate score improvement
      const originalAvg = this.calculateAvgScore(documents);
      const rerankedAvg = this.calculateAvgScore(reranked.slice(0, topK));
      const improvement = rerankedAvg - originalAvg;

      this.stats.averageScoreImprovement =
        (this.stats.averageScoreImprovement * (this.stats.rerankCalls - 1) + improvement) /
        this.stats.rerankCalls;

      // Filter by threshold and take topK
      const filtered = reranked
        .filter(doc => doc.score >= this.config.minScoreThreshold)
        .slice(0, topK);

      // Cache results
      if (this.config.cacheResults) {
        this.cache.set(cacheKey, filtered);
      }

      return filtered;

    } catch (error) {
      console.error('Reranker error:', error.message);
      // Fallback to original ranking
      return documents.slice(0, topK);
    }
  }

  /**
   * Rerank using OpenAI embeddings (cosine similarity)
   */
  async rerankWithOpenAI(query, documents) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Get query embedding
    const queryEmbeddingResponse = await this.openai.embeddings.create({
      model: this.config.model,
      input: query
    });

    const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

    // Get document embeddings (batch for efficiency)
    const documentTexts = documents.map(doc => this.extractText(doc));

    const docEmbeddingResponse = await this.openai.embeddings.create({
      model: this.config.model,
      input: documentTexts
    });

    const docEmbeddings = docEmbeddingResponse.data.map(d => d.embedding);

    // Calculate cross-encoder scores (cosine similarity)
    const scoredDocuments = documents.map((doc, idx) => {
      const similarity = this.cosineSimilarity(queryEmbedding, docEmbeddings[idx]);

      return {
        ...doc,
        originalScore: doc.score,
        score: similarity,
        rerankScore: similarity,
        scoreImprovement: similarity - (doc.score || 0)
      };
    });

    // Sort by rerank score
    return scoredDocuments.sort((a, b) => b.score - a.score);
  }

  /**
   * Rerank using Cohere Rerank API (more accurate but requires API key)
   */
  async rerankWithCohere(query, documents) {
    // Note: This requires @cohere-ai/cohere-ai package
    // For now, return fallback
    console.warn('Cohere reranker not implemented. Install @cohere-ai/cohere-ai to use.');
    return documents;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Extract text from document for embedding
   */
  extractText(doc) {
    if (typeof doc === 'string') {
      return doc;
    }

    // Handle different document formats
    if (doc.content) {
      return doc.content;
    }

    if (doc.text) {
      return doc.text;
    }

    if (doc.pageContent) {
      return doc.pageContent;
    }

    if (doc.payload) {
      return doc.payload.content || doc.payload.text || JSON.stringify(doc.payload);
    }

    return JSON.stringify(doc);
  }

  /**
   * Calculate average score
   */
  calculateAvgScore(documents) {
    if (documents.length === 0) return 0;
    const sum = documents.reduce((acc, doc) => acc + (doc.score || 0), 0);
    return sum / documents.length;
  }

  /**
   * Generate cache key
   */
  getCacheKey(query, documents) {
    const docIds = documents.map(d => d.id || d.payload?.id || '').join(',');
    return `${query}:${docIds}`;
  }

  /**
   * Get reranker statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.rerankCalls > 0
        ? this.stats.cacheHits / (this.stats.cacheHits + this.stats.rerankCalls)
        : 0,
      enabled: this.config.enabled,
      provider: this.config.provider,
      topK: this.config.topK
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      rerankCalls: 0,
      cacheHits: 0,
      averageScoreImprovement: 0,
      totalDocumentsReranked: 0
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Enable/disable reranker
   */
  setEnabled(enabled) {
    this.config.enabled = enabled;
  }
}

/**
 * Hybrid Reranker
 * Combines vector similarity with BM25 lexical matching
 */
class HybridReranker extends Reranker {
  constructor(options = {}) {
    super(options);

    this.hybridConfig = {
      vectorWeight: options.vectorWeight || 0.7,
      bm25Weight: options.bm25Weight || 0.3,
      k1: options.k1 || 1.5, // BM25 parameter
      b: options.b || 0.75   // BM25 parameter
    };
  }

  /**
   * Rerank using hybrid approach (vector + BM25)
   */
  async rerank(query, documents, options = {}) {
    if (!this.config.enabled) {
      return documents.slice(0, this.config.topK);
    }

    if (!documents || documents.length === 0) {
      return [];
    }

    const topK = options.topK || this.config.topK;

    try {
      // Get vector scores
      const vectorReranked = await super.rerank(query, documents, { topK: documents.length });

      // Calculate BM25 scores
      const bm25Scores = this.calculateBM25Scores(query, documents);

      // Combine scores
      const hybridScored = documents.map((doc, idx) => {
        const vectorScore = vectorReranked.find(d =>
          this.extractText(d) === this.extractText(doc)
        )?.score || 0;

        const bm25Score = bm25Scores[idx];

        const hybridScore =
          this.hybridConfig.vectorWeight * vectorScore +
          this.hybridConfig.bm25Weight * bm25Score;

        return {
          ...doc,
          originalScore: doc.score,
          vectorScore,
          bm25Score,
          score: hybridScore,
          hybridScore
        };
      });

      // Sort and filter
      const filtered = hybridScored
        .sort((a, b) => b.score - a.score)
        .filter(doc => doc.score >= this.config.minScoreThreshold)
        .slice(0, topK);

      return filtered;

    } catch (error) {
      console.error('Hybrid reranker error:', error.message);
      return documents.slice(0, topK);
    }
  }

  /**
   * Calculate BM25 scores for documents
   */
  calculateBM25Scores(query, documents) {
    const queryTokens = this.tokenize(query);
    const docTexts = documents.map(doc => this.extractText(doc));
    const docTokens = docTexts.map(text => this.tokenize(text));

    // Calculate document frequencies
    const docFreq = new Map();
    queryTokens.forEach(token => {
      const df = docTokens.filter(tokens => tokens.includes(token)).length;
      docFreq.set(token, df);
    });

    // Calculate average document length
    const avgDocLength = docTokens.reduce((sum, tokens) => sum + tokens.length, 0) / docTokens.length;

    // Calculate BM25 score for each document
    const scores = docTokens.map(tokens => {
      let score = 0;
      const docLength = tokens.length;

      queryTokens.forEach(queryToken => {
        const df = docFreq.get(queryToken) || 0;
        if (df === 0) return;

        const idf = Math.log((documents.length - df + 0.5) / (df + 0.5) + 1);
        const tf = tokens.filter(t => t === queryToken).length;

        const numerator = tf * (this.hybridConfig.k1 + 1);
        const denominator = tf + this.hybridConfig.k1 * (
          1 - this.hybridConfig.b +
          this.hybridConfig.b * (docLength / avgDocLength)
        );

        score += idf * (numerator / denominator);
      });

      return score;
    });

    // Normalize scores to 0-1 range
    const maxScore = Math.max(...scores, 1);
    return scores.map(s => s / maxScore);
  }

  /**
   * Tokenize text for BM25
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }
}

module.exports = {
  Reranker,
  HybridReranker
};