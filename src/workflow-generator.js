/**
 * Générateur de workflows n8n avancé
 * Construit des automatisations multi-étapes adaptées aux demandes complexes
 * Intègre la recherche de templates N8N existants pour optimiser les workflows
 */

const TemplateSearch = require('./template-search');

const DEFAULT_STAGE_SPACING = 280;
const DEFAULT_LANE_SPACING = 220;
const DEFAULT_BASE_X = 240;
const DEFAULT_BASE_Y = 280;

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function deepMerge(target = {}, source = {}) {
    const output = Array.isArray(target) ? [...target] : { ...target };

    Object.keys(source).forEach((key) => {
        const sourceValue = source[key];
        const targetValue = output[key];

        if (
            sourceValue &&
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue) &&
            targetValue &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)
        ) {
            output[key] = deepMerge(targetValue, sourceValue);
        } else if (Array.isArray(sourceValue)) {
            output[key] = [...sourceValue];
        } else {
            output[key] = sourceValue;
        }
    });

    return output;
}

class WorkflowBuilder {
    constructor(nodeTemplates, generateId) {
        this.nodeTemplates = nodeTemplates;
        this.generateId = generateId;
        this.nodes = [];
        this.connections = {};
        this.stage = 0;
    }

    computePosition(stage, lane = 0) {
        return [
            DEFAULT_BASE_X + (stage * DEFAULT_STAGE_SPACING),
            DEFAULT_BASE_Y + (lane * DEFAULT_LANE_SPACING)
        ];
    }

    addNode(templateKey, overrides = {}) {
        const template = typeof templateKey === 'string'
            ? this.nodeTemplates[templateKey]
            : templateKey;

        if (!template) {
            throw new Error(`Template de nœud introuvable: ${templateKey}`);
        }

        const node = deepClone(template);
        node.id = overrides.id || this.generateId();
        node.name = overrides.name || node.name;

        const stage = overrides.stage ?? this.stage;
        const lane = overrides.lane ?? 0;

        if (overrides.position) {
            node.position = overrides.position;
        } else {
            node.position = this.computePosition(stage, lane);
        }

        if (overrides.parameters) {
            node.parameters = deepMerge(node.parameters || {}, overrides.parameters);
        }

        if (overrides.credentials) {
            node.credentials = deepMerge(node.credentials || {}, overrides.credentials);
        }

        if (overrides.options) {
            node.options = deepMerge(node.options || {}, overrides.options);
        }

        if (overrides.notes) {
            node.notes = overrides.notes;
        }

        this.nodes.push(node);
        return node;
    }

    connect(fromNode, toNode, fromOutput = 0, targetInput = 0) {
        if (!this.connections[fromNode.name]) {
            this.connections[fromNode.name] = { main: [] };
        }

        const mainConnections = this.connections[fromNode.name].main;

        while (mainConnections.length <= fromOutput) {
            mainConnections.push([]);
        }

        mainConnections[fromOutput].push({
            node: toNode.name,
            type: 'main',
            index: targetInput
        });
    }

    wrap(node, outputIndex = 0) {
        return [{ node, outputIndex }];
    }

    chain(endpoints, nextNode, targetInput = 0) {
        endpoints.forEach((endpoint) => {
            const outputIndex = endpoint.outputIndex ?? 0;
            const inputIndex = endpoint.targetInput ?? targetInput;
            this.connect(endpoint.node, nextNode, outputIndex, inputIndex);
        });

        return this.wrap(nextNode, 0);
    }

    advanceStage() {
        this.stage += 1;
        return this.stage;
    }

    toWorkflow({ name, description, tags = [], analysis, settings = {}, staticData = {}, pinData = {} }) {
        return {
            id: this.generateId(),
            name,
            nodes: this.nodes,
            connections: this.connections,
            settings: {
                executionOrder: 'v1',
                timezone: 'Europe/Paris',
                saveManualExecutions: true,
                ...settings
            },
            staticData,
            meta: {
                generatedBy: 'Synoptia Workflow Builder',
                generatedAt: new Date().toISOString(),
                description,
                tags,
                analysis
            },
            pinData
        };
    }
}

