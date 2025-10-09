/**
 * Tests unitaires: Workflow Validator
 */

const WorkflowValidator = require('../../rag/validation/workflow-validator');

describe('WorkflowValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new WorkflowValidator();
  });

  describe('validate - basic structure', () => {
    test('should reject null workflow', () => {
      const result = validator.validate(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow null ou undefined');
    });

    test('should reject workflow without name', () => {
      const workflow = {
        nodes: [],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nom du workflow manquant ou invalide');
    });

    test('should reject workflow without nodes', () => {
      const workflow = {
        name: 'Test Workflow'
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nodes manquants ou invalides');
    });

    test('should reject empty workflow', () => {
      const workflow = {
        name: 'Test Workflow',
        nodes: []
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Workflow vide (aucun node)');
    });
  });

  describe('validate - nodes', () => {
    test('should validate simple valid workflow', () => {
      const workflow = {
        name: 'Simple Workflow',
        nodes: [
          {
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [200, 300],
            parameters: { httpMethod: 'POST', path: '/test' },
            id: 'node-1'
          }
        ],
        connections: {},
        settings: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect duplicate node names', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            name: 'Duplicate',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [200, 300],
            parameters: {},
            id: 'node-1'
          },
          {
            name: 'Duplicate',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [400, 300],
            parameters: {},
            id: 'node-2'
          }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('déjà utilisé'))).toBe(true);
    });

    test('should detect missing node position', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            name: 'Node1',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            parameters: {},
            id: 'node-1'
            // missing position
          }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('position invalide'))).toBe(true);
    });

    test('should detect invalid node type format', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            name: 'Node1',
            type: 'invalid-type',
            typeVersion: 1,
            position: [200, 300],
            parameters: {},
            id: 'node-1'
          }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.warnings.some(w => w.includes('type suspect'))).toBe(true);
    });
  });

  describe('validate - connections', () => {
    test('should validate correct connections', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            name: 'Node1',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [200, 300],
            parameters: {},
            id: 'node-1'
          },
          {
            name: 'Node2',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [400, 300],
            parameters: {},
            id: 'node-2'
          }
        ],
        connections: {
          Node1: {
            main: [[{ node: 'Node2', type: 'main', index: 0 }]]
          }
        }
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(true);
    });

    test('should detect connection to non-existent node', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            name: 'Node1',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [200, 300],
            parameters: {},
            id: 'node-1'
          }
        ],
        connections: {
          Node1: {
            main: [[{ node: 'NonExistent', type: 'main', index: 0 }]]
          }
        }
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('inexistant'))).toBe(true);
    });

    test('should detect connection from non-existent node', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            name: 'Node1',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [200, 300],
            parameters: {},
            id: 'node-1'
          }
        ],
        connections: {
          NonExistent: {
            main: [[{ node: 'Node1', type: 'main', index: 0 }]]
          }
        }
      };

      const result = validator.validate(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('inexistant'))).toBe(true);
    });
  });

  describe('validate - logic', () => {
    test('should warn about missing trigger', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            name: 'Node1',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [200, 300],
            parameters: {},
            id: 'node-1'
          }
        ],
        connections: {}
      };

      const result = validator.validate(workflow);

      expect(result.warnings.some(w => w.includes('Aucun trigger'))).toBe(true);
    });

    test('should detect isolated nodes', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            name: 'Node1',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [200, 300],
            parameters: {},
            id: 'node-1'
          },
          {
            name: 'Node2',
            type: 'n8n-nodes-base.set',
            typeVersion: 1,
            position: [400, 300],
            parameters: {},
            id: 'node-2'
          },
          {
            name: 'Isolated',
            type: 'n8n-nodes-base.slack',
            typeVersion: 1,
            position: [600, 300],
            parameters: {},
            id: 'node-3'
          }
        ],
        connections: {
          Node1: {
            main: [[{ node: 'Node2', type: 'main', index: 0 }]]
          }
        }
      };

      const result = validator.validate(workflow);

      expect(result.warnings.some(w => w.includes('isolé'))).toBe(true);
    });
  });

  describe('getStats', () => {
    test('should track validation stats', () => {
      const workflow = {
        name: 'Test',
        nodes: [
          {
            name: 'Node1',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [200, 300],
            parameters: {},
            id: 'node-1'
          }
        ],
        connections: {}
      };

      validator.validate(workflow);
      validator.validate(workflow);

      const stats = validator.getStats();

      expect(stats.validated).toBe(2);
      expect(stats.passed).toBe(2);
      expect(stats.passRate).toBe('100.0%');
    });
  });
});