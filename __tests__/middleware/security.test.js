/**
 * Tests unitaires: Security Middleware
 */

const {
  schemas,
  sanitizeInput,
  detectSecrets
} = require('../../middleware/security');

describe('Security Middleware', () => {
  describe('Joi Schemas Validation', () => {
    describe('workflowGeneration schema', () => {
      test('should validate correct workflow request', () => {
        const data = {
          message: 'Create a webhook workflow',
          options: {
            autoFix: true,
            maxRetries: 2
          }
        };

        const { error } = schemas.workflowGeneration.validate(data);
        expect(error).toBeUndefined();
      });

      test('should reject message too short', () => {
        const data = { message: 'Hi' };
        const { error } = schemas.workflowGeneration.validate(data);

        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('5 caractères');
      });

      test('should reject message too long', () => {
        const data = { message: 'a'.repeat(1001) };
        const { error } = schemas.workflowGeneration.validate(data);

        expect(error).toBeDefined();
        expect(error.details[0].message).toContain('1000 caractères');
      });

      test('should accept valid session ID', () => {
        const data = {
          message: 'Test message',
          sessionId: 'a'.repeat(32) // 32 hex chars
        };

        const { error } = schemas.workflowGeneration.validate(data);
        expect(error).toBeUndefined();
      });

      test('should reject invalid session ID format', () => {
        const data = {
          message: 'Test message',
          sessionId: 'invalid-session'
        };

        const { error } = schemas.workflowGeneration.validate(data);
        expect(error).toBeDefined();
      });

      test('should apply default values', () => {
        const data = {
          message: 'Test message',
          options: {}
        };

        const { value } = schemas.workflowGeneration.validate(data);
        expect(value.options.autoFix).toBe(true);
        expect(value.options.maxRetries).toBe(2);
      });
    });
  });

  describe('sanitizeInput', () => {
    test('should remove script tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const output = sanitizeInput(input);

      expect(output).not.toContain('<script>');
      expect(output).not.toContain('</script>');
    });

    test('should remove HTML tags', () => {
      const input = '<div>Hello</div>';
      const output = sanitizeInput(input);

      expect(output).toBe('Hello');
    });

    test('should remove event handlers', () => {
      const input = '<img src=x onerror="alert(1)">';
      const output = sanitizeInput(input);

      expect(output).not.toContain('onerror');
    });

    test('should not modify clean text', () => {
      const input = 'Normal text without tags';
      const output = sanitizeInput(input);

      expect(output).toBe(input);
    });

    test('should handle multiple XSS attempts', () => {
      const input = '<script>alert(1)</script><img onerror=alert(2)><b onclick="alert(3)">text</b>';
      const output = sanitizeInput(input);

      expect(output).not.toContain('script');
      expect(output).not.toContain('onerror');
      expect(output).not.toContain('onclick');
    });

    test('should trim whitespace', () => {
      const input = '  Hello  ';
      const output = sanitizeInput(input);

      expect(output).toBe('Hello');
    });

    test('should limit length', () => {
      const input = 'a'.repeat(20000);
      const output = sanitizeInput(input);

      expect(output.length).toBeLessThanOrEqual(10000);
    });

    test('should handle non-string input', () => {
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
      expect(sanitizeInput(123)).toBe(123);
    });
  });

  describe('detectSecrets', () => {
    test('should detect API key', () => {
      const text = 'api_key = "sk-abc123def456"';
      const detected = detectSecrets(text);

      expect(detected).toContain('apiKey');
    });

    test('should detect JWT token', () => {
      const text = 'token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const detected = detectSecrets(text);

      expect(detected).toContain('jwt');
    });

    test('should detect AWS key', () => {
      const text = 'AKIAIOSFODNN7EXAMPLE';
      const detected = detectSecrets(text);

      expect(detected).toContain('awsKey');
    });

    test('should not detect secrets in clean text', () => {
      const text = 'Create a workflow that sends to Slack';
      const detected = detectSecrets(text);

      expect(detected).toHaveLength(0);
    });

    test('should detect multiple secret types', () => {
      const text = 'api_key="sk-test123" and token=eyJtest';
      const detected = detectSecrets(text);

      expect(detected.length).toBeGreaterThan(1);
    });

    test('should detect private key', () => {
      const text = '-----BEGIN RSA PRIVATE KEY-----';
      const detected = detectSecrets(text);

      expect(detected).toContain('privateKey');
    });
  });

  describe('Integration', () => {
    test('should sanitize and validate together', () => {
      const input = '<script>alert("XSS")</script>Create a webhook';
      const sanitized = sanitizeInput(input);

      const { error } = schemas.workflowGeneration.validate({
        message: sanitized
      });

      expect(error).toBeUndefined();
      expect(sanitized).not.toContain('script');
    });

    test('should detect secrets after sanitization', () => {
      const input = '<b>api_key = "sk-test123"</b>';
      const sanitized = sanitizeInput(input);
      const secrets = detectSecrets(sanitized);

      expect(secrets).toContain('apiKey');
    });
  });
});