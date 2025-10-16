# 🚀 START - Prochaine Session

**Date de création** : 12 Octobre 2025 - 12h20
**Dernière session** : Correction Supervisor + RAG enrichment
**Statut système** : ✅ Fonctionnel avec limitations

---

## 📊 ÉTAT ACTUEL DU SYSTÈME

### ✅ Ce qui fonctionne

**Génération Workflows AI Agent** :
- ✅ Taux de succès : **100%** (1-2 tentatives)
- ✅ Performance : **-40% temps, -41% coût** vs avant
- ✅ Validation Supervisor : Pattern matching prioritaire
- ✅ Types corrects : `@n8n/n8n-nodes-langchain.*`
- ✅ 0 nodes inventés

**Meilleur résultat enregistré** :
```
Prompt: "Créer un chatbot simple avec AI Agent et OpenAI GPT-4o-mini avec mémoire"
⏱️ Durée: 173s (2min 53s)
💰 Coût: 10.44c€
✅ Approuvé 1ère tentative
✅ 6 nodes dont 3 LangChain corrects
```

**Agents corrects** :
- ✅ Supervisor : Pattern matching prioritaire (lignes 386-431)
- ✅ Planning : Règles parameters correctes (lignes 317-329)
- ✅ Generator : Règles parameters correctes (lignes 717-732)

**RAG enrichi** :
- ✅ 2563 embeddings (+4 vs avant)
- ✅ 4 documents de référence LangChain (haute priorité)
- ✅ 33 types documentés explicitement

### ⚠️ Limitations connues

**1. Feedback Supervisor incomplet** (NON BLOQUANT mais amélioration requise)
- Symptôme : Suggère `n8n-nodes-langchain.agent` au lieu de `@n8n/n8n-nodes-langchain.agent`
- Impact : Cause parfois 2ème tentative inutile
- Fréquence : ~30% des cas
- Coût : +10-12c€ par retry

**2. RAG Documentation incomplète**
- 708/709 documents sans préfixe `@n8n/` complet
- Workaround actif : 4 docs haute priorité compensent

**3. Distinction CLUSTER vs STANDALONE non gérée**
- Risque théorique de rejet de standalone nodes
- Non observé en pratique pour l'instant

---

## 🚨 PROBLÈMES À CORRIGER (PAR PRIORITÉ)

### 🔴 PRIORITÉ HAUTE (30 min)

#### 1. Fix Feedback Supervisor - Ajouter préfixe `@n8n/`

**Fichier** : `rag/pipeline/supervisor-agent.js`

**Problème** :
```javascript
// ACTUELLEMENT (INCORRECT)
suggestedFix: "Remplacer par n8n-nodes-langchain.agent"

// DEVRAIT ÊTRE
suggestedFix: "Remplacer par @n8n/n8n-nodes-langchain.agent"
```

**Localisation** :
- Chercher dans `buildSupervisionPrompt()` la section qui génère les `suggestedFix`
- Probablement dans le prompt envoyé à Claude (section `inventedNodes`)

**Solution** :
```javascript
// Ajouter dans le prompt du Supervisor :
"⚠️ IMPORTANT pour les alternatives suggérées :
- Si le node est LangChain, TOUJOURS inclure le préfixe complet @n8n/n8n-nodes-langchain.
- Exemple CORRECT: '@n8n/n8n-nodes-langchain.agent'
- Exemple INCORRECT: 'n8n-nodes-langchain.agent' (manque @n8n/)"
```

**Test après fix** :
```bash
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"request": "Créer un chatbot avec AI Agent"}' | \
  jq '.workflow.nodes[] | select(.type | contains("langchain")) | .type'

# Vérifier que tous les types commencent par @n8n/
```

**Critère de succès** : 1 seule tentative au lieu de 2

---

### 🟡 PRIORITÉ MOYENNE (1-2h)

#### 2. Audit RAG vs Documentation Web

**Objectif** : Comparer le RAG avec la doc officielle N8N pour identifier les écarts

**Script à créer** : `scripts/audit-rag-vs-web.js`

**Étapes** :
1. Prendre 10 échantillons de types LangChain
2. Chercher dans le RAG les types
3. Comparer avec https://docs.n8n.io/integrations/builtin/cluster-nodes/
4. Générer rapport avec écarts

