#!/usr/bin/env node
/**
 * N8N Documentation Fetcher
 * Récupère la documentation officielle n8n depuis docs.n8n.io
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  docsBaseUrl: 'https://docs.n8n.io',
  outputDir: path.join(__dirname, '../data/n8n-docs'),
  timeout: 30000,

  // GitHub repo for n8n docs (markdown source)
  githubRepo: 'n8n-io/n8n-docs',
  githubApiBase: 'https://api.github.com',

  // Paths to fetch from GitHub
  docsPaths: [
    'docs/integrations/builtin/core-nodes',
    'docs/integrations/builtin/app-nodes',
    'docs/integrations/builtin/trigger-nodes',
    'docs/integrations/builtin/cluster-nodes',
    'docs/workflows',
    'docs/code',
    'docs/hosting',
    'docs/user-management',
    'docs/release-notes.md'
  ]
};

class N8nDocsFetcher {
  constructor() {
    this.stats = {
      fetched: 0,
      failed: 0,
      duplicates: 0,
      totalSize: 0
    };
    this.visitedUrls = new Set();
    this.documents = [];
  }

  /**
   * Fetch a single page
   */
  async fetchPage(url) {
    try {
      const fullUrl = url.startsWith('http') ? url : `${CONFIG.docsBaseUrl}${url}`;

      if (this.visitedUrls.has(fullUrl)) {
        this.stats.duplicates++;
        return null;
      }

      console.log(`  📄 Fetching: ${fullUrl}`);

      const response = await axios.get(fullUrl, {
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': 'Synoptia-Workflow-Builder/1.0'
        }
      });

      this.visitedUrls.add(fullUrl);

      // Parse HTML
      const $ = cheerio.load(response.data);

      // Extraire le contenu principal
      const title = $('h1').first().text().trim() || $('title').text().trim();

      // Récupérer le contenu de l'article
      const article = $('article').first();
      let content = '';

      if (article.length > 0) {
        // Extraire texte des paragraphes, headings, listes
        article.find('p, h1, h2, h3, h4, li, code, pre').each((i, elem) => {
          const text = $(elem).text().trim();
          if (text) {
            content += text + '\n\n';
          }
        });
      } else {
        // Fallback: extraire tout le texte de la page
        content = $('body').text().trim();
      }

      // Nettoyer le contenu
      content = content
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+/g, ' ')
        .trim();

      if (!content || content.length < 100) {
        console.log(`    ⚠️  Contenu trop court, ignoré`);
        return null;
      }

      // Extraire métadonnées
      const category = this.detectCategory(url);
      const nodeType = this.extractNodeType(url, title);
      const keywords = this.extractKeywords(title, content);

      const doc = {
        title,
        url: fullUrl,
        content: content.substring(0, 8000), // Limiter à 8k chars
        category,
        nodeType,
        keywords,
        fetchedAt: new Date().toISOString(),
        hash: crypto.createHash('md5').update(content).digest('hex')
      };

      this.stats.fetched++;
      this.stats.totalSize += content.length;

      return doc;

    } catch (error) {
      console.error(`    ❌ Failed to fetch ${url}: ${error.message}`);
      this.stats.failed++;
      return null;
    }
  }

  /**
   * Detect category from URL
   */
  detectCategory(url) {
    if (url.includes('/integrations/builtin/core-nodes/')) return 'core-nodes';
    if (url.includes('/integrations/builtin/app-nodes/')) return 'app-nodes';
    if (url.includes('/integrations/builtin/trigger-nodes/')) return 'trigger-nodes';
    if (url.includes('/integrations/builtin/cluster-nodes/')) return 'cluster-nodes';
    if (url.includes('/workflows/')) return 'workflows';
    if (url.includes('/code/')) return 'code';
    if (url.includes('/ai/')) return 'ai';
    if (url.includes('/hosting/')) return 'hosting';
    if (url.includes('/user-management/')) return 'user-management';
    if (url.includes('/release-notes/')) return 'release-notes';
    return 'general';
  }

  /**
   * Extract node type from URL/title
   */
  extractNodeType(url, title) {
    // Ex: /integrations/builtin/app-nodes/n8n-nodes-base.gmail/
    const match = url.match(/\/([^/]+)\/?$/);
    if (match && match[1].includes('n8n-nodes-')) {
      return match[1];
    }

    // Fallback: extraire du titre
    if (title.toLowerCase().includes('node')) {
      return title.split(/\s+/)[0].toLowerCase();
    }

    return null;
  }

  /**
   * Extract keywords from title and content
   */
  extractKeywords(title, content) {
    const keywords = [];

    // Mots-clés du titre
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    keywords.push(...titleWords);

    // Mots-clés fréquents du contenu (top 10)
    const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const wordFreq = {};
    words.forEach(w => {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    });

    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    keywords.push(...topWords);

    // Déduplication
    return [...new Set(keywords)].slice(0, 15);
  }

  /**
   * Fetch from GitHub repository (markdown files)
   */
  async fetchFromGitHub(path) {
    try {
      const url = `${CONFIG.githubApiBase}/repos/${CONFIG.githubRepo}/contents/${path}`;

      console.log(`  📄 Fetching: ${path}`);

      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Synoptia-Workflow-Builder'
        },
        timeout: CONFIG.timeout
      });

      const items = Array.isArray(response.data) ? response.data : [response.data];

      for (const item of items) {
        if (item.type === 'file' && item.name.endsWith('.md')) {
          // Download markdown file
          const content = await this.downloadMarkdownFile(item.download_url, item.path);
          if (content) {
            this.documents.push(content);
          }
        } else if (item.type === 'dir') {
          // Recursively fetch directory
          await this.fetchFromGitHub(item.path);
        }
      }

    } catch (error) {
      if (error.response?.status !== 404) {
        console.error(`    ❌ Failed to fetch ${path}: ${error.message}`);
        this.stats.failed++;
      }
    }
  }

  /**
   * Download and parse markdown file
   */
  async downloadMarkdownFile(downloadUrl, githubPath) {
    try {
      const response = await axios.get(downloadUrl, {
        timeout: CONFIG.timeout
      });

      const content = response.data;

      if (!content || content.length < 100) {
        return null;
      }

      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : githubPath.split('/').pop().replace('.md', '');

      // Clean markdown to text
      const cleanContent = content
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/`([^`]+)`/g, '$1') // Remove inline code
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links
        .replace(/[#*_~]/g, '') // Remove markdown symbols
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Extract category from path
      const category = this.detectCategory('/' + githubPath);
      const nodeType = this.extractNodeType('/' + githubPath, title);
      const keywords = this.extractKeywords(title, cleanContent);

      const doc = {
        title,
        url: `https://docs.n8n.io/${githubPath.replace('docs/', '').replace('.md', '')}`,
        content: cleanContent.substring(0, 8000),
        category,
        nodeType,
        keywords,
        fetchedAt: new Date().toISOString(),
        hash: crypto.createHash('md5').update(cleanContent).digest('hex')
      };

      this.stats.fetched++;
      this.stats.totalSize += cleanContent.length;

      return doc;

    } catch (error) {
      console.error(`    ⚠️  Failed to download ${githubPath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch all documentation sections
   */
  async fetchAll() {
    console.log('🚀 N8N Documentation Fetcher (GitHub)');
    console.log('═'.repeat(60));

    // Créer répertoire de sortie
    await fs.mkdir(CONFIG.outputDir, { recursive: true });

    // Fetch chaque section depuis GitHub
    for (const docPath of CONFIG.docsPaths) {
      console.log(`\n📂 Section: ${docPath}`);
      await this.fetchFromGitHub(docPath);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Sauvegarder tous les documents
    await this.saveDocuments();

    // Rapport final
    this.generateReport();

    return this.stats;
  }

  /**
   * Find sub-pages in a section
   */
  async findSubPages(sectionUrl) {
    try {
      const fullUrl = `${CONFIG.docsBaseUrl}${sectionUrl}`;
      const response = await axios.get(fullUrl, { timeout: CONFIG.timeout });
      const $ = cheerio.load(response.data);

      const links = [];

      // Extraire liens de navigation
      $('nav a, article a').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && href.startsWith('/') && !href.includes('#')) {
          const fullHref = href.startsWith('http') ? href : `${CONFIG.docsBaseUrl}${href}`;
          if (!this.visitedUrls.has(fullHref)) {
            links.push(href);
          }
        }
      });

      return [...new Set(links)]; // Déduplication

    } catch (error) {
      console.error(`    ⚠️  Could not find sub-pages: ${error.message}`);
      return [];
    }
  }

  /**
   * Save all documents to disk
   */
  async saveDocuments() {
    console.log(`\n💾 Saving ${this.documents.length} documents...`);

    for (const doc of this.documents) {
      const filename = `${doc.hash}.json`;
      const filepath = path.join(CONFIG.outputDir, filename);

      try {
        await fs.writeFile(filepath, JSON.stringify(doc, null, 2), 'utf-8');
      } catch (error) {
        console.error(`  ❌ Failed to save ${filename}: ${error.message}`);
      }
    }

    console.log(`  ✅ Saved to: ${CONFIG.outputDir}`);
  }

  /**
   * Generate report
   */
  generateReport() {
    console.log('\n\n📊 FETCH REPORT');
    console.log('═'.repeat(60));
    console.log(`✅ Fetched: ${this.stats.fetched}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`♻️  Duplicates: ${this.stats.duplicates}`);
    console.log(`📦 Total documents: ${this.documents.length}`);
    console.log(`📊 Total size: ${(this.stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\n💾 Documents saved to: ${CONFIG.outputDir}`);
    console.log('═'.repeat(60));
  }
}

// Execute if run directly
if (require.main === module) {
  const fetcher = new N8nDocsFetcher();

  fetcher.fetchAll()
    .then(stats => {
      console.log('\n✅ Fetch completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fetch failed:', error);
      process.exit(1);
    });
}

module.exports = N8nDocsFetcher;
