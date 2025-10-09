/**
 * Client API n8n pour Synoptia
 * Gère toutes les interactions avec l'instance n8n
 */

const axios = require('axios');

class N8nApi {
    constructor() {
        this.baseUrl = process.env.N8N_API_URL;
        this.apiKey = process.env.N8N_API_KEY;

        if (!this.baseUrl || !this.apiKey) {
            console.warn('⚠️ Configuration n8n manquante. Les fonctionnalités de déploiement seront limitées.');
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'X-N8N-API-KEY': this.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        // Intercepteur pour le debug
        this.client.interceptors.request.use(request => {
            console.log(`🔗 API n8n: ${request.method.toUpperCase()} ${request.url}`);
            return request;
        });

        this.client.interceptors.response.use(
            response => {
                console.log(`✅ API n8n: ${response.status} ${response.statusText}`);
                return response;
            },
            error => {
                console.error(`❌ API n8n Error: ${error.response?.status} ${error.response?.statusText}`);
                console.error('Details:', error.response?.data);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Teste la connexion à l8n
     */
    async testConnection() {
        try {
            const response = await this.client.get('/workflows');
            return {
                success: true,
                message: 'Connexion n8n OK',
                workflowCount: response.data.data?.length || 0
            };
        } catch (error) {
            return {
                success: false,
                message: 'Impossible de se connecter à n8n',
                error: error.message
            };
        }
    }

    /**
     * Crée un nouveau workflow dans n8n
     */
    async createWorkflow(workflow) {
        try {
            if (!this.baseUrl || !this.apiKey) {
                throw new Error('Configuration n8n manquante');
            }

            // Nettoyer les nodes pour retirer les champs invalides
            const cleanedNodes = workflow.nodes.map(node => {
                const cleaned = { ...node };

                // Supprimer le champ "authentication" qui est invalide dans n8n
                if (cleaned.authentication) {
                    console.warn(`⚠️ Suppression du champ invalide "authentication" du node "${node.name}"`);
                    delete cleaned.authentication;
                }

                // Supprimer le champ "continueOnFail" s'il existe (doit être dans options)
                if (cleaned.continueOnFail !== undefined) {
                    // Le mettre dans parameters.options à la place
                    if (!cleaned.parameters) cleaned.parameters = {};
                    if (!cleaned.parameters.options) cleaned.parameters.options = {};
                    cleaned.parameters.options.continueOnFail = cleaned.continueOnFail;
                    delete cleaned.continueOnFail;
                }

                return cleaned;
            });

            // Préparer les données pour n8n (format API v1)
            const workflowData = {
                name: workflow.name,
                nodes: cleanedNodes,
                connections: workflow.connections,
                settings: workflow.settings || {},
                staticData: workflow.staticData || {}
            };

            console.log('📤 Création du workflow:', workflowData.name);

            const response = await this.client.post('/workflows', workflowData);

            console.log('📋 Réponse n8n:', JSON.stringify(response.data, null, 2));

            // n8n peut renvoyer directement les données ou dans un wrapper "data"
            const createdWorkflow = response.data.data || response.data;

            if (createdWorkflow && createdWorkflow.id) {
                console.log(`🎉 Workflow créé avec l'ID: ${createdWorkflow.id}`);

                return {
                    success: true,
                    id: createdWorkflow.id,
                    name: createdWorkflow.name,
                    url: `${this.baseUrl.replace('/api/v1', '')}/workflows/${createdWorkflow.id}`,
                    active: createdWorkflow.active || false
                };
            } else {
                console.error('❌ Réponse n8n inattendue:', response.data);
                throw new Error('Réponse inattendue de l\'API n8n');
            }

        } catch (error) {
            console.error('❌ Erreur création workflow:', error.message);

            // Analyser l'erreur pour donner un message plus clair
            let userMessage = 'Erreur lors de la création du workflow';

            if (error.response?.status === 401) {
                userMessage = 'Clé API n8n invalide';
            } else if (error.response?.status === 403) {
                userMessage = 'Permissions insuffisantes sur n8n';
            } else if (error.response?.status === 400) {
                userMessage = 'Données de workflow invalides';
            } else if (error.code === 'ECONNREFUSED') {
                userMessage = 'Impossible de se connecter à n8n';
            }

            throw new Error(userMessage);
        }
    }

    /**
     * Active ou désactive un workflow
     */
    async toggleWorkflow(workflowId, active = true) {
        try {
            const endpoint = active ? `/workflows/${workflowId}/activate` : `/workflows/${workflowId}/deactivate`;
            const response = await this.client.post(endpoint);

            return {
                success: true,
                id: workflowId,
                active: active,
                message: active ? 'Workflow activé' : 'Workflow désactivé'
            };
        } catch (error) {
            throw new Error(`Erreur lors de ${active ? 'l\'activation' : 'la désactivation'}: ${error.message}`);
        }
    }

    /**
     * Liste tous les workflows
     */
    async listWorkflows() {
        try {
            const response = await this.client.get('/workflows');

            if (response.data && response.data.data) {
                return {
                    success: true,
                    workflows: response.data.data.map(wf => ({
                        id: wf.id,
                        name: wf.name,
                        active: wf.active,
                        createdAt: wf.createdAt,
                        updatedAt: wf.updatedAt
                    }))
                };
            }

            return { success: true, workflows: [] };
        } catch (error) {
            throw new Error(`Erreur lors de la récupération des workflows: ${error.message}`);
        }
    }

    /**
     * Supprime un workflow
     */
    async deleteWorkflow(workflowId) {
        try {
            await this.client.delete(`/workflows/${workflowId}`);

            return {
                success: true,
                id: workflowId,
                message: 'Workflow supprimé avec succès'
            };
        } catch (error) {
            throw new Error(`Erreur lors de la suppression: ${error.message}`);
        }
    }

    /**
     * Exécute un workflow manuellement
     */
    async executeWorkflow(workflowId) {
        try {
            const response = await this.client.post(`/workflows/${workflowId}/execute`);

            return {
                success: true,
                executionId: response.data.data?.executionId,
                message: 'Workflow exécuté avec succès'
            };
        } catch (error) {
            throw new Error(`Erreur lors de l'exécution: ${error.message}`);
        }
    }

    /**
     * Obtient les statistiques de l'instance n8n
     */
    async getStats() {
        try {
            const [workflowsResponse] = await Promise.all([
                this.client.get('/workflows')
            ]);

            const workflows = workflowsResponse.data.data || [];
            const activeWorkflows = workflows.filter(wf => wf.active);

            return {
                success: true,
                stats: {
                    totalWorkflows: workflows.length,
                    activeWorkflows: activeWorkflows.length,
                    inactiveWorkflows: workflows.length - activeWorkflows.length
                }
            };
        } catch (error) {
            throw new Error(`Erreur lors de la récupération des stats: ${error.message}`);
        }
    }
}

module.exports = N8nApi;