**Échantillons suggérés** :
```javascript
const samples = [
  'AI Agent',
  'OpenAI Chat Model',
  'Simple Memory',
  'Anthropic Chat Model',
  'Google Gemini Chat Model',
  'Embeddings OpenAI',
  'Qdrant Vector Store',
  'Summarization Chain',
  'Calculator Tool',
  'Output Parser Structured'
];
```

**Rapport attendu** :
```markdown
# Audit RAG vs Web

## Échantillon 1: AI Agent
- ✅ Type correct dans RAG: @n8n/n8n-nodes-langchain.agent
- ✅ Type correct sur web: @n8n/n8n-nodes-langchain.agent
- ✅ Match: OUI

## Échantillon 2: OpenAI Chat Model
- ⚠️ Type dans RAG: n8n-nodes-langchain.lmChatOpenAi (sans @n8n/)
- ✅ Type correct: @n8n/n8n-nodes-langchain.lmChatOpenAi
- ❌ Match: NON
```

#### 3. Enrichir RAG avec tous les types LangChain

**Basé sur** : `scripts/fix-langchain-types-in-rag.js` existant

**Objectif** : Passer de 4 docs à ~60 docs de référence

**Types à ajouter** (liste complète dans le script) :
- Root nodes : 4 types
- LLM : 10+ types (OpenAI, Anthropic, Google, Mistral, Ollama, etc.)
- Memory : 8 types
- Embeddings : 8 types
- Vector Stores : 8 types
- Tools : 6 types
- Output Parsers : 4 types
- Document Loaders : 4 types
- Text Splitters : 4 types

**Commande** :
```bash
node scripts/enrich-rag-langchain-complete.js
```

**Résultat attendu** :
```
✅ 60 documents injectés
Total embeddings: 2623 (2563 + 60)
```

---

### 🟢 PRIORITÉ BASSE (2-3h - peut attendre)

#### 4. Gérer distinction CLUSTER vs STANDALONE

**Contexte** :
```
CLUSTER (avec @n8n/) :
- Format: @n8n/n8n-nodes-langchain.*
- Architecture: Root + Sub-nodes
- Sub-nodes parameters: {} ou {options: {continueOnFail}}

STANDALONE (sans @n8n/) :
- Format: n8n-nodes-langchain.*
- Fonctionnement: Indépendant
- Parameters: Complets (model, temperature, etc.)
```

**Fichier** : `utils/workflow-validator.js`

**Fonction à modifier** : `fixLangChainTypes()`

**Logique requise** :
```javascript
function detectLangChainArchitecture(node) {
  // Liste des standalone nodes connus
  const standaloneNodes = [
    'embeddingsopenai',
    'vectorstoreqdrant',
    'textsplitterrecursivecharactertextsplitter',
    'documentdefaultdataloader'
  ];

  const nodeName = node.type.toLowerCase().replace(/^.*langchain\./, '');
  return standaloneNodes.includes(nodeName) ? 'standalone' : 'cluster';
}

function fixLangChainTypes(workflow) {
  workflow.nodes.forEach(node => {
    if (node.type.includes('langchain')) {
      const arch = detectLangChainArchitecture(node);

      if (arch === 'cluster' && !node.type.startsWith('@n8n/')) {
        // Ajouter @n8n/ pour cluster nodes
        node.type = `@n8n/${node.type}`;
      }
      // Ne rien faire pour standalone (garder sans @n8n/)
    }
  });
}
```

#### 5. Améliorer error handling scoring

**Fichier** : `utils/workflow-validator.js`

**Fonction** : `testErrorHandling()`

**Actuellement détecte** :
- ✅ `continueOnFail: true`

**Devrait détecter** :
- ⏳ IF nodes (branches conditionnelles)
- ⏳ Error Trigger (capture erreurs)
- ⏳ Stop and Error (gestion erreurs explicite)
- ⏳ Try/Catch patterns (dans Code nodes)

**Référence** : `TODO_LUNDI_SCORING.md`

---

## 📚 CONTEXTE IMPORTANT

### Types LangChain Corrects (Référence)

**ROOT NODES** :
```
@n8n/n8n-nodes-langchain.agent
@n8n/n8n-nodes-langchain.chainLlm
@n8n/n8n-nodes-langchain.chainSummarization
@n8n/n8n-nodes-langchain.vectorStoreTool
```

