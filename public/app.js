// FIX #1/#4/#5: La fonction toggleTasksList est maintenant définie dans index.html (inline)
// FIX #5: Event delegation pour gérer les re-créations dynamiques du DOM
document.addEventListener('DOMContentLoaded', function() {
    // Event delegation au niveau document pour capturer tous les clics
    document.addEventListener('click', function(e) {
        const header = e.target.closest('.agent-tasks-header');
        if (header && window.toggleTasksList) {
            e.preventDefault();
            e.stopPropagation();
            window.toggleTasksList(header);
        }
    }, true); // useCapture=true pour priorité maximale

    console.log('✅ Event delegation activée pour .agent-tasks-header');
});

const state = {
    complexity: null, // Sera détecté automatiquement par El Planificator
    lastWorkflow: null,
    eventSource: null
};

const form = document.getElementById('workflow-form');
const requestInput = document.getElementById('request');
const autoExecuteInput = document.getElementById('autoExecute');
const examples = Array.from(document.querySelectorAll('#examples .example'));
const generateBtn = document.getElementById('generateBtn');
const statusPill = document.getElementById('status-pill');
const placeholder = document.getElementById('placeholder');
const resultsGrid = document.getElementById('results-grid');
const workflowName = document.getElementById('workflow-name');
const workflowDescription = document.getElementById('workflow-description');
const workflowNodes = document.getElementById('workflow-nodes');
const analysisList = document.getElementById('analysis-list');
const deploymentInfo = document.getElementById('deployment-info');
const copyButton = document.getElementById('copy-json');
const toast = document.getElementById('toast');

examples.forEach((example) => {
    example.addEventListener('click', () => {
        requestInput.value = example.textContent.trim();
        requestInput.focus();
        showToast('Exemple chargé');
    });
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const request = requestInput.value.trim();
    if (!request) {
        showToast('Décris ton workflow pour démarrer.');
        requestInput.focus();
        return;
    }

    setLoading(true);
    setStatus('Analyse en cours…', 'neutral');

    // Connecter au stream SSE pour le raisonnement en temps réel
    connectReasoningStream();

    // Afficher le panneau de raisonnement
    showReasoningPanel();

    try {
        const response = await fetch('/api/create-workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                request,
                autoExecute: autoExecuteInput.checked
            })
        });

        if (!response.ok) {
            throw new Error('Erreur serveur');
        }

        const payload = await response.json();

        if (!payload.success) {
            throw new Error(payload.error || 'Analyse échouée');
        }

        state.lastWorkflow = payload.workflowData;
        renderResults(payload);
        showToast('Workflow généré');
        setStatus(payload.deployment?.success ? 'Déployé sur n8n' : 'Prêt à être importé', payload.deployment?.success ? 'success' : 'neutral');

        // Tous les agents ont réussi
        completeAgentsPipeline(true);
    } catch (error) {
        console.error(error);
        showToast("Une erreur est survenue", true);
        setStatus('Erreur', 'error');

        // Erreur dans le pipeline
        completeAgentsPipeline(false);
    } finally {
        setLoading(false);
        disconnectReasoningStream();
    }
});

copyButton.addEventListener('click', async () => {
    if (!state.lastWorkflow) {
        showToast('Aucun workflow à copier');
        return;
    }

    try {
        const json = JSON.stringify(state.lastWorkflow, null, 2);
        await navigator.clipboard.writeText(json);
        showToast('Workflow copié dans le presse-papier');
    } catch (error) {
        console.error(error);
        showToast('Impossible de copier', true);
    }
});

function renderResults(payload) {
    placeholder.classList.add('hidden');
    resultsGrid.classList.remove('hidden');

    workflowName.textContent = payload.workflow?.name || '—';
    workflowDescription.textContent = payload.workflow?.description || payload.message || '—';
    workflowNodes.textContent = payload.workflow?.nodesCount ?? '—';

    renderAnalysis(payload.analysis);
    renderDeployment(payload.deployment, payload.message);
}