class WorkflowGenerator {
    constructor() {
        this.templateSearch = new TemplateSearch();
        this.nodeTemplates = {
            // === TRIGGERS ===
            manual_trigger: {
                id: 'manual-trigger',
                name: 'Déclenchement manuel',
                type: 'n8n-nodes-base.manualTrigger',
                typeVersion: 1,
                position: [250, 300]
            },
            schedule_trigger: {
                id: 'schedule-trigger',
                name: 'Planificateur',
                type: 'n8n-nodes-base.scheduleTrigger',
                typeVersion: 1,
                position: [250, 300],
                parameters: {
                    rule: {
                        interval: [{ field: 'cronExpression', value: '0 9 * * 1' }]
                    }
                }
            },
            webhook_trigger: {
                id: 'webhook-trigger',
                name: 'Webhook Synoptia',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 1,
                position: [250, 300],
                parameters: {
                    httpMethod: 'POST',
                    path: 'synoptia-automation',
                    responseMode: 'responseNode'
                }
            },
            form_trigger: {
                id: 'form-trigger',
                name: 'Trigger Formulaire',
                type: 'n8n-nodes-base.formTrigger',
                typeVersion: 1,
                position: [250, 300],
                parameters: {
                    formTitle: 'Formulaire Synoptia',
                    formDescription: 'Formulaire automatisé'
                }
            },
            email_trigger: {
                id: 'email-trigger',
                name: 'Surveillance email',
                type: 'n8n-nodes-base.emailReadImap',
                typeVersion: 2,
                position: [250, 300],
                parameters: {
                    format: 'simple',
                    downloadAttachments: true,
                    options: {
                        markAsRead: true,
                        property: 'messages'
                    }
                }
            },
            file_trigger: {
                id: 'file-trigger',
                name: 'Surveillance fichiers',
                type: 'n8n-nodes-base.googleDriveTrigger',
                typeVersion: 1,
                position: [250, 300],
                parameters: {
                    resource: 'file',
                    operation: 'update',
                    driveId: 'shared',
                    watchFolderId: 'root'
                }
            },

            // === ACTIONS EMAIL ===
            email_send: {
                id: 'email-send',
                name: 'Envoi Email',
                type: 'n8n-nodes-base.emailSend',
                typeVersion: 2,
                position: [450, 300],
                parameters: {
                    fromEmail: 'automation@synoptia.fr',
                    toEmail: '{{ $json.email || "contact@synoptia.fr" }}',
                    subject: 'Notification Synoptia',
                    message: 'Message automatique généré par Synoptia',
                    options: {
                        allowUnauthorizedCerts: false
                    }
                }
            },
            gmail_send: {
                id: 'gmail-send',
                name: 'Envoi Gmail',
                type: 'n8n-nodes-base.gmail',
                typeVersion: 2,
                position: [450, 300],
                parameters: {
                    operation: 'send',
                    to: '{{ $json.email || "contact@synoptia.fr" }}',
                    subject: 'Synoptia - Notification',
                    message: 'Message automatique de Synoptia'
                }
            },

            // === INTÉGRATIONS ===
            slack_notification: {
                id: 'slack-notification',
                name: 'Notification Slack',
                type: 'n8n-nodes-base.slack',
                typeVersion: 2,
                position: [450, 300],
                parameters: {
                    operation: 'postMessage',
                    channel: '#general',
                    text: '🤖 Notification Synoptia'
                }
            },
            google_sheets: {
                id: 'google-sheets',
                name: 'Google Sheets',
                type: 'n8n-nodes-base.googleSheets',
                typeVersion: 4,
                position: [450, 300],
                parameters: {
                    operation: 'append',
                    documentId: '{{ $json.spreadsheetId }}',
                    sheetName: 'Données Synoptia',
                    columnNames: 'Date,Type,Message,Statut'
                }
            },
            http_request: {
                id: 'http-request',
                name: 'API Call',
                type: 'n8n-nodes-base.httpRequest',
                typeVersion: 4.1,
                position: [450, 300],
                parameters: {
                    method: 'POST',
                    url: 'https://api.synoptia.fr/webhook',
                    sendHeaders: true,
                    headerParameters: {
                        parameters: [
                            {
                                name: 'Content-Type',
                                value: 'application/json'
                            },
                            {
                                name: 'Authorization',
                                value: 'Bearer {{ $json.apiKey }}'
                            }
                        ]
                    },
                    sendBody: true,
                    bodyParameters: {
                        parameters: [
                            {
                                name: 'event',
                                value: '{{ $json.event || "workflow_executed" }}'
                            },
                            {
                                name: 'timestamp',
                                value: '{{ new Date().toISOString() }}'
                            },
                            {
                                name: 'source',
                                value: 'synoptia-workflow-builder'
                            }
                        ]
                    }
                }
            },
            database_node: {
                id: 'database-node',
                name: 'Base de données',
                type: 'n8n-nodes-base.postgres',
                typeVersion: 1,
                position: [450, 300],
                parameters: {
                    operation: 'insert',
                    schema: 'public',
                    table: 'automation_events',
                    columns: {
                        columns: [
                            { name: 'id', value: '={{ $json.id || $now.toUnix() }}' },
                            { name: 'payload', value: '={{ JSON.stringify($json) }}' },
                            { name: 'created_at', value: '={{ $now.toISO() }}' }
                        ]
                    },
                    additionalFields: {}
                }
            },
            file_manager: {
                id: 'file-manager',
                name: 'Gestion fichiers',
                type: 'n8n-nodes-base.googleDrive',
                typeVersion: 2,
                position: [450, 300],
                parameters: {
                    operation: 'upload',
                    fileName: '{{ $json.fileName || "automation-output.json" }}',
                    binaryData: false,
                    content: '{{ JSON.stringify($json) }}'
                }
            },

            // === TRAITEMENT DE DONNÉES ===
            function_node: {
                id: 'function',
                name: 'Code JavaScript',
                type: 'n8n-nodes-base.function',
                typeVersion: 1,
                position: [450, 300],
                parameters: {
                    functionCode: `return items.map(item => ({\n    json: {\n        ...item.json,\n        processed: true,\n        processedAt: new Date().toISOString(),\n        source: 'synoptia-automation'\n    }\n}));`
                }
            },
            set_data: {
                id: 'set-data',
                name: 'Configurer données',
                type: 'n8n-nodes-base.set',
                typeVersion: 3,
                position: [450, 300],
                parameters: {
                    assignments: {
                        assignments: [
                            {
                                id: 'timestamp',
                                name: 'timestamp',
                                value: '{{ new Date().toISOString() }}',
                                type: 'string'
                            },
                            {
                                id: 'status',
                                name: 'status',
                                value: 'completed',
                                type: 'string'
                            },
                            {
                                id: 'source',
                                name: 'source',
                                value: 'synoptia-workflow-builder',
                                type: 'string'
                            }
                        ]
                    }
                }
            },

            // === CONDITIONS & STRUCTURES ===
            if_condition: {
                id: 'if-condition',
                name: 'Condition',
                type: 'n8n-nodes-base.if',
                typeVersion: 2,
                position: [450, 300],
                parameters: {
                    conditions: {
                        options: {
                            caseSensitive: false,
                            leftValue: '',
                            typeValidation: 'strict'
                        },
                        conditions: [
                            {
                                id: 'condition1',
                                leftValue: '{{ $json.status }}',
                                rightValue: 'success',
                                operator: {
                                    type: 'string',
                                    operation: 'equals'
                                }
                            }
                        ],
                        combinator: 'and'
                    }
                }
            },
            split_batches: {
                id: 'split-batches',
                name: 'Traitement par lots',
                type: 'n8n-nodes-base.splitInBatches',
                typeVersion: 1,
                position: [450, 300],
                parameters: {
                    batchSize: 50,
                    options: {
                        continueAtLastPosition: true
                    }
                }
            },
            merge_node: {
                id: 'merge-node',
                name: 'Fusionner flux',
                type: 'n8n-nodes-base.merge',
                typeVersion: 1,
                position: [450, 300],
                parameters: {
                    mode: 'passThrough',
                    property: 'data'
                }
            },

            // === UTILITAIRES ===
            wait_node: {
                id: 'wait-node',
                name: 'Attendre',
                type: 'n8n-nodes-base.wait',
                typeVersion: 1,
                position: [450, 300],
                parameters: {
                    amount: 5,
                    unit: 'seconds'
                }
            },
            response_node: {
                id: 'response-node',
                name: 'Réponse Webhook',
                type: 'n8n-nodes-base.respondToWebhook',
                typeVersion: 1,
                position: [650, 300],
                parameters: {
                    options: {},
                    responseBody: '{"status":"success"}'
                }
            },
            error_handler: {
                id: 'error-handler',
                name: 'Gestion erreurs',
                type: 'n8n-nodes-base.function',
                typeVersion: 1,
                position: [450, 300],
                parameters: {
                    functionCode: `return items.map(item => {\n    const data = item.json;\n    const errorReport = {\n        ...data,\n        handled: true,\n        handledAt: new Date().toISOString(),\n        severity: data.severity || 'medium'\n    };\n\n    console.error('Synoptia - Erreur gérée', errorReport);\n    return { json: errorReport };\n});`
                }
            }
        };
    }

