# 🧪 Prompts de Test - Workflows LangChain

**Date** : 11 octobre 2025
**Objectif** : Re-générer les 4 workflows cassés avec les nouveaux prompts

---

## 📝 COMMENT TESTER

### Méthode 1 : Via curl

```bash
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"request": "VOTRE_PROMPT_ICI"}' \
  -o /tmp/test-result.json
```

### Méthode 2 : Via l'interface web (si disponible)

Copier-coller les prompts dans l'interface de génération.

---

## 🤖 TEST 1 - Chatbot Telegram avec Mémoire

### Prompt

```
Créer un chatbot Telegram simple avec mémoire conversationnelle.

Le bot doit :
- Recevoir les messages des utilisateurs via un webhook Telegram
- Utiliser GPT-4 pour générer des réponses contextuelles
- Stocker l'historique des conversations dans une mémoire buffer
- Répondre aux messages avec le contexte des échanges précédents

Le workflow doit inclure :
- Un trigger Telegram pour recevoir les messages
- Un AI Agent pour orchestrer la conversation
- Un modèle OpenAI (GPT-4) pour générer les réponses
- Une mémoire buffer pour maintenir le contexte
- Une réponse vers Telegram
```

### Fichier de sortie

```bash
/tmp/test1-chatbot-telegram.json
```

---

## 🔍 TEST 2 - RAG avec Qdrant (Retrieval Augmented Generation)

### Prompt

```
Créer un système RAG (Retrieval Augmented Generation) pour répondre aux questions des utilisateurs en se basant sur une base documentaire.

Le système doit :
- Recevoir une question utilisateur via webhook
- Rechercher dans une base vectorielle Qdrant les documents pertinents
- Utiliser GPT-4 pour générer une réponse enrichie du contexte trouvé
- Retourner la réponse avec les sources

Le workflow doit inclure :
- Un webhook pour recevoir la question
- Un AI Agent pour orchestrer le RAG
- Un vector store Qdrant pour la recherche sémantique
- Des embeddings OpenAI pour vectoriser la question
- Un modèle OpenAI (GPT-4) pour la génération
- Une mémoire pour maintenir le contexte de la conversation
- Une réponse structurée avec les sources
```

### Fichier de sortie

```bash
/tmp/test2-rag-qdrant.json
```

---

## 📋 TEST 3 - RGPD Information Extractor

### Prompt

```
Créer un extracteur d'informations RGPD pour analyser automatiquement les demandes clients et extraire les données personnelles mentionnées.

Le système doit :
- Recevoir un email ou message contenant une demande client
- Extraire automatiquement les informations RGPD (nom, email, téléphone, adresse, etc.)
- Classifier le type de demande (accès, rectification, suppression, etc.)
- Structurer les données extraites dans un format JSON
- Enregistrer dans une base de données ou envoyer vers un CRM

Le workflow doit inclure :
- Un trigger (webhook ou email)
- Un Information Extractor LangChain pour extraire les données
- Un Text Classifier LangChain pour classifier la demande
- Un modèle OpenAI (GPT-4) pour l'analyse
- Un node pour structurer et stocker les résultats
```

### Fichier de sortie

```bash
/tmp/test3-rgpd-extractor.json
```

---

## 📰 TEST 4 - Blog Content Ingestion & Summarization

### Prompt

```
Créer un système d'ingestion et de résumé automatique d'articles de blog pour alimenter une newsletter.

Le système doit :
- Récupérer régulièrement de nouveaux articles depuis un flux RSS ou une API
- Extraire le contenu texte de chaque article
- Générer un résumé concis avec GPT-4
- Classifier le contenu par thématique (tech, business, etc.)
- Stocker les résumés dans une base vectorielle Qdrant pour recherche future
- Envoyer un email avec les meilleurs articles de la semaine

Le workflow doit inclure :
- Un trigger schedule (cron) ou webhook
- Un node pour récupérer les articles (HTTP Request ou RSS)
- Un AI Agent pour orchestrer le traitement
- Un Summarization Chain pour résumer les articles
- Un Text Classifier pour classifier par thématique
- Un vector store Qdrant pour indexer les résumés
- Un modèle OpenAI (GPT-4)
- Une mémoire pour le contexte
- Un node Email pour envoyer la newsletter
```

### Fichier de sortie

```bash
/tmp/test4-blog-ingestion.json
```

