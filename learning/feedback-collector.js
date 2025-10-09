/**
 * Feedback Collector
 * Collects and stores user feedback on generated workflows
 * Enables learning loop for continuous improvement
 */

const fs = require('fs').promises;
const path = require('path');

class FeedbackCollector {
  constructor(options = {}) {
    this.config = {
      storageDir: options.storageDir || path.join(__dirname, '../data/feedback'),
      maxFeedbackAge: options.maxFeedbackAge || 90, // days
      autoAnalyze: options.autoAnalyze !== false,
      minFeedbackForAnalysis: options.minFeedbackForAnalysis || 10
    };

    this.feedbackStore = new Map(); // In-memory cache
    this.stats = {
      totalFeedback: 0,
      positiveCount: 0,
      negativeCount: 0,
      averageRating: 0,
      byIntent: {},
      byModel: {},
      commonIssues: []
    };
  }

  /**
   * Initialize feedback collector
   */
  async init() {
    try {
      // Create storage directory if needed
      await fs.mkdir(this.config.storageDir, { recursive: true });

      // Load existing feedback
      await this.loadFeedback();

      console.log(`✅ Feedback collector initialized (${this.stats.totalFeedback} feedback items loaded)`);
    } catch (error) {
      console.error('Error initializing feedback collector:', error.message);
      throw error;
    }
  }

