/**
 * Module de recherche de templates N8N
 * Utilise l'API officielle n8n.io pour récupérer des templates existants
 */

const axios = require('axios');

class TemplateSearch {
    constructor() {
        this.baseUrl = 'https://api.n8n.io/templates';
        this.maxResults = 10; // Limite pour éviter les surcharges
    }

    /**
     * Recherche des templates par mots-clés
     */
    async searchTemplates(query, options = {}) {
        try {
            const params = {
                q: query,
                ...options
            };

            const response = await axios.get(`${this.baseUrl}/search`, {
                params,
                timeout: 10000
            });

            if (response.data && response.data.workflows) {
                return this.formatTemplateResults(response.data.workflows.slice(0, this.maxResults));
            }

            return [];
        } catch (error) {
            console.error('❌ Erreur recherche templates:', error.message);
            return [];
        }
    }

    /**
     * Recherche par catégorie
     */
    async searchByCategory(category) {
        try {
            const response = await axios.get(`${this.baseUrl}/search`, {
                params: { category },
                timeout: 10000
            });

            if (response.data && response.data.workflows) {
                return this.formatTemplateResults(response.data.workflows.slice(0, this.maxResults));
            }

            return [];
        } catch (error) {
            console.error('❌ Erreur recherche par catégorie:', error.message);
            return [];
        }
    }

    /**
     * Récupère les catégories disponibles
     */
    async getCategories() {
        try {
            const response = await axios.get(`${this.baseUrl}/categories`, {
                timeout: 5000
            });

            if (response.data && response.data.categories) {
                return response.data.categories;
            }

            return [];
        } catch (error) {
            console.error('❌ Erreur récupération catégories:', error.message);
            return [];
        }
    }

