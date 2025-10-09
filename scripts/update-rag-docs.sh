#!/bin/bash
# Update RAG with latest n8n documentation
# All-in-one script: fetch + index

set -e

echo "🚀 N8N Docs RAG Update"
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
echo "Step 1/3: Fetching n8n documentation..."
echo "───────────────────────────────────────────────────────"
node scripts/fetch-n8n-docs.js

if [ $? -ne 0 ]; then
  echo "❌ Fetch failed"
  exit 1
fi

echo ""
echo "Step 2/3: Indexing documentation to RAG..."
echo "───────────────────────────────────────────────────────"
node scripts/index-n8n-docs-to-rag.js

if [ $? -ne 0 ]; then
  echo "❌ Indexing failed"
  exit 1
fi

echo ""
echo "Step 3/3: Verification..."
echo "───────────────────────────────────────────────────────"

# Count docs
DOCS_COUNT=$(ls -1 data/n8n-docs/*.json 2>/dev/null | wc -l)
echo "✅ Total docs stored: $DOCS_COUNT"

# Check Qdrant
QDRANT_COUNT=$(curl -s http://localhost:6333/collections/synoptia_knowledge 2>/dev/null | jq -r '.result.points_count' 2>/dev/null || echo "0")
echo "✅ Total vectors in Qdrant: $QDRANT_COUNT"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ RAG update completed successfully!"
echo ""
echo "💡 Next steps:"
echo "   - Restart workflow builder: ./start.sh prod"
echo "   - Test generation: curl -X POST http://localhost:3002/api/generate \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"message\": \"envoyer un email avec gmail\"}'"
echo "═══════════════════════════════════════════════════════"
