#!/bin/bash

# Script d'orchestration pour mise à jour complète du RAG
# 1. Scrape tous les nodes n8n
# 2. Ingère dans Qdrant

set -e

echo "🚀 MISE À JOUR COMPLÈTE DU RAG N8N"
echo "=================================="
echo ""

# Vérifier dépendances
echo "📦 Vérification des dépendances..."
cd /home/ludo/synoptia-workflow-builder

if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules manquant, installation..."
    npm install
fi

# Vérifier services
echo ""
echo "🔍 Vérification des services..."

# Qdrant
if ! curl -s http://localhost:6333/health > /dev/null; then
    echo "❌ Qdrant n'est pas accessible sur http://localhost:6333"
    echo "   Démarrez Qdrant avec: docker compose up -d"
    exit 1
fi
echo "✅ Qdrant OK"

# Redis
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis n'est pas accessible"
    echo "   Démarrez Redis avec: docker compose up -d"
    exit 1
fi
echo "✅ Redis OK"

# OpenAI API Key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY non défini dans .env"
    exit 1
fi
echo "✅ OpenAI API Key OK"

echo ""
echo "=================================="
echo "ÉTAPE 1/2: SCRAPING DES NODES N8N"
echo "=================================="
echo ""

node scripts/scrape-all-n8n-nodes.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Échec du scraping"
    exit 1
fi

echo ""
echo "=================================="
echo "ÉTAPE 2/2: INGESTION DANS QDRANT"
echo "=================================="
echo ""

node scripts/ingest-scraped-nodes.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Échec de l'ingestion"
    exit 1
fi

echo ""
echo "=================================="
echo "✅ MISE À JOUR COMPLÈTE TERMINÉE !"
echo "=================================="
echo ""
echo "Vérifiez avec: npm run rag:stats"
echo ""
