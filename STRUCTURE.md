# 📁 Project Structure - Synoptia Workflow Builder

**Last Updated:** 16 Octobre 2025
**Optimizations Applied:** Oct 2025 cleanup

---

## 🗂️ Directory Structure

```
synoptia-workflow-builder-opensource/
│
├── 📚 DOCUMENTATION (Root)
│   ├── README.md                         # Main project overview
│   ├── DOCUMENTATION_INDEX.md            # Complete documentation index
│   ├── RAPPORT_FINAL_TESTS.md            # Test results (90% success)
│   ├── FIXES_APPLIED_OCT_2025.md         # Recent fixes
│   ├── STRUCTURE.md                      # ⬅️ YOU ARE HERE
│   ├── CONTRIBUTING.md                   # Contribution guide
│   ├── CODE_OF_CONDUCT.md                # Community rules
│   ├── SECURITY.md                       # Security policies
│   ├── ENRICHMENT_GUIDE.md               # RAG enrichment guide
│   ├── RAG_AUDIT_REPORT.md               # RAG system audit
│   └── RAG_COVERAGE_ANALYSIS.md          # Coverage breakdown
│
├── 🔧 CORE APPLICATION
│   ├── server.js                         # Main Express server
│   ├── package.json                      # Dependencies
│   ├── .env.example                      # Environment template
│   ├── .gitignore                        # Git ignore rules (Oct 2025 optimized)
│   │
│   ├── config/                           # Configuration files
│   │   └── (server, database, API configs)
│   │
│   ├── middleware/                       # Express middlewares
│   │   └── (auth, validation, error handling)
│   │
│   ├── services/                         # Business logic services
│   │   └── (n8n integration, deployment)
│   │
│   ├── utils/                            # Utility functions
│   │   ├── cost-tracker.js              # API cost tracking
│   │   └── (helpers, formatters)
│   │
│   └── public/                           # Frontend assets
│       ├── index.html                    # UI
│       ├── styles.css
│       └── images/
│
├── 🧠 RAG SYSTEM (Core Intelligence)
│   ├── rag/
│   │   ├── pipeline/                     # 3-Agent Pipeline ⭐
│   │   │   ├── planning-agent.js        # Agent 1: Planning (Claude Haiku 4.5)
│   │   │   ├── rag-enhanced-generator.js # Agent 2: Generation (Claude Haiku 4.5)
│   │   │   └── supervisor-agent.js      # Agent 3: Supervision (Claude Sonnet 4.5)
│   │   │
│   │   ├── retrieval/                    # RAG retrieval logic
│   │   │   ├── workflow-context-retriever.js  # Qdrant query + reranking
│   │   │   └── embeddings-service.js     # OpenAI embeddings
│   │   │
│   │   ├── validation/                   # Validation rules
│   │   │   ├── workflow-validator.js     # Structure validation
│   │   │   ├── node-schemas.js           # Node schemas
│   │   │   └── node-type-versions.js     # Type versions + blacklist
│   │   │
│   │   ├── embeddings/                   # Vector embeddings
│   │   │   └── (OpenAI embeddings cache)
│   │   │
│   │   ├── sessions/                     # Temporary session data
│   │   │   └── *.json (gitignored)
│   │   │
│   │   └── testing/                      # RAG testing tools
│       │   └── (quality tests, benchmarks)
│
├── 💾 DATA & KNOWLEDGE BASE
│   ├── data/
│   │   ├── n8n-docs/                     # n8n documentation scraped
│   │   ├── n8n-docs-enriched/            # Enriched with metadata
│   │   ├── n8n-docs-operations/          # Node operations docs
│   │   ├── n8n-docs-backup-20251016/     # Latest backup only
│   │   ├── n8n-nodes/                    # Node definitions
│   │   ├── n8n-nodes-api/                # API documentation
│   │   ├── n8n-nodes-parameters/         # Detailed node params
│   │   ├── n8n-nodes-parsed/             # Parsed node data
│   │   ├── n8n-workflows/                # Example workflows
│   │   ├── feedback/                     # User feedback
│   │   └── feedback-test/                # Test feedback
│   │
│   └── qdrant_storage/                   # Qdrant vector DB (gitignored)
│       └── (3907 vectors: 1800 workflows + 709 docs + 88 params)
│
├── 🧪 TESTING & QUALITY
│   ├── __tests__/                        # Jest tests
│   │   ├── middleware/
│   │   └── validation/
│   │
│   ├── tests/                            # Additional test files
│   │
│   ├── test-results/                     # Test outputs (gitignored)
│   │   ├── v1/                           # Version 1 results
│   │   └── retry/                        # Retry attempts
│   │
│   └── TEST_SUITE_20.json                # 20-test comprehensive suite
│
├── 📜 SCRIPTS & AUTOMATION
│   ├── scripts/
│   │   ├── run-test-suite.js             # Execute test suite
│   │   ├── inject-workflows-chunked.js   # RAG enrichment
│   │   ├── scrape-n8n-docs.js            # Scrape n8n.io
│   │   └── (deployment, maintenance scripts)
│
├── 📝 PROMPTS (LLM Instructions)
│   ├── prompts/
│   │   ├── shared-rules.js               # Shared validation rules
│   │   └── (planning, generation, supervision prompts)
│
├── 🔬 RESEARCH & LEARNING
│   ├── research/                         # Research experiments
│   │   ├── generated/                    # Generated test workflows
│   │   └── web/                          # Web research
│   │
│   ├── learning/                         # ML/AI learning materials
│   │
│   └── monitoring/                       # System monitoring
│
├── 📸 MEDIA & ASSETS
│   ├── screenshots/                      # Demo screenshots (gitignored)
│   │   └── demo/ (committed for docs)
│   │
│   └── templates/                        # Workflow templates
│
├── 📋 LOGS & MONITORING
│   ├── logs/                             # Application logs (gitignored)
│   │   └── (auto-cleaned after 7 days)
│
├── 📦 ARCHIVES
│   └── .archive/                         # Large backups (gitignored)
│       └── backup/ (371M moved here)
│
└── 📚 DOCUMENTATION (Subdirectories)
    └── docs/
        ├── GUIDE_UTILISATION.md          # Usage guide
        ├── RAG-AUTO-UPDATE.md            # Auto-update system
        ├── RAG_FULL_COVERAGE_PROGRESS.md # Coverage tracking
        │
        └── archive-pre-oct15/            # Pre-Oct 15 docs
            └── (38 archived files)
```

