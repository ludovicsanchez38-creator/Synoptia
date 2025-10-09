/**
 * Gestionnaire des codes SAV et système de support client
 * Version sécurisée avec base de données SQLite chiffrée
 */

const SecureSAVDatabase = require('./secure-db');

class SecureSAVManager {
    constructor() {
        // Base de données sécurisée
        this.db = new SecureSAVDatabase();
        this.knowledgeBase = this.initializeKnowledgeBase();

        // Nettoyage automatique des codes expirés toutes les heures
        this.cleanupInterval = setInterval(() => {
            this.db.cleanupExpiredCodes();
        }, 60 * 60 * 1000); // 1 heure

        console.log('🛡️ SAV Manager sécurisé initialisé');
    }

    /**
     * Génère un nouveau code SAV pour un client
     */
    async generateSupportCode(clientId, validityHours = 24) {
        try {
            return await this.db.generateCode(clientId, validityHours, {
                generatedBy: 'admin',
                source: 'web-interface'
            });
        } catch (error) {
            console.error('❌ Erreur génération code SAV:', error);
            throw new Error('Erreur lors de la génération du code SAV');
        }
    }

    /**
     * Vérifie un code SAV pour l'authentification
     */
    async validateSupportCode(code) {
        try {
            return await this.db.authenticateCode(code);
        } catch (error) {
            console.error('❌ Erreur validation code SAV:', error);
            return {
                success: false,
                error: 'Erreur lors de la validation du code'
            };
        }
    }

    /**
     * Révoque un code SAV spécifique
     */
    async revokeCode(code) {
        try {
            return await this.db.revokeCode(code);
        } catch (error) {
            console.error('❌ Erreur révocation code SAV:', error);
            return {
                success: false,
                error: 'Erreur lors de la révocation du code'
            };
        }
    }

    /**
     * Révoque tous les codes d'un client
     */
    async revokeClientCodes(clientId) {
        try {
            const activeCodes = await this.db.listActiveCodes();
            const clientCodes = activeCodes.filter(code => code.clientId === clientId);

            let revokedCount = 0;
            const revokedCodes = [];

            for (const codeData of clientCodes) {
                const result = await this.db.revokeCode(codeData.code);
                if (result.success) {
                    revokedCount++;
                    revokedCodes.push({
                        code: codeData.code,
                        used: codeData.used,
                        createdAt: codeData.createdAt
                    });
                }
            }

            return {
                success: true,
                message: `${revokedCount} code(s) révoqué(s) pour le client ${clientId}`,
                revokedCount,
                revokedCodes
            };

        } catch (error) {
            console.error('❌ Erreur révocation codes client:', error);
            return {
                success: false,
                error: 'Erreur lors de la révocation des codes client'
            };
        }
    }

    /**
     * Liste tous les codes actifs
     */
    async listActiveCodes() {
        try {
            return await this.db.listActiveCodes();
        } catch (error) {
            console.error('❌ Erreur listing codes actifs:', error);
            return [];
        }
    }

    /**
     * Traite une demande de support client
     */
    async processUserRequest(clientId, message) {
        try {
            // Analyser la demande avec la base de connaissances
            const analysis = this.analyzeRequest(message);

            // Générer une réponse intelligente
            const response = this.generateResponse(analysis, message);

            // Logger l'interaction (chiffré)
            await this.logInteraction(clientId, message, response);

            return {
                success: true,
                response: response,
                analysis: analysis
            };

        } catch (error) {
            console.error('❌ Erreur traitement demande:', error);
            return {
                success: false,
                response: "Désolé, je rencontre une difficulté technique. Un expert va prendre le relais."
            };
        }
    }

