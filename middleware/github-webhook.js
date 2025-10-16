/**
 * GitHub Webhook Handler
 * Écoute les releases n8n et déclenche les mises à jour RAG
 */

const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class GitHubWebhookHandler {
  constructor(webhookSecret) {
    this.webhookSecret = webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;
    this.updateInProgress = false;
  }

  /**
   * Vérifie la signature GitHub
   */
  verifySignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('⚠️ GITHUB_WEBHOOK_SECRET not set - skipping signature verification');
      return true;
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  }

  /**
   * Traite un événement release
   */
  async handleRelease(payload) {
    const { action, release, repository } = payload;

    // On ne réagit qu'aux nouvelles releases publiées
    if (action !== 'published') {
      console.log(`  ℹ️  Release action "${action}" ignored (not published)`);
      return { success: true, message: 'Release action ignored', triggered: false };
    }

    // Vérifier que c'est bien n8n ou n8n-docs
    const isN8nRepo = repository.full_name === 'n8n-io/n8n';
    const isDocsRepo = repository.full_name === 'n8n-io/n8n-docs';

    if (!isN8nRepo && !isDocsRepo) {
      console.log(`  ℹ️  Release from ${repository.full_name} ignored (not n8n)`);
      return { success: true, message: 'Not an n8n repository', triggered: false };
    }

    console.log(`\n🚀 NEW N8N RELEASE DETECTED`);
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`Repository: ${repository.full_name}`);
    console.log(`Version: ${release.tag_name}`);
    console.log(`Name: ${release.name}`);
    console.log(`Published: ${release.published_at}`);
    console.log(`URL: ${release.html_url}`);

    // Extraire les changements importants
    const releaseNotes = this.parseReleaseNotes(release.body);

    if (releaseNotes.newNodes.length > 0) {
      console.log(`\n✨ New Nodes (${releaseNotes.newNodes.length}):`);
      releaseNotes.newNodes.forEach(node => console.log(`   - ${node}`));
    }

    if (releaseNotes.updatedNodes.length > 0) {
      console.log(`\n📝 Updated Nodes (${releaseNotes.updatedNodes.length}):`);
      releaseNotes.updatedNodes.forEach(node => console.log(`   - ${node}`));
    }

    // Déclencher la mise à jour RAG
    if (this.updateInProgress) {
      console.log(`\n⚠️  Update already in progress, queuing...`);
      return {
        success: true,
        message: 'Update already in progress',
        triggered: false,
        queued: true
      };
    }

    try {
      this.updateInProgress = true;

      console.log(`\n🔄 Triggering RAG update...`);
      console.log(`═══════════════════════════════════════════════════════`);

      const scriptPath = require('path').join(__dirname, '../scripts/update-rag-docs.sh');
      const { stdout, stderr } = await execAsync(scriptPath, {
        timeout: 600000, // 10 minutes max
        env: {
          ...process.env,
          N8N_RELEASE_VERSION: release.tag_name,
          N8N_RELEASE_URL: release.html_url
        }
      });

      console.log(stdout);
      if (stderr) console.error(stderr);

      // Envoyer notification
      await this.sendNotification({
        type: 'success',
        version: release.tag_name,
        releaseUrl: release.html_url,
        newNodes: releaseNotes.newNodes,
        updatedNodes: releaseNotes.updatedNodes
      });

      console.log(`\n✅ RAG update completed successfully`);

      return {
        success: true,
        message: 'RAG updated successfully',
        triggered: true,
        version: release.tag_name,
        newNodes: releaseNotes.newNodes.length,
        updatedNodes: releaseNotes.updatedNodes.length
      };

    } catch (error) {
      console.error(`\n❌ RAG update failed: ${error.message}`);

      await this.sendNotification({
        type: 'error',
        version: release.tag_name,
        error: error.message
      });

      return {
        success: false,
        message: 'RAG update failed',
        error: error.message
      };

    } finally {
      this.updateInProgress = false;
    }
  }

  /**
   * Parse les release notes pour extraire les nouveaux nodes
   */
  parseReleaseNotes(body) {
    const newNodes = [];
    const updatedNodes = [];

    if (!body) return { newNodes, updatedNodes };

    // Patterns pour détecter nouveaux nodes
    const newNodePatterns = [
      /(?:new|add(?:ed)?)\s+([A-Z][a-zA-Z0-9\s]+?)\s+node/gi,
      /\*\*([A-Z][a-zA-Z0-9\s]+?)\*\*\s+node/gi,
      /^\s*-\s+([A-Z][a-zA-Z0-9\s]+?)\s+\(new\)/gmi
    ];

    // Patterns pour détecter nodes mis à jour
    const updatedNodePatterns = [
      /(?:update(?:d)?|improve(?:d)?)\s+([A-Z][a-zA-Z0-9\s]+?)\s+node/gi,
      /\*\*([A-Z][a-zA-Z0-9\s]+?)\*\*.*(?:fix|enhance|improve)/gi
    ];

    // Extraire nouveaux nodes
    newNodePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        const nodeName = match[1].trim();
        if (nodeName && !newNodes.includes(nodeName)) {
          newNodes.push(nodeName);
        }
      }
    });

    // Extraire nodes mis à jour
    updatedNodePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(body)) !== null) {
        const nodeName = match[1].trim();
        if (nodeName && !updatedNodes.includes(nodeName) && !newNodes.includes(nodeName)) {
          updatedNodes.push(nodeName);
        }
      }
    });

    return { newNodes, updatedNodes };
  }

  /**
   * Envoie une notification (Slack, Discord, webhook custom)
   */
  async sendNotification(data) {
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;

    if (!webhookUrl) {
      console.log('  ℹ️  No notification webhook configured (NOTIFICATION_WEBHOOK_URL)');
      return;
    }

    try {
      const axios = require('axios');

      let message;
      if (data.type === 'success') {
        message = {
          text: `🚀 *n8n ${data.version} Released - RAG Updated*`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🚀 *n8n ${data.version} Released*\n\n` +
                      `✅ RAG documentation updated automatically\n\n` +
                      (data.newNodes.length > 0 ? `✨ *New Nodes (${data.newNodes.length})*:\n${data.newNodes.map(n => `  • ${n}`).join('\n')}\n\n` : '') +
                      (data.updatedNodes.length > 0 ? `📝 *Updated Nodes (${data.updatedNodes.length})*:\n${data.updatedNodes.map(n => `  • ${n}`).join('\n')}\n\n` : '') +
                      `🔗 <${data.releaseUrl}|View Release Notes>`
              }
            }
          ]
        };
      } else {
        message = {
          text: `❌ *n8n ${data.version} - RAG Update Failed*`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `❌ *RAG Update Failed*\n\nVersion: ${data.version}\nError: ${data.error}`
              }
            }
          ]
        };
      }

      await axios.post(webhookUrl, message);
      console.log('  ✅ Notification sent');

    } catch (error) {
      console.error(`  ⚠️  Failed to send notification: ${error.message}`);
    }
  }

  /**
   * Middleware Express pour gérer les webhooks
   */
  middleware() {
    return async (req, res) => {
      try {
        const signature = req.headers['x-hub-signature-256'];
        const event = req.headers['x-github-event'];

        console.log(`\n📥 GitHub Webhook received: ${event}`);

        // Vérifier signature
        if (this.webhookSecret && !this.verifySignature(req.body, signature)) {
          console.error('❌ Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }

        // Gérer seulement les events release
        if (event === 'release') {
          const result = await this.handleRelease(req.body);
          return res.status(200).json(result);
        }

        // Event non géré
        console.log(`  ℹ️  Event "${event}" not handled`);
        return res.status(200).json({
          success: true,
          message: `Event "${event}" not handled`
        });

      } catch (error) {
        console.error('❌ Webhook error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    };
  }
}

module.exports = GitHubWebhookHandler;