    async generate(rawAnalysis) {
        const analysis = this.normalizeAnalysis(rawAnalysis);

        // Recherche de templates existants
        const templates = await this.templateSearch.intelligentSearch(rawAnalysis.description || '', analysis);
        if (templates && templates.length > 0) {
            console.log(`📚 Templates trouvés: ${templates.length} résultats`);
            analysis.templates = templates;
            analysis.templateSummary = this.templateSearch.generateTemplateSummary(templates);
        }

        const builder = new WorkflowBuilder(this.nodeTemplates, () => this.generateId());

        const triggerNode = this.createTriggerNode(builder, analysis);
        let currentEndpoints = builder.wrap(triggerNode);
        builder.advanceStage();

        currentEndpoints = this.applyPreProcessing(builder, analysis, currentEndpoints);

        const actionResult = this.applyActionPlan(builder, analysis, currentEndpoints);
        currentEndpoints = actionResult.endpoints;

        if (analysis.complexity === 'complex') {
            currentEndpoints = this.applyComplexBranch(builder, analysis, currentEndpoints);
        }

        currentEndpoints = this.applyPostProcessing(builder, analysis, currentEndpoints);

        const workflowName = this.generateWorkflowName(analysis);

        return builder.toWorkflow({
            name: workflowName,
            description: analysis.description || analysis.use_case,
            tags: this.generateTags(analysis),
            analysis
        });
    }

