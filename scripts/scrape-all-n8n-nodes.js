#!/usr/bin/env node

/**
 * Scraper Complet N8N Nodes
 * Scrape TOUS les nodes n8n (400+) et ingère dans le RAG
 */

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'https://docs.n8n.io';
const OUTPUT_DIR = path.join(__dirname, '../data/n8n-nodes');

class ComprehensiveN8nScraper {
  constructor() {
    this.nodes = [];
    this.scraped = new Set();
    this.errors = [];
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0
    };
  }

  /**
   * Découvre tous les nodes depuis les pages d'index
   */
  async discoverAllNodes() {
    console.log('🔍 Découverte de tous les nodes n8n...\n');

    const indexPages = [
      '/integrations/builtin/app-nodes/',
      '/integrations/builtin/core-nodes/',
      '/integrations/builtin/trigger-nodes/',
      '/integrations/builtin/cluster-nodes/'
    ];

    for (const indexPath of indexPages) {
      try {
        console.log(`📄 Scraping index: ${indexPath}`);
        await this.discoverNodesFromIndex(indexPath);
        await this.sleep(1000);
      } catch (error) {
        console.error(`❌ Erreur sur ${indexPath}:`, error.message);
      }
    }

    console.log(`\n✅ ${this.nodes.length} nodes découverts\n`);
    return this.nodes;
  }

  /**
   * Découvre les nodes depuis une page d'index
   */
  async discoverNodesFromIndex(indexPath) {
    const url = `${BASE_URL}${indexPath}`;

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'SynoptiaBot/2.0 (Complete Documentation Scraper)'
        }
      });

      const $ = cheerio.load(response.data);

      // Extraire tous les liens (y compris relatifs)
      $('a[href]').each((_, element) => {
        let href = $(element).attr('href');
        const text = $(element).text().trim();

        // Ignorer liens vides ou ancres
        if (!href || href === '#' || href.startsWith('#')) return;

        // Gérer les liens relatifs
        if (href.startsWith('../')) {
          // Convertir ../core-nodes/xxx en /integrations/builtin/core-nodes/xxx
          href = href.replace(/^\.\.\//, '/integrations/builtin/');
        } else if (href.startsWith('./')) {
          href = indexPath + href.substring(2);
        } else if (!href.startsWith('http') && !href.startsWith('/')) {
          href = indexPath + href;
        }

        if (this.isNodeDocPage(href)) {
          const nodeUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          const nodeName = this.extractNodeName(text, href);

          if (nodeName && nodeName.length > 2 && !this.scraped.has(nodeUrl)) {
            this.nodes.push({
              name: nodeName,
              url: nodeUrl,
              path: href,
              category: this.categorizeNode(href)
            });
            this.scraped.add(nodeUrl);
          }
        }
      });

    } catch (error) {
      throw new Error(`Failed to fetch index ${indexPath}: ${error.message}`);
    }
  }

  /**
   * Vérifie si c'est une page de doc de node
   */
  isNodeDocPage(href) {
    // Patterns valides pour les nodes
    const validPatterns = [
      'n8n-nodes-base.',
      'n8n-nodes-langchain.'
    ];

    // Doit contenir un pattern de node
    const hasNodePattern = validPatterns.some(pattern => href.includes(pattern));

    // Ne doit pas être une page d'index
    const isNotIndex = !href.match(/\/(app-nodes|core-nodes|trigger-nodes|cluster-nodes)\/?$/);

    // Ne doit pas être un lien ancre ou autre
    const isValid = !href.includes('#') && href.includes('/integrations/');

    return hasNodePattern && isNotIndex && isValid;
  }

  /**
   * Extrait le nom propre du node
   */
  extractNodeName(text, href) {
    // Nettoyer le texte
    let name = text.replace(/\s+node$/i, '').trim();

    // Si pas de texte, extraire du href
    if (!name || name.length < 2) {
      const match = href.match(/n8n-nodes[^\/]*\.([^\/]+)/);
      if (match) {
        name = match[1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
    }

    return name;
  }

  /**
   * Catégorise le node
   */
  categorizeNode(href) {
    if (href.includes('/app-nodes/')) return 'app_integration';
    if (href.includes('/core-nodes/')) return 'core_utility';
    if (href.includes('/trigger-nodes/')) return 'trigger';
    if (href.includes('/cluster-nodes/')) return 'ai_langchain';
    if (href.includes('/actions/')) return 'action';
    return 'other';
  }

  /**
   * Scrape un node spécifique
   */
  async scrapeNode(node) {
    if (this.scraped.has(node.url)) {
      this.stats.skipped++;
      return null;
    }

    this.scraped.add(node.url);

    try {
      const response = await axios.get(node.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'SynoptiaBot/2.0'
        }
      });

      const $ = cheerio.load(response.data);

      // Extraire contenu principal
      const mainContent = $('main, article, .markdown-body, .content').first();

      // Supprimer navigation, footer, etc.
      mainContent.find('nav, footer, .sidebar, .breadcrumb, script, style, .ad').remove();

      // Titre
      const title = $('h1').first().text().trim() || node.name;

      // Description
      const description = $('meta[name="description"]').attr('content') ||
                         $('p').first().text().trim().substring(0, 200);

      // Contenu textuel
      const content = mainContent.text()
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      // Extraire sections importantes
      const operations = this.extractOperations($);
      const credentials = this.extractCredentials($);
      const examples = this.extractExamples($);
      const parameters = this.extractParameters($);

      const document = {
        name: node.name,
        title,
        description,
        url: node.url,
        path: node.path,
        category: node.category,
        content,
        operations,
        credentials,
        examples,
        parameters,
        metadata: {
          source: 'n8n_docs_comprehensive',
          nodeType: this.extractNodeType(node.path),
          category: node.category,
          scrapedAt: Date.now(),
          contentLength: content.length,
          hasExamples: examples.length > 0,
          operationsCount: operations.length
        }
      };

      this.stats.success++;
      console.log(`  ✓ ${node.name} (${content.length} chars, ${operations.length} ops)`);

      return document;

    } catch (error) {
      this.stats.failed++;
      this.errors.push({ node: node.name, error: error.message });
      console.error(`  ✗ ${node.name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extrait les opérations du node
   */
  extractOperations($) {
    const operations = [];

    $('h2, h3').each((_, element) => {
      const text = $(element).text().trim();

      // Patterns d'opérations
      if (text.match(/^(create|get|update|delete|list|send|execute|search)/i)) {
        const description = $(element).next('p').text().trim();
        operations.push({
          name: text,
          description: description.substring(0, 200)
        });
      }
    });

    return operations;
  }

  /**
   * Extrait les credentials nécessaires
   */
  extractCredentials($) {
    const credentials = [];

    $('a[href*="/credentials/"], code').each((_, element) => {
      const text = $(element).text().trim();
      if (text.includes('Api') || text.includes('OAuth') || text.includes('auth')) {
        if (!credentials.includes(text)) {
          credentials.push(text);
        }
      }
    });

    return credentials.slice(0, 5);
  }

  /**
   * Extrait les exemples de code
   */
  extractExamples($) {
    const examples = [];

    $('pre code, .code-block').each((_, element) => {
      const code = $(element).text().trim();
      if (code.length > 20 && code.length < 2000) {
        examples.push(code);
      }
    });

    return examples.slice(0, 3);
  }

  /**
   * Extrait les paramètres documentés
   */
  extractParameters($) {
    const params = [];

    $('table tr, .parameter, dt').each((_, element) => {
      const text = $(element).text().trim();
      if (text.includes('parameter') || text.includes('field')) {
        params.push(text.substring(0, 100));
      }
    });

    return params.slice(0, 10);
  }

  /**
   * Extrait le type technique du node
   */
  extractNodeType(path) {
    const match = path.match(/n8n-nodes-([^.]+)\.(.+)/);
    return match ? match[2].replace(/\//g, '') : 'unknown';
  }

  /**
   * Scrape tous les nodes
   */
  async scrapeAll() {
    console.log('🚀 Démarrage scraping complet n8n\n');

    // 1. Découvrir tous les nodes
    await this.discoverAllNodes();

    if (this.nodes.length === 0) {
      console.error('❌ Aucun node découvert !');
      return;
    }

    this.stats.total = this.nodes.length;

    // 2. Créer répertoire de sortie
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // 3. Scrape chaque node
    console.log('📥 Scraping des nodes...\n');

    const documents = [];
    const batchSize = 10;

    for (let i = 0; i < this.nodes.length; i += batchSize) {
      const batch = this.nodes.slice(i, i + batchSize);

      console.log(`\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(this.nodes.length / batchSize)}`);

      const results = await Promise.all(
        batch.map(node => this.scrapeNode(node))
      );

      documents.push(...results.filter(doc => doc !== null));

      // Rate limiting
      await this.sleep(2000);

      // Sauvegarder progression
      if (documents.length % 50 === 0) {
        await this.saveDocuments(documents, 'partial');
      }
    }

    // 4. Sauvegarder tous les documents
    await this.saveDocuments(documents, 'complete');

    // 5. Afficher résumé
    this.printSummary();

    return documents;
  }

  /**
   * Sauvegarde les documents
   */
  async saveDocuments(documents, suffix = '') {
    const filename = suffix
      ? `n8n-nodes-${suffix}-${Date.now()}.json`
      : `n8n-nodes-${Date.now()}.json`;

    const filepath = path.join(OUTPUT_DIR, filename);

    await fs.writeFile(
      filepath,
      JSON.stringify(documents, null, 2),
      'utf-8'
    );

    console.log(`\n💾 Sauvegardé: ${filepath} (${documents.length} nodes)`);
  }

  /**
   * Affiche le résumé
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DU SCRAPING');
    console.log('='.repeat(60));
    console.log(`Total nodes découverts: ${this.stats.total}`);
    console.log(`✅ Succès: ${this.stats.success}`);
    console.log(`❌ Échecs: ${this.stats.failed}`);
    console.log(`⏭️  Ignorés: ${this.stats.skipped}`);
    console.log(`Taux succès: ${((this.stats.success / this.stats.total) * 100).toFixed(1)}%`);

    if (this.errors.length > 0) {
      console.log('\n🚨 Erreurs:');
      this.errors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.node}: ${err.error}`);
      });
      if (this.errors.length > 10) {
        console.log(`  ... et ${this.errors.length - 10} autres erreurs`);
      }
    }

    console.log('\n' + '='.repeat(60));
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
  const scraper = new ComprehensiveN8nScraper();

  scraper.scrapeAll()
    .then(documents => {
      console.log('\n✅ Scraping terminé !');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveN8nScraper;