---

## ✅ VALIDATION

### Checklist pour chaque workflow généré

Pour valider qu'un workflow est correct, vérifier :

#### 1. Sub-nodes ont parameters vides
```bash
jq '.workflow.nodes[] | select(.type | contains("langchain")) | {name: .name, type: .type, parameters: .parameters}' test.json
```

**Attendu** : Tous les sub-nodes doivent avoir `"parameters": {}`

#### 2. Root node existe
```bash
jq '.workflow.nodes[] | select(.type | contains("agent") or contains("chain"))' test.json
```

**Attendu** : Au moins un root node (agent ou chain)

#### 3. Connexions spéciales présentes
```bash
jq '.workflow.connections' test.json | grep -E "(ai_languageModel|ai_memory|ai_vectorStore|ai_embedding)"
```

**Attendu** : Connexions avec types `ai_*` vers le root node

#### 4. Pas de connexions "main" entre sub-nodes
```bash
jq '.workflow.connections | to_entries[] | select(.key | contains("OpenAI") or contains("Memory") or contains("Qdrant")) | .value' test.json
```

**Attendu** : Sub-nodes ne doivent PAS avoir de connexions "main" entre eux

---

## 🔬 SCRIPT DE TEST AUTOMATIQUE

```bash
#!/bin/bash

# Script pour tester les 4 workflows

PROMPTS=(
  "Créer un chatbot Telegram simple avec mémoire conversationnelle..."
  "Créer un système RAG (Retrieval Augmented Generation)..."
  "Créer un extracteur d'informations RGPD..."
  "Créer un système d'ingestion et de résumé automatique d'articles de blog..."
)

OUTPUTS=(
  "/tmp/test1-chatbot-telegram.json"
  "/tmp/test2-rag-qdrant.json"
  "/tmp/test3-rgpd-extractor.json"
  "/tmp/test4-blog-ingestion.json"
)

for i in "${!PROMPTS[@]}"; do
  echo "🧪 Test $((i+1))/4 - ${OUTPUTS[$i]}"

  curl -X POST http://localhost:3002/api/generate \
    -H "Content-Type: application/json" \
    -d "{\"request\": \"${PROMPTS[$i]}\"}" \
    -o "${OUTPUTS[$i]}"

  # Validation basique
  if jq -e '.workflow' "${OUTPUTS[$i]}" > /dev/null 2>&1; then
    echo "✅ Workflow généré"

    # Vérifier sub-nodes
    SUBNODE_ERRORS=$(jq '[.workflow.nodes[] | select(.type | contains("langchain")) | select(.type | contains("agent") | not) | select(.type | contains("chain") | not) | select(.parameters != {})] | length' "${OUTPUTS[$i]}")

    if [ "$SUBNODE_ERRORS" -eq 0 ]; then
      echo "✅ Sub-nodes parameters corrects"
    else
      echo "❌ $SUBNODE_ERRORS sub-nodes avec parameters incorrects"
    fi
  else
    echo "❌ Erreur de génération"
  fi

  echo ""
  sleep 5
done

echo "✅ Tests terminés"
```

---

## 📊 RÉSULTATS ATTENDUS

| Workflow | Sub-nodes | Root node | Connexions ai_* | Status |
|----------|-----------|-----------|-----------------|--------|
| Chatbot Telegram | 2-3 | AI Agent | ✅ | À tester |
| RAG Qdrant | 4-5 | AI Agent | ✅ | À tester |
| RGPD Extractor | 2-3 | Information Extractor | ✅ | À tester |
| Blog Ingestion | 4-6 | Summarization Chain | ✅ | À tester |

---

## 🚀 APRÈS LES TESTS

### Import dans N8N

```bash
# Pour chaque workflow qui passe la validation
jq '.workflow | .active = false | .name = (.name + " (Test)")' test.json | \
  docker exec -i n8n-subpath-n8n-1 n8n import:workflow --input=-
```

### Vérification visuelle

1. Ouvrir N8N : https://n8n.synoptia.fr
2. Vérifier que les nodes s'affichent correctement (pas de "?")
3. Vérifier les connexions entre nodes
4. Configurer les credentials (OpenAI, Telegram, etc.)
5. Tester l'exécution

---

**Date de création** : 11 octobre 2025
**Dernière mise à jour** : 11 octobre 2025 14h00
