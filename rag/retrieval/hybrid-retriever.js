/**
 * Enhanced Hybrid Retriever
 * Combines vector search + BM25 + reranking for optimal results
 * Implements Reciprocal Rank Fusion (RRF) for score combination
 */

const { HybridReranker } = require('./reranker');

class EnhancedHybridRetriever {
  constructor(vectorRetriever, options = {}) {
    this.vectorRetriever = vectorRetriever;

    this.config = {
      // Fusion parameters
      fusionMethod: options.fusionMethod || 'rrf', // 'rrf' or 'weighted'
      rrfK: options.rrfK || 60, // RRF constant

      // Weights for weighted fusion
      vectorWeight: options.vectorWeight || 0.6,
      bm25Weight: options.bm25Weight || 0.4,

      // Retrieval parameters
      initialK: options.initialK || 20, // Retrieve top 20 initially
      finalK: options.finalK || 5, // Return top 5 after reranking

      // BM25 parameters
      bm25K1: options.bm25K1 || 1.5,
      bm25B: options.bm25B || 0.75,

      // Reranking
      useReranker: options.useReranker !== false,
      rerankerTopK: options.rerankerTopK || 10,

      // Diversity
      enableDiversity: options.enableDiversity || false,
      diversityLambda: options.diversityLambda || 0.5
    };

    // Initialize reranker if enabled
    if (this.config.useReranker) {
      this.reranker = new HybridReranker({
        provider: 'openai',
        topK: this.config.rerankerTopK,
        vectorWeight: 0.7,
        bm25Weight: 0.3,
        enabled: process.env.OPENAI_API_KEY ? true : false
      });
    }

    this.stats = {
      retrievals: 0,
      vectorHits: 0,
      bm25Hits: 0,
      rerankCalls: 0,
      avgFusionScore: 0,
      avgImprovement: 0
    };
  }

