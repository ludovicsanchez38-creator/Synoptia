/**
 * Improvement Engine
 * Automatically improves prompts and system based on feedback
 */

const PromptManager = require('../prompts/prompt-manager');

class ImprovementEngine {
  constructor(feedbackCollector, options = {}) {
    this.feedbackCollector = feedbackCollector;
    this.promptManager = new PromptManager();

    this.config = {
      minFeedbackForImprovement: options.minFeedbackForImprovement || 20,
      improvementThreshold: options.improvementThreshold || 0.2, // 20% improvement needed
      autoApply: options.autoApply || false, // Auto-apply improvements
      testPeriod: options.testPeriod || 7 // days to test new version
    };

    this.improvements = [];
    this.experiments = new Map(); // A/B tests
  }

  /**
   * Initialize improvement engine
   */
  async init() {
    await this.promptManager.load();
    console.log('✅ Improvement engine initialized');
  }

  /**
   * Analyze feedback and suggest improvements
   */
  async suggestImprovements() {
    const analysis = await this.feedbackCollector.analyzePatterns();

    if (analysis.totalFeedback < this.config.minFeedbackForImprovement) {
      return {
        message: `Not enough feedback yet (${analysis.totalFeedback}/${this.config.minFeedbackForImprovement})`,
        improvements: []
      };
    }

    const suggestions = [];

    // Analyze negative feedback patterns
    const negativeFeedback = this.feedbackCollector.getNegativeFeedback();
    if (negativeFeedback.length > 0) {
      const promptSuggestions = this.analyzeNegativeFeedbackForPrompts(negativeFeedback);
      suggestions.push(...promptSuggestions);
    }

    // Analyze RAG performance
    if (analysis.ragEffectiveness.improvement < 0) {
      suggestions.push({
        type: 'rag_configuration',
        priority: 'high',
        current: analysis.ragEffectiveness,
        suggestion: 'RAG is reducing quality. Consider adjusting retrieval parameters or disabling.',
        actions: [
          'Increase minScore threshold',
          'Reduce maxDocuments',
          'Review document quality',
          'Test with RAG disabled'
        ]
      });
    }

    // Analyze intent performance
    const poorPerformingIntents = analysis.intentPerformance
      .filter(i => parseFloat(i.averageRating) < 3.0);

    if (poorPerformingIntents.length > 0) {
      poorPerformingIntents.forEach(intent => {
        suggestions.push({
          type: 'intent_specific',
          priority: 'medium',
          intent: intent.intent,
          current: intent,
          suggestion: `Intent "${intent.intent}" has low rating (${intent.averageRating})`,
          actions: [
            'Review prompts for this intent',
            'Add more examples for this use case',
            'Improve validation for this intent type'
          ]
        });
      });
    }

    this.improvements = suggestions;
    return {
      totalSuggestions: suggestions.length,
      suggestions,
      analysis
    };
  }

  /**
   * Analyze negative feedback for prompt improvements
   */
  analyzeNegativeFeedbackForPrompts(negativeFeedback) {
    const suggestions = [];

    // Group by common issues
    const issueGroups = {};

    negativeFeedback.forEach(feedback => {
      feedback.issues?.forEach(issue => {
        if (!issueGroups[issue]) {
          issueGroups[issue] = [];
        }
        issueGroups[issue].push(feedback);
      });
    });

    // Generate suggestions for each issue type
    Object.entries(issueGroups).forEach(([issue, feedbacks]) => {
      if (feedbacks.length >= 3) { // At least 3 occurrences
        suggestions.push({
          type: 'prompt_improvement',
          priority: 'high',
          issue,
          occurrences: feedbacks.length,
          suggestion: this.getPromptSuggestionForIssue(issue),
          affectedRequests: feedbacks.map(f => f.request).slice(0, 5)
        });
      }
    });

    return suggestions;
  }

  /**
   * Get prompt suggestion for specific issue
   */
  getPromptSuggestionForIssue(issue) {
    const suggestions = {
      'missing_parameters': 'Add explicit instructions to include all required node parameters',
      'invalid_connections': 'Strengthen connection validation rules in prompt',
      'wrong_node_types': 'Add more examples of correct node selection',
      'missing_credentials': 'Add reminder about credential requirements',
      'syntax_errors': 'Add JSON syntax validation instructions',
      'incomplete_workflow': 'Add completeness check instructions',
      'poor_node_naming': 'Add naming convention guidelines',
      'missing_trigger': 'Add requirement for trigger node'
    };

    return suggestions[issue] || 'Review and improve prompt for this issue type';
  }

