#!/bin/bash
# Synoptia Workflow Builder - Démarrage rapide
# Usage: ./start.sh [dev|prod]

set -e

MODE="${1:-dev}"
PORT="${PORT:-3002}"

echo "🚀 Démarrage Workflow Builder en mode: $MODE"
echo "📍 Working directory: $(pwd)"

# Vérifier que node_modules existe
if [ ! -d "node_modules" ]; then
  echo "📦 Installation des dépendances..."
  npm install
fi

# Vérifier que .env existe
if [ ! -f ".env" ]; then
  echo "❌ Erreur: fichier .env manquant"
  echo "💡 Copiez .env.example vers .env et configurez vos clés"
  exit 1
fi

# Créer répertoires logs et data si nécessaire
mkdir -p logs data

# Démarrage selon le mode
case "$MODE" in
  dev|development)
    echo "🔧 Mode développement (auto-reload)"
    NODE_ENV=development PORT=$PORT node --watch server.js
    ;;

  prod|production)
    echo "⚡ Mode production"
    NODE_ENV=production PORT=$PORT node server.js
    ;;

  test)
    echo "🧪 Mode test"
    NODE_ENV=test npm test
    ;;

  *)
    echo "❌ Mode inconnu: $MODE"
    echo "Usage: $0 [dev|prod|test]"
    exit 1
    ;;
esac
