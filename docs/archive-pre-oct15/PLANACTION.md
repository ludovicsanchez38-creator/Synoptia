# 📋 PLAN D'ACTION - Fix Workflow Builder

**Date** : 12 octobre 2025
**Objectif** : Corriger les problèmes de génération LangChain et scoring
**Statut** : En cours

---

## 🔍 SOURCES DE RECHERCHE

### Documentation officielle N8N consultée :
1. **LangChain Architecture** : https://docs.n8n.io/advanced-ai/langchain/langchain-n8n/
   - Confirmation cluster nodes (root + sub-nodes)
   - Architecture modulaire confirmée

2. **AI Agent Node** : https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/
   - Types d'agents : Conversational, OpenAI Functions, ReAct, etc.
   - Configuration via sub-nodes (LLM, Memory, Tools)

3. **Error Handling** : https://docs.n8n.io/flow-logic/error-handling/
   - 4 méthodes confirmées : Error Trigger, continueOnFail, IF node, Stop and Error
   - Best practice : workflow d'erreur centralisé

4. **Community Nodes** : https://docs.n8n.io/integrations/community-nodes/installation/
   - **LangChain nodes BUILT-IN depuis N8N 1.19.4** (confirmé)
   - Package @n8n/n8n-nodes-langchain v1.113.1 (4 jours)

### Exemples réels trouvés :
5. **Workflow Export 2025** (Medium article) :
   ```json
   "type": "@n8n/n8n-nodes-langchain.agent"
   "parameters": {
     "text": "={{ $('Message Router').item.json.body.message.text }}",
     "promptType": "define",
     "options": {"systemMessage": "..."}
   }
   ```
   Source : AI Agent Factory avec 2000+ templates

6. **Community Issues** :
   - Multiples rapports "Unrecognized node type" confirmant problème format
   - Erreurs fréquentes : types en lowercase, sans @n8n/

---

## ✅ CERTITUDES (Validées par doc officielle)

### 1. Format des Types LangChain
**Confirmé à 100%** :
- ✅ Format correct : `@n8n/n8n-nodes-langchain.{nodeName}`
- ✅ CamelCase requis : `lmChatOpenAi`, `memoryBufferWindow`, etc.
- ✅ Préfixe `@n8n/` obligatoire

**Preuves** :
- Package npm officiel
- Multiples community threads avec erreurs format incorrect
- Documentation utilise ce format partout

### 2. Architecture Cluster Nodes
**Confirmé à 100%** :
- ✅ Root nodes : AI Agent, Chains, Extractors, Classifiers
- ✅ Sub-nodes : LLM, Memory, Embeddings, Tools, Parsers
- ✅ Connexions spéciales : `ai_languageModel`, `ai_memory`, `ai_tool`, etc.

**Preuves** :
- Doc officielle explicite
- Structure confirmée dans LangChain concepts page

### 3. Error Handling Techniques
**Confirmé à 100%** :
- ✅ continueOnFail (au niveau node)
- ✅ Error Trigger + workflow dédié
- ✅ IF/Switch nodes (branching)
- ✅ Stop and Error node

**Preuves** :
- Doc officielle error-handling page
- Best practices confirmées

---

## ⚠️ ZONES D'INCERTITUDE (À valider par tests)

### 1. Parameters des Root Nodes vs Sub-Nodes

**Hypothèse** (basée sur 1 exemple trouvé) :
- Root nodes (AI Agent) : PEUVENT avoir des parameters
- Sub-nodes (LLM, Memory) : DOIVENT avoir `parameters: {}`

**Niveau de confiance** : 🟡 **MOYEN (60%)**

**Raisons** :
- ✅ 1 exemple réel trouvé avec AI Agent ayant des parameters
- ❌ Aucune doc officielle explicitant cette règle
- ❌ Vos notes SESSION.md disent "tous vides" mais peuvent être obsolètes

**Action** : **TESTER d'abord** avant de modifier le code

### 2. Correction Automatique dans n8n-api.js

**Question** : La correction lignes 93-125 s'exécute-t-elle vraiment ?

**Niveau de confiance** : 🟡 **MOYEN (70%)**

**Raisons** :
- ✅ Code semble correct
- ❌ Aucun log visible dans SESSION.md confirmant l'exécution
- ❌ Workflows importés avaient encore des types incorrects (session 11 oct 19h40)

**Action** : Vérifier les logs serveur en temps réel

---

## 🎯 PLAN D'ACTION PROGRESSIF

### Phase 0 : INVESTIGATION (30 min)

**Objectif** : Valider les hypothèses AVANT modification du code

