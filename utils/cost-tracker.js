/**
 * Cost Tracker pour Synoptia Workflow Builder
 * Calcule les coûts réels des appels API GPT-5 et Claude Sonnet 4.5
 *
 * Pricing (à jour au 8 octobre 2025):
 * - GPT-5: $1.25/M tokens input, $10.00/M tokens output
 * - Claude Sonnet 4.5: $3.00/M tokens input, $15.00/M tokens output
 *
 * Taux de change: 1 USD = 0.91 EUR (octobre 2025)
 */

const EXCHANGE_RATE_USD_TO_EUR = 0.91;

const PRICING = {
    'gpt-5': {
        input: 1.25,    // $/M tokens
        output: 10.00   // $/M tokens
    },
    'claude-sonnet-4.5': {
        input: 3.00,    // $/M tokens
        output: 15.00   // $/M tokens
    }
};

class CostTracker {
    constructor() {
        this.sessions = new Map(); // sessionId -> session costs
    }

    /**
     * Initialise une nouvelle session de tracking
     */
    startSession(sessionId) {
        this.sessions.set(sessionId, {
            startTime: Date.now(),
            agents: {
                'planning': { calls: [], total: 0 },
                'generator': { calls: [], total: 0 },
                'supervisor': { calls: [], total: 0 }
            },
            total: 0
        });
    }

    /**
     * Enregistre un appel API
     * @param {string} sessionId - ID de la session
     * @param {string} agent - 'planning', 'generator', ou 'supervisor'
     * @param {string} model - 'gpt-5' ou 'claude-sonnet-4.5'
     * @param {number} inputTokens - Nombre de tokens d'entrée
     * @param {number} outputTokens - Nombre de tokens de sortie
     */
    recordCall(sessionId, agent, model, inputTokens, outputTokens) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`⚠️ Session ${sessionId} not found in cost tracker`);
            return;
        }

        const pricing = PRICING[model];
        if (!pricing) {
            console.warn(`⚠️ Unknown model: ${model}`);
            return;
        }

        // Calcul du coût en dollars
        const inputCostUSD = (inputTokens / 1_000_000) * pricing.input;
        const outputCostUSD = (outputTokens / 1_000_000) * pricing.output;
        const totalCostUSD = inputCostUSD + outputCostUSD;

        // Conversion en euros
        const totalCostEUR = totalCostUSD * EXCHANGE_RATE_USD_TO_EUR;

        const callRecord = {
            timestamp: Date.now(),
            model,
            inputTokens,
            outputTokens,
            costUSD: totalCostUSD,
            costEUR: totalCostEUR
        };

        // Enregistrer l'appel
        session.agents[agent].calls.push(callRecord);
        session.agents[agent].total += totalCostEUR;
        session.total += totalCostEUR;

        console.log(`💰 Coût de l'appel ${agent} (${model}): ${this.formatCurrency(totalCostEUR)}`);
        console.log(`   📊 Tokens: ${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} out`);

        // Broadcast SSE du coût pour affichage UI
        if (global.broadcastSSE) {
            const agentNames = {
                'planning': 'El Planificator',
                'generator': 'El Generator',
                'supervisor': 'El Supervisor'
            };

            global.broadcastSSE('agent_cost', {
                agent: agentNames[agent] || agent,
                agentId: agent,
                model: model,
                cost: totalCostEUR,
                costFormatted: this.formatCurrency(totalCostEUR),
                inputTokens: inputTokens,
                outputTokens: outputTokens,
                totalCost: session.total,
                totalCostFormatted: this.formatCurrency(session.total)
            });
        }
    }

    /**
     * Récupère le coût total d'une session
     */
    getSessionCost(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        return {
            total: session.total,
            byAgent: {
                planning: session.agents.planning.total,
                generator: session.agents.generator.total,
                supervisor: session.agents.supervisor.total
            },
            callCount: {
                planning: session.agents.planning.calls.length,
                generator: session.agents.generator.calls.length,
                supervisor: session.agents.supervisor.calls.length
            },
            duration: Date.now() - session.startTime
        };
    }

    /**
     * Génère un rapport détaillé pour une session
     */
    generateReport(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const cost = this.getSessionCost(sessionId);
        const durationSec = Math.floor(cost.duration / 1000);

        let report = '\n╔══════════════════════════════════════════╗\n';
        report += '║       RAPPORT DE COÛTS API              ║\n';
        report += '╚══════════════════════════════════════════╝\n\n';

        report += `⏱️  Durée totale: ${durationSec}s\n\n`;

        // Coûts par agent
        report += '📊 Coûts par agent:\n';
        report += `   El Planificator:  ${this.formatCurrency(cost.byAgent.planning)} (${cost.callCount.planning} appel${cost.callCount.planning > 1 ? 's' : ''})\n`;
        report += `   El Generator:     ${this.formatCurrency(cost.byAgent.generator)} (${cost.callCount.generator} appel${cost.callCount.generator > 1 ? 's' : ''})\n`;
        report += `   El Supervisor:    ${this.formatCurrency(cost.byAgent.supervisor)} (${cost.callCount.supervisor} appel${cost.callCount.supervisor > 1 ? 's' : ''})\n\n`;

        // Total
        report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        report += `💰 COÛT TOTAL:       ${this.formatCurrency(cost.total)}\n`;
        report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

        // Détails des appels
        report += '\n📝 Détails des appels:\n';
        ['planning', 'generator', 'supervisor'].forEach(agent => {
            const agentData = session.agents[agent];
            if (agentData.calls.length > 0) {
                report += `\n   ${agent.toUpperCase()}:\n`;
                agentData.calls.forEach((call, idx) => {
                    report += `   ${idx + 1}. ${call.model}: ${call.inputTokens.toLocaleString()}→${call.outputTokens.toLocaleString()} tokens (${this.formatCurrency(call.costEUR)})\n`;
                });
            }
        });

        return report;
    }

    /**
     * Formate une valeur en euros
     */
    formatCurrency(valueEUR) {
        if (valueEUR < 0.01) {
            return `${(valueEUR * 100).toFixed(3)}c€`; // centimes avec 3 décimales
        } else if (valueEUR < 1) {
            return `${(valueEUR * 100).toFixed(2)}c€`; // centimes
        } else {
            return `${valueEUR.toFixed(2)}€`;
        }
    }

    /**
     * Nettoie les sessions anciennes (> 24h)
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures

        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.startTime > maxAge) {
                this.sessions.delete(sessionId);
                console.log(`🧹 Session ${sessionId} nettoyée (> 24h)`);
            }
        }
    }
}

// Instance globale
const costTracker = new CostTracker();

// Nettoyage automatique toutes les heures
setInterval(() => costTracker.cleanup(), 60 * 60 * 1000);

module.exports = costTracker;
