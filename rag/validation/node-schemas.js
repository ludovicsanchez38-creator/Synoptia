/**
 * Node Schemas & Validation Rules
 * Définit les schémas de validation pour les nodes n8n les plus courants
 */

// Schémas des nodes n8n les plus utilisés
const NODE_SCHEMAS = {
  // TRIGGERS
  'n8n-nodes-base.webhook': {
    category: 'trigger',
    requiredParams: ['httpMethod', 'path'],
    optionalParams: ['authentication', 'responseMode', 'responseData'],
    credentialTypes: ['httpHeaderAuth', 'httpBasicAuth'],
    description: 'Webhook Trigger - receives HTTP requests'
  },

  'n8n-nodes-base.cronTrigger': {
    category: 'trigger',
    requiredParams: ['triggerTimes'],
    optionalParams: ['timezone'],
    credentialTypes: [],
    description: 'Cron Trigger - time-based execution'
  },

  'n8n-nodes-base.manualTrigger': {
    category: 'trigger',
    requiredParams: [],
    optionalParams: [],
    credentialTypes: [],
    description: 'Manual Trigger - manual workflow execution'
  },

  // CORE NODES
  'n8n-nodes-base.httpRequest': {
    category: 'action',
    requiredParams: ['url', 'method'],
    optionalParams: ['authentication', 'queryParameters', 'headers', 'body', 'jsonParameters'],
    credentialTypes: ['httpHeaderAuth', 'httpBasicAuth', 'httpDigestAuth', 'oAuth2Api'],
    description: 'HTTP Request - make HTTP calls'
  },

  'n8n-nodes-base.code': {
    category: 'action',
    requiredParams: ['jsCode'],
    optionalParams: ['mode'],
    credentialTypes: [],
    description: 'Code - execute JavaScript code'
  },

  'n8n-nodes-base.set': {
    category: 'action',
    requiredParams: ['values'],
    optionalParams: ['keepOnlySet'],
    credentialTypes: [],
    description: 'Set - set/modify data'
  },

  'n8n-nodes-base.if': {
    category: 'logic',
    requiredParams: ['conditions'],
    optionalParams: [],
    credentialTypes: [],
    description: 'IF - conditional branching'
  },

  'n8n-nodes-base.switch': {
    category: 'logic',
    requiredParams: ['mode', 'rules'],
    optionalParams: ['fallbackOutput'],
    credentialTypes: [],
    description: 'Switch - multi-way branching'
  },

  'n8n-nodes-base.merge': {
    category: 'logic',
    requiredParams: ['mode'],
    optionalParams: ['joinMode', 'outputDataFrom'],
    credentialTypes: [],
    description: 'Merge - combine data from multiple inputs'
  },

  'n8n-nodes-base.splitInBatches': {
    category: 'logic',
    requiredParams: ['batchSize'],
    optionalParams: ['options'],
    credentialTypes: [],
    description: 'Split In Batches - process data in batches'
  },

  // COMMUNICATION
  'n8n-nodes-base.slack': {
    category: 'communication',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['channel', 'text', 'attachments'],
    credentialTypes: ['slackApi', 'slackOAuth2Api'],
    description: 'Slack - send messages and interact with Slack'
  },

  'n8n-nodes-base.telegram': {
    category: 'communication',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['chatId', 'text', 'replyMarkup'],
    credentialTypes: ['telegramApi'],
    description: 'Telegram - send messages via Telegram'
  },

  'n8n-nodes-base.discord': {
    category: 'communication',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['channelId', 'content'],
    credentialTypes: ['discordApi', 'discordOAuth2Api'],
    description: 'Discord - interact with Discord'
  },

  'n8n-nodes-base.gmail': {
    category: 'communication',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['to', 'subject', 'message', 'filters'],
    credentialTypes: ['gmailOAuth2'],
    description: 'Gmail - send and manage emails'
  },

  'n8n-nodes-base.sendGrid': {
    category: 'communication',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['toEmail', 'subject', 'fromEmail'],
    credentialTypes: ['sendGridApi'],
    description: 'SendGrid - email service'
  },

  // DATABASES
  'n8n-nodes-base.postgres': {
    category: 'database',
    requiredParams: ['operation'],
    optionalParams: ['query', 'table', 'columns'],
    credentialTypes: ['postgres'],
    description: 'PostgreSQL - interact with PostgreSQL database'
  },

  'n8n-nodes-base.mysql': {
    category: 'database',
    requiredParams: ['operation'],
    optionalParams: ['query', 'table'],
    credentialTypes: ['mysql'],
    description: 'MySQL - interact with MySQL database'
  },

  'n8n-nodes-base.mongodb': {
    category: 'database',
    requiredParams: ['operation', 'collection'],
    optionalParams: ['query', 'fields', 'limit'],
    credentialTypes: ['mongoDb'],
    description: 'MongoDB - interact with MongoDB database'
  },

  'n8n-nodes-base.redis': {
    category: 'database',
    requiredParams: ['operation'],
    optionalParams: ['key', 'value', 'keyType'],
    credentialTypes: ['redis'],
    description: 'Redis - interact with Redis cache'
  },

  // PRODUCTIVITY
  'n8n-nodes-base.googleSheets': {
    category: 'productivity',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['sheetId', 'range', 'dataMode'],
    credentialTypes: ['googleSheetsOAuth2Api'],
    description: 'Google Sheets - read and write spreadsheets'
  },

  'n8n-nodes-base.googleDrive': {
    category: 'productivity',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['fileId', 'name', 'driveId'],
    credentialTypes: ['googleDriveOAuth2Api'],
    description: 'Google Drive - manage files in Google Drive'
  },

  'n8n-nodes-base.notion': {
    category: 'productivity',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['databaseId', 'pageId', 'properties'],
    credentialTypes: ['notionApi'],
    description: 'Notion - interact with Notion workspace'
  },

  'n8n-nodes-base.airtable': {
    category: 'productivity',
    requiredParams: ['operation'],
    optionalParams: ['application', 'table', 'id'],
    credentialTypes: ['airtableApi'],
    description: 'Airtable - manage Airtable bases'
  },

  // CRM
  'n8n-nodes-base.hubspot': {
    category: 'crm',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['contactId', 'dealId', 'properties'],
    credentialTypes: ['hubspotApi', 'hubspotOAuth2Api'],
    description: 'HubSpot - CRM operations'
  },

  'n8n-nodes-base.salesforce': {
    category: 'crm',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['objectType', 'id', 'fields'],
    credentialTypes: ['salesforceOAuth2Api'],
    description: 'Salesforce - CRM operations'
  },

  'n8n-nodes-base.stripe': {
    category: 'payment',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['amount', 'currency', 'customerId'],
    credentialTypes: ['stripeApi'],
    description: 'Stripe - payment processing'
  },

  // PROJECT MANAGEMENT
  'n8n-nodes-base.github': {
    category: 'development',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['owner', 'repository', 'issueNumber'],
    credentialTypes: ['githubApi', 'githubOAuth2Api'],
    description: 'GitHub - interact with GitHub'
  },

  'n8n-nodes-base.trello': {
    category: 'projectManagement',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['boardId', 'listId', 'cardId'],
    credentialTypes: ['trelloApi'],
    description: 'Trello - manage Trello boards'
  },

  'n8n-nodes-base.asana': {
    category: 'projectManagement',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['projectId', 'taskId', 'workspace'],
    credentialTypes: ['asanaApi', 'asanaOAuth2Api'],
    description: 'Asana - project management'
  },

  // AI NODES
  'n8n-nodes-base.openAi': {
    category: 'ai',
    requiredParams: ['resource', 'operation'],
    optionalParams: ['model', 'prompt', 'temperature'],
    credentialTypes: ['openAiApi'],
    description: 'OpenAI - AI operations'
  }
};

