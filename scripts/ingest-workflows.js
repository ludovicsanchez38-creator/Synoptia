const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const client = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const WORKFLOWS_DIR = process.env.WORKFLOWS_BACKUP_DIR || path.join(__dirname, 'data', 'workflows_backup');
const BATCH_SIZE = 50; // Traiter par lots pour éviter rate limits
const MAX_WORKFLOWS = 2000; // Limiter pour l'ingestion initiale

// Extraction des informations clés d'un workflow
function extractWorkflowInfo(workflow) {
  const nodes = workflow.nodes || [];
  const nodeTypes = [...new Set(nodes.map(n => n.type).filter(Boolean))];
  const nodeNames = [...new Set(nodes.map(n => n.name).filter(Boolean))];

  // Extraire les intégrations (enlever les prefixes n8n-nodes-base.)
  const integrations = nodeTypes
    .map(t => t.replace('n8n-nodes-base.', '').replace('n8n-nodes-langchain.', ''))
    .filter(t => !['stickyNote', 'noOp'].includes(t));

  // Déterminer la complexité
  const nodeCount = nodes.length;
  let complexity = 'medium';
  if (nodeCount <= 5) complexity = 'simple';
  else if (nodeCount >= 16) complexity = 'complex';

  // Extraire les triggers
  const triggers = nodes.filter(n => n.type?.includes('trigger') || n.type?.includes('Trigger'));

  // Générer une description enrichie
  const description = workflow.description || workflow.name || 'Workflow n8n';

  return {
    id: workflow.id,
    name: workflow.name || 'Unnamed workflow',
    description,
    nodeCount,
    complexity,
    integrations: integrations.slice(0, 10), // Limiter à 10 intégrations max
    nodeTypes: nodeTypes.slice(0, 10),
    triggers: triggers.map(t => t.type),
    connections: Object.keys(workflow.connections || {}).length,
    active: workflow.active || false
  };
}

// Générer le texte pour embedding
function generateEmbeddingText(info) {
  return `
Workflow N8N: ${info.name}

Description: ${info.description}

Caractéristiques:
- Nombre de nœuds: ${info.nodeCount}
- Complexité: ${info.complexity}
- Connexions: ${info.connections}
- Actif: ${info.active ? 'Oui' : 'Non'}

Intégrations utilisées: ${info.integrations.join(', ')}

Types de nœuds: ${info.nodeTypes.join(', ')}

Triggers: ${info.triggers.length > 0 ? info.triggers.join(', ') : 'Manuel'}

Ce workflow peut être utilisé pour: ${info.description}
  `.trim();
}

// Parcourir récursivement les fichiers JSON
async function findWorkflowFiles(dir, maxFiles = MAX_WORKFLOWS) {
  const files = [];

  async function traverse(currentDir) {
    if (files.length >= maxFiles) return;

    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.includes('backup')) {
        files.push(fullPath);
      }
    }
  }

  await traverse(dir);
  return files;
}

// Ingestion par lots
async function ingestBatch(workflows, batchIndex) {
  const points = [];

  for (const workflow of workflows) {
    try {
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: generateEmbeddingText(workflow),
        dimensions: 3072
      });

      const id = crypto.randomUUID();

      points.push({
        id,
        vector: embedding.data[0].embedding,
        payload: {
          type: 'workflow_example',
          source: 'n8n-workflows-github',
          category: 'workflow_template',
          timestamp: Date.now(),
          ...workflow,
          keywords: [
            ...workflow.integrations.map(i => i.toLowerCase()),
            workflow.complexity,
            'n8n',
            'workflow',
            'automation'
          ]
        }
      });

    } catch (error) {
      console.error(`⚠️  Erreur embedding pour ${workflow.name}: ${error.message}`);
    }
  }

  if (points.length > 0) {
    await client.upsert('synoptia_knowledge', { points });
    console.log(`✅ Batch ${batchIndex + 1}: ${points.length} workflows ingérés`);
  }

  return points.length;
}

// Fonction principale
(async () => {
  try {
    console.log('🚀 Ingestion des workflows n8n...\n');
    console.log(`📂 Répertoire: ${WORKFLOWS_DIR}`);
    console.log(`📊 Limite: ${MAX_WORKFLOWS} workflows\n`);

    // 1. Trouver tous les fichiers
    console.log('🔍 Recherche des fichiers JSON...');
    const workflowFiles = await findWorkflowFiles(WORKFLOWS_DIR);
    console.log(`✅ ${workflowFiles.length} workflows trouvés\n`);

    // 2. Lire et extraire les infos
    console.log('📖 Extraction des métadonnées...');
    const workflows = [];
    let skipped = 0;

    for (const file of workflowFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const workflow = JSON.parse(content);
        const info = extractWorkflowInfo(workflow);

        // Filtrer les workflows vides ou invalides
        if (info.nodeCount > 0 && info.integrations.length > 0) {
          workflows.push(info);
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`⚠️  Erreur lecture ${path.basename(file)}: ${error.message}`);
        skipped++;
      }
    }

    console.log(`✅ ${workflows.length} workflows valides (${skipped} ignorés)\n`);

    // 3. Statistiques
    const stats = {
      simple: workflows.filter(w => w.complexity === 'simple').length,
      medium: workflows.filter(w => w.complexity === 'medium').length,
      complex: workflows.filter(w => w.complexity === 'complex').length,
      avgNodes: (workflows.reduce((sum, w) => sum + w.nodeCount, 0) / workflows.length).toFixed(1),
      topIntegrations: {}
    };

    workflows.forEach(w => {
      w.integrations.forEach(i => {
        stats.topIntegrations[i] = (stats.topIntegrations[i] || 0) + 1;
      });
    });

    const topIntegrations = Object.entries(stats.topIntegrations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('📊 Statistiques:');
    console.log(`   Simple: ${stats.simple} | Moyen: ${stats.medium} | Complexe: ${stats.complex}`);
    console.log(`   Moyenne nœuds: ${stats.avgNodes}`);
    console.log(`\n🔝 Top 10 intégrations:`);
    topIntegrations.forEach(([name, count]) => {
      console.log(`   ${name}: ${count} workflows`);
    });
    console.log('');

    // 4. Ingestion par lots
    console.log('💾 Ingestion dans Qdrant...\n');
    let totalIngested = 0;

    for (let i = 0; i < workflows.length; i += BATCH_SIZE) {
      const batch = workflows.slice(i, i + BATCH_SIZE);
      const count = await ingestBatch(batch, Math.floor(i / BATCH_SIZE));
      totalIngested += count;

      // Pause pour éviter rate limits
      if (i + BATCH_SIZE < workflows.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n🎉 ${totalIngested} workflows ingérés dans Qdrant!`);

    // 5. Vérification
    const results = await client.scroll('synoptia_knowledge', {
      filter: {
        must: [
          { key: 'type', match: { value: 'workflow_example' } }
        ]
      },
      limit: 10
    });

    console.log(`\n✅ Vérification: ${results.points.length} workflows dans Qdrant`);

    if (results.points.length > 0) {
      console.log('\n📋 Exemples ingérés:');
      results.points.slice(0, 3).forEach(p => {
        console.log(`   - ${p.payload.name} (${p.payload.complexity}, ${p.payload.nodeCount} nœuds)`);
      });
    }

  } catch(e) {
    console.error('❌ Erreur:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