#### 0.1 - Exporter workflows N8N existants avec LangChain
```bash
# Récupérer un workflow avec AI Agent depuis ton N8N
curl -s "https://n8n.synoptia.fr/api/v1/workflows/{workflowId}" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.' > /tmp/real-n8n-langchain-workflow.json

# Analyser la structure des parameters
jq '.nodes[] | select(.type | contains("langchain")) | {name, type, parameters}' \
  /tmp/real-n8n-langchain-workflow.json
```

**Questions à répondre** :
- [ ] Les root nodes (AI Agent) ont-ils des parameters non-vides ?
- [ ] Les sub-nodes (OpenAI Chat Model) ont-ils parameters: {} ?
- [ ] Quelle est la vraie structure dans N8N ?

#### 0.2 - Tester génération actuelle
```bash
# Générer un workflow simple
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"request": "Créer un chatbot simple avec AI Agent et OpenAI GPT-4o-mini"}' \
  > /tmp/test-generation-current.json

# Vérifier les types générés
jq '.workflow.nodes[] | select(.type | contains("langchain")) | {name, type, parameters}' \
  /tmp/test-generation-current.json
```

**Questions à répondre** :
- [ ] Les types sont-ils corrects (@n8n/n8n-nodes-langchain.*) ?
- [ ] Les parameters sont-ils vides ou remplis ?
- [ ] La correction n8n-api.js fonctionne-t-elle ?

#### 0.3 - Analyser les logs serveur
```bash
# Vérifier que le serveur tourne
ps aux | grep "node server.js"

# Voir les logs en temps réel pendant génération
tail -f /tmp/server.log | grep -E "(🔧|🔍|LangChain)"
```

**Questions à répondre** :
- [ ] La fonction fixLangChainTypes() est-elle appelée ?
- [ ] La correction n8n-api.js s'exécute-t-elle ?
- [ ] Y a-t-il des logs de correction visibles ?

---

### Phase 1 : FIXES CONFIRMÉS (1h)

**Objectif** : Corriger uniquement ce qui est certain à 100%

#### 1.1 - Améliorer Error Handling Test ✅ CONFIRMÉ

**Fichier** : `rag/testing/workflow-tester.js`

**Action** : Remplacer la fonction `testErrorHandling()` (lignes 382-388)

**Code** :
```javascript
testErrorHandling(workflow) {
  const result = { passed: false, score: 0, details: [] };

  // Méthode 1: continueOnFail (existant)
  const hasContinueOnFail = workflow.nodes.some(node =>
    node.parameters?.continueOnFail === true
  );

  // Méthode 2: IF/Switch node (branching conditionnel)
  const hasConditionalBranching = workflow.nodes.some(node =>
    node.type === 'n8n-nodes-base.if' ||
    node.type === 'n8n-nodes-base.switch'
  );

  // Méthode 3: Error Workflow (settings)
  const hasErrorWorkflow = workflow.settings?.errorWorkflow;

  // Méthode 4: Stop and Error node
  const hasStopAndError = workflow.nodes.some(node =>
    node.type === 'n8n-nodes-base.stopanderror'
  );

  // Méthode 5: Try/catch dans Code node
  const hasTryCatch = workflow.nodes.some(node =>
    node.type === 'n8n-nodes-base.code' &&
    /try\s*\{[\s\S]*\}\s*catch/.test(node.parameters?.jsCode || '')
  );

  const methods = [];
  if (hasContinueOnFail) methods.push('continueOnFail');
  if (hasConditionalBranching) methods.push('conditional branching');
  if (hasErrorWorkflow) methods.push('error workflow');
  if (hasStopAndError) methods.push('stop and error');
  if (hasTryCatch) methods.push('try/catch in code');

  if (methods.length > 0) {
    result.passed = true;
    result.score = 10;
    result.details.push(`✅ Error handling detected: ${methods.join(', ')}`);
  } else {
    result.details.push('⚠️ No error handling mechanisms detected');
  }

  return result;
}
```

**Impact attendu** : Score 89 → 92-99 selon workflow

**Validation** :
```bash
# Relancer tests
cd /home/ludo/synoptia-workflow-builder
node scripts/run-all-tests.js
```

#### 1.2 - Ajouter Nodes Manquants ✅ CONFIRMÉ

**Fichier** : `rag/testing/workflow-tester.js` (ligne ~16-84)

**Action** : Ajouter dans l'array `knownNodes`

**Code** :
```javascript
// Ligne ~84, ajouter :
'n8n-nodes-base.emailsend',
'n8n-nodes-base.respondtowebhook',
'n8n-nodes-base.googledrivetrigger',
'n8n-nodes-base.dropboxtrigger',
'n8n-nodes-base.gmailtrigger',
'n8n-nodes-base.telegramtrigger',
'n8n-nodes-base.stopanderror',
'n8n-nodes-base.switch',
```

