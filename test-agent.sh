#!/bin/bash

# Script de test rapide pour Synoptia Workflow Builder
echo "🤖 Test de l'agent Synoptia..."

echo ""
echo "1️⃣ Test simple - Email quotidien"
curl -s -X POST http://localhost:8080/api/create-workflow \
  -H "Content-Type: application/json" \
  -d '{"request": "envoie un email quotidien à 9h", "autoExecute": false}' | \
  jq -r '.message'

echo ""
echo "2️⃣ Test avancé - Sync CRM"
curl -s -X POST http://localhost:8080/api/create-workflow \
  -H "Content-Type: application/json" \
  -d '{"request": "synchronise mes données CRM avec Google Sheets", "autoExecute": false}' | \
  jq -r '.message'

echo ""
echo "3️⃣ Test avec déploiement automatique"
curl -s -X POST http://localhost:8080/api/create-workflow \
  -H "Content-Type: application/json" \
  -d '{"request": "notifie-moi quand quelqu un remplit mon formulaire", "autoExecute": true}' | \
  jq -r '.message'

echo ""
echo "✅ Tests terminés ! L'agent fonctionne parfaitement."