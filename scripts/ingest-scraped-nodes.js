#!/usr/bin/env node

/**
 * Ingestion des Nodes N8N scrapés dans le RAG
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs').promises;
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');
const Redis = require('ioredis');

const DATA_DIR = path.join(__dirname, '../data/n8n-nodes');
const COLLECTION_NAME = 'synoptia_knowledge';

class NodeDocumentIngester {
  constructor() {
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333'
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      db: 2 // DB 2 pour Workflow Builder
    });

    this.stats = {
      total: 0,
      ingested: 0,
      skipped: 0,
      errors: 0,
      totalCost: 0
    };
  }

  /**
   * Initialise la collection Qdrant si nécessaire
   */
  async initialize() {
    console.log('🚀 Initialisation...\n');

    try {
      // Vérifier si collection existe
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

      if (!exists) {
        console.log('📦 Création de la collection Qdrant...');
        await this.qdrant.createCollection(COLLECTION_NAME, {
          vectors: {
            size: 3072, // text-embedding-3-large
            distance: 'Cosine'
          }
        });
        console.log('✅ Collection créée\n');
      } else {
        console.log('✅ Collection existe déjà\n');
      }

    } catch (error) {
      console.error('❌ Erreur initialisation:', error.message);
      throw error;
    }
  }

  /**
   * Charge les documents depuis les fichiers JSON
   */
  async loadDocuments() {
    console.log('📂 Chargement des documents...\n');

    try {
      const files = await fs.readdir(DATA_DIR);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('complete'));

      if (jsonFiles.length === 0) {
        throw new Error('Aucun fichier de nodes trouvé. Lancez d\'abord scrape-all-n8n-nodes.js');
      }

      // Prendre le fichier le plus récent
      const latestFile = jsonFiles.sort().reverse()[0];
      const filepath = path.join(DATA_DIR, latestFile);

      console.log(`📄 Fichier: ${latestFile}`);

      const content = await fs.readFile(filepath, 'utf-8');
      const documents = JSON.parse(content);

      console.log(`✅ ${documents.length} nodes chargés\n`);

      return documents;

    } catch (error) {
      throw new Error(`Erreur chargement documents: ${error.message}`);
    }
  }

  /**
   * Prépare les chunks d'un document
   */
  prepareChunks(document) {
    const chunks = [];

    // Chunk 1: Vue d'ensemble
    const overview = `${document.title}

Description: ${document.description}

Category: ${document.category}

${document.operations.length > 0 ? `Operations: ${document.operations.map(op => op.name).join(', ')}` : ''}

${document.credentials.length > 0 ? `Required credentials: ${document.credentials.join(', ')}` : ''}`;

    chunks.push({
      content: overview,
      type: 'overview',
      metadata: {
        ...document.metadata,
        chunkType: 'overview',
        title: document.title,
        url: document.url
      }
    });

    // Chunk 2: Contenu principal (si > 500 chars)
    if (document.content.length > 500) {
      const mainContent = document.content.substring(0, 2000);
      chunks.push({
        content: mainContent,
        type: 'content',
        metadata: {
          ...document.metadata,
          chunkType: 'content',
          title: document.title,
          url: document.url
        }
      });
    }

    // Chunk 3: Opérations détaillées
    if (document.operations.length > 0) {
      const opsContent = document.operations.map(op =>
        `Operation: ${op.name}\n${op.description}`
      ).join('\n\n');

      chunks.push({
        content: `${document.title} Operations:\n\n${opsContent}`,
        type: 'operations',
        metadata: {
          ...document.metadata,
          chunkType: 'operations',
          title: document.title,
          url: document.url
        }
      });
    }

    // Chunk 4: Exemples
    if (document.examples.length > 0) {
      const examplesContent = document.examples.map((ex, i) =>
        `Example ${i + 1}:\n${ex}`
      ).join('\n\n');

      chunks.push({
        content: `${document.title} Examples:\n\n${examplesContent}`,
        type: 'examples',
        metadata: {
          ...document.metadata,
          chunkType: 'examples',
          title: document.title,
          url: document.url,
          hasCode: true
        }
      });
    }

    return chunks;
  }

  /**
   * Génère embedding pour un texte
   */
  async embed(text) {
    // Vérifier cache Redis
    const cacheKey = `embed:${Buffer.from(text).toString('base64').substring(0, 50)}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Cache miss, continuer
    }

    // Générer embedding
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text.substring(0, 8000), // Limite OpenAI
        dimensions: 3072
      });

      const embedding = response.data[0].embedding;

      // Estimer coût
      const tokens = Math.ceil(text.length / 4);
      const cost = (tokens / 1000000) * 0.13; // $0.13 per 1M tokens
      this.stats.totalCost += cost;

      // Mettre en cache
      try {
        await this.redis.setex(cacheKey, 7 * 24 * 60 * 60, JSON.stringify(embedding));
      } catch (error) {
        // Ignorer erreur cache
      }

      return embedding;

    } catch (error) {
      throw new Error(`Embedding failed: ${error.message}`);
    }
  }

  /**
   * Ingère un document
   */
  async ingestDocument(document, index) {
    try {
      const chunks = this.prepareChunks(document);

      for (const chunk of chunks) {
        const vector = await this.embed(chunk.content);

        const point = {
          id: `node_${document.metadata.nodeType}_${chunk.type}_${index}_${Date.now()}`,
          vector,
          payload: {
            content: chunk.content,
            ...chunk.metadata,
            nodeName: document.name,
            ingestedAt: Date.now()
          }
        };

        await this.qdrant.upsert(COLLECTION_NAME, {
          wait: true,
          points: [point]
        });

        await this.sleep(100); // Rate limiting OpenAI
      }

      this.stats.ingested++;
      console.log(`  ✓ ${document.name} (${chunks.length} chunks)`);

    } catch (error) {
      this.stats.errors++;
      console.error(`  ✗ ${document.name}: ${error.message}`);
    }
  }

  /**
   * Ingère tous les documents
   */
  async ingestAll() {
    console.log('📥 Démarrage ingestion...\n');

    const documents = await this.loadDocuments();
    this.stats.total = documents.length;

    const batchSize = 5;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      console.log(`\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`);

      for (const doc of batch) {
        await this.ingestDocument(doc, i);
      }

      // Checkpoint
      if ((i + batchSize) % 50 === 0) {
        console.log(`\n💾 Checkpoint: ${this.stats.ingested}/${this.stats.total} ingérés`);
        console.log(`💰 Coût actuel: $${this.stats.totalCost.toFixed(4)}`);
      }
    }

    this.printSummary();
  }

  /**
   * Affiche le résumé
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DE L\'INGESTION');
    console.log('='.repeat(60));
    console.log(`Total documents: ${this.stats.total}`);
    console.log(`✅ Ingérés: ${this.stats.ingested}`);
    console.log(`❌ Erreurs: ${this.stats.errors}`);
    console.log(`⏭️  Ignorés: ${this.stats.skipped}`);
    console.log(`💰 Coût total: $${this.stats.totalCost.toFixed(4)}`);
    console.log(`Taux succès: ${((this.stats.ingested / this.stats.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
  }

  /**
   * Ferme les connexions
   */
  async close() {
    await this.redis.quit();
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exécution
if (require.main === module) {
  const ingester = new NodeDocumentIngester();

  ingester.initialize()
    .then(() => ingester.ingestAll())
    .then(() => ingester.close())
    .then(() => {
      console.log('\n✅ Ingestion terminée !');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = NodeDocumentIngester;
