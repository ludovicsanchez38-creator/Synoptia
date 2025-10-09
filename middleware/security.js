/**
 * Security Middleware - OWASP Best Practices
 * Protection contre XSS, injection, DoS, etc.
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const Joi = require('joi');
const { body, query, param, validationResult } = require('express-validator');

/**
 * Helmet - Protection headers HTTP
 * Configure des headers de sécurité standards
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 an
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * Rate Limiting - Protection DoS
 * Limite le nombre de requêtes par IP
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // 100 requêtes par fenêtre
    message = 'Trop de requêtes, réessayez plus tard',
    skipSuccessfulRequests = false,
    standardHeaders = true,
    legacyHeaders = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    skipSuccessfulRequests,
    standardHeaders,
    legacyHeaders,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limiters prédéfinis
const rateLimiters = {
  // Strict: API sensibles (génération, modification)
  strict: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15min
    max: 20, // 20 requêtes
    message: 'Limite de génération atteinte. Réessayez dans 15 minutes.'
  }),

  // Standard: API normales
  standard: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100
  }),

  // Lax: Endpoints publics (health, status)
  lax: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300
  })
};

/**
 * Validation Schemas Joi
 */
const schemas = {
  // Workflow generation request
  workflowGeneration: Joi.object({
    message: Joi.string().min(5).max(1000).required()
      .messages({
        'string.min': 'Le message doit contenir au moins 5 caractères',
        'string.max': 'Le message ne peut pas dépasser 1000 caractères',
        'any.required': 'Le message est requis'
      }),
    sessionId: Joi.string().pattern(/^[a-f0-9]{32}$/).optional()
      .messages({
        'string.pattern.base': 'Session ID invalide'
      }),
    options: Joi.object({
      autoFix: Joi.boolean().default(true),
      maxRetries: Joi.number().integer().min(0).max(5).default(2),
      userId: Joi.string().max(100).optional(),
      metadata: Joi.object().optional()
    }).optional()
  }),

  // Session ID
  sessionId: Joi.string().pattern(/^[a-f0-9]{32}$/).required()
    .messages({
      'string.pattern.base': 'Session ID invalide',
      'any.required': 'Session ID requis'
    }),

  // User message
  userMessage: Joi.object({
    message: Joi.string().min(1).max(1000).required()
  })
};

/**
 * Middleware de validation Joi
 */
const validateJoi = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    req.validatedBody = value;
    next();
  };
};

/**
 * Sanitization - Nettoie les inputs utilisateur
 * Protège contre XSS, injection
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Limit length
    .substring(0, 10000)
    // Trim
    .trim();
};

/**
 * Middleware de sanitization
 */
const sanitizeMiddleware = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }

  // Sanitize query params
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    });
  }

  next();
};

/**
 * Validation des erreurs Express Validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }

  next();
};

/**
 * Secrets Detection - Empêche l'envoi de secrets
 */
const detectSecrets = (text) => {
  const patterns = {
    apiKey: /\b(api[_-]?key|apikey)[\s:=]+['"]?([a-zA-Z0-9_\-]{20,})['"]?/gi,
    token: /\b(token|auth[_-]?token)[\s:=]+['"]?([a-zA-Z0-9_\-\.]{20,})['"]?/gi,
    password: /\b(password|passwd|pwd)[\s:=]+['"]?([^\s'"]{8,})['"]?/gi,
    privateKey: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
    awsKey: /AKIA[0-9A-Z]{16}/g,
    jwt: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g
  };

  const detected = [];

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      detected.push(type);
    }
  }

  return detected;
};

/**
 * Middleware de détection de secrets
 */
const secretsDetectionMiddleware = (req, res, next) => {
  const bodyStr = JSON.stringify(req.body);
  const detected = detectSecrets(bodyStr);

  if (detected.length > 0) {
    return res.status(400).json({
      error: 'Security Error',
      message: 'Données sensibles détectées dans la requête',
      detected: detected,
      hint: 'Ne jamais envoyer de clés API, tokens ou mots de passe'
    });
  }

  next();
};

/**
 * CORS Configuration sécurisée
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24h
};

/**
 * Security Headers middleware custom
 */
const securityHeaders = (req, res, next) => {
  // Remove powered by header
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Cache control for sensitive data
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * Request size limiter
 */
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    const maxBytes = parseInt(maxSize) * 1024 * 1024;

    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `La requête dépasse la taille maximale de ${maxSize}`,
        maxSize
      });
    }

    next();
  };
};

module.exports = {
  helmetMiddleware,
  rateLimiters,
  createRateLimiter,
  schemas,
  validateJoi,
  sanitizeInput,
  sanitizeMiddleware,
  handleValidationErrors,
  detectSecrets,
  secretsDetectionMiddleware,
  corsOptions,
  securityHeaders,
  requestSizeLimiter,

  // Express Validator helpers
  body,
  query,
  param
};