    /**
     * Log sécurisé des interactions
     */
    async logInteraction(clientId, message, response) {
        // Utiliser le système d'audit de la DB pour logger les interactions
        this.db.logAudit('INTERACTION', 'CHAT', {
            clientId,
            messageLength: message.length,
            responseLength: response.length,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Fermeture propre
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.db) {
            this.db.close();
        }
        console.log('🔒 SAV Manager sécurisé fermé');
    }

    /**
     * Initialise la base de connaissances du support
     */
    initializeKnowledgeBase() {
        return {
            // Problèmes de workflow
            workflow: {
                patterns: [
                    /workflow(?:s)?\s+(?:ne\s+)?(?:fonctionne(?:nt)?|marche(?:nt)?)\s*(?:pas|plus)?/i,
                    /erreur(?:s)?\s+(?:dans|avec|sur)\s+(?:le\s+|les\s+)?workflow(?:s)?/i,
                    /workflow(?:s)?\s+(?:interrompu(?:s)?|arrêté(?:s)?|bloqué(?:s)?)/i,
                    /problème(?:s)?\s+(?:avec|sur)\s+(?:l'|les?\s+)?automatisation(?:s)?/i
                ],
                responses: [
                    "Je vais vérifier l'état de vos workflows. Pouvez-vous me préciser quel workflow pose problème et depuis quand vous avez remarqué cette situation ?",
                    "Un problème de workflow peut avoir plusieurs causes. Laissez-moi examiner les logs récents de vos automatisations.",
                    "Pour diagnostiquer efficacement ce problème de workflow, j'ai besoin de quelques informations : le nom du workflow concerné et le message d'erreur exact si il y en a un."
                ]
            },

            // Problèmes de connexion/API
            connection: {
                patterns: [
                    /(?:ne\s+)?(?:peux|peut|arrive)\s*(?:pas|plus)?\s+(?:à\s+)?(?:me\s+)?connecter/i,
                    /connexion(?:\s+impossible|\s+échoue|\s+refuse)/i,
                    /erreur(?:s)?\s+(?:de\s+)?connexion/i,
                    /(?:problème(?:s)?|souci(?:s)?)\s+(?:d'|de\s+)?(?:accès|connexion)/i,
                    /api(?:\s+key)?\s+(?:invalide|expiré(?:e)?|ne\s+fonctionne\s+pas)/i
                ],
                responses: [
                    "Un problème de connexion peut venir de plusieurs éléments. Vérifiez d'abord que vos identifiants API sont toujours valides et que votre connexion internet est stable.",
                    "Je vais vérifier l'état de nos serveurs. En attendant, pouvez-vous essayer de vous reconnecter ? Si le problème persiste, nous regarderons vos tokens d'authentification.",
                    "Les erreurs de connexion sont souvent liées aux clés API. Quand avez-vous régénéré vos tokens pour la dernière fois ?"
                ]
            },

            // Questions sur la facturation
            billing: {
                patterns: [
                    /factur(?:e|ation)/i,
                    /(?:combien|prix|coût|tarif)/i,
                    /(?:paiement|abonnement)/i,
                    /(?:gratuit|payant)/i
                ],
                responses: [
                    "Pour toute question concernant la facturation, je peux vous expliquer notre système de tarification : setup unique + abonnement mensuel de 30€. Que souhaitez-vous savoir précisément ?",
                    "Votre facture Synoptïa comprend les frais de setup (selon votre package) et l'abonnement mensuel pour l'hébergement et la maintenance. Puis-je vous aider avec un point particulier ?",
                    "Concernant la facturation, nous pratiquons une tarification transparente. Avez-vous une question sur votre dernière facture ou sur nos tarifs ?"
                ]
            },

            // Demande de contact humain
            human: {
                patterns: [
                    /(?:parler\s+(?:à|avec)|contacter)\s+(?:un\s+)?(?:humain|personne|quelqu'un)/i,
                    /(?:expert|technicien|développeur)\s+(?:humain|réel)/i,
                    /escalade(?:r)?/i,
                    /(?:équipe|support)\s+(?:technique|humain)/i
                ],
                responses: [
                    "Je comprends que vous souhaitez parler à un expert humain. Je transfère immédiatement votre demande à notre équipe technique qui va prendre le relais.",
                    "Pas de problème, je fais appel à un expert de notre équipe. Quelqu'un va vous contacter dans les plus brefs délais.",
                    "Votre demande nécessite effectivement l'intervention d'un expert. Je notifie immédiatement l'équipe technique Synoptïa."
                ]
            },

            // Réponses par défaut
            default: {
                responses: [
                    "Je vais analyser votre demande et vous proposer une solution adaptée. Pouvez-vous me donner plus de contexte sur votre problème ?",
                    "Pour mieux vous aider, pourriez-vous préciser la nature exacte de votre demande ? Je dispose d'une base de connaissances complète sur nos services.",
                    "Je suis là pour vous accompagner sur tous les aspects techniques de Synoptïa. Décrivez-moi votre situation en détail."
                ]
            }
        };
    }

    /**
     * Analyse une demande utilisateur
     */
    analyzeRequest(message) {
        const analysis = {
            type: 'general',
            urgency: 'normal',
            keywords: [],
            needsHuman: false
        };

        const lowerMessage = message.toLowerCase();

        // Détection du type de problème
        for (const [category, data] of Object.entries(this.knowledgeBase)) {
            if (category === 'default') continue;

            for (const pattern of data.patterns) {
                if (pattern.test(lowerMessage)) {
                    analysis.type = category;
                    break;
                }
            }

            if (analysis.type === category) break;
        }

        // Détection urgence
        const urgentKeywords = ['urgent', 'critique', 'bloqué', 'production', 'immédiatement'];
        if (urgentKeywords.some(keyword => lowerMessage.includes(keyword))) {
            analysis.urgency = 'high';
        }

        // Détection demande humaine
        if (analysis.type === 'human') {
            analysis.needsHuman = true;
        }

        return analysis;
    }

    /**
     * Génère une réponse basée sur l'analyse
     */
    generateResponse(analysis, originalMessage) {
        const category = this.knowledgeBase[analysis.type] || this.knowledgeBase.default;
        const responses = category.responses;

        // Sélectionner une réponse aléatoire pour plus de naturel
        const selectedResponse = responses[Math.floor(Math.random() * responses.length)];

        // Ajouter des informations selon le contexte
        let finalResponse = selectedResponse;

        if (analysis.urgency === 'high') {
            finalResponse = "⚡ **Demande urgente détectée** - " + finalResponse;
        }

        if (analysis.needsHuman) {
            finalResponse += "\n\n🧑‍💻 **Escalade automatique vers un expert humain activée.**";
        }

        return finalResponse;
    }
}

module.exports = SecureSAVManager;