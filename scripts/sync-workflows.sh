#!/bin/bash
# Workflow Sync - All-in-One script
# Récupère et indexe automatiquement les workflows n8n

set -e

echo "🚀 N8N Workflow Sync"
echo "═══════════════════════════════════════════════════════"

# Check environment
if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ Error: OPENAI_API_KEY not set"
  echo "💡 Export your key: export OPENAI_API_KEY=sk-..."
  exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js not found"
  exit 1
fi

# Check dependencies
cd "$(dirname "$0")/.."
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

echo ""
echo "Step 1/3: Fetching workflows from sources..."
echo "───────────────────────────────────────────────────────"
node scripts/fetch-workflows.js

if [ $? -ne 0 ]; then
  echo "❌ Fetch failed"
  exit 1
fi

echo ""
echo "Step 2/3: Indexing workflows to RAG..."
echo "───────────────────────────────────────────────────────"
node scripts/index-workflows-to-rag.js

if [ $? -ne 0 ]; then
  echo "❌ Indexing failed"
  exit 1
fi

echo ""
echo "Step 3/3: Verification..."
echo "───────────────────────────────────────────────────────"

# Count workflows
WORKFLOW_COUNT=$(ls -1 data/n8n-workflows/*.json 2>/dev/null | wc -l)
echo "✅ Total workflows stored: $WORKFLOW_COUNT"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Sync completed successfully!"
echo ""
echo "💡 Next steps:"
echo "   - Restart workflow builder: ./start.sh prod"
echo "   - Test search: curl http://localhost:3002/api/templates"
echo "═══════════════════════════════════════════════════════"
