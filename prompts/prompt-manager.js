/**
 * Prompt Version Manager
 * Gère les versions de prompts et permet l'A/B testing
 */

const fs = require('fs').promises;
const path = require('path');

class PromptManager {
  constructor(promptsFile = path.join(__dirname, 'versions.json')) {
    this.promptsFile = promptsFile;
    this.prompts = null;
    this.cache = new Map();
  }

  /**
   * Load prompts from file
   */
  async load() {
    try {
      const data = await fs.readFile(this.promptsFile, 'utf8');
      this.prompts = JSON.parse(data);
      console.log('✅ Prompts loaded successfully');
      return this.prompts;
    } catch (error) {
      console.error('❌ Error loading prompts:', error.message);
      throw error;
    }
  }

  /**
   * Get active prompt for a category
   */
  getActivePrompt(category) {
    if (!this.prompts || !this.prompts[category]) {
      throw new Error(`Prompt category "${category}" not found`);
    }

    const versions = this.prompts[category];
    const activeVersion = Object.values(versions).find(v => v.active);

    if (!activeVersion) {
      throw new Error(`No active prompt for category "${category}"`);
    }

    return activeVersion;
  }

  /**
   * Get specific version of prompt
   */
  getPromptVersion(category, version) {
    if (!this.prompts || !this.prompts[category]) {
      throw new Error(`Prompt category "${category}" not found`);
    }

    const prompt = this.prompts[category][version];

    if (!prompt) {
      throw new Error(`Version "${version}" not found for category "${category}"`);
    }

    return prompt;
  }

  /**
   * Build prompt with variables
   */
  buildPrompt(category, variables = {}, version = null) {
    const prompt = version
      ? this.getPromptVersion(category, version)
      : this.getActivePrompt(category);

    let system = prompt.system;

    // Replace variables
    if (prompt.variables) {
      prompt.variables.forEach(varName => {
        const value = variables[varName] !== undefined ? variables[varName] : '';
        system = system.replace(new RegExp(`\\{${varName}\\}`, 'g'), value);
      });
    }

    return {
      system,
      version: prompt.version,
      description: prompt.description
    };
  }

  /**
   * List all versions for a category
   */
  listVersions(category) {
    if (!this.prompts || !this.prompts[category]) {
      throw new Error(`Prompt category "${category}" not found`);
    }

    return Object.values(this.prompts[category]).map(v => ({
      version: v.version,
      description: v.description,
      createdAt: v.createdAt,
      active: v.active
    }));
  }

  /**
   * List all categories
   */
  listCategories() {
    if (!this.prompts) {
      return [];
    }

    return Object.keys(this.prompts);
  }

  /**
   * Set active version for a category
   */
  async setActiveVersion(category, version) {
    if (!this.prompts || !this.prompts[category]) {
      throw new Error(`Prompt category "${category}" not found`);
    }

    if (!this.prompts[category][version]) {
      throw new Error(`Version "${version}" not found for category "${category}"`);
    }

    // Deactivate all versions
    Object.values(this.prompts[category]).forEach(v => {
      v.active = false;
    });

    // Activate specified version
    this.prompts[category][version].active = true;

    // Save to file
    await this.save();

    console.log(`✅ Set active version for "${category}" to ${version}`);
  }

  /**
   * Add new version
   */
  async addVersion(category, version, promptData) {
    if (!this.prompts) {
      await this.load();
    }

    if (!this.prompts[category]) {
      this.prompts[category] = {};
    }

    if (this.prompts[category][version]) {
      throw new Error(`Version "${version}" already exists for category "${category}"`);
    }

    this.prompts[category][version] = {
      version,
      description: promptData.description || '',
      createdAt: new Date().toISOString(),
      active: promptData.active || false,
      system: promptData.system,
      variables: promptData.variables || []
    };

    await this.save();

    console.log(`✅ Added version ${version} for category "${category}"`);
  }

  /**
   * Save prompts to file
   */
  async save() {
    try {
      await fs.writeFile(
        this.promptsFile,
        JSON.stringify(this.prompts, null, 2),
        'utf8'
      );
      console.log('✅ Prompts saved successfully');
    } catch (error) {
      console.error('❌ Error saving prompts:', error.message);
      throw error;
    }
  }

  /**
   * A/B Testing: Get random version for testing
   */
  getRandomVersion(category, excludeActive = false) {
    if (!this.prompts || !this.prompts[category]) {
      throw new Error(`Prompt category "${category}" not found`);
    }

    let versions = Object.values(this.prompts[category]);

    if (excludeActive) {
      versions = versions.filter(v => !v.active);
    }

    if (versions.length === 0) {
      throw new Error('No versions available');
    }

    const randomIndex = Math.floor(Math.random() * versions.length);
    return versions[randomIndex];
  }

  /**
   * Compare versions side-by-side
   */
  compareVersions(category, version1, version2) {
    const v1 = this.getPromptVersion(category, version1);
    const v2 = this.getPromptVersion(category, version2);

    return {
      version1: {
        version: v1.version,
        description: v1.description,
        systemLength: v1.system.length,
        variables: v1.variables || [],
        active: v1.active
      },
      version2: {
        version: v2.version,
        description: v2.description,
        systemLength: v2.system.length,
        variables: v2.variables || [],
        active: v2.active
      },
      differences: {
        lengthDiff: v2.system.length - v1.system.length,
        variablesDiff: (v2.variables || []).length - (v1.variables || []).length
      }
    };
  }

  /**
   * Get prompt stats
   */
  getStats() {
    if (!this.prompts) {
      return { categories: 0, totalVersions: 0 };
    }

    const categories = Object.keys(this.prompts);
    const totalVersions = categories.reduce((sum, cat) => {
      return sum + Object.keys(this.prompts[cat]).length;
    }, 0);

    return {
      categories: categories.length,
      totalVersions,
      byCategory: categories.map(cat => ({
        category: cat,
        versions: Object.keys(this.prompts[cat]).length,
        activeVersion: Object.values(this.prompts[cat]).find(v => v.active)?.version
      }))
    };
  }
}

module.exports = PromptManager;