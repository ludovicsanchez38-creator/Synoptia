# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Support pour d'autres LLMs (Gemini, Mistral)
- Interface de configuration des agents
- Export vers d'autres plateformes (Zapier, Make)
- Mode batch pour génération multiple
- API REST publique

---

## [1.0.0] - 2025-10-09

### 🎉 Initial Release

Premier release open source du Synoptia Workflow Builder !

### ✨ Added

**Architecture Multi-Agent**
- El Planificator (GPT-5) - Agent de planning et analyse
- El Generator (GPT-5) - Génération de workflows n8n
- El Supervisor (Claude Sonnet 4.5) - Validation stricte
- Feedback loop intelligent avec retry automatique (max 3x)

**RAG System**
- Intégration Qdrant pour vector database
- 2000+ workflows n8n indexés
- Documentation n8n complète (365 intégrations)
- Recherche hybride (70% docs + 30% workflows)
- Extraction automatique des types exacts de nodes

**Interface Web**
- Interface web moderne et responsive
- Real-time updates via Server-Sent Events (SSE)
- Affichage des coûts API en temps réel
- Pipeline visuel des 3 agents
- Expandable task lists pour chaque agent

**Cost Tracking**
- Tracking détaillé par agent (Planning, Generator, Supervisor)
- Conversion USD → EUR automatique
- Coût total par workflow
- Historique des coûts par session

**Validation & Quality**
- Validation stricte des nodes (0 nodes inventés)
- Vérification des types exacts
- Detection des nodes manquants
- Gestion automatique des erreurs critiques (`continueOnFail`)
- Score de qualité par workflow

**Performance**
- Timeouts adaptatifs selon complexité (5-25 min)
- Gestion intelligente des rate limits (429)
- Cache Redis pour embeddings
- Optimisation des prompts (-36% coûts)

**Security**
- Middleware de sécurité (Helmet, CORS, Rate limiting)
- Validation stricte des inputs (Joi)
- Sanitization automatique
- Detection de secrets dans les requêtes
- Protection XSS, injection, DoS

**Documentation**
- README complet avec quick start
- Guide de démarrage (START_HERE.md)
- Guide d'intégration RAG
- Notes de session détaillées
- Installation systemd

### 🔧 Technical Details

**Stack**
- Node.js 18+
- Express.js
- OpenAI GPT-5 API
- Anthropic Claude Sonnet 4.5 API
- Qdrant (vector DB)
- Redis (cache)

**Metrics**
- ⏱️ Temps moyen : 5-6 minutes par workflow
- 💰 Coût moyen : 17-50 centimes par workflow
- ✅ Taux de succès : 100%
- 📊 Quality score : 89/100 (Grade A)

---

## [0.9.0] - 2025-10-08

### Beta Testing Phase

**Session 3 - Élimination nodes inventés**
- Extraction types exacts depuis RAG
- Fix `moveBinaryData` invention
- Réduction coûts -36%

**Session 2 - Ingestion 2000 workflows**
- Clone repo Zie619/n8n-workflows
- Ingestion 1990 workflows valides
- El Supervisor avec accès RAG
- Fix bug `continueOnFail` placement

**Session 1 - Foundation**
- Architecture 3 agents
- RAG avec Qdrant
- Cost tracking en EUR
- Auto-detection complexité

---

## Contributing

Pour contribuer, consultez [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT License - voir [LICENSE](LICENSE)
