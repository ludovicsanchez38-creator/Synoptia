#!/usr/bin/env node
/**
 * Workflow RAG Indexer
 * Indexe les workflows n8n récupérés dans le système RAG (Qdrant + embeddings)
 */

const fs = require('fs').promises;
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');

// Configuration
const CONFIG = {
  workflowsDir: path.join(__dirname, '../data/n8n-workflows'),
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  collectionName: 'n8n_workflows',
  embeddingModel: 'text-embedding-3-small',
  vectorSize: 1536,
  batchSize: 10
};

class WorkflowRAGIndexer {
  constructor() {
    this.qdrant = new QdrantClient({ url: CONFIG.qdrantUrl });
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.stats = {
      processed: 0,
      indexed: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * Initialize Qdrant collection
   */
  async initCollection() {
    console.log('🔧 Initializing Qdrant collection...');

    try {
      // Check if collection exists
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(
        c => c.name === CONFIG.collectionName
      );

      if (!exists) {
        // Create collection
        await this.qdrant.createCollection(CONFIG.collectionName, {
          vectors: {
            size: CONFIG.vectorSize,
            distance: 'Cosine'
          }
        });
        console.log(`✅ Created collection: ${CONFIG.collectionName}`);
      } else {
        console.log(`✅ Collection already exists: ${CONFIG.collectionName}`);
      }

    } catch (error) {
      console.error(`❌ Failed to initialize collection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load workflows from disk
   */
  async loadWorkflows() {
    console.log('\n📁 Loading workflows from disk...');

    try {
      const files = await fs.readdir(CONFIG.workflowsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      console.log(`   Found ${jsonFiles.length} workflow files`);

      const workflows = [];

      for (const file of jsonFiles) {
        try {
          const filepath = path.join(CONFIG.workflowsDir, file);
          const content = await fs.readFile(filepath, 'utf-8');
          const data = JSON.parse(content);

          workflows.push({
            file,
            ...data
          });

        } catch (error) {
          console.error(`   ⚠️  Failed to load ${file}: ${error.message}`);
          this.stats.failed++;
        }
      }

      console.log(`✅ Loaded ${workflows.length} workflows`);
      return workflows;

    } catch (error) {
      console.error(`❌ Failed to load workflows: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embedding for workflow
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: CONFIG.embeddingModel,
        input: text.substring(0, 8000) // Limit to 8k chars
      });

      return response.data[0].embedding;

    } catch (error) {
      console.error(`❌ Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create searchable text from workflow
   */
  createSearchableText(workflowData) {
    const { workflow, metadata } = workflowData;

    const parts = [
      `Name: ${metadata.name}`,
      `Description: ${metadata.description}`,
      `Nodes: ${metadata.nodes}`,
      `Source: ${metadata.source}`,
      `Tags: ${metadata.tags.join(', ')}`
    ];

    // Add node types
    if (workflow.nodes) {
      const nodeTypes = workflow.nodes
        .map(n => n.type)
        .filter((v, i, a) => a.indexOf(v) === i);
      parts.push(`Node Types: ${nodeTypes.join(', ')}`);
    }

    // Add node names
    if (workflow.nodes) {
      const nodeNames = workflow.nodes
        .map(n => n.name)
        .join(', ');
      parts.push(`Components: ${nodeNames}`);
    }

    return parts.join('\n');
  }

  /**
   * Index workflows in batches
   */
  async indexWorkflows(workflows) {
    console.log('\n🔍 Indexing workflows to RAG...');

    const batches = [];
    for (let i = 0; i < workflows.length; i += CONFIG.batchSize) {
      batches.push(workflows.slice(i, i + CONFIG.batchSize));
    }

    console.log(`   Processing ${batches.length} batches...`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      console.log(`   Batch ${batchIndex + 1}/${batches.length}...`);

      const points = [];

      for (const wf of batch) {
        try {
          // Create searchable text
          const searchText = this.createSearchableText(wf);

          // Generate embedding
          const embedding = await this.generateEmbedding(searchText);

          // Create Qdrant point
          points.push({
            id: wf.metadata.hash,
            vector: embedding,
            payload: {
              name: wf.metadata.name,
              description: wf.metadata.description,
              nodes: wf.metadata.nodes,
              connections: wf.metadata.connections,
              tags: wf.metadata.tags,
              source: wf.metadata.source,
              fetchedAt: wf.metadata.fetchedAt,
              nodeTypes: wf.workflow.nodes?.map(n => n.type) || [],
              workflowJson: JSON.stringify(wf.workflow),
              searchText
            }
          });

          this.stats.processed++;

        } catch (error) {
          console.error(`   ⚠️  Failed to process ${wf.metadata.name}: ${error.message}`);
          this.stats.failed++;
        }
      }

      // Upload batch to Qdrant
      if (points.length > 0) {
        try {
          await this.qdrant.upsert(CONFIG.collectionName, {
            wait: true,
            points
          });

          this.stats.indexed += points.length;
          console.log(`   ✅ Indexed ${points.length} workflows`);

        } catch (error) {
          console.error(`   ❌ Failed to index batch: ${error.message}`);
          this.stats.failed += points.length;
        }
      }

      // Rate limiting (avoid OpenAI rate limits)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Generate report
   */
  generateReport() {
    console.log('\n\n📊 INDEXING REPORT');
    console.log('═'.repeat(50));
    console.log(`✅ Processed: ${this.stats.processed}`);
    console.log(`✅ Indexed: ${this.stats.indexed}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`\n📦 Collection: ${CONFIG.collectionName}`);
    console.log(`🔗 Qdrant: ${CONFIG.qdrantUrl}`);
    console.log('═'.repeat(50));
  }

  /**
   * Test search
   */
  async testSearch(query = 'send email') {
    console.log(`\n🔎 Testing search: "${query}"`);

    try {
      // Generate query embedding
      const embedding = await this.generateEmbedding(query);

      // Search in Qdrant
      const results = await this.qdrant.search(CONFIG.collectionName, {
        vector: embedding,
        limit: 5
      });

      console.log(`\n   Found ${results.length} results:`);

      results.forEach((result, i) => {
        console.log(`\n   ${i + 1}. ${result.payload.name}`);
        console.log(`      Score: ${result.score.toFixed(3)}`);
        console.log(`      Nodes: ${result.payload.nodes}`);
        console.log(`      Source: ${result.payload.source}`);
      });

    } catch (error) {
      console.error(`❌ Search test failed: ${error.message}`);
    }
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🚀 Workflow RAG Indexer');
    console.log('═'.repeat(50));

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set');
    }

    // Initialize collection
    await this.initCollection();

    // Load workflows
    const workflows = await this.loadWorkflows();

    if (workflows.length === 0) {
      console.log('⚠️  No workflows to index. Run fetch-workflows.js first.');
      return this.stats;
    }

    // Index workflows
    await this.indexWorkflows(workflows);

    // Generate report
    this.generateReport();

    // Test search
    await this.testSearch('send email notification');

    return this.stats;
  }
}

// Execute if run directly
if (require.main === module) {
  const indexer = new WorkflowRAGIndexer();

  indexer.run()
    .then(stats => {
      console.log('\n✅ Indexing completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Indexing failed:', error);
      process.exit(1);
    });
}

module.exports = WorkflowRAGIndexer;
