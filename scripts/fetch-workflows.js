#!/usr/bin/env node
/**
 * N8N Workflow Fetcher
 * Récupère automatiquement des workflows n8n depuis diverses sources
 * et les indexe dans le système RAG
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  dataDir: path.join(__dirname, '../data/n8n-workflows'),
  sources: {
    n8nOfficial: 'https://n8n.io/workflows.json',
    githubRepos: [
      'Zie619/n8n-workflows',
      'wassupjay/n8n-free-templates',
      'enescingoz/awesome-n8n-templates',
      'Marvomatic/n8n-templates'
    ]
  },
  maxWorkflowsPerSource: 100,
  timeout: 30000
};

class WorkflowFetcher {
  constructor() {
    this.workflows = new Map();
    this.stats = {
      fetched: 0,
      failed: 0,
      duplicates: 0,
      sources: {}
    };
  }

  /**
   * Initialize data directory
   */
  async init() {
    await fs.mkdir(CONFIG.dataDir, { recursive: true });
    console.log(`📁 Data directory: ${CONFIG.dataDir}`);
  }

  /**
   * Fetch from n8n.io official API
   */
  async fetchN8nOfficial() {
    console.log('\n🔍 Fetching from n8n.io official...');

    try {
      // Try workflows API endpoint
      const response = await axios.get('https://n8n.io/api/workflows', {
        timeout: CONFIG.timeout,
        params: {
          limit: CONFIG.maxWorkflowsPerSource,
          offset: 0
        }
      });

      const workflows = response.data.data || response.data.workflows || [];

      for (const wf of workflows) {
        await this.storeWorkflow(wf, 'n8n.io');
      }

      console.log(`✅ Fetched ${workflows.length} workflows from n8n.io`);

    } catch (error) {
      console.error(`❌ Failed to fetch from n8n.io: ${error.message}`);
      this.stats.failed++;
    }
  }

  /**
   * Fetch from GitHub repository
   */
  async fetchGitHubRepo(repo) {
    console.log(`\n🔍 Fetching from GitHub: ${repo}...`);

    try {
      // Get repository contents
      const contentsUrl = `https://api.github.com/repos/${repo}/contents`;
      const response = await axios.get(contentsUrl, {
        timeout: CONFIG.timeout,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Synoptia-Workflow-Builder'
        }
      });

      const files = response.data.filter(file =>
        file.name.endsWith('.json') &&
        file.type === 'file'
      );

      console.log(`   Found ${files.length} JSON files`);

      // Fetch workflows (limited)
      const limitedFiles = files.slice(0, CONFIG.maxWorkflowsPerSource);

      for (const file of limitedFiles) {
        try {
          const fileResponse = await axios.get(file.download_url, {
            timeout: CONFIG.timeout
          });

          const workflow = fileResponse.data;
          await this.storeWorkflow(workflow, `github:${repo}`, file.name);

        } catch (fileError) {
          console.error(`   ⚠️  Failed to fetch ${file.name}: ${fileError.message}`);
        }
      }

      console.log(`✅ Fetched ${limitedFiles.length} workflows from ${repo}`);

    } catch (error) {
      console.error(`❌ Failed to fetch from ${repo}: ${error.message}`);
      this.stats.failed++;
    }
  }

  /**
   * Store workflow with deduplication
   */
  async storeWorkflow(workflow, source, filename = null) {
    // Generate unique ID based on content
    const contentHash = crypto
      .createHash('md5')
      .update(JSON.stringify(workflow))
      .digest('hex');

    // Check duplicates
    if (this.workflows.has(contentHash)) {
      this.stats.duplicates++;
      return;
    }

    // Extract metadata
    const metadata = {
      id: workflow.id || contentHash,
      name: workflow.name || filename || 'Untitled Workflow',
      description: workflow.description || '',
      nodes: workflow.nodes?.length || 0,
      connections: Object.keys(workflow.connections || {}).length,
      tags: workflow.tags || [],
      source: source,
      fetchedAt: new Date().toISOString(),
      hash: contentHash
    };

    // Store in memory
    this.workflows.set(contentHash, {
      workflow,
      metadata
    });

    // Update stats
    this.stats.fetched++;
    this.stats.sources[source] = (this.stats.sources[source] || 0) + 1;

    // Save to disk
    const filename_safe = metadata.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filepath = path.join(CONFIG.dataDir, `${contentHash}_${filename_safe}.json`);

    await fs.writeFile(filepath, JSON.stringify({
      workflow,
      metadata
    }, null, 2));
  }

  /**
   * Fetch from popular workflow collections
   */
  async fetchPopularCollections() {
    console.log('\n🔍 Fetching popular workflow collections...');

    const collections = [
      {
        name: 'Zie619 Collection',
        url: 'https://raw.githubusercontent.com/Zie619/n8n-workflows/main/workflows',
        type: 'directory'
      },
      {
        name: 'WassupJay Templates',
        url: 'https://raw.githubusercontent.com/wassupjay/n8n-free-templates/main',
        type: 'directory'
      }
    ];

    for (const collection of collections) {
      try {
        console.log(`   Trying ${collection.name}...`);
        // Try to fetch index or list
        // This is a simplified approach - real implementation would need to explore
        await this.fetchGitHubRepo(collection.url.split('githubusercontent.com/')[1]?.split('/')[0] + '/' + collection.url.split('githubusercontent.com/')[1]?.split('/')[1]);
      } catch (error) {
        console.log(`   ⚠️  ${collection.name} needs manual indexing`);
      }
    }
  }

  /**
   * Generate summary report
   */
  generateReport() {
    console.log('\n\n📊 FETCH REPORT');
    console.log('═'.repeat(50));
    console.log(`✅ Total workflows fetched: ${this.stats.fetched}`);
    console.log(`❌ Failed fetches: ${this.stats.failed}`);
    console.log(`♻️  Duplicates skipped: ${this.stats.duplicates}`);
    console.log(`\n📂 By source:`);

    for (const [source, count] of Object.entries(this.stats.sources)) {
      console.log(`   ${source}: ${count}`);
    }

    console.log(`\n💾 Workflows saved to: ${CONFIG.dataDir}`);
    console.log('═'.repeat(50));
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🚀 N8N Workflow Fetcher');
    console.log('═'.repeat(50));

    await this.init();

    // Fetch from official n8n
    await this.fetchN8nOfficial();

    // Fetch from GitHub repos
    for (const repo of CONFIG.sources.githubRepos) {
      await this.fetchGitHubRepo(repo);
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Fetch popular collections
    await this.fetchPopularCollections();

    // Generate report
    this.generateReport();

    return this.stats;
  }
}

// Execute if run directly
if (require.main === module) {
  const fetcher = new WorkflowFetcher();

  fetcher.run()
    .then(stats => {
      console.log('\n✅ Fetch completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fetch failed:', error);
      process.exit(1);
    });
}

module.exports = WorkflowFetcher;