function renderAnalysis(analysis) {
    analysisList.innerHTML = '';

    if (!analysis) {
        analysisList.innerHTML = '<li>Aucune analyse disponible</li>';
        return;
    }

    const entries = [
        { label: 'Type', value: analysis.type },
        { label: 'Trigger', value: analysis.trigger },
        { label: 'Fréquence', value: analysis.frequency },
        { label: 'Actions', value: analysis.actions?.join(', ') },
        { label: 'Intégrations', value: analysis.integrations?.join(', ') },
        { label: 'Complexité', value: analysis.complexity },
        { label: 'Cas d\'usage', value: analysis.use_case }
    ];

    entries.forEach(({ label, value }) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
            return;
        }

        const item = document.createElement('li');
        item.innerHTML = `<strong>${label} :</strong> ${Array.isArray(value) ? value.join(', ') : value}`;
        analysisList.appendChild(item);
    });
}

function renderDeployment(deployment, message) {
    if (deployment?.success) {
        deploymentInfo.innerHTML = `✅ Workflow actif<br><a href="${deployment.url}" target="_blank" rel="noreferrer">Ouvrir dans n8n</a>`;
    } else if (deployment === null) {
        deploymentInfo.innerHTML = `⚠️ Déploiement désactivé<br>${message || 'Tu peux importer le JSON dans n8n.'}`;
    } else {
        deploymentInfo.innerHTML = `ℹ️ Prêt à être importé<br>${message || 'Télécharge le JSON et dépose-le dans n8n.'}`;
    }
}

function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    generateBtn.textContent = isLoading ? 'Génération…' : 'Générer le workflow';
}

function setStatus(text, type) {
    statusPill.textContent = text;
    statusPill.classList.remove('status-success', 'status-error');

    if (type === 'success') {
        statusPill.classList.add('status-success');
    }

    if (type === 'error') {
        statusPill.classList.add('status-error');
    }
}

function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.borderColor = isError ? 'rgba(248, 113, 113, 0.5)' : 'rgba(56, 189, 248, 0.3)';
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2600);
}

// ===== AGENTS PIPELINE ANIMATION =====

function setAgentStatus(agentId, status, text) {
    const agent = document.getElementById(agentId);
    if (!agent) return;

    const statusEl = agent.querySelector('.agent-status');
    const statusText = statusEl.querySelector('.status-text');

    statusEl.setAttribute('data-status', status);
    statusText.textContent = text;
}

let reasoningStartTime = 0;
let timerInterval = null;

function startAgentsPipeline() {
    // Reset all agents (plus besoin des timeouts simulés)
    setAgentStatus('agent-planning', 'idle', 'En attente');
    setAgentStatus('agent-generator', 'idle', 'En attente');
    setAgentStatus('agent-supervisor', 'idle', 'En attente');
}

function completeAgentsPipeline(success) {
    stopTimer();
    updateProgress(100);

    if (success) {
        setAgentStatus('agent-supervisor', 'success', 'Approuvé ✓');
        addReasoningStep('✅', 'Validation', 'Workflow approuvé par tous les agents !', false);
    } else {
        // En cas d'erreur, marquer l'agent en cours comme erreur
        const workingAgent = document.querySelector('.agent-status[data-status="working"]');
        if (workingAgent) {
            const agentCard = workingAgent.closest('.agent-card');
            setAgentStatus(agentCard.id, 'error', 'Erreur ✗');
        }
        addReasoningStep('❌', 'Erreur', 'Une erreur est survenue pendant la génération', false);
    }

    // NE PLUS masquer automatiquement - garder le panneau persistant
    // L'utilisateur pourra le fermer manuellement s'il veut
}

// ===== REASONING PANEL FUNCTIONS =====

function showReasoningPanel() {
    const panel = document.getElementById('reasoning-panel');
    const stepsContainer = document.getElementById('reasoning-steps');

    // Reset COMPLET de tous les agents (status + tasks + coûts)
    resetAgentsPipeline();

    // Reset reasoning steps
    stepsContainer.innerHTML = '';
    updateProgress(0);

    // Afficher
    panel.classList.remove('hidden');

    // Démarrer le timer
    startTimer();

    // Afficher temps prévisionnels
    showEstimatedTimes();
}

