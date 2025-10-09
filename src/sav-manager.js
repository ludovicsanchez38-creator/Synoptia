/**
 * Gestionnaire des codes SAV et système de support client
 * Utilise une base de données SQLite sécurisée avec chiffrement AES-256
 */

const SecureSAVDatabase = require('./secure-db');

class SAVManager {
    constructor() {
        // Base de données sécurisée
        this.db = new SecureSAVDatabase();
        this.knowledgeBase = this.initializeKnowledgeBase();

        // Nettoyage automatique des codes expirés toutes les heures
        this.cleanupInterval = setInterval(() => {
            this.db.cleanupExpiredCodes();
        }, 60 * 60 * 1000); // 1 heure

        console.log('🛡️ SAV Manager initialisé avec base de données sécurisée');
    }

    /**
     * Génère un nouveau code SAV pour un client
     * @param {string} clientId - Identifiant unique du client
     * @param {number} validityHours - Durée de validité en heures (défaut: 24h)
     * @returns {string} Code SAV généré
     */
    generateSupportCode(clientId, validityHours = 24) {
        // Génération d'un code unique format: SAV-XXXX-YYYY
        const prefix = 'SAV';
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${prefix}-${part1}-${part2}`;

        // Calcul de l'expiration
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + validityHours);

        // Stockage du code avec les informations client
        this.activeCodes.set(code, {
            clientId,
            createdAt: new Date(),
            expiresAt,
            used: false,
            sessionStarted: null
        });

        console.log(`🔑 Code SAV généré: ${code} pour client ${clientId} (expire: ${expiresAt.toLocaleString()})`);

        return code;
    }

    /**
     * Vérifie la validité d'un code SAV
     * @param {string} code - Code SAV à vérifier
     * @returns {Object} Résultat de la vérification
     */
    validateSupportCode(code) {
        const normalizedCode = code.trim().toUpperCase();
        const codeData = this.activeCodes.get(normalizedCode);

        if (!codeData) {
            return {
                valid: false,
                error: 'Code support invalide'
            };
        }

        // Vérifier l'expiration
        if (new Date() > codeData.expiresAt) {
            this.activeCodes.delete(normalizedCode);
            return {
                valid: false,
                error: 'Code support expiré'
            };
        }

        // Marquer le code comme utilisé et démarrer la session
        if (!codeData.used) {
            codeData.used = true;
            codeData.sessionStarted = new Date();
        }

        return {
            valid: true,
            clientId: codeData.clientId,
            sessionStarted: codeData.sessionStarted
        };
    }

    /**
     * Génère une réponse automatique basée sur la question
     * @param {string} question - Question du client
     * @param {string} clientCode - Code SAV du client
     * @returns {string} Réponse générée
     */
    generateResponse(question, clientCode) {
        const normalizedQuestion = question.toLowerCase().trim();

        // Recherche dans la base de connaissances
        for (const category of Object.values(this.knowledgeBase)) {
            for (const item of category) {
                if (item.keywords.some(keyword => normalizedQuestion.includes(keyword))) {
                    return this.formatResponse(item.response, clientCode);
                }
            }
        }

        // Réponse par défaut si aucune correspondance
        return this.getDefaultResponse(clientCode);
    }

    /**
     * Formate la réponse avec des informations contextuelles
     */
    formatResponse(response, clientCode) {
        const codeData = this.activeCodes.get(clientCode);
        const clientId = codeData ? codeData.clientId : 'inconnu';

        return response.replace(/\{clientId\}/g, clientId);
    }

    /**
     * Réponse par défaut quand aucune correspondance n'est trouvée
     */
    getDefaultResponse(clientCode) {
        const responses = [
            "Je vais transférer votre demande à notre équipe technique. Un expert vous contactera sous 2 heures ouvrées.",
            "Votre question nécessite une analyse plus approfondie. Notre équipe support va prendre contact avec vous rapidement.",
            "Pour mieux vous aider, je vais escalader votre demande vers un technicien spécialisé. Vous recevrez une réponse personnalisée sous peu.",
            "Cette situation nécessite l'intervention de notre équipe d'experts. Votre demande est maintenant prioritaire dans notre système."
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * Initialise la base de connaissances SAV
     */
    initializeKnowledgeBase() {
        return {
            workflow_problems: [
                {
                    keywords: ['workflow', 'ne fonctionne pas', 'arrêté', 'bloqué', 'erreur workflow'],
                    response: `Problème de workflow détecté pour le client {clientId}.

**Vérifications immédiates :**
1. ✅ Vérifiez que votre workflow est bien activé dans n8n
2. 🔍 Consultez les logs d'exécution pour voir les erreurs
3. 🔧 Vérifiez vos connexions et autorisations

**Solutions rapides :**
- Relancez manuellement votre workflow pour test
- Vérifiez que vos clés API sont toujours valides
- Assurez-vous que les triggers sont correctement configurés

Si le problème persiste, notre équipe va analyser votre configuration spécifique.`
                },
                {
                    keywords: ['timeout', 'lent', 'performance', 'ralenti'],
                    response: `Problème de performance détecté.

**Actions recommandées :**
1. 🚀 Optimisez vos noeuds avec des filtres plus précis
2. 📊 Réduisez la quantité de données traitées simultanément
3. ⏱️ Ajoutez des délais entre les appels d'API

Notre équipe peut auditer votre workflow pour l'optimiser.`
                }
            ],
            connection_issues: [
                {
                    keywords: ['connexion', 'api', 'authentification', 'oauth', 'token', 'clé'],
                    response: `Problème de connexion API identifié.

**Solutions immédiates :**
1. 🔑 Vérifiez que vos clés API sont valides et non expirées
2. 🔄 Reconnectez-vous à vos services tiers
3. 🛡️ Vérifiez les permissions de vos comptes connectés

**Pour les erreurs OAuth :**
- Relancez le processus d'autorisation
- Vérifiez que les URLs de callback sont correctes

Je transmets votre cas à notre équipe technique pour une vérification approfondie.`
                },
                {
                    keywords: ['webhook', 'url', 'endpoint', 'receive', 'trigger'],
                    response: `Problème de webhook/trigger détecté.

**Vérifications :**
1. 🌐 Testez votre URL webhook depuis n8n
2. 📡 Vérifiez que votre endpoint est accessible
3. 🔍 Consultez les logs de réception

L'équipe technique va tester vos endpoints et vous proposer des corrections.`
                }
            ],
            configuration: [
                {
                    keywords: ['configurer', 'paramétrer', 'setup', 'installer', 'connecter'],
                    response: `Guide de configuration rapide :

**Étapes essentielles :**
1. 📋 Définissez clairement votre objectif d'automatisation
2. 🔗 Identifiez tous les services à connecter
3. 🛠️ Préparez vos clés API et autorisations
4. 🎯 Testez chaque étape individuellement

**Ressources utiles :**
- Documentation Synoptia : guide étape par étape
- Vidéos tutoriels disponibles dans votre espace client
- Templates prêts à l'emploi

Un expert peut vous accompagner pour une configuration personnalisée.`
                },
                {
                    keywords: ['email', 'smtp', 'gmail', 'outlook', 'mail'],
                    response: `Configuration email détectée.

**Pour Gmail :**
1. 🔐 Activez l'authentification 2 facteurs
2. 🗝️ Générez un mot de passe d'application
3. 📧 Utilisez smtp.gmail.com:587

**Pour Outlook/Office365 :**
- Serveur : smtp-mail.outlook.com:587
- Authentification : OAuth2 recommandée

Je peux faire vérifier votre configuration email par notre équipe.`
                }
            ],
            billing_support: [
                {
                    keywords: ['facture', 'paiement', 'abonnement', 'prix', 'coût', 'billing'],
                    response: `Question de facturation identifiée.

**Informations importantes :**
- 💳 Vos factures sont disponibles dans votre espace client
- 🔄 Les abonnements se renouvellent automatiquement
- 📞 Contact direct : support-billing@synoptia.com

**Demandes courantes :**
- Modification d'abonnement : possible à tout moment
- Remboursement : selon nos CGV
- Questions TVA : notre service comptable vous répondra

Je transfère votre demande au service facturation qui vous contactera rapidement.`
                }
            ],
            escalation: [
                {
                    keywords: ['humain', 'personne', 'technicien', 'expert', 'parler', 'appeler'],
                    response: `Demande de contact humain enregistrée.

**Prochaines étapes :**
1. 📝 Votre demande est transmise à notre équipe d'experts
2. 📞 Un technicien vous contactera sous 2h ouvrées
3. 💌 Vous recevrez un email de confirmation avec un numéro de ticket

**Informations de contact :**
- Email prioritaire : support-urgent@synoptia.com
- Horaires : Lun-Ven 9h-18h
- Urgences weekend : ticket@synoptia.com

Merci de votre patience, nous sommes là pour vous aider !`
                }
            ]
        };
    }

    /**
     * Nettoie les codes expirés (à appeler périodiquement)
     */
    cleanupExpiredCodes() {
        const now = new Date();
        let cleaned = 0;

        for (const [code, data] of this.activeCodes.entries()) {
            if (now > data.expiresAt) {
                this.activeCodes.delete(code);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Nettoyage: ${cleaned} codes SAV expirés supprimés`);
        }
    }

    /**
     * Obtient les statistiques des codes SAV
     */
    getStats() {
        const total = this.activeCodes.size;
        const used = Array.from(this.activeCodes.values()).filter(code => code.used).length;
        const active = total - used;

        return {
            totalCodes: total,
            usedCodes: used,
            activeCodes: active,
            knowledgeBaseItems: Object.values(this.knowledgeBase)
                .reduce((acc, category) => acc + category.length, 0)
        };
    }

    /**
     * Liste tous les codes actifs (pour administration)
     */
    listActiveCodes() {
        const codes = [];
        for (const [code, data] of this.activeCodes.entries()) {
            codes.push({
                code,
                clientId: data.clientId,
                used: data.used,
                createdAt: data.createdAt,
                expiresAt: data.expiresAt,
                sessionStarted: data.sessionStarted
            });
        }
        return codes.sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Révoque un code SAV spécifique
     * @param {string} code - Code SAV à révoquer
     * @returns {Object} Résultat de la révocation
     */
    revokeCode(code) {
        const normalizedCode = code.trim().toUpperCase();
        const codeData = this.activeCodes.get(normalizedCode);

        if (!codeData) {
            return {
                success: false,
                error: 'Code introuvable ou déjà révoqué'
            };
        }

        // Supprimer le code de la liste active
        this.activeCodes.delete(normalizedCode);

        console.log(`🚫 Code SAV révoqué: ${normalizedCode} (client: ${codeData.clientId})`);

        return {
            success: true,
            message: 'Code SAV révoqué avec succès',
            revokedCode: {
                code: normalizedCode,
                clientId: codeData.clientId,
                wasUsed: codeData.used,
                revokedAt: new Date()
            }
        };
    }

    /**
     * Révoque tous les codes d'un client spécifique
     * @param {string} clientId - ID du client
     * @returns {Object} Résultat de la révocation
     */
    revokeClientCodes(clientId) {
        let revokedCount = 0;
        const revokedCodes = [];

        for (const [code, data] of this.activeCodes.entries()) {
            if (data.clientId === clientId) {
                this.activeCodes.delete(code);
                revokedCodes.push({
                    code,
                    used: data.used,
                    createdAt: data.createdAt
                });
                revokedCount++;
            }
        }

        console.log(`🚫 ${revokedCount} codes SAV révoqués pour le client: ${clientId}`);

        return {
            success: true,
            message: `${revokedCount} code(s) révoqué(s) pour le client ${clientId}`,
            revokedCount,
            revokedCodes
        };
    }
}

module.exports = SAVManager;