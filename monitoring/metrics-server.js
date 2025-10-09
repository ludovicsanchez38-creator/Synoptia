/**
 * Metrics HTTP Server
 * Expose Prometheus metrics via HTTP endpoint
 */

const express = require('express');
const { getMetrics, getContentType } = require('./metrics');

class MetricsServer {
  constructor(port = 9090) {
    this.port = port;
    this.app = express();
    this.server = null;

    this.setupRoutes();
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    // Prometheus metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', getContentType());
        const metrics = await getMetrics();
        res.send(metrics);
      } catch (error) {
        res.status(500).send(`Error collecting metrics: ${error.message}`);
      }
    });

    // Metrics summary (human-readable)
    this.app.get('/metrics/summary', async (req, res) => {
      try {
        const metrics = await getMetrics();
        const lines = metrics.split('\n').filter(line =>
          !line.startsWith('#') && line.trim() !== ''
        );

        const summary = {
          totalMetrics: lines.length,
          timestamp: new Date().toISOString(),
          sampleMetrics: lines.slice(0, 10)
        };

        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Root
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Synoptia Workflow Builder - Metrics Server',
        endpoints: {
          '/health': 'Health check',
          '/metrics': 'Prometheus metrics (scrape endpoint)',
          '/metrics/summary': 'Human-readable metrics summary'
        },
        prometheus: {
          scrapeConfig: `
scrape_configs:
  - job_name: 'synoptia-workflow-builder'
    static_configs:
      - targets: ['localhost:${this.port}']
        labels:
          service: 'workflow-builder'
          environment: 'production'`
        }
      });
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`📊 Metrics server listening on port ${this.port}`);
          console.log(`   Metrics endpoint: http://localhost:${this.port}/metrics`);
          console.log(`   Health check: http://localhost:${this.port}/health`);
          resolve();
        });

        this.server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.error(`❌ Port ${this.port} is already in use`);
          } else {
            console.error(`❌ Metrics server error:`, error);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('📊 Metrics server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = MetricsServer;