    normalizeAnalysis(analysis = {}) {
        const normalized = {
            type: analysis.type || 'other',
            description: analysis.description || 'Automatisation Synoptia',
            trigger: analysis.trigger || 'manual',
            frequency: analysis.frequency || 'manuel',
            actions: Array.isArray(analysis.actions) ? analysis.actions : [],
            integrations: Array.isArray(analysis.integrations) ? analysis.integrations : [],
            complexity: analysis.complexity || 'simple',
            use_case: analysis.use_case || analysis.description || 'Automatisation'
        };

        return normalized;
    }

    createTriggerNode(builder, analysis) {
        const triggerKey = this.getTriggerTemplateKey(analysis.trigger);
        const triggerName = this.getTriggerName(analysis.trigger);
        const triggerNode = builder.addNode(triggerKey, {
            stage: builder.stage,
            lane: 0,
            name: triggerName
        });

        this.customizeTrigger(triggerNode, analysis);
        return triggerNode;
    }

    getTriggerTemplateKey(triggerType) {
        const map = {
            schedule: 'schedule_trigger',
            webhook: 'webhook_trigger',
            manual: 'manual_trigger',
            email: 'email_trigger',
            form: 'form_trigger',
            file: 'file_trigger'
        };

        return map[triggerType] || 'manual_trigger';
    }

