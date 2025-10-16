/**
 * Base de données des typeVersion valides pour les nodes N8N les plus courants
 * Source: Documentation N8N officielle et analyse des workflows existants
 * Dernière mise à jour: Octobre 2025
 */

/**
 * Retourne les typeVersion valides pour un node type donné
 */
function getValidTypeVersions(nodeType) {
  // Normaliser le type
  const normalizedType = nodeType.toLowerCase();

  // Core nodes (n8n-nodes-base)
  const coreNodeVersions = {
    // Triggers
    'n8n-nodes-base.cron': [1],
    'n8n-nodes-base.webhook': [1, 2],
    'n8n-nodes-base.emailreadimal': [1, 2],
    'n8n-nodes-base.emailreadimap': [1, 2],
    'n8n-nodes-base.emailtrigger': [1],
    'n8n-nodes-base.formtrigger': [1, 2],
    'n8n-nodes-base.manualtrigger': [1],
    'n8n-nodes-base.scheduletrigger': [1],
    'n8n-nodes-base.starttrigger': [1],

    // Actions
    'n8n-nodes-base.httprequest': [1, 2, 3, 4], // Version 4 is current
    'n8n-nodes-base.code': [1, 2],
    'n8n-nodes-base.function': null, // ⚠️ N'EXISTE PAS! Utiliser 'code' à la place
    'n8n-nodes-base.functionitem': null, // ⚠️ N'EXISTE PAS! Utiliser 'code' à la place
    'n8n-nodes-base.set': [1, 2, 3],
    'n8n-nodes-base.if': [1, 2],
    'n8n-nodes-base.switch': [1, 2, 3],
    'n8n-nodes-base.merge': [1, 2, 3],
    'n8n-nodes-base.respondtowebhook': [1],
    'n8n-nodes-base.noop': [1],
    'n8n-nodes-base.stopanderror': [1],

    // Communication
    'n8n-nodes-base.gmail': [1, 2],
    'n8n-nodes-base.slack': [1, 2],
    'n8n-nodes-base.telegram': [1], // ⚠️ UNIQUEMENT 1 (typeVersion 2 affiche "?")
    'n8n-nodes-base.discord': [1, 2],
    'n8n-nodes-base.sendemail': [2], // Version recommandée

    // Storage
    'n8n-nodes-base.googledrive': [3],
    'n8n-nodes-base.dropbox': [2],
    'n8n-nodes-base.awss3': [1],

    // Databases
    'n8n-nodes-base.postgres': [1, 2],
    'n8n-nodes-base.mysql': [1, 2],
    'n8n-nodes-base.mongodb': [1, 2],
    'n8n-nodes-base.redis': [1],

    // Productivity
    'n8n-nodes-base.googlesheets': [4],
    'n8n-nodes-base.notion': [1, 2],
    'n8n-nodes-base.airtable': [2],
    'n8n-nodes-base.trello': [2],

    // AI/OpenAI
    'n8n-nodes-base.openai': [1],
  };

  // LangChain nodes (@n8n/n8n-nodes-langchain)
  const langchainNodeVersions = {
    // Root nodes
    '@n8n/n8n-nodes-langchain.agent': [1, 1.1, 1.2, 1.3, 1.4, 1.5],
    '@n8n/n8n-nodes-langchain.chainllm': [1, 1.1, 1.2, 1.3],
    '@n8n/n8n-nodes-langchain.chainsummarization': [1, 1.1, 1.2],
    '@n8n/n8n-nodes-langchain.informationextractor': [1, 1.1],
    '@n8n/n8n-nodes-langchain.textclassifier': [1],
    '@n8n/n8n-nodes-langchain.code': [1],

    // Sub-nodes: LLMs
    '@n8n/n8n-nodes-langchain.lmchatopenai': [1],
    '@n8n/n8n-nodes-langchain.lmchatanthropic': [1],
    '@n8n/n8n-nodes-langchain.lmchatollorma': [1],
    '@n8n/n8n-nodes-langchain.lmchatollama': [1],
    '@n8n/n8n-nodes-langchain.lmchatgroq': [1],
    '@n8n/n8n-nodes-langchain.lmchatmistralcloud': [1],
    '@n8n/n8n-nodes-langchain.lmchatgooglegemini': [1],

    // Sub-nodes: Memory
    '@n8n/n8n-nodes-langchain.memorybufferwindow': [1],
    '@n8n/n8n-nodes-langchain.memorypostgreschat': [1],
    '@n8n/n8n-nodes-langchain.memorymongodbchat': [1],
    '@n8n/n8n-nodes-langchain.memoryredischat': [1],

    // Sub-nodes: Embeddings
    '@n8n/n8n-nodes-langchain.embeddingsopenai': [1],
    '@n8n/n8n-nodes-langchain.embeddingscohere': [1],
    '@n8n/n8n-nodes-langchain.embeddingsgooglegemini': [1],

    // Sub-nodes: Vector Stores
    '@n8n/n8n-nodes-langchain.vectorstoreqdrant': [1],
    '@n8n/n8n-nodes-langchain.vectorstoreinmemory': [1],
    '@n8n/n8n-nodes-langchain.vectorstoremongodbatlas': [1],
    '@n8n/n8n-nodes-langchain.vectorstorepinecone': [1],

    // Sub-nodes: Tools
    '@n8n/n8n-nodes-langchain.toolcalculator': [1],
    '@n8n/n8n-nodes-langchain.toolcode': [1],
    '@n8n/n8n-nodes-langchain.toolhttprequest': [1],
    '@n8n/n8n-nodes-langchain.toolworkflow': [1],

    // Sub-nodes: Document Loaders
    '@n8n/n8n-nodes-langchain.documentdefaultdataloader': [1],

    // Sub-nodes: Text Splitters
    '@n8n/n8n-nodes-langchain.textsplitterrecursivecharactertextsplitter': [1],

    // Sub-nodes: Output Parsers
    '@n8n/n8n-nodes-langchain.outputparserstructured': [1],
  };

  // Lookup dans core nodes
  if (coreNodeVersions[normalizedType] !== undefined) {
    return coreNodeVersions[normalizedType];
  }

  // Lookup dans langchain nodes
  if (langchainNodeVersions[normalizedType.toLowerCase()] !== undefined) {
    return langchainNodeVersions[normalizedType.toLowerCase()];
  }

  // Node inconnu - retourner null (sera validé par pattern matching)
  return undefined;
}

