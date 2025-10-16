# 🤖 Synoptia Workflow Builder

> **Système multi-agent qui génère des workflows n8n production-ready en quelques minutes**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%3E%3D20.10-blue.svg)](https://www.docker.com/)

---

## 🎯 Ce que ça fait

Transforme une demande en français naturel en workflow n8n complet et fonctionnel.

**Exemple** :
\`\`\`
"Gérer automatiquement ma base RGPD à l'envoi d'un devis"
\`\`\`

**Résultat** : 17 nodes, pipeline complet avec pseudonymisation, extraction IA, classification légale, vectorisation et export Google Sheets.

- ⏱️ **Temps** : 30s-5min selon complexité (10x plus rapide avec Haiku 4.5)
- 💰 **Coût** : 5-15 centimes d'euro par workflow (3x moins cher)
- ✅ **Qualité** : Validation stricte, 0 nodes inventés
- 🧠 **RAG** : 3907 points Qdrant (1800 workflows + 709 docs + 88 paramètres détaillés)

---

## 🧠 Architecture Multi-Agent

### **3 agents collaboratifs avec feedback loop**

\`\`\`
┌────────────────────┐
│  El Planificator   │  Claude Haiku 4.5
│  (Planning Agent)  │  → Analyse + Plan
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│   El Generator     │  Claude Haiku 4.5
│ (Generator Agent)  │  → Génération JSON
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│  El Supervisor     │  Claude Sonnet 4.5
│ (Supervisor Agent) │  → Validation stricte
└──────────┬─────────┘
           │
           ▼
      ✅ Workflow OK
      ou
      🔄 Retry (max 3x)
\`\`\`

---

## 🚀 Quick Start

\`\`\`bash
# 1. Clone
git clone https://github.com/ludovicsanchez38-creator/Synoptia.git
cd Synoptia

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Ajoute tes clés API OpenAI + Anthropic

# 4. Start
npm start
# Ouvre http://localhost:3002
\`\`\`

---

## 📖 Documentation complète

- 🗺️ **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Index complet de toute la documentation
- 📘 **[START_HERE.md](START_HERE.md)** - Guide de démarrage détaillé
- ✅ **[RAPPORT_FINAL_TESTS.md](RAPPORT_FINAL_TESTS.md)** - Résultats tests (90% de réussite)
- 🔧 **[FIXES_APPLIED_OCT_2025.md](FIXES_APPLIED_OCT_2025.md)** - Fixes critiques Oct 2025

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour :
- 🐛 Signaler des bugs
- 💡 Proposer des features
- 🔧 Soumettre des Pull Requests
- 📚 Améliorer la documentation

---

## 🙏 Crédits

Développé par [Ludovic Sanchez](https://github.com/ludovicsanchez38-creator) @ [Synoptia](https://synoptia.fr)

---

⭐ **Star** si tu trouves ça utile !