    getTriggerName(triggerType) {
        const map = {
            schedule: 'Planificateur Synoptia',
            webhook: 'Webhook entrant',
            manual: 'Déclenchement manuel',
            email: 'Surveillance email',
            form: 'Soumission de formulaire',
            file: 'Surveillance fichiers'
        };

        return map[triggerType] || 'Déclenchement manuel';
    }

    customizeTrigger(node, analysis) {
        if (analysis.trigger === 'schedule') {
            this.customizeScheduleTrigger(node, analysis);
        }

        if (analysis.trigger === 'webhook') {
            node.parameters.path = this.slugify(analysis.use_case || 'synoptia-automation');
        }

        if (analysis.trigger === 'form') {
            node.parameters.formTitle = `Formulaire - ${analysis.use_case}`;
            node.parameters.formDescription = analysis.description;
        }
    }

    customizeScheduleTrigger(node, analysis) {
        const cronMap = {
            quotidien: '0 8 * * *',
            hebdomadaire: '0 9 * * 1',
            mensuel: '0 9 1 * *',
            'temps-réel': '*/5 * * * *'
        };

        const expression = cronMap[analysis.frequency] || '0 */2 * * *';

        node.parameters = node.parameters || {};
        node.parameters.rule = {
            interval: [{ field: 'cronExpression', value: expression }]
        };
    }

    applyPreProcessing(builder, analysis, endpoints) {
        let current = endpoints;

        if (analysis.complexity !== 'simple') {
            const contextNode = builder.addNode('set_data', {
                stage: builder.stage,
                name: 'Préparer le contexte'
            });
            this.customizeContextNode(contextNode, analysis);
            current = builder.chain(current, contextNode);
            builder.advanceStage();
        }

        if (this.shouldUseBatching(analysis)) {
            const splitNode = builder.addNode('split_batches', {
                stage: builder.stage,
                name: 'Traitement par lots'
            });
            this.customizeSplitNode(splitNode, analysis);
            current = builder.chain(current, splitNode);
            builder.advanceStage();
        }

        return current;
    }

    shouldUseBatching(analysis) {
        const batchTriggers = ['data-processing', 'sync'];
        const batchActions = ['data_transform', 'crm_sync', 'database_operation', 'file_operation'];
        return (
            batchTriggers.includes(analysis.type) ||
            analysis.actions.some(action => batchActions.includes(action)) ||
            analysis.complexity === 'complex'
        );
    }

    applyActionPlan(builder, analysis, endpoints) {
        let current = endpoints;
        const plan = this.buildActionPlan(analysis);

        plan.primary.forEach((action) => {
            const node = builder.addNode(action.template, {
                stage: builder.stage,
                lane: action.lane ?? 0,
                name: action.name
            });

            if (typeof action.customize === 'function') {
                action.customize(node, analysis, action.context || {});
            }

            current = builder.chain(current, node);
            builder.advanceStage();
        });

        if (plan.sideEffects.length > 0) {
            const anchorNode = current.length > 0 ? current[0].node : endpoints[0].node;
            const branchNodes = [];

            plan.sideEffects.forEach((action, index) => {
                const node = builder.addNode(action.template, {
                    stage: builder.stage,
                    lane: index + 1,
                    name: action.name
                });

                if (typeof action.customize === 'function') {
                    action.customize(node, analysis, action.context || {});
                }

                builder.connect(anchorNode, node, 0, 0);
                branchNodes.push(node);
            });

            builder.advanceStage();

            if (branchNodes.length === 1) {
                current = builder.wrap(branchNodes[0]);
            } else {
                const mergeNode = builder.addNode('merge_node', {
                    stage: builder.stage,
                    lane: 0,
                    name: 'Consolidation résultats'
                });

                branchNodes.forEach((branchNode, idx) => {
                    builder.connect(branchNode, mergeNode, 0, idx);
                });

                builder.advanceStage();
                current = builder.wrap(mergeNode);
            }
        }

        return { endpoints: current };
    }