**Impact** : Réduction des faux positifs "Unknown node type"

#### 1.3 - Améliorer Logs N8N-API ✅ CONFIRMÉ

**Fichier** : `src/n8n-api.js` (lignes 93-125)

**Action** : Ajouter logs plus visibles

**Code** :
```javascript
// Ligne 93, AVANT la correction
if (cleaned.type && cleaned.type.includes('langchain') && !cleaned.type.startsWith('@n8n/')) {
    console.log('🔍 [N8N-API] Node LangChain détecté:', cleaned.name, '|', cleaned.type);

    const lowerType = cleaned.type.toLowerCase();
    if (langchainFixes[lowerType]) {
        const oldType = cleaned.type;
        cleaned.type = langchainFixes[lowerType];
        console.log('🔧 [N8N-API] Type corrigé:', oldType, '→', cleaned.type);
    } else {
        console.warn('⚠️ [N8N-API] Type LangChain non mappé:', cleaned.type);
    }
}
```

**Validation** :
```bash
# Redémarrer serveur
cd /home/ludo/synoptia-workflow-builder
pkill -f "node server.js"
nohup node server.js > /tmp/server.log 2>&1 &

# Générer workflow et voir logs
tail -f /tmp/server.log
```

---

### Phase 2 : INVESTIGATION APPROFONDIE (1h)

**Objectif** : Répondre aux questions sur parameters root vs sub-nodes

#### 2.1 - Analyser Structure Réelle N8N

**Actions** :
1. Exporter 3-5 workflows existants avec LangChain
2. Comparer structure root nodes vs sub-nodes
3. Documenter la vraie règle

**Script d'analyse** :
```bash
# Créer script analyse
cat > /tmp/analyze-langchain-structure.js << 'EOF'
const fs = require('fs');

// Charger workflow
const workflow = JSON.parse(fs.readFileSync(process.argv[2]));

console.log('\n📊 ANALYSE STRUCTURE LANGCHAIN\n');

const rootNodes = [
  '@n8n/n8n-nodes-langchain.agent',
  '@n8n/n8n-nodes-langchain.chainllm',
  '@n8n/n8n-nodes-langchain.chainsummarization',
  '@n8n/n8n-nodes-langchain.informationextractor',
  '@n8n/n8n-nodes-langchain.textclassifier'
];

workflow.nodes.forEach(node => {
  if (node.type && node.type.includes('langchain')) {
    const isRoot = rootNodes.some(root => node.type.toLowerCase().includes(root.toLowerCase()));
    const hasParams = Object.keys(node.parameters || {}).length > 0;

    console.log(`\n${isRoot ? '🔷 ROOT' : '🔹 SUB'} : ${node.name}`);
    console.log(`  Type: ${node.type}`);
    console.log(`  Parameters: ${hasParams ? 'NON-VIDE' : 'VIDE {}'}`);
    if (hasParams) {
      console.log(`  Keys: ${Object.keys(node.parameters).join(', ')}`);
    }
  }
});
EOF

# Analyser workflows
node /tmp/analyze-langchain-structure.js /tmp/real-n8n-langchain-workflow.json
```

#### 2.2 - Tests Génération Contrôlés

**Scénarios** :
1. **Test A** : Chatbot simple (AI Agent + OpenAI + Memory)
2. **Test B** : RAG basique (Chain + Embeddings + Qdrant)
3. **Test C** : Information Extractor

**Pour chaque test** :
```bash
# Générer
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d '{"request": "PROMPT_ICI"}' > /tmp/test-A.json

# Analyser
node /tmp/analyze-langchain-structure.js /tmp/test-A.json

# Importer dans N8N
# Via UI ou API

# Tester exécution
# Workflows s'ouvrent correctement ?
# Nodes apparaissent avec "?" ?
```

---

### Phase 3 : DÉCISION & FIX FINAL (1h)

**Basé sur résultats Phase 2**

#### Scénario A : Parameters root nodes DOIVENT être non-vides

**Action** : Modifier `fixLangChainTypes()` pour distinguer root vs sub

**Fichier** : `rag/pipeline/rag-enhanced-generator.js` (lignes 1026-1119)