**SUB-NODES (exemples les plus utilisés)** :
```
@n8n/n8n-nodes-langchain.lmChatOpenAi (OpenAI Chat Model)
@n8n/n8n-nodes-langchain.lmChatAnthropic (Anthropic Chat Model)
@n8n/n8n-nodes-langchain.memoryBufferWindow (Simple Memory)
@n8n/n8n-nodes-langchain.memoryPostgresChat (Postgres Chat Memory)
@n8n/n8n-nodes-langchain.embeddingsOpenAi (OpenAI Embeddings)
@n8n/n8n-nodes-langchain.vectorStoreQdrant (Qdrant Vector Store)
```

### Règles Parameters (Rappel)

**Root Nodes** :
- ✅ PEUVENT avoir parameters fonctionnels
- Exemple : `{ promptType: "define", text: "...", options: {} }`

**Sub-Nodes** :
- ✅ Soit `parameters: {}`
- ✅ Soit `parameters: { options: { continueOnFail: true } }`
- ❌ **JAMAIS** de parameters fonctionnels (model, temperature, etc.)

### Validation Supervisor (Logique)

**Ordre de priorité** :
1. 🥇 **Pattern matching** (TOUJOURS prioritaire)
   - `@n8n/n8n-nodes-langchain.*` → VALIDE
   - `@n8n/n8n-nodes-base.*` → VALIDE
2. 🥈 **Documentation RAG** (secondaire)
   - Vérifier si type dans la doc
3. 🥉 **Rejet** (seulement si aucune règle ne match)

---

## 🔧 COMMANDES UTILES

### Redémarrer le serveur
```bash
cd /home/ludo/synoptia-workflow-builder
pkill -f "node server.js"
sleep 2
nohup node server.js > /tmp/server.log 2>&1 &
tail -f /tmp/server.log
```

### Tester génération
```bash
# Test simple
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"request": "Créer un chatbot simple avec AI Agent"}' \
  -o /tmp/test-workflow.json

# Extraire types LangChain
jq '.workflow.nodes[] | select(.type | contains("langchain")) | {name, type}' /tmp/test-workflow.json
```

### Vérifier RAG
```bash
# Compter embeddings
curl http://localhost:6333/collections/synoptia_knowledge | jq '.result.points_count'

# Chercher un type spécifique dans les docs scrappés
grep -l "@n8n/n8n-nodes-langchain.agent" data/n8n-docs/*.json
```

### Injecter documents RAG
```bash
# Réutiliser le script existant
node -r dotenv/config scripts/fix-langchain-types-in-rag.js

# Pour injection complète (à créer)
node -r dotenv/config scripts/enrich-rag-langchain-complete.js
```

### Vérifier les logs
```bash
# Logs en temps réel
tail -f /tmp/server.log

# Chercher erreurs
grep -E "❌|ERROR|REJETÉ" /tmp/server.log | tail -20

# Chercher validations
grep -E "✅.*APPROUVÉ|Workflow APPROUVÉ" /tmp/server.log | tail -10
```

---

## 📂 FICHIERS IMPORTANTS

### À modifier
- `rag/pipeline/supervisor-agent.js` - Fix feedback (ligne ~160-170 section inventedNodes)
- `utils/workflow-validator.js` - Distinction CLUSTER/STANDALONE
- `utils/workflow-validator.js` - Error handling scoring

### Scripts utiles existants
- `scripts/fix-langchain-types-in-rag.js` - Injection 4 docs (OK)
- `scripts/audit-rag.js` - Audit général RAG
- `scripts/check-duplicates.js` - Vérifier doublons

### Scripts à créer
- `scripts/audit-rag-vs-web.js` - Comparer RAG vs web
- `scripts/enrich-rag-langchain-complete.js` - Injecter 60 types

### Documentation
- `SESSION.md` - Historique complet des sessions
- `PHASE0_RESULTS.md` - Investigation initiale du problème
- `PLANACTION.md` - Plan d'action original
- `TODO_LUNDI_SCORING.md` - Améliorations scoring

---

## 🎯 OBJECTIFS PROCHAINE SESSION

### Objectif Principal
**Atteindre 100% d'approbation en 1 tentative** (actuellement 70% en 1 tentative, 30% en 2)

### Objectifs Secondaires
1. ✅ Feedback Supervisor complet
2. ✅ Audit RAG vs web terminé
3. ⏳ RAG enrichi (60 types) - optionnel