    buildActionPlan(analysis) {
        const plan = {
            primary: [],
            sideEffects: []
        };

        const addPrimary = (template, name, customize, lane = 0, context = {}) => {
            plan.primary.push({ template, name, customize, lane, context });
        };

        const addSideEffect = (template, name, customize, context = {}) => {
            plan.sideEffects.push({ template, name, customize, context });
        };

        if (analysis.actions.includes('data_transform') || analysis.type === 'data-processing') {
            addPrimary('function_node', 'Transformation des données', (node) => this.customizeFunctionNode(node, analysis));
        }

        if (analysis.actions.includes('http_request') || analysis.integrations.includes('http_api')) {
            addPrimary('http_request', 'Appel API principal', (node) => this.customizeHttpNode(node, analysis));
        }

        if (analysis.actions.includes('database_operation')) {
            addPrimary('database_node', 'Insertion base de données', (node) => this.customizeDatabaseNode(node, analysis));
        }

        if (analysis.actions.includes('crm_sync') || analysis.integrations.includes('google_sheets')) {
            addPrimary('google_sheets', 'Synchronisation Sheets', (node) => this.customizeSheetsNode(node, analysis));
        }

        if (analysis.actions.includes('file_operation') || analysis.integrations.includes('google_drive')) {
            addPrimary('file_manager', 'Gestion fichiers', (node) => this.customizeFileNode(node, analysis));
        }

        if (analysis.actions.includes('send_email') || analysis.type === 'email') {
            addPrimary('email_send', 'Envoi email principal', (node) => this.customizeEmailNode(node, analysis));
        }

        if (analysis.integrations.includes('slack')) {
            addSideEffect('slack_notification', 'Notification Slack', (node) => this.customizeSlackNode(node, analysis));
        }

        if (analysis.integrations.includes('gmail')) {
            addSideEffect('gmail_send', 'Notification Gmail', (node) => this.customizeEmailNode(node, analysis));
        }

        if (plan.primary.length === 0) {
            addPrimary('set_data', 'Structurer les données', (node) => this.customizeContextNode(node, analysis));
        }

        return plan;
    }

    applyComplexBranch(builder, analysis, endpoints) {
        const validationNode = builder.addNode('if_condition', {
            stage: builder.stage,
            lane: 0,
            name: 'Contrôle qualité'
        });

        this.customizeIfNode(validationNode, analysis);
        endpoints.forEach((endpoint) => {
            builder.connect(endpoint.node, validationNode, endpoint.outputIndex ?? 0, 0);
        });
        builder.advanceStage();

        const successNode = builder.addNode('set_data', {
            stage: builder.stage,
            lane: 0,
            name: 'Marquer succès'
        });
        this.customizeSuccessNode(successNode, analysis);
        builder.connect(validationNode, successNode, 0, 0);

        const remediationNode = builder.addNode('error_handler', {
            stage: builder.stage,
            lane: 1,
            name: 'Remédiation'
        });
        this.customizeErrorHandler(remediationNode, analysis);
        builder.connect(validationNode, remediationNode, 1, 0);
        builder.advanceStage();

        const mergeNode = builder.addNode('merge_node', {
            stage: builder.stage,
            lane: 0,
            name: 'Fusionner branches'
        });
        builder.connect(successNode, mergeNode, 0, 0);
        builder.connect(remediationNode, mergeNode, 0, 1);
        builder.advanceStage();

        return builder.wrap(mergeNode);
    }

    applyPostProcessing(builder, analysis, endpoints) {
        let current = endpoints;

        if (analysis.frequency === 'temps-réel') {
            const waitNode = builder.addNode('wait_node', {
                stage: builder.stage,
                name: 'Réguler les appels'
            });
            current = builder.chain(current, waitNode);
            builder.advanceStage();
        }

        if (analysis.trigger === 'webhook' || analysis.trigger === 'form') {
            const responseNode = builder.addNode('response_node', {
                stage: builder.stage,
                name: 'Réponse finale'
            });
            this.customizeResponseNode(responseNode, analysis);
            current = builder.chain(current, responseNode);
            builder.advanceStage();
        }

        return current;
    }