  /**
   * Collect feedback for a workflow generation
   */
  async collectFeedback(feedback) {
    const {
      sessionId,
      workflowId,
      rating, // 1-5 stars
      successful, // boolean
      comment,
      issues = [], // Array of issue types
      request,
      workflow,
      metadata = {}
    } = feedback;

    // Validate required fields
    if (!sessionId || rating === undefined) {
      throw new Error('SessionId and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const feedbackEntry = {
      id: this.generateFeedbackId(),
      sessionId,
      workflowId: workflowId || null,
      rating,
      successful: successful !== false,
      comment: comment || '',
      issues,
      request: request || '',
      workflow: workflow ? {
        name: workflow.name,
        nodeCount: workflow.nodes?.length || 0,
        nodeTypes: workflow.nodes?.map(n => n.type) || []
      } : null,
      metadata: {
        intent: metadata.intent,
        model: metadata.model,
        ragUsed: metadata.ragUsed,
        documentsUsed: metadata.documentsUsed,
        generationTime: metadata.generationTime,
        validationResult: metadata.validationResult,
        ...metadata
      },
      timestamp: Date.now(),
      analyzed: false
    };

    // Store feedback
    this.feedbackStore.set(feedbackEntry.id, feedbackEntry);
    await this.saveFeedback(feedbackEntry);

    // Update stats
    this.updateStats(feedbackEntry);

    // Trigger auto-analysis if threshold reached
    if (this.config.autoAnalyze &&
        this.stats.totalFeedback >= this.config.minFeedbackForAnalysis &&
        this.stats.totalFeedback % this.config.minFeedbackForAnalysis === 0) {
      setImmediate(() => this.analyzePatterns());
    }

    return {
      feedbackId: feedbackEntry.id,
      message: 'Feedback collected successfully',
      totalFeedback: this.stats.totalFeedback
    };
  }

  /**
   * Get feedback by session
   */
  getFeedbackBySession(sessionId) {
    return Array.from(this.feedbackStore.values())
      .filter(f => f.sessionId === sessionId);
  }

  /**
   * Get feedback by rating
   */
  getFeedbackByRating(rating) {
    return Array.from(this.feedbackStore.values())
      .filter(f => f.rating === rating);
  }

  /**
   * Get negative feedback (rating <= 2)
   */
  getNegativeFeedback() {
    return Array.from(this.feedbackStore.values())
      .filter(f => f.rating <= 2)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get positive feedback (rating >= 4)
   */
  getPositiveFeedback() {
    return Array.from(this.feedbackStore.values())
      .filter(f => f.rating >= 4)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Analyze feedback patterns
   */
  async analyzePatterns() {
    const allFeedback = Array.from(this.feedbackStore.values());

    if (allFeedback.length === 0) {
      return { message: 'No feedback to analyze' };
    }

    const analysis = {
      timestamp: Date.now(),
      totalFeedback: allFeedback.length,
      averageRating: this.stats.averageRating,
      successRate: this.stats.positiveCount / this.stats.totalFeedback,

      // Issues analysis
      commonIssues: this.analyzeIssues(allFeedback),

      // Intent performance
      intentPerformance: this.analyzeByIntent(allFeedback),

      // Model performance
      modelPerformance: this.analyzeByModel(allFeedback),

      // RAG effectiveness
      ragEffectiveness: this.analyzeRAGEffectiveness(allFeedback),

      // Recommendations
      recommendations: []
    };

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    // Save analysis
    await this.saveAnalysis(analysis);

    return analysis;
  }

  /**
   * Analyze common issues
   */
  analyzeIssues(feedback) {
    const issueCount = {};

    feedback.forEach(f => {
      if (f.issues && f.issues.length > 0) {
        f.issues.forEach(issue => {
          issueCount[issue] = (issueCount[issue] || 0) + 1;
        });
      }
    });

    return Object.entries(issueCount)
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: (count / feedback.length * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze by intent
   */
  analyzeByIntent(feedback) {
    const byIntent = {};

    feedback.forEach(f => {
      const intent = f.metadata.intent || 'unknown';
      if (!byIntent[intent]) {
        byIntent[intent] = {
          count: 0,
          ratings: [],
          successCount: 0
        };
      }

      byIntent[intent].count++;
      byIntent[intent].ratings.push(f.rating);
      if (f.successful) {
        byIntent[intent].successCount++;
      }
    });

    return Object.entries(byIntent).map(([intent, data]) => ({
      intent,
      count: data.count,
      averageRating: (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(2),
      successRate: (data.successCount / data.count * 100).toFixed(1) + '%'
    }));
  }

  /**
   * Analyze by model
   */
  analyzeByModel(feedback) {
    const byModel = {};

    feedback.forEach(f => {
      const model = f.metadata.model || 'unknown';
      if (!byModel[model]) {
        byModel[model] = {
          count: 0,
          ratings: [],
          totalTime: 0
        };
      }

      byModel[model].count++;
      byModel[model].ratings.push(f.rating);
      byModel[model].totalTime += f.metadata.generationTime || 0;
    });

    return Object.entries(byModel).map(([model, data]) => ({
      model,
      count: data.count,
      averageRating: (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(2),
      averageTime: Math.round(data.totalTime / data.count) + 'ms'
    }));
  }

  /**
   * Analyze RAG effectiveness
   */
  analyzeRAGEffectiveness(feedback) {
    const withRAG = feedback.filter(f => f.metadata.ragUsed);
    const withoutRAG = feedback.filter(f => !f.metadata.ragUsed);

    const avgRatingWithRAG = withRAG.length > 0
      ? withRAG.reduce((sum, f) => sum + f.rating, 0) / withRAG.length
      : 0;

    const avgRatingWithoutRAG = withoutRAG.length > 0
      ? withoutRAG.reduce((sum, f) => sum + f.rating, 0) / withoutRAG.length
      : 0;

    return {
      withRAG: {
        count: withRAG.length,
        averageRating: avgRatingWithRAG.toFixed(2),
        averageDocuments: withRAG.length > 0
          ? Math.round(withRAG.reduce((sum, f) => sum + (f.metadata.documentsUsed || 0), 0) / withRAG.length)
          : 0
      },
      withoutRAG: {
        count: withoutRAG.length,
        averageRating: avgRatingWithoutRAG.toFixed(2)
      },
      improvement: ((avgRatingWithRAG - avgRatingWithoutRAG) * 20).toFixed(1) + '%'
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Low success rate
    if (analysis.successRate < 0.7) {
      recommendations.push({
        priority: 'high',
        category: 'success_rate',
        message: `Success rate is low (${(analysis.successRate * 100).toFixed(1)}%). Consider improving validation and error handling.`,
        actions: [
          'Review failed workflows for common patterns',
          'Enhance validation rules',
          'Improve RAG context retrieval'
        ]
      });
    }

    // Common issues
    if (analysis.commonIssues.length > 0 && analysis.commonIssues[0].count > 5) {
      const topIssue = analysis.commonIssues[0];
      recommendations.push({
        priority: 'high',
        category: 'issue',
        message: `Most common issue: "${topIssue.issue}" (${topIssue.percentage}% of feedback)`,
        actions: [
          `Focus on fixing: ${topIssue.issue}`,
          'Update prompts to address this issue',
          'Add specific validation for this case'
        ]
      });
    }

    // RAG effectiveness
    if (analysis.ragEffectiveness.withRAG.averageRating < analysis.ragEffectiveness.withoutRAG.averageRating) {
      recommendations.push({
        priority: 'medium',
        category: 'rag',
        message: 'RAG is not improving results. Review retrieval quality.',
        actions: [
          'Check document relevance scores',
          'Improve chunking strategy',
          'Update knowledge base content'
        ]
      });
    }

    // Low average rating
    if (analysis.averageRating < 3.5) {
      recommendations.push({
        priority: 'critical',
        category: 'rating',
        message: `Average rating is low (${analysis.averageRating.toFixed(1)}/5). Immediate attention needed.`,
        actions: [
          'Review recent negative feedback',
          'Identify breaking changes or regressions',
          'Consider prompt version rollback'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Update statistics
   */
  updateStats(feedbackEntry) {
    this.stats.totalFeedback++;

    if (feedbackEntry.rating >= 4) {
      this.stats.positiveCount++;
    } else if (feedbackEntry.rating <= 2) {
      this.stats.negativeCount++;
    }

    // Update average rating
    const allRatings = Array.from(this.feedbackStore.values()).map(f => f.rating);
    this.stats.averageRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;

    // Update by intent
    const intent = feedbackEntry.metadata.intent || 'unknown';
    if (!this.stats.byIntent[intent]) {
      this.stats.byIntent[intent] = { count: 0, totalRating: 0 };
    }
    this.stats.byIntent[intent].count++;
    this.stats.byIntent[intent].totalRating += feedbackEntry.rating;

    // Update by model
    const model = feedbackEntry.metadata.model || 'unknown';
    if (!this.stats.byModel[model]) {
      this.stats.byModel[model] = { count: 0, totalRating: 0 };
    }
    this.stats.byModel[model].count++;
    this.stats.byModel[model].totalRating += feedbackEntry.rating;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      positiveRate: this.stats.totalFeedback > 0
        ? (this.stats.positiveCount / this.stats.totalFeedback * 100).toFixed(1) + '%'
        : '0%',
      negativeRate: this.stats.totalFeedback > 0
        ? (this.stats.negativeCount / this.stats.totalFeedback * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Save feedback to disk
   */
  async saveFeedback(feedback) {
    const filename = `feedback_${feedback.id}.json`;
    const filepath = path.join(this.config.storageDir, filename);

    try {
      await fs.writeFile(filepath, JSON.stringify(feedback, null, 2));
    } catch (error) {
      console.error('Error saving feedback:', error.message);
    }
  }

  /**
   * Load feedback from disk
   */
  async loadFeedback() {
    try {
      const files = await fs.readdir(this.config.storageDir);
      const feedbackFiles = files.filter(f => f.startsWith('feedback_') && f.endsWith('.json'));

      for (const file of feedbackFiles) {
        try {
          const filepath = path.join(this.config.storageDir, file);
          const content = await fs.readFile(filepath, 'utf8');
          const feedback = JSON.parse(content);

          // Skip old feedback
          const age = (Date.now() - feedback.timestamp) / (1000 * 60 * 60 * 24);
          if (age > this.config.maxFeedbackAge) {
            continue;
          }

          this.feedbackStore.set(feedback.id, feedback);
          this.updateStats(feedback);

        } catch (error) {
          console.error(`Error loading ${file}:`, error.message);
        }
      }

    } catch (error) {
      // Directory doesn't exist yet, that's ok
      if (error.code !== 'ENOENT') {
        console.error('Error loading feedback:', error.message);
      }
    }
  }

  /**
   * Save analysis results
   */
  async saveAnalysis(analysis) {
    const filename = `analysis_${Date.now()}.json`;
    const filepath = path.join(this.config.storageDir, filename);

    try {
      await fs.writeFile(filepath, JSON.stringify(analysis, null, 2));
    } catch (error) {
      console.error('Error saving analysis:', error.message);
    }
  }

  /**
   * Generate feedback ID
   */
  generateFeedbackId() {
    return 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Clean old feedback
   */
  async cleanOldFeedback() {
    const cutoffTime = Date.now() - (this.config.maxFeedbackAge * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    try {
      const files = await fs.readdir(this.config.storageDir);

      for (const file of files) {
        if (!file.startsWith('feedback_')) continue;

        const filepath = path.join(this.config.storageDir, file);
        const content = await fs.readFile(filepath, 'utf8');
        const feedback = JSON.parse(content);

        if (feedback.timestamp < cutoffTime) {
          await fs.unlink(filepath);
          this.feedbackStore.delete(feedback.id);
          cleanedCount++;
        }
      }

      return { cleanedCount, message: `Cleaned ${cleanedCount} old feedback items` };

    } catch (error) {
      console.error('Error cleaning feedback:', error.message);
      return { error: error.message };
    }
  }
}

module.exports = FeedbackCollector;