  /**
   * Create A/B test experiment
   */
  async createExperiment(name, variantA, variantB, options = {}) {
    const experiment = {
      id: this.generateExperimentId(),
      name,
      variantA: {
        ...variantA,
        traffic: 0.5, // 50% traffic split
        results: {
          count: 0,
          ratings: [],
          successCount: 0
        }
      },
      variantB: {
        ...variantB,
        traffic: 0.5,
        results: {
          count: 0,
          ratings: [],
          successCount: 0
        }
      },
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      minSamples: options.minSamples || 50,
      confidenceLevel: options.confidenceLevel || 0.95
    };

    this.experiments.set(experiment.id, experiment);

    return experiment;
  }

  /**
   * Get variant for experiment (A/B testing)
   */
  getVariant(experimentId) {
    const experiment = this.experiments.get(experimentId);

    if (!experiment || experiment.status !== 'running') {
      return null;
    }

    // Random assignment based on traffic split
    const random = Math.random();
    return random < experiment.variantA.traffic ? 'A' : 'B';
  }

  /**
   * Record experiment result
   */
  recordExperimentResult(experimentId, variant, result) {
    const experiment = this.experiments.get(experimentId);

    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const variantData = variant === 'A' ? experiment.variantA : experiment.variantB;

    variantData.results.count++;
    variantData.results.ratings.push(result.rating);
    if (result.successful) {
      variantData.results.successCount++;
    }

    // Check if we have enough samples to analyze
    if (this.canAnalyzeExperiment(experiment)) {
      this.analyzeExperiment(experimentId);
    }
  }

  /**
   * Check if experiment has enough samples
   */
  canAnalyzeExperiment(experiment) {
    return experiment.variantA.results.count >= experiment.minSamples &&
           experiment.variantB.results.count >= experiment.minSamples;
  }

  /**
   * Analyze experiment results
   */
  analyzeExperiment(experimentId) {
    const experiment = this.experiments.get(experimentId);

    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const variantA = experiment.variantA.results;
    const variantB = experiment.variantB.results;

    // Calculate averages
    const avgRatingA = variantA.ratings.reduce((a, b) => a + b, 0) / variantA.count;
    const avgRatingB = variantB.ratings.reduce((a, b) => a + b, 0) / variantB.count;

    const successRateA = variantA.successCount / variantA.count;
    const successRateB = variantB.successCount / variantB.count;

    // Calculate improvement
    const ratingImprovement = (avgRatingB - avgRatingA) / avgRatingA;
    const successImprovement = (successRateB - successRateA) / successRateA;

    // Determine winner
    let winner = null;
    let significant = false;

    if (Math.abs(ratingImprovement) > this.config.improvementThreshold) {
      winner = ratingImprovement > 0 ? 'B' : 'A';
      significant = true;
    }

    const analysis = {
      experimentId,
      variantA: {
        samples: variantA.count,
        avgRating: avgRatingA.toFixed(2),
        successRate: (successRateA * 100).toFixed(1) + '%'
      },
      variantB: {
        samples: variantB.count,
        avgRating: avgRatingB.toFixed(2),
        successRate: (successRateB * 100).toFixed(1) + '%'
      },
      improvement: {
        rating: (ratingImprovement * 100).toFixed(1) + '%',
        success: (successImprovement * 100).toFixed(1) + '%'
      },
      winner,
      significant,
      recommendation: significant
        ? `Deploy variant ${winner} to all users`
        : 'Continue testing, difference not significant'
    };

    // Auto-apply if configured
    if (this.config.autoApply && significant && winner === 'B') {
      console.log(`🚀 Auto-applying variant B from experiment ${experimentId}`);
      // Implementation would update prompt version here
    }

    return analysis;
  }

  /**
   * Get all experiments
   */
  getExperiments() {
    return Array.from(this.experiments.values());
  }

  /**
   * Stop experiment
   */
  stopExperiment(experimentId) {
    const experiment = this.experiments.get(experimentId);

    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    experiment.status = 'stopped';
    experiment.endTime = Date.now();

    const analysis = this.analyzeExperiment(experimentId);

    return {
      experiment,
      analysis
    };
  }

  /**
   * Generate experiment ID
   */
  generateExperimentId() {
    return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * Get improvement suggestions summary
   */
  getSummary() {
    return {
      totalImprovements: this.improvements.length,
      byPriority: {
        critical: this.improvements.filter(i => i.priority === 'critical').length,
        high: this.improvements.filter(i => i.priority === 'high').length,
        medium: this.improvements.filter(i => i.priority === 'medium').length,
        low: this.improvements.filter(i => i.priority === 'low').length
      },
      byType: {
        prompt: this.improvements.filter(i => i.type === 'prompt_improvement').length,
        rag: this.improvements.filter(i => i.type === 'rag_configuration').length,
        intent: this.improvements.filter(i => i.type === 'intent_specific').length
      },
      experiments: {
        running: this.getExperiments().filter(e => e.status === 'running').length,
        completed: this.getExperiments().filter(e => e.status === 'stopped').length
      }
    };
  }
}

module.exports = ImprovementEngine;