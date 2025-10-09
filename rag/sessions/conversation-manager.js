/**
 * Conversation Manager
 * Gère les sessions conversationnelles pour le Workflow Builder
 * Permet une expérience ChatGPT-like avec historique et modifications itératives
 */

const crypto = require('crypto');

class ConversationManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> session data
    this.config = {
      maxHistoryLength: 20,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      maxTokensPerMessage: 4000
    };

    // Cleanup expired sessions periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Crée une nouvelle session de conversation
   */
  createSession(userId = 'anonymous', metadata = {}) {
    const sessionId = this.generateSessionId();

    const session = {
      sessionId,
      userId,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      metadata,
      history: [],
      currentWorkflow: null,
      workflowVersions: [],
      stats: {
        messagesCount: 0,
        modificationsCount: 0,
        regenerationsCount: 0
      }
    };

    this.sessions.set(sessionId, session);

    console.log(`✅ Session créée: ${sessionId}`);

    return { sessionId, session };
  }

  /**
   * Récupère une session
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} introuvable`);
    }

    // Vérifier timeout
    const elapsed = Date.now() - session.lastActivityAt;
    if (elapsed > this.config.sessionTimeout) {
      this.deleteSession(sessionId);
      throw new Error(`Session ${sessionId} expirée (${Math.floor(elapsed / 60000)} min d'inactivité)`);
    }

    return session;
  }

  /**
   * Ajoute un message à l'historique
   */
  addMessage(sessionId, role, content, metadata = {}) {
    const session = this.getSession(sessionId);

    const message = {
      id: crypto.randomUUID(),
      role, // 'user' | 'assistant' | 'system'
      content,
      timestamp: Date.now(),
      metadata
    };

    session.history.push(message);
    session.lastActivityAt = Date.now();
    session.stats.messagesCount++;

    // Limiter taille historique
    if (session.history.length > this.config.maxHistoryLength) {
      session.history = session.history.slice(-this.config.maxHistoryLength);
    }

    return message;
  }

  /**
   * Met à jour le workflow courant
   */
  updateWorkflow(sessionId, workflow, action = 'create', validationResult = null) {
    const session = this.getSession(sessionId);

    // Sauvegarder version précédente
    if (session.currentWorkflow) {
      session.workflowVersions.push({
        workflow: session.currentWorkflow,
        timestamp: Date.now(),
        action: session.lastAction || 'unknown'
      });

      // Limiter à 10 versions
      if (session.workflowVersions.length > 10) {
        session.workflowVersions = session.workflowVersions.slice(-10);
      }
    }

    session.currentWorkflow = workflow;
    session.lastAction = action;
    session.lastValidation = validationResult;
    session.lastActivityAt = Date.now();

    // Stats
    if (action === 'modify') {
      session.stats.modificationsCount++;
    } else if (action === 'regenerate') {
      session.stats.regenerationsCount++;
    }

    return session;
  }

  /**
   * Récupère l'historique conversationnel formaté pour LLM
   */
  getConversationHistory(sessionId, options = {}) {
    const session = this.getSession(sessionId);
    const {
      maxMessages = 10,
      includeSystem = true,
      format = 'openai' // 'openai' | 'simple'
    } = options;

    let messages = session.history.slice(-maxMessages);

    if (!includeSystem) {
      messages = messages.filter(m => m.role !== 'system');
    }

    if (format === 'openai') {
      return messages.map(m => ({
        role: m.role,
        content: m.content
      }));
    }

    return messages;
  }

  /**
   * Génère un contexte pour modification de workflow
   */
  getModificationContext(sessionId) {
    const session = this.getSession(sessionId);

    if (!session.currentWorkflow) {
      return null;
    }

    const context = {
      currentWorkflow: session.currentWorkflow,
      lastValidation: session.lastValidation,
      previousVersions: session.workflowVersions.length,
      conversationHistory: this.getConversationHistory(sessionId, { maxMessages: 5 })
    };

    return context;
  }

  /**
   * Rollback vers version précédente
   */
  rollbackWorkflow(sessionId) {
    const session = this.getSession(sessionId);

    if (session.workflowVersions.length === 0) {
      throw new Error('Aucune version précédente disponible');
    }

    const previousVersion = session.workflowVersions.pop();
    session.currentWorkflow = previousVersion.workflow;
    session.lastAction = 'rollback';
    session.lastActivityAt = Date.now();

    return {
      workflow: previousVersion.workflow,
      restoredFrom: previousVersion.timestamp
    };
  }

  /**
   * Supprime une session
   */
  deleteSession(sessionId) {
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      console.log(`🗑️ Session supprimée: ${sessionId}`);
    }

    return deleted;
  }

  /**
   * Nettoie les sessions expirées
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const elapsed = now - session.lastActivityAt;
      if (elapsed > this.config.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Nettoyage: ${cleanedCount} session(s) expirée(s)`);
    }
  }

  /**
   * Récupère les stats d'une session
   */
  getSessionStats(sessionId) {
    const session = this.getSession(sessionId);

    return {
      ...session.stats,
      historyLength: session.history.length,
      versionsCount: session.workflowVersions.length,
      duration: Date.now() - session.createdAt,
      hasWorkflow: !!session.currentWorkflow
    };
  }

  /**
   * Récupère les stats globales
   */
  getGlobalStats() {
    return {
      activeSessions: this.sessions.size,
      totalMessages: Array.from(this.sessions.values()).reduce((sum, s) => sum + s.stats.messagesCount, 0),
      totalModifications: Array.from(this.sessions.values()).reduce((sum, s) => sum + s.stats.modificationsCount, 0)
    };
  }

  /**
   * Récupère toutes les sessions actives (non expirées)
   */
  getActiveSessions() {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(session => {
      const inactiveTime = now - session.lastActivityAt;
      return inactiveTime < this.config.sessionTimeout;
    });
  }

  /**
   * Génère un ID de session unique
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}

module.exports = ConversationManager;