# 🤝 Contributing to Synoptia Workflow Builder

Merci de votre intérêt pour contribuer au projet ! Toute contribution est la bienvenue.

---

## 📋 Table des matières

- [Code de conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Développement local](#développement-local)
- [Standards de code](#standards-de-code)
- [Process de Pull Request](#process-de-pull-request)
- [Signaler des bugs](#signaler-des-bugs)
- [Proposer des features](#proposer-des-features)

---

## 🌟 Code de conduite

Ce projet adhère aux principes de respect et d'inclusion. Nous attendons de tous les contributeurs qu'ils :

- Soient respectueux et constructifs
- Acceptent les critiques constructives
- Se concentrent sur ce qui est meilleur pour la communauté
- Fassent preuve d'empathie envers les autres membres

---

## 🚀 Comment contribuer

Il existe plusieurs façons de contribuer :

### 1. **Signaler des bugs**
Utilisez les [GitHub Issues](../../issues) avec le label `bug`

### 2. **Proposer des améliorations**
Ouvrez une issue avec le label `enhancement`

### 3. **Améliorer la documentation**
La documentation est dans `README.md`, `START_HERE.md`, et autres fichiers `.md`

### 4. **Contribuer du code**
Suivez le processus de Pull Request ci-dessous

---

## 💻 Développement local

### Prérequis

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** (pour Qdrant)
- **Redis** (optionnel, pour le cache)

### Installation

```bash
# 1. Fork le repo sur GitHub
# 2. Clone ton fork
git clone https://github.com/YOUR_USERNAME/Synoptia.git
cd Synoptia

# 3. Installe les dépendances
npm install

# 4. Configure l'environnement
cp .env.example .env
# Édite .env avec tes clés API

# 5. Lance Qdrant (vector DB)
docker run -d -p 6333:6333 qdrant/qdrant

# 6. Ingère la documentation n8n
npm run ingest

# 7. Lance le serveur
npm start
```

Le serveur démarre sur `http://localhost:3002`

---

## 📐 Standards de code

### Style JavaScript

- **Indentation** : 2 espaces
- **Quotes** : Simple quotes `'` pour les strings
- **Semicolons** : Oui
- **Naming** :
  - `camelCase` pour variables et fonctions
  - `PascalCase` pour classes
  - `UPPER_CASE` pour constantes

### Exemple

```javascript
const MAX_RETRIES = 3;

class WorkflowGenerator {
  constructor(config) {
    this.config = config;
  }

  async generateWorkflow(userRequest) {
    // Implementation
  }
}
```

### Commits

Utilisez des messages de commit clairs avec des emojis :

```
✨ feat: Add new OpenAI integration
🐛 fix: Resolve supervisor validation bug
📝 docs: Update README installation steps
♻️ refactor: Simplify RAG retrieval logic
🧪 test: Add tests for planning agent
🔒 security: Remove hardcoded API keys
```

**Format** : `<emoji> <type>: <description>`

**Types** :
- `feat` : Nouvelle feature
- `fix` : Bug fix
- `docs` : Documentation
- `refactor` : Refactoring
- `test` : Tests
- `chore` : Maintenance

---

## 🔄 Process de Pull Request

### 1. Créer une branche

```bash
git checkout -b feature/ma-nouvelle-feature
# ou
git checkout -b fix/mon-bug-fix
```

### 2. Faire tes modifications

- Écris du code propre et commenté
- Ajoute des tests si applicable
- Mets à jour la documentation

### 3. Tester

```bash
# Lance les tests
npm test

# Vérifie que le serveur démarre
npm start
```

### 4. Commit et Push

```bash
git add .
git commit -m "✨ feat: Add amazing feature"
git push origin feature/ma-nouvelle-feature
```

### 5. Ouvrir une Pull Request

- Va sur GitHub
- Ouvre une PR depuis ta branche vers `main`
- Décris clairement ce que ta PR fait
- Lie les issues concernées (`Fixes #123`)

### 6. Review

- Attends la review du maintainer
- Réponds aux commentaires
- Fais les modifications demandées

---

## 🐛 Signaler des bugs

Ouvre une [GitHub Issue](../../issues/new) avec :

### Template

```markdown
**Description du bug**
Description claire et concise du problème

**Pour reproduire**
1. Lance le serveur avec '...'
2. Envoie une requête '...'
3. Vois l'erreur '...'

**Comportement attendu**
Ce qui devrait se passer

**Screenshots**
Si applicable

**Environnement**
- OS: [Ubuntu 22.04]
- Node.js: [18.17.0]
- Version: [1.0.0]

**Logs**
```
Colle les logs pertinents ici
```
```

---

## 💡 Proposer des features

Ouvre une [GitHub Issue](../../issues/new) avec :

### Template

```markdown
**Problème à résoudre**
Quel problème cette feature résout-elle ?

**Solution proposée**
Comment tu imagines cette feature

**Alternatives considérées**
Autres solutions possibles

**Contexte additionnel**
Tout autre détail utile
```

---

## 🏗️ Architecture du projet

```
synoptia-workflow-builder/
├── rag/
│   ├── pipeline/          # Agents (Planning, Generator, Supervisor)
│   ├── retrieval/         # RAG system
│   └── validation/        # Workflow validator
├── public/                # Frontend (HTML/CSS/JS)
├── utils/                 # Utilitaires (logger, cost tracker)
├── middleware/            # Security middleware
├── data/                  # Documentation n8n
└── server.js             # Entry point
```

---

## 🧪 Tests

### Lancer les tests

```bash
# Tous les tests
npm test

# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration
```

### Écrire des tests

Placez vos tests dans `__tests__/` avec le même chemin que le fichier source :

```
src/rag/pipeline/planning-agent.js
__tests__/rag/pipeline/planning-agent.test.js
```

---

## 📞 Contact

- **GitHub Issues** : [Issues](../../issues)
- **Discussions** : [Discussions](../../discussions)
- **LinkedIn** : [Ludovic Sanchez](https://linkedin.com/in/ludovic-sanchez)

---

## 📜 License

En contribuant, vous acceptez que vos contributions soient sous [Licence MIT](LICENSE).

---

**Merci d'avoir contribué ! 🙏**