/**
 * Valide si un typeVersion est correct pour un node type
 * @returns {Object} { valid: boolean, suggestedVersion: number|null, reason: string }
 */
function validateTypeVersion(nodeType, typeVersion) {
  const validVersions = getValidTypeVersions(nodeType);

  // Node inexistant (blacklisted)
  if (validVersions === null) {
    return {
      valid: false,
      suggestedVersion: null,
      reason: `Le node type "${nodeType}" n'existe pas dans n8n`,
      isBlacklisted: true
    };
  }

  // Node inconnu (pas dans notre base) - accepter par pattern matching
  if (validVersions === undefined) {
    return {
      valid: true,
      suggestedVersion: null,
      reason: 'Node type non listé - validation par pattern matching',
      isUnknown: true
    };
  }

  // Vérifier si le typeVersion fourni est valide
  const isValid = validVersions.includes(typeVersion);

  if (isValid) {
    return {
      valid: true,
      suggestedVersion: typeVersion,
      reason: 'TypeVersion valide'
    };
  }

  // TypeVersion invalide - suggérer la version la plus récente
  const latestVersion = Math.max(...validVersions);

  return {
    valid: false,
    suggestedVersion: latestVersion,
    reason: `TypeVersion ${typeVersion} n'existe pas pour ce node. Versions valides: ${validVersions.join(', ')}. Version recommandée: ${latestVersion}`
  };
}