/**
 * Valide les paramètres d'un node selon son schéma
 */
function validateNodeParameters(node) {
  const errors = [];
  const warnings = [];

  const schema = NODE_SCHEMAS[node.type];

  if (!schema) {
    warnings.push(`Node "${node.name}": type "${node.type}" inconnu (pas de schéma de validation)`);
    return { valid: true, errors, warnings };
  }

  // Vérifier paramètres requis
  if (schema.requiredParams && schema.requiredParams.length > 0) {
    schema.requiredParams.forEach(param => {
      if (!node.parameters || !(param in node.parameters)) {
        errors.push(`Node "${node.name}": paramètre requis "${param}" manquant`);
      } else if (node.parameters[param] === undefined || node.parameters[param] === null) {
        errors.push(`Node "${node.name}": paramètre requis "${param}" est null/undefined`);
      }
    });
  }

  // Valider certains paramètres spécifiques
  if (node.parameters) {
    // URL pour httpRequest
    if (node.type === 'n8n-nodes-base.httpRequest' && node.parameters.url) {
      try {
        new URL(node.parameters.url);
      } catch (e) {
        if (!node.parameters.url.startsWith('{{')) { // Ignore expressions
          warnings.push(`Node "${node.name}": URL "${node.parameters.url}" semble invalide`);
        }
      }
    }

    // HTTP method validation
    if (node.parameters.httpMethod || node.parameters.method) {
      const method = (node.parameters.httpMethod || node.parameters.method).toUpperCase();
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      if (!validMethods.includes(method)) {
        warnings.push(`Node "${node.name}": méthode HTTP "${method}" non standard`);
      }
    }
  }

  // Avertir si credentials probablement nécessaires
  if (schema.credentialTypes && schema.credentialTypes.length > 0) {
    if (!node.credentials || Object.keys(node.credentials).length === 0) {
      warnings.push(`Node "${node.name}": credentials probablement nécessaires (types: ${schema.credentialTypes.join(', ')})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schema
  };
}

/**
 * Récupère le schéma d'un node
 */
function getNodeSchema(nodeType) {
  return NODE_SCHEMAS[nodeType] || null;
}

/**
 * Liste tous les types de nodes supportés
 */
function getSupportedNodeTypes() {
  return Object.keys(NODE_SCHEMAS);
}

/**
 * Statistiques sur les nodes
 */
function getNodeStats() {
  const categories = {};
  Object.entries(NODE_SCHEMAS).forEach(([type, schema]) => {
    if (!categories[schema.category]) {
      categories[schema.category] = [];
    }
    categories[schema.category].push(type);
  });

  return {
    total: Object.keys(NODE_SCHEMAS).length,
    categories,
    byCategory: Object.entries(categories).map(([cat, nodes]) => ({
      category: cat,
      count: nodes.length
    }))
  };
}

module.exports = {
  NODE_SCHEMAS,
  validateNodeParameters,
  getNodeSchema,
  getSupportedNodeTypes,
  getNodeStats
};