**Code** : (celui que j'ai proposé dans mes solutions)

#### Scénario B : Parameters TOUS vides (comme actuellement)

**Action** : Garder le code actuel, juste améliorer les prompts

**Fichiers** : `planning-agent.js`, `rag-enhanced-generator.js`

#### Scénario C : Mixte ou cas par cas

**Action** : Créer logique conditionnelle selon le type d'agent

---

### Phase 4 : VALIDATION FINALE (30 min)

#### 4.1 - Tests End-to-End

```bash
# Re-générer les 3 workflows complexes
curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d @/tmp/test7-prompt.json > /tmp/test7-v2.json

curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d @/tmp/test8-prompt.json > /tmp/test8-v2.json

curl -X POST http://localhost:3002/api/generate \
  -H "Content-Type: application/json" \
  -d @/tmp/test9-prompt.json > /tmp/test9-v2.json
```

#### 4.2 - Import N8N & Vérification

**Checklist** :
- [ ] Workflows s'importent sans erreur
- [ ] Tous les nodes sont reconnus (pas de "?")
- [ ] Types LangChain corrects (@n8n/...)
- [ ] Structure cluster nodes correcte
- [ ] Score > 92/100

#### 4.3 - Documentation

**Fichiers à mettre à jour** :
1. `SESSION.md` - Ajouter session du 12 octobre
2. `DOCUMENTATION_COMPLETE.md` - Section LangChain
3. `README.md` - Statut corrections

**Commit** :
```bash
git add .
git commit -m "fix(langchain): Improve cluster nodes generation & scoring

- Enhanced error handling detection (5 methods)
- Added missing nodes to validation whitelist
- Improved n8n-api logging for LangChain corrections
- [Root vs Sub parameters logic based on tests]

Score improvement: 89/100 → 92-99/100
Tests: 9/9 workflows validated"
```

---

## 📊 INDICATEURS DE SUCCÈS

| Indicateur | Avant | Cible |
|------------|-------|-------|
| Score moyen | 89/100 | 95/100 |
| Faux positifs | 7-10/workflow | <3/workflow |
| Workflows importables N8N | ?/9 | 9/9 |
| Types LangChain corrects | ~60% | 100% |
| Error handling détecté | 0% | 80%+ |

---

## 🚨 RISQUES & MITIGATIONS

### Risque 1 : Hypothèse parameters incorrecte
**Impact** : Workflows cassés après modification
**Mitigation** : Phase 0 & 2 (investigation d'abord)
**Rollback** : Git revert si nécessaire

### Risque 2 : Correction n8n-api non exécutée
**Impact** : Types toujours incorrects
**Mitigation** : Logs améliorés + tests en temps réel
**Rollback** : Identifier pourquoi et corriger le flux

### Risque 3 : Scoring trop généreux après fix
**Impact** : Workflows de mauvaise qualité notés 99/100
**Mitigation** : Tester sur workflows volontairement cassés
**Rollback** : Ajuster poids des scores

---

## ✅ CHECKLIST GLOBALE

### Phase 0 : Investigation
- [ ] Exporter workflow N8N existant avec LangChain
- [ ] Analyser structure parameters (root vs sub)
- [ ] Tester génération actuelle
- [ ] Vérifier logs serveur en temps réel

### Phase 1 : Fixes Confirmés
- [ ] Améliorer testErrorHandling()
- [ ] Ajouter nodes manquants
- [ ] Améliorer logs n8n-api.js
- [ ] Redémarrer serveur
- [ ] Tester 1 génération simple

### Phase 2 : Investigation Approfondie
- [ ] Analyser 3-5 workflows réels
- [ ] Tests génération contrôlés (A, B, C)
- [ ] Import N8N et vérification
- [ ] Documenter règle réelle parameters

### Phase 3 : Fix Final
- [ ] Décision basée sur Phase 2
- [ ] Modifier code si nécessaire
- [ ] Tests unitaires
- [ ] Redémarrer serveur

### Phase 4 : Validation
- [ ] Re-générer test 7, 8, 9
- [ ] Import N8N complet
- [ ] Vérifier scores
- [ ] Documentation complète
- [ ] Commit Git

---

## 📝 NOTES

### Niveau de confiance global : 🟢 **ÉLEVÉ (85%)**

**Points forts** :
- ✅ Format types LangChain : 100% certain
- ✅ Error handling techniques : 100% certain
- ✅ Architecture cluster nodes : 100% certain

**Points à valider** :
- ⚠️ Parameters root vs sub : 60% certain (à tester)
- ⚠️ Correction n8n-api exécution : 70% certain (logs à vérifier)

**Approche recommandée** : **Progressive et testée**
- Commencer par investigation (Phase 0 & 2)
- Appliquer fixes certains (Phase 1)
- Décider du fix parameters basé sur faits (Phase 3)

---

**Dernière mise à jour** : 12 octobre 2025
**Prochaine étape** : Phase 0 - Investigation
