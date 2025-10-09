#!/usr/bin/env node
/**
 * N8N Docs RAG Indexer
 * Indexe la documentation n8n dans Qdrant avec embeddings OpenAI
 */

const fs = require('fs').promises;
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');

// Configuration
const CONFIG = {
  docsDir: path.join(__dirname, '../data/n8n-docs'),
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  collectionName: 'synoptia_knowledge', // Collection partagée
  embeddingModel: 'text-embedding-3-large',
  vectorSize: 3072,
  batchSize: 10
};

class N8nDocsRAGIndexer {
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
   * Initialize or verify Qdrant collection
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
        console.log(`✅ Collection exists: ${CONFIG.collectionName}`);
      }

      // Verify collection config
      const info = await this.qdrant.getCollection(CONFIG.collectionName);
      console.log(`  📊 Current points: ${info.points_count}`);
      console.log(`  📏 Vector size: ${info.config.params.vectors.size}`);

    } catch (error) {
      console.error(`❌ Failed to initialize collection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load documents from disk
   */
  async loadDocuments() {
    console.log('\n📁 Loading n8n docs from disk...');

    try {
      const files = await fs.readdir(CONFIG.docsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      console.log(`  Found ${jsonFiles.length} document files`);

      const documents = [];

      for (const file of jsonFiles) {
        try {
          const filepath = path.join(CONFIG.docsDir, file);
          const content = await fs.readFile(filepath, 'utf-8');
          const doc = JSON.parse(content);
          documents.push(doc);
        } catch (error) {
          console.error(`  ⚠️  Failed to load ${file}: ${error.message}`);
          this.stats.failed++;
        }
      }

      console.log(`✅ Loaded ${documents.length} documents`);
      return documents;

    } catch (error) {
      console.error(`❌ Failed to load documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate embedding for text
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
   * Create searchable text from document
   */
  createSearchableText(doc) {
    const parts = [
      `Title: ${doc.title}`,
      `Category: ${doc.category}`,
      `Content: ${doc.content}`
    ];

    if (doc.nodeType) {
      parts.unshift(`Node Type: ${doc.nodeType}`);
    }

    if (doc.keywords && doc.keywords.length > 0) {
      parts.push(`Keywords: ${doc.keywords.join(', ')}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Index documents in batches
   */
  async indexDocuments(documents) {
    console.log('\n🔍 Indexing documents to RAG...');

    const batches = [];
    for (let i = 0; i < documents.length; i += CONFIG.batchSize) {
      batches.push(documents.slice(i, i + CONFIG.batchSize));
    }

    console.log(`  Processing ${batches.length} batches...`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      console.log(`  Batch ${batchIndex + 1}/${batches.length}...`);

      const points = [];

      for (const doc of batch) {
        try {
          // Create searchable text
          const searchText = this.createSearchableText(doc);

          // Generate embedding
          const embedding = await this.generateEmbedding(searchText);

          // Create Qdrant point
          points.push({
            id: doc.hash,
            vector: embedding,
            payload: {
              title: doc.title,
              content: doc.content,
              category: doc.category,
              nodeType: doc.nodeType,
              keywords: doc.keywords,
              url: doc.url,
              source: 'n8n-docs',
              fetchedAt: doc.fetchedAt,
              searchText
            }
          });

          this.stats.processed++;

        } catch (error) {
          console.error(`  ⚠️  Failed to process ${doc.title}: ${error.message}`);
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
          console.log(`  ✅ Indexed ${points.length} documents`);

        } catch (error) {
          console.error(`  ❌ Failed to index batch: ${error.message}`);
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
    console.log('═'.repeat(60));
    console.log(`✅ Processed: ${this.stats.processed}`);
    console.log(`✅ Indexed: ${this.stats.indexed}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`\n📦 Collection: ${CONFIG.collectionName}`);
    console.log(`🔗 Qdrant: ${CONFIG.qdrantUrl}`);
    console.log('═'.repeat(60));
  }

  /**
   * Test search
   */
  async testSearch(query = 'gmail node') {
    console.log(`\n🔎 Testing search: "${query}"`);

    try {
      // Generate query embedding
      const embedding = await this.generateEmbedding(query);

      // Search in Qdrant with filter for n8n docs
      const results = await this.qdrant.search(CONFIG.collectionName, {
        vector: embedding,
        limit: 5,
        filter: {
          must: [
            { key: 'source', match: { value: 'n8n-docs' } }
          ]
        }
      });

      console.log(`\n  Found ${results.length} results:`);

      results.forEach((result, i) => {
        console.log(`\n  ${i + 1}. ${result.payload.title}`);
        console.log(`     Score: ${result.score.toFixed(3)}`);
        console.log(`     Category: ${result.payload.category}`);
        if (result.payload.nodeType) {
          console.log(`     Node Type: ${result.payload.nodeType}`);
        }
        console.log(`     URL: ${result.payload.url}`);
      });

    } catch (error) {
      console.error(`❌ Search test failed: ${error.message}`);
    }
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🚀 N8N Docs RAG Indexer');
    console.log('═'.repeat(60));

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set');
    }

    // Initialize collection
    await this.initCollection();

    // Load documents
    const documents = await this.loadDocuments();

    if (documents.length === 0) {
      console.log('⚠️  No documents to index. Run fetch-n8n-docs.js first.');
      return this.stats;
    }

    // Index documents
    await this.indexDocuments(documents);

    // Generate report
    this.generateReport();

    // Test search
    await this.testSearch('send email with gmail');

    return this.stats;
  }
}

// Execute if run directly
if (require.main === module) {
  const indexer = new N8nDocsRAGIndexer();

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

module.exports = N8nDocsRAGIndexer;