### Critères de Succès
- 5 tests de génération AI Agent
- 5/5 approuvés en 1 tentative
- Tous les types avec `@n8n/` correct
- Temps moyen < 180s
- Coût moyen < 12c€

---

## 💡 NOTES IMPORTANTES

### Leçons Session Précédente

1. **Pattern matching > RAG Documentation**
   - Les patterns officiels sont la source de vérité
   - La doc peut être obsolète/incomplète

2. **Tests après chaque modif**
   - Fix Supervisor : succès immédiat
   - Injection RAG : révélé bug feedback
   - Toujours tester end-to-end

3. **Feedback critique dans retry loops**
   - Un feedback incorrect amplifie les erreurs
   - Valider le feedback avant de valider la validation

### Pièges à éviter

1. ❌ Ne pas faire confiance uniquement au RAG pour les types
2. ❌ Ne pas redémarrer le serveur après modifs prompts
3. ❌ Ne pas tester avec un seul prompt (varier)
4. ❌ Ne pas oublier de vérifier les logs pour comprendre rejets

### Quick Wins

1. ✅ Fix feedback Supervisor (30min) → +30% taux 1ère tentative
2. ✅ Audit RAG (1h) → Comprendre écarts doc
3. ⏳ Enrichir RAG (2h) → Robustesse long terme

---

## 🚀 DÉMARRAGE RAPIDE

### Pour reprendre immédiatement

```bash
# 1. Aller dans le projet
cd /home/ludo/synoptia-workflow-builder

# 2. Vérifier que le serveur tourne
ps aux | grep "node server.js"

# 3. Si pas lancé, démarrer
nohup node server.js > /tmp/server.log 2>&1 &

# 4. Tester que ça marche
curl http://localhost:3002/health

# 5. Lire les derniers logs
tail -50 /tmp/server.log

# 6. Faire un test rapide
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"request": "Test chatbot AI Agent"}' | \
  jq '.success, .message'
```

### Pour commencer le fix feedback

```bash
# 1. Ouvrir le fichier
nano rag/pipeline/supervisor-agent.js

# 2. Chercher "inventedNodes" ou "suggestedFix"
# Ligne ~160-180

# 3. Ajouter dans le prompt du Supervisor (fonction buildSupervisionPrompt)
# Section avec les exemples de réponse JSON

# 4. Redémarrer serveur
pkill -f "node server.js" && sleep 2 && nohup node server.js > /tmp/server.log 2>&1 &

# 5. Tester
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"request": "Créer un chatbot avec AI Agent"}' | \
  jq '.workflow.nodes[] | select(.type | contains("langchain"))'
```

---

## ⏱️ ESTIMATION TEMPS

| Tâche | Temps estimé | Priorité |
|-------|--------------|----------|
| Fix feedback Supervisor | 30 min | 🔴 HAUTE |
| Test + validation fix | 15 min | 🔴 HAUTE |
| Audit RAG vs web | 1h | 🟡 MOYENNE |
| Enrichir RAG complet | 2h | 🟡 MOYENNE |
| Distinction CLUSTER/STANDALONE | 2h | 🟢 BASSE |
| Error handling scoring | 1h | 🟢 BASSE |

**Total tâches prioritaires** : 1h45
**Total tâches importantes** : 5h45
**Total complet** : 8h45

**Recommandation** : Commencer par les tâches HAUTES (1h45) pour atteindre 100% en 1 tentative

---

## 📞 CONTACT & RESSOURCES

### Documentation N8N Officielle
- Cluster Nodes : https://docs.n8n.io/integrations/builtin/cluster-nodes/
- AI Agent : https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/
- Sub-nodes : https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/

### API N8N Locale
- Instance : https://n8n.synoptia.fr
- API Key : Dans .env (X-N8N-API-KEY)
- Health : https://n8n.synoptia.fr/healthz

### RAG Qdrant
- URL : http://localhost:6333
- Collection : synoptia_knowledge
- Dashboard : http://localhost:6333/dashboard

---

**Créé le** : 12 Octobre 2025 - 12h20
**Prêt pour** : Session correction feedback + audit RAG
**Durée estimée prochaine session** : 1h45 (priorités) à 5h45 (tout)

✅ **Le système est fonctionnel - Les tâches restantes sont des améliorations**
