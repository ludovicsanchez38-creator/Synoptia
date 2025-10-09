/**
 * MCP Server pour Synoptia Workflow Builder
 * Gère la communication avec l'agent IA et les demandes utilisateur
 */

const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const WorkflowGenerator = require('./workflow-generator');
const RAGEnhancedGenerator = require('../rag/pipeline/rag-enhanced-generator');
const N8nApi = require('./n8n-api');
const SecureSAVManager = require('./sav-manager-secure');

class MCPServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Choisir générateur selon feature flag
        const useRAG = process.env.ENABLE_RAG === 'true';
        if (useRAG) {
            console.log('✅ RAG Enhanced Generator activé');
            this.ragGenerator = new RAGEnhancedGenerator();
            this.workflowGenerator = null;
        } else {
            console.log('ℹ️  Générateur classique activé');
            this.workflowGenerator = new WorkflowGenerator();
            this.ragGenerator = null;
        }

        this.n8nApi = new N8nApi();
        this.savManager = new SecureSAVManager();
        this.setupMiddleware();
        this.setupRoutes();
        this.startCleanupTimer();
    }

    setupMiddleware() {
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: false
        }));
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    setupRoutes() {
        // Route principale pour traiter les demandes
        this.app.post('/api/create-workflow', async (req, res) => {
            try {
                const { request, autoExecute = true, preferences = {} } = req.body;

                if (!request) {
                    return res.status(400).json({
                        success: false,
                        error: 'Aucune demande fournie'
                    });
                }

                console.log(`📥 Nouvelle demande: "${request}"`);

                let workflow, analysis, ragMetadata;

                // Générer avec RAG ou classique
                if (this.ragGenerator) {
                    // Mode RAG: génération directe avec contexte enrichi
                    console.log('🧠 Génération avec RAG Enhanced Generator...');
                    const result = await this.ragGenerator.generate(request);
                    workflow = result.workflow;
                    ragMetadata = result.metadata;

                    // Créer analyse pour compatibilité
                    analysis = {
                        type: result.context.workflowType || 'other',
                        description: request,
                        trigger: 'webhook', // Détecté par RAG
                        actions: result.context.nodesDetected || [],
                        integrations: result.context.nodesDetected || [],
                        complexity: result.context.complexity || 'medium',
                        ragContext: {
                            documentsUsed: result.context.documentsUsed,
                            nodesDetected: result.context.nodesDetected,
                            generationTime: result.metadata.duration
                        }
                    };

                    console.log(`✅ Workflow généré avec ${result.context.documentsUsed} docs RAG en ${(result.metadata.duration / 1000).toFixed(1)}s`);
                } else {
                    // Mode classique
                    console.log('🔍 Génération classique...');
                    analysis = await this.analyzeRequest(request, preferences);
                    console.log('🔍 Analyse:', analysis);
                    workflow = await this.workflowGenerator.generate(analysis);
                    console.log('⚙️ Workflow généré');
                }

                let deploymentResult = null;

                // Étape 3: Déployer automatiquement (si activé)
                if (autoExecute) {
                    try {
                        deploymentResult = await this.n8nApi.createWorkflow(workflow);
                        console.log('🚀 Workflow déployé avec succès');
                    } catch (deployError) {
                        console.error('❌ Erreur de déploiement:', deployError.message);
                    }
                }

                // Préparer la réponse simplifiée
                const response = {
                    success: true,
                    message: this.generateSimpleExplanation(analysis, deploymentResult),
                    analysis,
                    workflow: {
                        name: workflow.name,
                        description: analysis.description,
                        nodesCount: workflow.nodes?.length || 0
                    },
                    workflowData: workflow,
                    deployment: deploymentResult ? {
                        success: true,
                        id: deploymentResult.id,
                        url: `${process.env.N8N_API_URL.replace('/api/v1', '')}/workflow/${deploymentResult.id}`
                    } : null
                };

                res.json(response);

            } catch (error) {
                console.error('❌ Erreur:', error);
                res.status(500).json({
                    success: false,
                    error: 'Une erreur est survenue lors de la création du workflow',
                    details: error.message
                });
            }
        });

        // Route pour obtenir des informations sur l'agent
        this.app.get('/api/agent-info', (req, res) => {
            res.json({
                name: 'Synoptia Workflow Builder',
                version: '1.0.0',
                description: 'Je transforme vos idées en workflows automatisés',
                capabilities: [
                    'Envoi d\'emails automatique',
                    'Traitement de données',
                    'Intégrations diverses',
                    'Notifications',
                    'Synchronisation de données'
                ]
            });
        });

        // Routes SAV
        this.app.post('/api/sav/authenticate', async (req, res) => {
            try {
                const { code } = req.body;
                const validation = await this.savManager.validateSupportCode(code);

                if (validation.success) {
                    res.json({
                        success: true,
                        message: 'Accès accordé',
                        clientId: validation.clientId
                    });
                } else {
                    res.status(401).json({
                        success: false,
                        error: validation.error
                    });
                }
            } catch (error) {
                console.error('❌ Erreur authentification SAV:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur serveur'
                });
            }
        });

        this.app.post('/api/sav/chat', async (req, res) => {
            try {
                const { message, clientCode } = req.body;

                // Vérifier que le code est toujours valide
                const validation = this.savManager.validateSupportCode(clientCode);
                if (!validation.valid) {
                    return res.status(401).json({
                        success: false,
                        error: 'Session expirée'
                    });
                }

                // Générer la réponse
                const response = this.savManager.generateResponse(message, clientCode);

                res.json({
                    success: true,
                    response: response,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('❌ Erreur chat SAV:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors du traitement de votre message'
                });
            }
        });

        // Route pour générer un code SAV (administration)
        this.app.post('/api/admin/generate-sav-code', async (req, res) => {
            try {
                const { clientId, validityHours = 24 } = req.body;

                if (!clientId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Client ID requis'
                    });
                }

                const result = await this.savManager.generateSupportCode(clientId, validityHours);

                res.json({
                    success: true,
                    code: result.code,
                    clientId: result.clientId,
                    validityHours: result.validityHours,
                    expiresAt: result.expiresAt
                });

            } catch (error) {
                console.error('❌ Erreur génération code SAV:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la génération du code'
                });
            }
        });

        // Route pour obtenir les statistiques SAV (administration)
        this.app.get('/api/admin/sav-stats', (req, res) => {
            try {
                const stats = this.savManager.getStats();
                const activeCodes = this.savManager.listActiveCodes();

                res.json({
                    success: true,
                    stats: stats,
                    activeCodes: activeCodes
                });
            } catch (error) {
                console.error('❌ Erreur stats SAV:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des statistiques'
                });
            }
        });

        // Route pour révoquer un code SAV spécifique
        this.app.post('/api/admin/revoke-sav-code', async (req, res) => {
            try {
                const { code } = req.body;

                if (!code) {
                    return res.status(400).json({
                        success: false,
                        error: 'Code SAV requis'
                    });
                }

                const result = await this.savManager.revokeCode(code);
                res.json(result);

            } catch (error) {
                console.error('❌ Erreur révocation code SAV:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la révocation du code'
                });
            }
        });

        // Route pour révoquer tous les codes d'un client
        this.app.post('/api/admin/revoke-client-codes', async (req, res) => {
            try {
                const { clientId } = req.body;

                if (!clientId) {
                    return res.status(400).json({
                        success: false,
                        error: 'ID client requis'
                    });
                }

                const result = await this.savManager.revokeClientCodes(clientId);
                res.json(result);

            } catch (error) {
                console.error('❌ Erreur révocation codes client:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la révocation des codes client'
                });
            }
        });

        // Route pour lister les codes actifs (avec possibilité de révocation)
        this.app.get('/api/admin/list-active-codes', async (req, res) => {
            try {
                const activeCodes = await this.savManager.listActiveCodes();
                res.json({
                    success: true,
                    codes: activeCodes,
                    count: activeCodes.length
                });

            } catch (error) {
                console.error('❌ Erreur listing codes actifs:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des codes actifs'
                });
            }
        });

        // Route de santé
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                service: 'Synoptia Workflow Builder'
            });
        });
    }

    /**
     * Analyse la demande utilisateur avec OpenAI
     */
    async analyzeRequest(request, preferences = {}) {
        const preferenceSection = this.formatPreferencePrompt(preferences);

        const prompt = `
Tu es un expert n8n spécialisé dans l'automatisation pour Synoptia. Analyse cette demande et crée la meilleure configuration possible.

DEMANDE: "${request}"

PRÉFÉRENCES:${preferenceSection}

RÈGLES D'ANALYSE:
- Sois précis sur le type de trigger le plus adapté
- Identifie tous les services/intégrations nécessaires
- Propose des actions concrètes et utiles
- Estime la complexité réellement

TYPES DE TRIGGERS:
- "schedule": pour planifications (quotidien, hebdo, mensuel)
- "webhook": pour réactions à des événements externes
- "manual": pour déclenchements manuels
- "email": pour traitement d'emails entrants
- "form": pour soumissions de formulaires
- "file": pour surveillance de fichiers/dossiers

TYPES D'ACTIONS COURANTES:
- "send_email": envoi d'emails
- "http_request": appels d'API
- "data_transform": traitement de données
- "file_operation": manipulation de fichiers
- "notification": envoi de notifications
- "database_operation": opérations BDD
- "crm_sync": synchronisation CRM
- "social_media": publications sociales

INTÉGRATIONS POPULAIRES:
- "email", "smtp", "gmail"
- "slack", "discord", "teams"
- "google_sheets", "excel"
- "hubspot", "salesforce", "pipedrive"
- "dropbox", "google_drive"
- "webhook", "http_api"
- "mysql", "postgresql"

Réponds UNIQUEMENT avec ce JSON:
{
    "type": "email|data-processing|notification|sync|form|file|social|other",
    "description": "description claire et précise en français",
    "trigger": "schedule|webhook|manual|email|form|file",
    "frequency": "quotidien|hebdomadaire|mensuel|temps-réel|manuel",
    "actions": ["action1", "action2", "action3"],
    "integrations": ["service1", "service2"],
    "complexity": "simple|medium|complex",
    "use_case": "description du cas d'usage métier"
}

EXEMPLES:
- "envoyer un email tous les lundis" → type:"email", trigger:"schedule", frequency:"hebdomadaire"
- "notifier quand formulaire rempli" → type:"notification", trigger:"webhook", frequency:"temps-réel"
- "synchroniser CRM avec Google Sheets" → type:"sync", trigger:"schedule", frequency:"quotidien"`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 500
        });

        try {
            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            console.error('Erreur parsing JSON:', error);
            // Fallback avec analyse basique
            return {
                type: "other",
                description: request,
                trigger: "manual",
                actions: ["custom"],
                integrations: [],
                complexity: "simple"
            };
        }
    }

    formatPreferencePrompt(preferences = {}) {
        if (!preferences || Object.keys(preferences).length === 0) {
            return '\n- Aucune préférence spécifique. Optimise librement.';
        }

        const lines = [];

        if (preferences.complexity) {
            lines.push(`- Complexité cible: ${preferences.complexity}`);
        }

        if (Array.isArray(preferences.integrations) && preferences.integrations.length > 0) {
            lines.push(`- Intégrations privilégiées: ${preferences.integrations.join(', ')}`);
        }

        if (preferences.notes) {
            lines.push(`- Notes: ${preferences.notes}`);
        }

        if (lines.length === 0) {
            return '\n- Aucune préférence spécifique. Optimise librement.';
        }

        return `\n${lines.join('\n')}`;
    }

    /**
     * Génère une explication simple pour l'utilisateur
     */
    generateSimpleExplanation(analysis, deployment) {
        const triggerTexts = {
            manual: "que tu déclenches manuellement",
            schedule: "qui se lance automatiquement selon un planning",
            webhook: "qui se déclenche quand quelque chose arrive",
            email: "qui réagit aux emails reçus"
        };

        const triggerText = triggerTexts[analysis.trigger] || "personnalisé";

        let message = `🎉 J'ai créé ton workflow "${analysis.description}" ${triggerText}.`;

        if (deployment?.success) {
            message += ` Il est maintenant actif dans ton n8n !`;
        } else if (deployment === null) {
            message += ` Le code est prêt, tu peux l'importer dans n8n.`;
        } else {
            message += ` Il y a eu un petit souci lors du déploiement, mais le workflow est créé.`;
        }

        return message;
    }

    /**
     * Démarre le timer de nettoyage des codes expirés
     */
    startCleanupTimer() {
        // Nettoyer les codes expirés toutes les heures
        setInterval(() => {
            this.savManager.cleanupExpiredCodes();
        }, 60 * 60 * 1000); // 1 heure

        console.log('🧹 Timer de nettoyage SAV démarré (1h)');
    }

    /**
     * Démarre le serveur
     */
    start() {
        this.app.listen(this.port, '0.0.0.0', () => {
            console.log(`🚀 Synoptia Workflow Builder démarré sur le port ${this.port}`);
            console.log(`📱 Interface locale: http://localhost:${this.port}`);
            console.log(`🌐 Interface publique: http://141.94.115.26:${this.port}`);
            console.log(`🔗 API: http://141.94.115.26:${this.port}/api`);
            console.log(`🛠️ Support SAV: http://141.94.115.26:${this.port}/sav.html`);
            console.log(`📊 Admin SAV: http://141.94.115.26:${this.port}/api/admin/sav-stats`);
        });
    }
}

module.exports = MCPServer;