    customizeContextNode(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.assignments = {
            assignments: [
                {
                    id: 'use_case',
                    name: 'use_case',
                    value: analysis.use_case,
                    type: 'string'
                },
                {
                    id: 'workflow_type',
                    name: 'workflow_type',
                    value: analysis.type,
                    type: 'string'
                },
                {
                    id: 'complexity',
                    name: 'complexity',
                    value: analysis.complexity,
                    type: 'string'
                },
                {
                    id: 'generated_at',
                    name: 'generated_at',
                    value: '{{ $now.toISO() }}',
                    type: 'string'
                }
            ]
        };
    }

    customizeSplitNode(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.batchSize = analysis.complexity === 'complex' ? 10 : 50;
        node.parameters.options = node.parameters.options || {};
        node.parameters.options.continueAtLastPosition = true;
    }

    customizeEmailNode(node, analysis) {
        node.parameters = node.parameters || {};
        const description = analysis.description || 'Notification Synoptia';

        const subjectMap = {
            quotidien: 'Rapport quotidien Synoptia - {{ $now.format("DD/MM/YYYY") }}',
            hebdomadaire: 'Rapport hebdomadaire Synoptia - Semaine {{ $now.format("WW") }}',
            mensuel: 'Rapport mensuel Synoptia - {{ $now.format("MMMM YYYY") }}'
        };

        node.parameters.subject = subjectMap[analysis.frequency] || `Synoptia - ${description}`;
        node.parameters.message = `Bonjour,\n\n${description}.\n\nCas d'usage: ${analysis.use_case}.\nType: ${analysis.type}.\nComplexité: ${analysis.complexity}.\n\n— Synoptia Automations`;
    }

    customizeSlackNode(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.text = `🤖 *Synoptia*: ${analysis.description}\nCas d'usage: ${analysis.use_case}\nComplexité: ${analysis.complexity}`;
    }

    customizeSheetsNode(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.sheetName = `Synoptia - ${analysis.use_case}`;
        node.parameters.columnNames = 'Horodatage,Statut,Message,Source';
    }

    customizeFunctionNode(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.functionCode = this.generateProcessingCode(analysis);
    }

    customizeHttpNode(node, analysis) {
        node.parameters = node.parameters || {};

        if (analysis.type === 'sync') {
            node.parameters.url = 'https://api.synoptia.fr/sync';
        } else if (analysis.type === 'notification') {
            node.parameters.url = 'https://api.synoptia.fr/notify';
        }

        node.parameters.method = analysis.actions.includes('http_get') ? 'GET' : 'POST';
    }

    customizeDatabaseNode(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.table = this.slugify(`${analysis.type}_events`).replace(/-/g, '_');
        node.parameters.columns = {
            columns: [
                { name: 'use_case', value: `='${analysis.use_case.replace(/'/g, "''")}'` },
                { name: 'payload', value: '={{ JSON.stringify($json) }}' },
                { name: 'created_at', value: '={{ $now.toISO() }}' }
            ]
        };
    }

    customizeFileNode(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.fileName = `{{ $json.fileName || '${this.slugify(analysis.use_case)}.json' }}`;
        node.parameters.content = `{{ JSON.stringify($json, null, 2) }}`;
    }

    customizeIfNode(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.conditions = node.parameters.conditions || {};
        node.parameters.conditions.conditions = [
            {
                id: 'status-check',
                leftValue: '{{ $json.status || $json.state || $json.success }}',
                rightValue: 'success',
                operator: {
                    type: 'string',
                    operation: 'equals'
                }
            }
        ];

        if (analysis.actions.includes('http_request')) {
            node.parameters.conditions.conditions.push({
                id: 'response-code',
                leftValue: '{{ $json.responseCode || $json.statusCode }}',
                rightValue: '200',
                operator: {
                    type: 'number',
                    operation: 'largerEqual'
                }
            });
        }
    }