---

## 🎯 Key Directories Explained

### **Core Application**
- **Entry point:** `server.js` (Express server)
- **Config:** Environment vars, API keys, database connections
- **Middleware:** Authentication, validation, error handling
- **Services:** Business logic (n8n deployment, workflow management)
- **Utils:** Reusable utilities (cost tracking, formatters)

### **RAG System** ⭐
The heart of the application. 3-agent pipeline:

1. **Planning Agent** (`rag/pipeline/planning-agent.js`)
   - Analyzes user request
   - Creates execution plan
   - Validates nodes exist in RAG

2. **Generator Agent** (`rag/pipeline/rag-enhanced-generator.js`)
   - Constructs workflow JSON
   - Uses RAG context + plan
   - Auto-corrects LangChain types

3. **Supervisor Agent** (`rag/pipeline/supervisor-agent.js`)
   - Validates final workflow
   - Detects invented nodes (150+ whitelist)
   - Auto-retry with feedback (max 3x)

### **Data & Knowledge Base**
- **n8n-docs:** Scraped documentation from n8n.io
- **n8n-workflows:** Example workflows for RAG
- **n8n-nodes-parameters:** Detailed node parameter schemas
- **qdrant_storage:** Vector database (3907 embeddings)

### **Testing**
- **__tests__:** Jest unit tests
- **test-results:** Test outputs (gitignored, auto-cleaned)
- **TEST_SUITE_20.json:** Comprehensive test suite (90% success rate)

---

## 🔍 Important Files

| File | Purpose | Location |
|------|---------|----------|
| **server.js** | Main Express server | Root |
| **planning-agent.js** | Agent 1 (Planning) | rag/pipeline/ |
| **rag-enhanced-generator.js** | Agent 2 (Generation) | rag/pipeline/ |
| **supervisor-agent.js** | Agent 3 (Supervision) | rag/pipeline/ |
| **workflow-context-retriever.js** | RAG retrieval | rag/retrieval/ |
| **cost-tracker.js** | API cost tracking | utils/ |
| **shared-rules.js** | Validation rules | prompts/ |
| **TEST_SUITE_20.json** | Test suite definition | Root |
| **DOCUMENTATION_INDEX.md** | Doc navigation | Root |

---

## 📏 Code Organization Principles

