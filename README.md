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

- ⏱️ **Temps** : 5-25 minutes selon complexité
- 💰 **Coût** : 17-50 centimes d'euro par workflow
- ✅ **Qualité** : Validation stricte, 0 nodes inventés

---

## 🧠 Architecture Multi-Agent

### **3 agents collaboratifs avec feedback loop**

\`\`\`
┌────────────────────┐
│  El Planificator   │  GPT-5
│  (Planning Agent)  │  → Analyse + Plan
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│   El Generator     │  GPT-5
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
git clone https://github.com/yourusername/synoptia-workflow-builder.git
cd synoptia-workflow-builder

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

Voir [START_HERE.md](START_HERE.md) pour le guide complet.

---

## 🙏 Crédits

Développé par [Ludovic](https://github.com/yourusername) @ [Synoptia](https://synoptia.fr)

---

⭐ **Star** si tu trouves ça utile !