    customizeSuccessNode(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.assignments = {
            assignments: [
                {
                    id: 'status',
                    name: 'status',
                    value: 'success',
                    type: 'string'
                },
                {
                    id: 'validated',
                    name: 'validated',
                    value: 'true',
                    type: 'boolean'
                },
                {
                    id: 'validated_at',
                    name: 'validated_at',
                    value: '{{ $now.toISO() }}',
                    type: 'string'
                }
            ]
        };
    }

    customizeErrorHandler(node, analysis) {
        node.parameters = node.parameters || {};
        node.parameters.functionCode = `return items.map(item => {\n    const data = item.json;\n\n    const enriched = {\n        ...data,\n        handled: true,\n        handledAt: new Date().toISOString(),\n        workflowType: '${analysis.type}',\n        useCase: '${analysis.use_case.replace(/'/g, "''")}',\n        severity: data.severity || '${analysis.complexity === 'complex' ? 'high' : 'medium'}'\n    };\n\n    console.warn('Synoptia - Remédiation engagée', enriched);\n    return { json: enriched };\n});`;
    }

    customizeResponseNode(node, analysis) {
        node.parameters = node.parameters || {};
        const body = {
            status: 'success',
            message: `Automatisation Synoptia finalisée pour ${analysis.use_case}`,
            complexity: analysis.complexity,
            type: analysis.type,
            timestamp: '{{ $now.toISO() }}'
        };
        node.parameters.responseBody = JSON.stringify(body);
    }

    generateProcessingCode(analysis) {
        const specificProcessing = this.generateSpecificProcessing(analysis);

        return `// Traitement spécialisé Synoptia\n// Cas d'usage: ${analysis.use_case}\n// Type: ${analysis.type}\n\nreturn items.map(item => {\n    const data = item.json || {};\n\n    const processedData = {\n        ...data,\n        processed: true,\n        processedAt: new Date().toISOString(),\n        complexity: '${analysis.complexity}',\n        workflowType: '${analysis.type}'\n    };\n\n${specificProcessing}\n\n    return { json: processedData };\n});`;
    }

    generateSpecificProcessing(analysis) {
        switch (analysis.type) {
            case 'email':
                return `    processedData.subject = processedData.subject || 'Notification Synoptia';\n    processedData.emailValid = processedData.email ? processedData.email.includes('@') : false;`;
            case 'sync':
                return `    processedData.syncId = processedData.syncId || $now.toUnix();\n    processedData.lastSync = new Date().toISOString();`;
            case 'notification':
                return `    processedData.priority = processedData.priority || (processedData.urgent ? 'high' : 'normal');\n    processedData.channel = processedData.channel || 'email';`;
            case 'data-processing':
                return `    processedData.hash = $crypto.sha256(JSON.stringify(processedData));`;
            default:
                return `    processedData.processedBy = 'synoptia-workflow-builder';`;
        }
    }

    generateWorkflowName(analysis) {
        const prefixes = {
            email: 'Email Auto',
            notification: 'Notification',
            'data-processing': 'Traitement Données',
            sync: 'Synchronisation',
            form: 'Collecte Formulaire',
            file: 'Gestion Fichiers',
            other: 'Workflow'
        };

        const prefix = prefixes[analysis.type] || 'Workflow';
        const useCase = this.slugifyReadable(analysis.use_case);
        const date = new Date().toLocaleDateString('fr-FR');

        return `${prefix} - ${useCase} (${date})`;
    }

    generateTags(analysis) {
        const baseTags = new Set(['synoptia', 'auto-generated']);
        baseTags.add(analysis.type);
        baseTags.add(analysis.complexity);

        analysis.integrations.forEach((integration) => {
            baseTags.add(this.slugify(integration));
        });

        return Array.from(baseTags);
    }

    slugify(value) {
        return (value || 'synoptia')
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .substring(0, 50) || 'synoptia';
    }

    slugifyReadable(value) {
        return (value || 'Synoptia')
            .toString()
            .replace(/[\n\r]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .slice(0, 5)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ') || 'Synoptia';
    }

    generateId() {
        return Math.random().toString(36).slice(2, 11);
    }
}

module.exports = WorkflowGenerator;