/**
 * Liste des nodes qui n'existent PAS dans n8n (blacklist)
 */
const BLACKLISTED_NODES = [
  // Nodes inventés fréquemment par les LLMs
  'n8n-nodes-base.function',
  'n8n-nodes-base.functionitem',
  'n8n-nodes-base.movebinarydata',
  'n8n-nodes-base.converttofile',
  'n8n-nodes-base.binarydatamanager',
  'n8n-nodes-base.veo',
  'n8n-nodes-base.linkedin', // N8N n'a pas de node LinkedIn natif
  'n8n-nodes-base.youtube', // Utiliser HTTP Request vers YouTube API
  'n8n-nodes-base.twitter', // Renommé en X, utilisé HTTP Request
  'n8n-nodes-base.facebook', // Utiliser HTTP Request vers Graph API
  'n8n-nodes-base.instagram', // Utiliser HTTP Request vers Graph API
];

/**
 * Retourne l'alternative recommandée pour un node blacklisté
 */
function getAlternativeForBlacklistedNode(nodeType) {
  const normalizedType = nodeType.toLowerCase();

  const alternatives = {
    'n8n-nodes-base.function': {
      alternative: 'n8n-nodes-base.code',
      reason: 'Le node "function" n\'existe pas. Utiliser "code" à la place.'
    },
    'n8n-nodes-base.functionitem': {
      alternative: 'n8n-nodes-base.code',
      reason: 'Le node "functionItem" n\'existe pas. Utiliser "code" à la place.'
    },
    'n8n-nodes-base.movebinarydata': {
      alternative: 'n8n-nodes-base.code',
      reason: 'Le node "moveBinaryData" n\'existe pas. Utiliser "code" avec JavaScript pour manipuler les données binaires.'
    },
    'n8n-nodes-base.converttofile': {
      alternative: 'n8n-nodes-base.code',
      reason: 'Le node "convertToFile" n\'existe pas. Utiliser "code" avec Buffer.from() pour convertir.'
    },
    'n8n-nodes-base.binarydatamanager': {
      alternative: 'n8n-nodes-base.code',
      reason: 'Le node "binaryDataManager" n\'existe pas. Utiliser "code" pour gérer les données binaires.'
    },
    'n8n-nodes-base.linkedin': {
      alternative: 'n8n-nodes-base.httpRequest',
      reason: 'N8N n\'a pas de node LinkedIn natif. Utiliser "httpRequest" avec LinkedIn API.'
    },
    'n8n-nodes-base.youtube': {
      alternative: 'n8n-nodes-base.httpRequest',
      reason: 'N8N n\'a pas de node YouTube natif. Utiliser "httpRequest" avec YouTube Data API v3.'
    },
    'n8n-nodes-base.twitter': {
      alternative: 'n8n-nodes-base.httpRequest',
      reason: 'N8N n\'a pas de node Twitter/X natif. Utiliser "httpRequest" avec X API v2.'
    },
    'n8n-nodes-base.veo': {
      alternative: 'n8n-nodes-base.httpRequest',
      reason: 'Le node "veo" n\'existe pas. Utiliser "httpRequest" pour appeler l\'API Veo.'
    }
  };

  return alternatives[normalizedType] || {
    alternative: 'n8n-nodes-base.httpRequest',
    reason: `Le node "${nodeType}" n'existe pas. Utiliser "httpRequest" pour intégrer cette API externe.`
  };
}

/**
 * Vérifie si un node est blacklisté
 */
function isBlacklisted(nodeType) {
  return BLACKLISTED_NODES.includes(nodeType.toLowerCase());
}

module.exports = {
  getValidTypeVersions,
  validateTypeVersion,
  isBlacklisted,
  getAlternativeForBlacklistedNode,
  BLACKLISTED_NODES
};
