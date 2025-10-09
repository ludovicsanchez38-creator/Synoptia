/**
 * Tests unitaires: Node Schemas
 */

const {
  validateNodeParameters,
  getNodeSchema,
  getSupportedNodeTypes,
  getNodeStats
} = require('../../rag/validation/node-schemas');

describe('Node Schemas', () => {
  describe('getNodeSchema', () => {
    test('should return schema for valid node type', () => {
      const schema = getNodeSchema('n8n-nodes-base.webhook');

      expect(schema).toBeDefined();
      expect(schema.category).toBe('trigger');
      expect(schema.requiredParams).toContain('httpMethod');
      expect(schema.requiredParams).toContain('path');
    });

    test('should return null for unknown node type', () => {
      const schema = getNodeSchema('n8n-nodes-base.unknown');
      expect(schema).toBeNull();
    });

    test('should return correct schema for Slack node', () => {
      const schema = getNodeSchema('n8n-nodes-base.slack');

      expect(schema.category).toBe('communication');
      expect(schema.requiredParams).toContain('resource');
      expect(schema.requiredParams).toContain('operation');
      expect(schema.credentialTypes).toContain('slackApi');
    });
  });

  describe('getSupportedNodeTypes', () => {
    test('should return array of supported node types', () => {
      const types = getSupportedNodeTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(30);
      expect(types).toContain('n8n-nodes-base.webhook');
      expect(types).toContain('n8n-nodes-base.slack');
      expect(types).toContain('n8n-nodes-base.httpRequest');
    });
  });

  describe('getNodeStats', () => {
    test('should return stats about supported nodes', () => {
      const stats = getNodeStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('categories');
      expect(stats).toHaveProperty('byCategory');
      expect(stats.total).toBeGreaterThan(30);
      expect(Array.isArray(stats.byCategory)).toBe(true);
    });

    test('should categorize nodes correctly', () => {
      const stats = getNodeStats();
      const categories = stats.byCategory.map(c => c.category);

      expect(categories).toContain('trigger');
      expect(categories).toContain('action');
      expect(categories).toContain('communication');
    });
  });

  describe('validateNodeParameters', () => {
    test('should pass validation for node with all required params', () => {
      const node = {
        name: 'Test Webhook',
        type: 'n8n-nodes-base.webhook',
        parameters: {
          httpMethod: 'POST',
          path: '/test'
        }
      };

      const result = validateNodeParameters(node);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation for missing required params', () => {
      const node = {
        name: 'Test Webhook',
        type: 'n8n-nodes-base.webhook',
        parameters: {
          httpMethod: 'POST'
          // missing 'path'
        }
      };

      const result = validateNodeParameters(node);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('path');
    });

    test('should warn about missing credentials', () => {
      const node = {
        name: 'Test Slack',
        type: 'n8n-nodes-base.slack',
        parameters: {
          resource: 'message',
          operation: 'postMessage'
        }
        // no credentials
      };

      const result = validateNodeParameters(node);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('credentials');
    });

    test('should handle unknown node types gracefully', () => {
      const node = {
        name: 'Unknown Node',
        type: 'n8n-nodes-base.unknown',
        parameters: {}
      };

      const result = validateNodeParameters(node);

      expect(result.valid).toBe(true); // Unknown nodes pass validation
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should validate Slack node with all required params', () => {
      const node = {
        name: 'Send Slack Message',
        type: 'n8n-nodes-base.slack',
        parameters: {
          resource: 'message',
          operation: 'postMessage',
          channel: 'general',
          text: 'Hello'
        },
        credentials: {
          slackApi: 'slack-creds'
        }
      };

      const result = validateNodeParameters(node);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('Node Schemas - Edge Cases', () => {
  test('should handle null parameters', () => {
    const node = {
      name: 'Test',
      type: 'n8n-nodes-base.webhook',
      parameters: null
    };

    const result = validateNodeParameters(node);
    expect(result.valid).toBe(false);
  });

  test('should handle undefined parameters', () => {
    const node = {
      name: 'Test',
      type: 'n8n-nodes-base.webhook'
      // parameters undefined
    };

    const result = validateNodeParameters(node);
    expect(result.valid).toBe(false);
  });

  test('should validate HTTP request node with URL', () => {
    const node = {
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      parameters: {
        url: 'https://api.example.com',
        method: 'GET'
      }
    };

    const result = validateNodeParameters(node);
    expect(result.valid).toBe(true);
  });
});