### **Separation of Concerns**
- **Pipeline:** 3 agents with clear responsibilities
- **Validation:** Dual layer (JavaScript + LLM)
- **RAG:** Retrieval, embedding, reranking separated

### **DRY (Don't Repeat Yourself)**
- Shared rules in `prompts/shared-rules.js`
- Reusable validation logic
- Centralized cost tracking

### **Testability**
- Each agent independently testable
- Mocked RAG context for tests
- Test suite with 20 scenarios

### **Documentation**
- JSDoc for all core agents
- README files in key directories
- Comprehensive index (DOCUMENTATION_INDEX.md)

---

## 🗂️ Gitignore Strategy

**Ignored (not committed):**
- ✅ `.env` (secrets)
- ✅ `node_modules/` (dependencies)
- ✅ `logs/` (temporary logs)
- ✅ `qdrant_storage/` (vector DB data)
- ✅ `.archive/` (large backups)
- ✅ `test-results/` (temporary test outputs)
- ✅ `rag/sessions/*.json` (temporary sessions)
- ✅ `screenshots/*.png` (temporary screenshots)

**Committed (version controlled):**
- ✅ Documentation (README, guides)
- ✅ Source code (agents, services, utils)
- ✅ Tests (test suite, unit tests)
- ✅ Configuration templates (.env.example)
- ✅ Scripts (automation, deployment)
- ✅ Example workflows (data/n8n-workflows/)

---

## 🧹 Maintenance & Cleanup

### **Automatic Cleanup**
- **Logs:** Cleaned after 7 days (`find logs -mtime +7 -delete`)
- **Test Results:** Not committed (gitignored)
- **Sessions:** Temporary, cleaned on server restart

### **Manual Cleanup (Periodic)**
- **Old backups:** Keep only latest (`data/n8n-docs-backup-*`)
- **Archives:** Move to `.archive/` if >100M
- **Research:** Archive experiments to `.archive/research/`

### **Optimization Applied (Oct 2025)**
- ✅ 38 obsolete docs archived
- ✅ Old backup removed (6.5M saved)
- ✅ backup/ moved to .archive/ (371M cleaned)
- ✅ Logs auto-cleanup configured
- ✅ .gitignore optimized

**Total Space Saved: ~378M**

---

## 📊 Directory Sizes (Approx)

| Directory | Size | Notes |
|-----------|------|-------|
| `data/` | ~50M | RAG knowledge base |
| `qdrant_storage/` | ~200M | Vector DB (3907 vectors) |
| `node_modules/` | ~150M | Dependencies (gitignored) |
| `.archive/` | ~371M | Old backups (gitignored) |
| `docs/` | ~2M | Documentation |
| `rag/` | ~5M | Core agents + logic |
| `scripts/` | ~1M | Automation scripts |

**Total Project (excluding ignored):** ~60M
**Total with dependencies:** ~210M
**Total with archives:** ~580M (but gitignored)

---

## 🔄 Common Operations

### **Finding Files**
```bash
# Find all agent files
find rag/pipeline -name "*-agent.js"

# Find all test files
find __tests__ -name "*.test.js"

# Find all markdown docs
find . -name "*.md" -not -path "./node_modules/*"
```

### **Cleaning Up**
```bash
# Clean old logs (>7 days)
find logs -type f -name "*.log" -mtime +7 -delete

# Clean test results
rm -rf test-results/*

# Clean node_modules
rm -rf node_modules && npm install
```

### **Checking Sizes**
```bash
# Project size
du -sh .

# Data size
du -sh data/

# Archive size
du -sh .archive/
```

---

## 🚀 Quick Navigation

- **Start coding?** → `rag/pipeline/` (3 agents)
- **Need docs?** → `DOCUMENTATION_INDEX.md`
- **Running tests?** → `TEST_SUITE_20.json` + `scripts/run-test-suite.js`
- **Enriching RAG?** → `ENRICHMENT_GUIDE.md` + `scripts/inject-workflows-chunked.js`
- **Understanding structure?** → This file!

---

## 📝 Notes

- This structure is optimized for multi-agent RAG workflow generation
- All core logic is in `rag/pipeline/` (3 agents)
- Knowledge base in `data/` (RAG docs + workflows)
- Tests in `__tests__/` + `test-results/`
- Archives in `.archive/` (gitignored, large backups)

---

*Last optimized: October 16, 2025*
*Total cleanup: 378M saved, structure optimized for production*
