/**
 * Point d'entrée principal pour Synoptia Workflow Builder
 */

require('dotenv').config();
const MCPServer = require('./mcp-server');

// Vérifier la configuration
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:', missingVars.join(', '));
    console.error('💡 Créez un fichier .env basé sur .env.example');
    process.exit(1);
}

// Configuration optionnelle n8n
if (!process.env.N8N_API_URL || !process.env.N8N_API_KEY) {
    console.warn('⚠️ Configuration n8n manquante. Mode test uniquement.');
    console.warn('💡 Ajoutez N8N_API_URL et N8N_API_KEY pour le déploiement automatique.');
}

// Démarrer le serveur
const server = new MCPServer();

// Gestion des erreurs
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non gérée:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesse rejetée:', reason);
});

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt de Synoptia Workflow Builder...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Arrêt de Synoptia Workflow Builder...');
    process.exit(0);
});

// Démarrage
console.log('🚀 Démarrage de Synoptia Workflow Builder...');
server.start();