  /**
   * Retrieve documents using hybrid approach
   */
  async retrieve(query, options = {}) {
    this.stats.retrievals++;

    const startTime = Date.now();

    // Step 1: Vector retrieval
    const vectorResults = await this.vectorRetriever.search(query, {
      limit: this.config.initialK,
      ...options
    });

    this.stats.vectorHits += vectorResults.length;

    // Step 2: BM25 retrieval (if we have document corpus)
    let bm25Results = [];
    if (this.vectorRetriever.documentCorpus) {
      bm25Results = this.bm25Search(query, this.vectorRetriever.documentCorpus, {
        k: this.config.initialK
      });
      this.stats.bm25Hits += bm25Results.length;
    }

    // Step 3: Fusion
    let fusedResults;
    if (this.config.fusionMethod === 'rrf') {
      fusedResults = this.reciprocalRankFusion(vectorResults, bm25Results);
    } else {
      fusedResults = this.weightedFusion(vectorResults, bm25Results);
    }

    // Take top K for reranking
    let topResults = fusedResults.slice(0, this.config.rerankerTopK);

    // Step 4: Reranking (optional)
    if (this.config.useReranker && this.reranker && topResults.length > 0) {
      this.stats.rerankCalls++;

      try {
        topResults = await this.reranker.rerank(query, topResults, {
          topK: this.config.finalK
        });
      } catch (error) {
        console.warn('Reranking failed, using fusion results:', error.message);
        topResults = topResults.slice(0, this.config.finalK);
      }
    } else {
      topResults = topResults.slice(0, this.config.finalK);
    }

    // Step 5: Diversity (optional)
    if (this.config.enableDiversity && topResults.length > 1) {
      topResults = this.maximalMarginalRelevance(topResults, query);
    }

    const duration = Date.now() - startTime;

    return {
      results: topResults,
      metadata: {
        vectorCount: vectorResults.length,
        bm25Count: bm25Results.length,
        fusedCount: fusedResults.length,
        finalCount: topResults.length,
        fusionMethod: this.config.fusionMethod,
        reranked: this.config.useReranker && topResults.length > 0,
        duration
      }
    };
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   * Combines rankings from multiple sources
   * Score(doc) = sum(1 / (k + rank(doc)))
   */
  reciprocalRankFusion(vectorResults, bm25Results) {
    const k = this.config.rrfK;
    const scoreMap = new Map();

    // Add vector scores
    vectorResults.forEach((doc, rank) => {
      const docId = this.getDocId(doc);
      const score = 1 / (k + rank + 1);

      scoreMap.set(docId, {
        doc,
        score,
        vectorRank: rank + 1,
        bm25Rank: null
      });
    });

    // Add BM25 scores
    bm25Results.forEach((doc, rank) => {
      const docId = this.getDocId(doc);
      const score = 1 / (k + rank + 1);

      if (scoreMap.has(docId)) {
        const existing = scoreMap.get(docId);
        existing.score += score;
        existing.bm25Rank = rank + 1;
      } else {
        scoreMap.set(docId, {
          doc,
          score,
          vectorRank: null,
          bm25Rank: rank + 1
        });
      }
    });

    // Convert to array and sort
    const fused = Array.from(scoreMap.values())
      .map(item => ({
        ...item.doc,
        fusionScore: item.score,
        vectorRank: item.vectorRank,
        bm25Rank: item.bm25Rank,
        score: item.score // Update score for downstream
      }))
      .sort((a, b) => b.fusionScore - a.fusionScore);

    // Update stats
    const avgScore = fused.reduce((sum, d) => sum + d.fusionScore, 0) / fused.length;
    this.stats.avgFusionScore = (this.stats.avgFusionScore * (this.stats.retrievals - 1) + avgScore) / this.stats.retrievals;

    return fused;
  }

  /**
   * Weighted fusion
   * Combines normalized scores with weights
   */
  weightedFusion(vectorResults, bm25Results) {
    const scoreMap = new Map();

    // Normalize and weight vector scores
    const maxVectorScore = Math.max(...vectorResults.map(d => d.score || 0), 1);
    vectorResults.forEach(doc => {
      const docId = this.getDocId(doc);
      const normalizedScore = (doc.score || 0) / maxVectorScore;
      const weightedScore = normalizedScore * this.config.vectorWeight;

      scoreMap.set(docId, {
        doc,
        score: weightedScore,
        vectorScore: normalizedScore,
        bm25Score: 0
      });
    });

    // Normalize and weight BM25 scores
    const maxBM25Score = Math.max(...bm25Results.map(d => d.bm25Score || 0), 1);
    bm25Results.forEach(doc => {
      const docId = this.getDocId(doc);
      const normalizedScore = (doc.bm25Score || 0) / maxBM25Score;
      const weightedScore = normalizedScore * this.config.bm25Weight;

      if (scoreMap.has(docId)) {
        const existing = scoreMap.get(docId);
        existing.score += weightedScore;
        existing.bm25Score = normalizedScore;
      } else {
        scoreMap.set(docId, {
          doc,
          score: weightedScore,
          vectorScore: 0,
          bm25Score: normalizedScore
        });
      }
    });

    // Convert and sort
    return Array.from(scoreMap.values())
      .map(item => ({
        ...item.doc,
        fusionScore: item.score,
        vectorScore: item.vectorScore,
        bm25Score: item.bm25Score,
        score: item.score
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * BM25 search implementation
   */
  bm25Search(query, documents, options = {}) {
    const k = options.k || this.config.initialK;
    const k1 = this.config.bm25K1;
    const b = this.config.bm25B;

    // Tokenize query
    const queryTokens = this.tokenize(query);

    // Tokenize documents
    const docTokens = documents.map(doc => ({
      doc,
      tokens: this.tokenize(this.extractText(doc))
    }));

    // Calculate average document length
    const avgDocLength = docTokens.reduce((sum, d) => sum + d.tokens.length, 0) / docTokens.length;

    // Calculate document frequencies
    const docFreq = new Map();
    queryTokens.forEach(token => {
      const df = docTokens.filter(d => d.tokens.includes(token)).length;
      docFreq.set(token, df);
    });

    // Calculate BM25 score for each document
    const scores = docTokens.map(({ doc, tokens }) => {
      let score = 0;
      const docLength = tokens.length;

      queryTokens.forEach(queryToken => {
        const df = docFreq.get(queryToken) || 0;
        if (df === 0) return;

        // IDF
        const idf = Math.log((documents.length - df + 0.5) / (df + 0.5) + 1);

        // TF
        const tf = tokens.filter(t => t === queryToken).length;

        // BM25 formula
        const numerator = tf * (k1 + 1);
        const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));

        score += idf * (numerator / denominator);
      });

      return {
        ...doc,
        bm25Score: score,
        score: score
      };
    });

    // Sort and return top k
    return scores
      .sort((a, b) => b.bm25Score - a.bm25Score)
      .slice(0, k);
  }

  /**
   * Maximal Marginal Relevance (MMR)
   * Promotes diversity in results
   */
  maximalMarginalRelevance(documents, query, lambda = null) {
    if (documents.length <= 1) return documents;

    lambda = lambda || this.config.diversityLambda;
    const selected = [documents[0]]; // Start with top result
    const remaining = documents.slice(1);

    while (selected.length < this.config.finalK && remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;

      // Find document that maximizes: λ * relevance - (1-λ) * max_similarity_to_selected
      for (let i = 0; i < remaining.length; i++) {
        const doc = remaining[i];
        const relevance = doc.score || 0;

        // Calculate max similarity to already selected documents
        const maxSimilarity = Math.max(
          ...selected.map(s => this.documentSimilarity(doc, s))
        );

        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }

      // Move best document to selected
      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    return selected;
  }

  /**
   * Calculate document similarity (simple text overlap)
   */
  documentSimilarity(doc1, doc2) {
    const tokens1 = new Set(this.tokenize(this.extractText(doc1)));
    const tokens2 = new Set(this.tokenize(this.extractText(doc2)));

    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Tokenize text
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  /**
   * Extract text from document
   */
  extractText(doc) {
    if (typeof doc === 'string') return doc;
    if (doc.content) return doc.content;
    if (doc.text) return doc.text;
    if (doc.pageContent) return doc.pageContent;
    if (doc.payload) {
      return doc.payload.content || doc.payload.text || JSON.stringify(doc.payload);
    }
    return JSON.stringify(doc);
  }

  /**
   * Get document ID
   */
  getDocId(doc) {
    return doc.id || doc.payload?.id || this.extractText(doc).substring(0, 50);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      avgVectorHitsPerRetrieval: this.stats.retrievals > 0
        ? (this.stats.vectorHits / this.stats.retrievals).toFixed(1)
        : 0,
      avgBM25HitsPerRetrieval: this.stats.retrievals > 0
        ? (this.stats.bm25Hits / this.stats.retrievals).toFixed(1)
        : 0,
      rerankRate: this.stats.retrievals > 0
        ? ((this.stats.rerankCalls / this.stats.retrievals) * 100).toFixed(1) + '%'
        : '0%',
      config: {
        fusionMethod: this.config.fusionMethod,
        initialK: this.config.initialK,
        finalK: this.config.finalK,
        rerankerEnabled: this.config.useReranker
      }
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      retrievals: 0,
      vectorHits: 0,
      bm25Hits: 0,
      rerankCalls: 0,
      avgFusionScore: 0,
      avgImprovement: 0
    };
  }
}

module.exports = EnhancedHybridRetriever;