function showEstimatedTimes() {
    const timerEl = document.getElementById('reasoning-timer');
    if (!timerEl) return;

    // Créer un élément pour les temps estimés
    let estimateEl = document.getElementById('time-estimate');
    if (!estimateEl) {
        estimateEl = document.createElement('div');
        estimateEl.id = 'time-estimate';
        estimateEl.style.cssText = 'margin-left: 16px; font-size: 13px; color: rgba(255,255,255,0.6);';
        timerEl.appendChild(estimateEl);
    }

    // Affichage initial : fourchette large (sera affinée après El Planificator)
    estimateEl.innerHTML = '⏱️ Temps estimé: 3-25 min';
}

function updateEstimatedTime(complexity) {
    const estimateEl = document.getElementById('time-estimate');
    if (!estimateEl) return;

    // Temps estimés selon la complexité détectée par El Planificator
    const estimations = {
        simple: { text: '3-5 min', warn: 4, max: 5 },
        medium: { text: '10-15 min', warn: 12, max: 15 },
        complex: { text: '15-25 min', warn: 20, max: 25 }
    };

    const estimate = estimations[complexity] || estimations.complex;

    // Mettre à jour avec la fourchette affinée
    estimateEl.innerHTML = `⏱️ Temps estimé: ${estimate.text}`;

    // Sauvegarder pour les messages suivants
    state.complexity = complexity;
}

function hideReasoningPanel() {
    const panel = document.getElementById('reasoning-panel');
    panel.classList.add('hidden');
}