    /**
     * Obtient les détails d'un template spécifique
     */
    async getTemplateDetails(templateId) {
        try {
            const response = await axios.get(`${this.baseUrl}/${templateId}`, {
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('❌ Erreur récupération template:', error.message);
            return null;
        }
    }

    /**
     * Formate les résultats de recherche pour l'IA
     */
    formatTemplateResults(templates) {
        return templates.map(template => ({
            id: template.id,
            name: template.name,
            description: template.description?.substring(0, 200) || 'Pas de description',
            totalViews: template.totalViews || 0,
            nodes: template.nodes?.map(node => ({
                name: node.displayName || node.name,
                type: node.name
            })) || [],
            author: template.user?.name || 'Communauté N8N',
            verified: template.user?.verified || false,
            url: `https://n8n.io/workflows/${template.id}/`,
            categories: this.extractCategories(template.nodes),
            complexity: this.estimateComplexity(template.nodes),
            useCase: this.extractUseCase(template.name, template.description)
        }));
    }

    /**
     * Extrait les catégories probables basées sur les nodes
     */
    extractCategories(nodes = []) {
        const categories = new Set();

        nodes.forEach(node => {
            const nodeType = node.name || '';

            if (nodeType.includes('email') || nodeType.includes('gmail')) {
                categories.add('email');
            }
            if (nodeType.includes('slack') || nodeType.includes('discord') || nodeType.includes('teams')) {
                categories.add('communication');
            }
            if (nodeType.includes('google') || nodeType.includes('sheets')) {
                categories.add('google-workspace');
            }
            if (nodeType.includes('webhook') || nodeType.includes('http')) {
                categories.add('api');
            }
            if (nodeType.includes('ai') || nodeType.includes('openai') || nodeType.includes('langchain')) {
                categories.add('ai');
            }
            if (nodeType.includes('schedule') || nodeType.includes('cron')) {
                categories.add('automation');
            }
        });

        return Array.from(categories);
    }

    /**
     * Estime la complexité basée sur le nombre de nodes
     */
    estimateComplexity(nodes = []) {
        const nodeCount = nodes.length;

        if (nodeCount <= 3) return 'simple';
        if (nodeCount <= 7) return 'medium';
        return 'complex';
    }

    /**
     * Extrait le cas d'usage principal
     */
    extractUseCase(name = '', description = '') {
        const text = `${name} ${description}`.toLowerCase();

        if (text.includes('email') && text.includes('send')) return 'email-automation';
        if (text.includes('data') && text.includes('sync')) return 'data-sync';
        if (text.includes('notification')) return 'notification';
        if (text.includes('social') || text.includes('post')) return 'social-media';
        if (text.includes('crm') || text.includes('lead')) return 'crm';
        if (text.includes('ai') || text.includes('chat')) return 'ai-automation';
        if (text.includes('webhook') || text.includes('api')) return 'api-integration';

        return 'general-automation';
    }

    /**
     * Recherche intelligente avec analyse contextuelle
     */
    async intelligentSearch(userRequest, analysis) {
        console.log(`🔍 Recherche intelligente pour: "${userRequest}"`);

        // 1. Recherche directe par mots-clés
        const directResults = await this.searchTemplates(userRequest);

        // 2. Recherche par type d'automation
        let typeResults = [];
        if (analysis.type && analysis.type !== 'other') {
            typeResults = await this.searchTemplates(analysis.type);
        }

        // 3. Recherche par intégrations
        let integrationResults = [];
        if (analysis.integrations && analysis.integrations.length > 0) {
            const integrationQuery = analysis.integrations.join(' ');
            integrationResults = await this.searchTemplates(integrationQuery);
        }

        // 4. Recherche par actions
        let actionResults = [];
        if (analysis.actions && analysis.actions.length > 0) {
            const actionQuery = analysis.actions.join(' ');
            actionResults = await this.searchTemplates(actionQuery);
        }

        // Combine et déduplique les résultats
        const allResults = [...directResults, ...typeResults, ...integrationResults, ...actionResults];
        const uniqueResults = this.deduplicateResults(allResults);

        // Score et trie les résultats par pertinence
        const scoredResults = this.scoreResults(uniqueResults, analysis);

        console.log(`📊 Trouvé ${scoredResults.length} templates pertinents`);

        return scoredResults.slice(0, 5); // Top 5 des résultats
    }

    /**
     * Déduplique les résultats par ID
     */
    deduplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            if (seen.has(result.id)) {
                return false;
            }
            seen.add(result.id);
            return true;
        });
    }

    /**
     * Score les résultats par pertinence
     */
    scoreResults(results, analysis) {
        return results.map(result => {
            let score = 0;

            // Score basé sur les vues (popularité)
            score += Math.min(result.totalViews / 1000, 10);

            // Score basé sur la correspondance du type
            if (analysis.type && result.useCase.includes(analysis.type)) {
                score += 15;
            }

            // Score basé sur les intégrations
            if (analysis.integrations) {
                analysis.integrations.forEach(integration => {
                    if (result.categories.includes(integration) ||
                        result.description.toLowerCase().includes(integration.toLowerCase())) {
                        score += 10;
                    }
                });
            }

            // Score basé sur la complexité appropriée
            if (analysis.complexity === result.complexity) {
                score += 8;
            }

            // Bonus pour les auteurs vérifiés
            if (result.verified) {
                score += 5;
            }

            // Malus si trop complexe pour une demande simple
            if (analysis.complexity === 'simple' && result.complexity === 'complex') {
                score -= 10;
            }

            return { ...result, relevanceScore: Math.round(score) };
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Génère un résumé des templates trouvés pour l'IA
     */
    generateTemplateSummary(templates) {
        if (!templates || templates.length === 0) {
            return "Aucun template trouvé dans la bibliothèque N8N.";
        }

        const topTemplate = templates[0];
        const summary = [
            `🎯 **Meilleur match**: "${topTemplate.name}" (Score: ${topTemplate.relevanceScore})`,
            `📝 **Description**: ${topTemplate.description}`,
            `👀 **Popularité**: ${topTemplate.totalViews} vues`,
            `⚙️ **Nodes**: ${topTemplate.nodes.map(n => n.name).join(', ')}`,
            `🔗 **URL**: ${topTemplate.url}`
        ];

        if (templates.length > 1) {
            summary.push('');
            summary.push('📚 **Autres options**:');
            templates.slice(1, 4).forEach((template, index) => {
                summary.push(`${index + 2}. "${template.name}" (${template.totalViews} vues)`);
            });
        }

        return summary.join('\n');
    }
}

module.exports = TemplateSearch;