function addReasoningStep(icon, title, content, isCurrent) {
    const stepsContainer = document.getElementById('reasoning-steps');
    const elapsedTime = getElapsedTime();

    // Replier toutes les étapes précédentes SAUF si c'est la fin (success/error)
    if (isCurrent) {
        document.querySelectorAll('.reasoning-step.current').forEach(step => {
            step.classList.remove('current');
            step.classList.add('collapsed');
        });
    }

    const stepEl = document.createElement('div');
    stepEl.className = `reasoning-step ${isCurrent ? 'current' : ''}`;
    stepEl.innerHTML = `
        <div class="step-header">
            <span class="step-agent">${icon}</span>
            <span class="step-title">${title}</span>
            <span class="step-toggle">▼</span>
        </div>
        <div class="step-content">${content}</div>
        <div class="step-time">+${elapsedTime}s</div>
    `;

    // Ajouter le click pour toggle
    const header = stepEl.querySelector('.step-header');
    header.addEventListener('click', () => {
        stepEl.classList.toggle('collapsed');
    });

    stepsContainer.appendChild(stepEl);

    // Auto-scroll vers le bas
    stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateProgress(percent) {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${percent}%`;
}

function startTimer() {
    reasoningStartTime = Date.now();
    const timerText = document.getElementById('timer-text');

    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - reasoningStartTime) / 1000);
        timerText.textContent = `${elapsed}s`;
    }, 100);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function getElapsedTime() {
    return Math.floor((Date.now() - reasoningStartTime) / 1000);
}

// ===== SSE CONNECTION FOR REAL-TIME REASONING =====

function connectReasoningStream() {
    // Fermer l'ancienne connexion si elle existe
    disconnectReasoningStream();

    // Créer nouvelle connexion SSE
    state.eventSource = new EventSource('/api/reasoning-stream');

    // Événements de planning
    state.eventSource.addEventListener('planning_start', (e) => {
        const data = JSON.parse(e.data);
        setAgentStatus('agent-planning', 'working', 'Planification...');
        updateAgentCard('agent-planning', data.message);
    });

    state.eventSource.addEventListener('planning_progress', (e) => {
        const data = JSON.parse(e.data);
        updateAgentCard('agent-planning', data.message);
    });

    state.eventSource.addEventListener('planning_complete', (e) => {
        const data = JSON.parse(e.data);
        setAgentStatus('agent-planning', 'success', 'Plan créé ✓');
        updateAgentCard('agent-planning', data.message);
        updateProgress(33);

        // Affiner l'estimation de temps selon la complexité détectée
        if (data.complexity) {
            updateEstimatedTime(data.complexity);
        }
    });

    state.eventSource.addEventListener('planning_error', (e) => {
        const data = JSON.parse(e.data);
        setAgentStatus('agent-planning', 'error', 'Erreur ✗');
        updateAgentCard('agent-planning', data.message);
    });

    // Événements de génération
    state.eventSource.addEventListener('generation_start', (e) => {
        const data = JSON.parse(e.data);
        setAgentStatus('agent-generator', 'working', 'Génération...');
        updateAgentCard('agent-generator', data.message);
    });

    state.eventSource.addEventListener('generation_progress', (e) => {
        const data = JSON.parse(e.data);
        updateAgentCard('agent-generator', data.message);
    });

    state.eventSource.addEventListener('generation_complete', (e) => {
        const data = JSON.parse(e.data);
        setAgentStatus('agent-generator', 'success', 'Workflow généré ✓');
        updateAgentCard('agent-generator', data.message);
        updateProgress(66);
    });

    // Événements de supervision
    state.eventSource.addEventListener('supervision_start', (e) => {
        const data = JSON.parse(e.data);
        setAgentStatus('agent-supervisor', 'working', 'Validation...');
        updateAgentCard('agent-supervisor', data.message);
    });

    state.eventSource.addEventListener('supervision_progress', (e) => {
        const data = JSON.parse(e.data);
        updateAgentCard('agent-supervisor', data.message);
    });

    state.eventSource.addEventListener('supervision_complete', (e) => {
        const data = JSON.parse(e.data);
        setAgentStatus('agent-supervisor', 'success', 'Approuvé ✓');
        updateAgentCard('agent-supervisor', data.message);
        updateProgress(100);
    });

    state.eventSource.addEventListener('supervision_retry', (e) => {
        const data = JSON.parse(e.data);
        updateAgentCard('agent-supervisor', data.message);

        // Reset les status des agents pour le retry (GARDER tasks + coûts)
        resetAgentsStatusOnly();
    });

    state.eventSource.addEventListener('supervision_error', (e) => {
        const data = JSON.parse(e.data);
        setAgentStatus('agent-supervisor', 'error', 'Erreur ✗');
        updateAgentCard('agent-supervisor', data.message);
    });

    // Événements de coûts
    state.eventSource.addEventListener('agent_cost', (e) => {
        const data = JSON.parse(e.data);
        updateAgentCost(data.agentId, data.costFormatted);
        updateTotalCost(data.totalCostFormatted);
    });

    // Erreurs de connexion
    state.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        disconnectReasoningStream();
    };
}

function disconnectReasoningStream() {
    if (state.eventSource) {
        state.eventSource.close();
        state.eventSource = null;
    }
}

// ===== UPDATE AGENT COST DISPLAY =====

function updateAgentCost(agentId, costFormatted) {
    const costEl = document.getElementById(`cost-${agentId}`);
    if (!costEl) return;

    const amountEl = costEl.querySelector('.cost-amount');
    if (amountEl) {
        amountEl.textContent = costFormatted;
        costEl.style.display = 'block';

        // Animation pulse
        costEl.style.animation = 'none';
        setTimeout(() => {
            costEl.style.animation = 'pulse 0.5s ease';
        }, 10);
    }
}

function updateTotalCost(totalCostFormatted) {
    const totalCostEl = document.getElementById('workflow-total-cost');
    const amountEl = document.getElementById('total-cost-amount');

    if (totalCostEl && amountEl) {
        amountEl.textContent = totalCostFormatted;
        totalCostEl.style.display = 'block';

        // Animation pulse
        totalCostEl.style.animation = 'none';
        setTimeout(() => {
            totalCostEl.style.animation = 'pulse 0.5s ease';
        }, 10);
    }
}

function resetCostDisplays() {
    // Masquer et reset tous les coûts agents
    ['planning', 'generator', 'supervisor'].forEach(agentId => {
        const costEl = document.getElementById(`cost-${agentId}`);
        if (costEl) {
            costEl.style.display = 'none';
            const amountEl = costEl.querySelector('.cost-amount');
            if (amountEl) {
                amountEl.textContent = '0.00€';
            }
        }
    });

    // Masquer et reset le coût total
    const totalCostEl = document.getElementById('workflow-total-cost');
    if (totalCostEl) {
        totalCostEl.style.display = 'none';
        const amountEl = document.getElementById('total-cost-amount');
        if (amountEl) {
            amountEl.textContent = '0.00€';
        }
    }
}

function resetAgentsPipeline() {
    // Reset complet de tous les agents comme un refresh de page
    ['planning', 'generator', 'supervisor'].forEach(agentId => {
        const agentCardId = `agent-${agentId}`;
        const agent = document.getElementById(agentCardId);
        if (!agent) return;

        // 1. Reset status
        setAgentStatus(agentCardId, 'idle', 'En attente');

        // 2. Reset tasks list (vider + collapse)
        const tasksList = agent.querySelector('.agent-tasks-list');
        if (tasksList) {
            tasksList.innerHTML = '';
            tasksList.classList.add('collapsed');
        }

        // 3. Reset tasks counter
        const tasksCount = agent.querySelector('.tasks-count');
        if (tasksCount) {
            tasksCount.textContent = '0 tâche';
        }

        // 4. Reset tasks toggle arrow
        const tasksToggle = agent.querySelector('.tasks-toggle');
        if (tasksToggle) {
            tasksToggle.textContent = '▼';
        }

        // 5. Reset cost display
        const costEl = document.getElementById(`cost-${agentId}`);
        if (costEl) {
            costEl.style.display = 'none';
            const amountEl = costEl.querySelector('.cost-amount');
            if (amountEl) {
                amountEl.textContent = '0.00€';
            }
        }
    });

    // Reset coût total workflow
    const totalCostEl = document.getElementById('workflow-total-cost');
    if (totalCostEl) {
        totalCostEl.style.display = 'none';
        const amountEl = document.getElementById('total-cost-amount');
        if (amountEl) {
            amountEl.textContent = '0.00€';
        }
    }

    console.log('✅ Pipeline agents complètement reseté');
}

function resetAgentsStatusOnly() {
    // Reset UNIQUEMENT les status (pour les retries du Supervisor)
    // GARDE : tasks, coûts (historique important)
    ['planning', 'generator', 'supervisor'].forEach(agentId => {
        const agentCardId = `agent-${agentId}`;
        setAgentStatus(agentCardId, 'idle', 'En attente');
    });

    console.log('🔄 Status agents resetés pour retry (tasks/coûts conservés)');
}

// ===== UPDATE AGENT CARDS WITH LATEST MESSAGE =====

function updateAgentCard(agentId, message) {
    const agent = document.getElementById(agentId);
    if (!agent) return;

    // Récupérer la liste de tâches (elle existe maintenant dans le HTML)
    const tasksList = agent.querySelector('.agent-tasks-list');
    if (!tasksList) return;

    // Ajouter la nouvelle tâche
    const taskItem = document.createElement('li');
    taskItem.textContent = message;
    tasksList.appendChild(taskItem);

    // Mettre à jour le compteur
    const count = tasksList.children.length;
    const countEl = agent.querySelector('.tasks-count');
    if (countEl) {
        countEl.textContent = `${count} tâche${count > 1 ? 's' : ''}`;
    }

    // Mettre à jour la tâche en cours globale
    const currentTaskEl = document.getElementById('current-task');
    const currentTaskText = document.getElementById('current-task-text');
    if (currentTaskEl && currentTaskText) {
        currentTaskEl.style.display = 'block';

        // Trouver le nom de l'agent
        const agentName = agent.querySelector('h3')?.textContent || 'Agent';
        currentTaskText.textContent = `${agentName} - ${message}`;
    }
}
