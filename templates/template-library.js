/**
 * Workflow Template Library
 * Collection of 30+ ready-to-use workflow templates
 */

const TEMPLATE_CATEGORIES = {
  COMMUNICATION: 'communication',
  AUTOMATION: 'automation',
  DATA_SYNC: 'data_sync',
  MONITORING: 'monitoring',
  SOCIAL_MEDIA: 'social_media',
  ECOMMERCE: 'ecommerce',
  DEVELOPER_TOOLS: 'developer_tools',
  CONTENT: 'content',
  CRM: 'crm',
  ANALYTICS: 'analytics',
  AI_RAG: 'ai_rag',
  DATA: 'data',
  BUSINESS: 'business',
  DEVOPS: 'devops',
  MARKETING: 'marketing'
};

const TEMPLATES = {
  // ===== COMMUNICATION =====
  'webhook-to-slack': {
    id: 'webhook-to-slack',
    name: 'Webhook to Slack Notification',
    category: TEMPLATE_CATEGORIES.COMMUNICATION,
    description: 'Receive webhook data and send formatted notification to Slack channel',
    tags: ['slack', 'webhook', 'notification'],
    difficulty: 'beginner',
    estimatedSetupTime: '5 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Webhook to Slack',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'webhook',
            responseMode: 'onReceived'
          },
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#notifications',
            text: '=New webhook received!\n\n{{JSON.stringify($json)}}'
          },
          name: 'Slack',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [450, 300],
          credentials: {
            slackApi: { id: 'REPLACE_WITH_YOUR_CREDENTIAL_ID', name: 'Slack account' }
          }
        }
      ],
      connections: {
        Webhook: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] }
      }
    }
  },

  'email-to-slack': {
    id: 'email-to-slack',
    name: 'Email to Slack Forwarder',
    category: TEMPLATE_CATEGORIES.COMMUNICATION,
    description: 'Forward important emails to Slack channel with formatting',
    tags: ['slack', 'email', 'gmail', 'notification'],
    difficulty: 'beginner',
    estimatedSetupTime: '10 minutes',
    requiredCredentials: ['googleApi', 'slackApi'],
    workflow: {
      name: 'Email to Slack',
      nodes: [
        {
          parameters: {
            resource: 'message',
            operation: 'getAll',
            filters: { labelIds: ['INBOX'], q: 'is:unread' },
            format: 'simple',
            maxResults: 5
          },
          name: 'Gmail',
          type: 'n8n-nodes-base.gmail',
          typeVersion: 1,
          position: [250, 300],
          credentials: { googleApi: { id: 'REPLACE', name: 'Google' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#emails',
            text: '=📧 New email from {{$json["from"]["name"]}}\n\n*Subject:* {{$json["subject"]}}\n\n{{$json["snippet"]}}'
          },
          name: 'Slack',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [450, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        Gmail: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] }
      }
    }
  },

  'discord-notification': {
    id: 'discord-notification',
    name: 'Webhook to Discord',
    category: TEMPLATE_CATEGORIES.COMMUNICATION,
    description: 'Send formatted notifications to Discord channel via webhook',
    tags: ['discord', 'webhook', 'notification'],
    difficulty: 'beginner',
    estimatedSetupTime: '5 minutes',
    requiredCredentials: [],
    workflow: {
      name: 'Webhook to Discord',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'notify',
            responseMode: 'onReceived'
          },
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            method: 'POST',
            url: '=YOUR_DISCORD_WEBHOOK_URL',
            jsonParameters: true,
            options: {},
            bodyParametersJson: '={\n  "content": "**New Notification**",\n  "embeds": [{\n    "title": "{{$json["title"]}}",\n    "description": "{{$json["message"]}}",\n    "color": 5814783\n  }]\n}'
          },
          name: 'Discord Webhook',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 300]
        }
      ],
      connections: {
        Webhook: { main: [[{ node: 'Discord Webhook', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== AUTOMATION =====
  'scheduled-backup': {
    id: 'scheduled-backup',
    name: 'Daily Database Backup',
    category: TEMPLATE_CATEGORIES.AUTOMATION,
    description: 'Automatically backup database daily and upload to cloud storage',
    tags: ['backup', 'schedule', 'database', 'automation'],
    difficulty: 'intermediate',
    estimatedSetupTime: '20 minutes',
    requiredCredentials: ['googleDriveApi'],
    workflow: {
      name: 'Daily Backup',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 24 }] }
          },
          name: 'Schedule',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            command: 'pg_dump -U postgres mydb > backup_$(date +%Y%m%d).sql'
          },
          name: 'Create Backup',
          type: 'n8n-nodes-base.executeCommand',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            operation: 'upload',
            fileContent: '={{$binary.data}}',
            name: '=backup_{{$now.format("YYYYMMDD")}}.sql',
            parents: [{ id: 'BACKUP_FOLDER_ID' }]
          },
          name: 'Upload to Drive',
          type: 'n8n-nodes-base.googleDrive',
          typeVersion: 1,
          position: [650, 300],
          credentials: { googleDriveApi: { id: 'REPLACE', name: 'Google Drive' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#backups',
            text: '=✅ Daily backup completed: {{$now.format("YYYY-MM-DD HH:mm")}}'
          },
          name: 'Notify',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        Schedule: { main: [[{ node: 'Create Backup', type: 'main', index: 0 }]] },
        'Create Backup': { main: [[{ node: 'Upload to Drive', type: 'main', index: 0 }]] },
        'Upload to Drive': { main: [[{ node: 'Notify', type: 'main', index: 0 }]] }
      }
    }
  },

  'error-monitoring': {
    id: 'error-monitoring',
    name: 'Application Error Monitor',
    category: TEMPLATE_CATEGORIES.MONITORING,
    description: 'Monitor application logs and alert on errors',
    tags: ['monitoring', 'errors', 'alerts', 'logs'],
    difficulty: 'intermediate',
    estimatedSetupTime: '15 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Error Monitor',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] }
          },
          name: 'Every 5 Minutes',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            command: 'tail -n 100 /var/log/app.log | grep ERROR'
          },
          name: 'Check Logs',
          type: 'n8n-nodes-base.executeCommand',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["stdout"]}}', operation: 'isNotEmpty' }]
            }
          },
          name: 'Has Errors?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#alerts',
            text: '=🚨 *Application Errors Detected*\n\n```\n{{$json["stdout"]}}\n```'
          },
          name: 'Alert Team',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Every 5 Minutes': { main: [[{ node: 'Check Logs', type: 'main', index: 0 }]] },
        'Check Logs': { main: [[{ node: 'Has Errors?', type: 'main', index: 0 }]] },
        'Has Errors?': { main: [[{ node: 'Alert Team', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== DATA SYNC =====
  'airtable-to-sheets': {
    id: 'airtable-to-sheets',
    name: 'Airtable to Google Sheets Sync',
    category: TEMPLATE_CATEGORIES.DATA_SYNC,
    description: 'Sync Airtable records to Google Sheets automatically',
    tags: ['airtable', 'google-sheets', 'sync', 'data'],
    difficulty: 'intermediate',
    estimatedSetupTime: '15 minutes',
    requiredCredentials: ['airtableApi', 'googleSheetsApi'],
    workflow: {
      name: 'Airtable to Sheets',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 1 }] }
          },
          name: 'Hourly',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'list',
            base: { value: 'YOUR_BASE_ID' },
            table: { value: 'YOUR_TABLE_NAME' }
          },
          name: 'Get Airtable Records',
          type: 'n8n-nodes-base.airtable',
          typeVersion: 2,
          position: [450, 300],
          credentials: { airtableApi: { id: 'REPLACE', name: 'Airtable' } }
        },
        {
          parameters: {
            operation: 'clear',
            documentId: { value: 'YOUR_SHEET_ID' },
            sheetName: { value: 'Sheet1' },
            clear: { clearType: 'all' }
          },
          name: 'Clear Sheet',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [650, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        },
        {
          parameters: {
            operation: 'appendOrUpdate',
            documentId: { value: 'YOUR_SHEET_ID' },
            sheetName: { value: 'Sheet1' },
            columns: { mappingMode: 'autoMapInputData' }
          },
          name: 'Write to Sheet',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [850, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        }
      ],
      connections: {
        Hourly: { main: [[{ node: 'Get Airtable Records', type: 'main', index: 0 }]] },
        'Get Airtable Records': { main: [[{ node: 'Clear Sheet', type: 'main', index: 0 }]] },
        'Clear Sheet': { main: [[{ node: 'Write to Sheet', type: 'main', index: 0 }]] }
      }
    }
  },

  'csv-to-database': {
    id: 'csv-to-database',
    name: 'CSV Import to Database',
    category: TEMPLATE_CATEGORIES.DATA_SYNC,
    description: 'Import CSV files to PostgreSQL database with validation',
    tags: ['csv', 'database', 'postgres', 'import'],
    difficulty: 'intermediate',
    estimatedSetupTime: '15 minutes',
    requiredCredentials: ['postgres'],
    workflow: {
      name: 'CSV to Database',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'import-csv',
            responseMode: 'lastNode'
          },
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'toJson',
            options: { delimiter: ',', skipEmptyLines: true }
          },
          name: 'Parse CSV',
          type: 'n8n-nodes-base.csv',
          typeVersion: 2,
          position: [450, 300]
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: '=INSERT INTO users (name, email) VALUES (\'{{$json["name"]}}\', \'{{$json["email"]}}\')'
          },
          name: 'Insert to DB',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [650, 300],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        }
      ],
      connections: {
        Webhook: { main: [[{ node: 'Parse CSV', type: 'main', index: 0 }]] },
        'Parse CSV': { main: [[{ node: 'Insert to DB', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== SOCIAL MEDIA =====
  'twitter-to-slack': {
    id: 'twitter-to-slack',
    name: 'Twitter Mentions to Slack',
    category: TEMPLATE_CATEGORIES.SOCIAL_MEDIA,
    description: 'Monitor Twitter mentions and send to Slack',
    tags: ['twitter', 'slack', 'social-media', 'monitoring'],
    difficulty: 'intermediate',
    estimatedSetupTime: '15 minutes',
    requiredCredentials: ['twitterApi', 'slackApi'],
    workflow: {
      name: 'Twitter to Slack',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'minutes', minutesInterval: 15 }] }
          },
          name: 'Every 15 Minutes',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'search',
            operation: 'search',
            searchText: '@YourBrand',
            returnAll: false,
            limit: 10
          },
          name: 'Search Mentions',
          type: 'n8n-nodes-base.twitter',
          typeVersion: 1,
          position: [450, 300],
          credentials: { twitterApi: { id: 'REPLACE', name: 'Twitter' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#social',
            text: '=🐦 New mention from @{{$json["user"]["screen_name"]}}\n\n{{$json["text"]}}'
          },
          name: 'Post to Slack',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [650, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Every 15 Minutes': { main: [[{ node: 'Search Mentions', type: 'main', index: 0 }]] },
        'Search Mentions': { main: [[{ node: 'Post to Slack', type: 'main', index: 0 }]] }
      }
    }
  },

  'social-media-scheduler': {
    id: 'social-media-scheduler',
    name: 'Multi-Platform Post Scheduler',
    category: TEMPLATE_CATEGORIES.SOCIAL_MEDIA,
    description: 'Schedule posts across multiple social media platforms',
    tags: ['social-media', 'scheduler', 'twitter', 'linkedin'],
    difficulty: 'advanced',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['twitterApi', 'linkedInApi'],
    workflow: {
      name: 'Social Scheduler',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'schedule-post',
            responseMode: 'onReceived'
          },
          name: 'Schedule Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            amount: '={{$json["delay_minutes"]}}',
            unit: 'minutes'
          },
          name: 'Wait',
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            resource: 'tweet',
            operation: 'create',
            text: '={{$json["message"]}}'
          },
          name: 'Post to Twitter',
          type: 'n8n-nodes-base.twitter',
          typeVersion: 1,
          position: [650, 250],
          credentials: { twitterApi: { id: 'REPLACE', name: 'Twitter' } }
        },
        {
          parameters: {
            resource: 'post',
            operation: 'create',
            text: '={{$json["message"]}}'
          },
          name: 'Post to LinkedIn',
          type: 'n8n-nodes-base.linkedIn',
          typeVersion: 1,
          position: [650, 350],
          credentials: { linkedInApi: { id: 'REPLACE', name: 'LinkedIn' } }
        }
      ],
      connections: {
        'Schedule Webhook': { main: [[{ node: 'Wait', type: 'main', index: 0 }]] },
        Wait: { main: [[{ node: 'Post to Twitter', type: 'main', index: 0 }, { node: 'Post to LinkedIn', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== ECOMMERCE =====
  'shopify-order-notification': {
    id: 'shopify-order-notification',
    name: 'Shopify Order Notifications',
    category: TEMPLATE_CATEGORIES.ECOMMERCE,
    description: 'Send multi-channel notifications for new Shopify orders',
    tags: ['shopify', 'ecommerce', 'orders', 'notification'],
    difficulty: 'intermediate',
    estimatedSetupTime: '15 minutes',
    requiredCredentials: ['shopifyApi', 'slackApi'],
    workflow: {
      name: 'Shopify Orders',
      nodes: [
        {
          parameters: {
            topic: 'orders/create'
          },
          name: 'Shopify Trigger',
          type: 'n8n-nodes-base.shopifyTrigger',
          typeVersion: 1,
          position: [250, 300],
          webhookId: 'GENERATE_ON_ACTIVATION',
          credentials: { shopifyApi: { id: 'REPLACE', name: 'Shopify' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#orders',
            text: '=🛒 *New Order #{{$json["order_number"]}}*\n\nCustomer: {{$json["customer"]["name"]}}\nTotal: ${{$json["total_price"]}}\nItems: {{$json["line_items"].length}}'
          },
          name: 'Notify Slack',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [450, 250],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'orders@company.com',
            toEmail: '={{$json["customer"]["email"]}}',
            subject: '=Order Confirmation #{{$json["order_number"]}}',
            text: '=Thank you for your order!\n\nOrder number: {{$json["order_number"]}}\nTotal: ${{$json["total_price"]}}'
          },
          name: 'Send Confirmation',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [450, 350]
        }
      ],
      connections: {
        'Shopify Trigger': { main: [[{ node: 'Notify Slack', type: 'main', index: 0 }, { node: 'Send Confirmation', type: 'main', index: 0 }]] }
      }
    }
  },

  'abandoned-cart': {
    id: 'abandoned-cart',
    name: 'Abandoned Cart Recovery',
    category: TEMPLATE_CATEGORIES.ECOMMERCE,
    description: 'Send automated emails for abandoned shopping carts',
    tags: ['ecommerce', 'abandoned-cart', 'email', 'recovery'],
    difficulty: 'advanced',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['shopifyApi'],
    workflow: {
      name: 'Cart Recovery',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 6 }] }
          },
          name: 'Every 6 Hours',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'checkout',
            operation: 'getAll',
            returnAll: false,
            limit: 50,
            options: { status: 'open' }
          },
          name: 'Get Abandoned Carts',
          type: 'n8n-nodes-base.shopify',
          typeVersion: 1,
          position: [450, 300],
          credentials: { shopifyApi: { id: 'REPLACE', name: 'Shopify' } }
        },
        {
          parameters: {
            conditions: {
              number: [{ value1: '={{$json["abandoned_checkout_url"]}}', operation: 'isNotEmpty' }]
            }
          },
          name: 'Has Email?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'noreply@company.com',
            toEmail: '={{$json["email"]}}',
            subject: 'You left something behind!',
            text: '=Hi {{$json["customer"]["first_name"]}},\n\nYou have items waiting in your cart worth ${{$json["total_price"]}}.\n\nComplete your order: {{$json["abandoned_checkout_url"]}}'
          },
          name: 'Send Recovery Email',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [850, 300]
        }
      ],
      connections: {
        'Every 6 Hours': { main: [[{ node: 'Get Abandoned Carts', type: 'main', index: 0 }]] },
        'Get Abandoned Carts': { main: [[{ node: 'Has Email?', type: 'main', index: 0 }]] },
        'Has Email?': { main: [[{ node: 'Send Recovery Email', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== DEVELOPER TOOLS =====
  'github-pr-notification': {
    id: 'github-pr-notification',
    name: 'GitHub PR Notifications',
    category: TEMPLATE_CATEGORIES.DEVELOPER_TOOLS,
    description: 'Get notified on Slack when pull requests need review',
    tags: ['github', 'pull-request', 'slack', 'devops'],
    difficulty: 'intermediate',
    estimatedSetupTime: '15 minutes',
    requiredCredentials: ['githubApi', 'slackApi'],
    workflow: {
      name: 'GitHub PR Alerts',
      nodes: [
        {
          parameters: {
            events: ['pull_request'],
            repository: 'owner/repo'
          },
          name: 'GitHub Trigger',
          type: 'n8n-nodes-base.githubTrigger',
          typeVersion: 1,
          position: [250, 300],
          webhookId: 'GENERATE_ON_ACTIVATION',
          credentials: { githubApi: { id: 'REPLACE', name: 'GitHub' } }
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["action"]}}', operation: 'equals', value2: 'opened' }]
            }
          },
          name: 'Is New PR?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#pull-requests',
            text: '=🔔 *New Pull Request*\n\n*{{$json["pull_request"]["title"]}}*\nAuthor: {{$json["pull_request"]["user"]["login"]}}\nRepo: {{$json["repository"]["full_name"]}}\n\n{{$json["pull_request"]["html_url"]}}'
          },
          name: 'Notify Team',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [650, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'GitHub Trigger': { main: [[{ node: 'Is New PR?', type: 'main', index: 0 }]] },
        'Is New PR?': { main: [[{ node: 'Notify Team', type: 'main', index: 0 }]] }
      }
    }
  },

  'ci-cd-monitor': {
    id: 'ci-cd-monitor',
    name: 'CI/CD Pipeline Monitor',
    category: TEMPLATE_CATEGORIES.DEVELOPER_TOOLS,
    description: 'Monitor CI/CD builds and notify on failures',
    tags: ['ci-cd', 'devops', 'github', 'monitoring'],
    difficulty: 'advanced',
    estimatedSetupTime: '20 minutes',
    requiredCredentials: ['githubApi', 'slackApi'],
    workflow: {
      name: 'CI/CD Monitor',
      nodes: [
        {
          parameters: {
            events: ['workflow_run'],
            repository: 'owner/repo'
          },
          name: 'GitHub Actions',
          type: 'n8n-nodes-base.githubTrigger',
          typeVersion: 1,
          position: [250, 300],
          webhookId: 'GENERATE_ON_ACTIVATION',
          credentials: { githubApi: { id: 'REPLACE', name: 'GitHub' } }
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["workflow_run"]["conclusion"]}}', operation: 'equals', value2: 'failure' }]
            }
          },
          name: 'Build Failed?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#deployments',
            text: '=🔴 *Build Failed*\n\nWorkflow: {{$json["workflow_run"]["name"]}}\nBranch: {{$json["workflow_run"]["head_branch"]}}\nCommit: {{$json["workflow_run"]["head_commit"]["message"]}}\n\n{{$json["workflow_run"]["html_url"]}}'
          },
          name: 'Alert Failure',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [650, 250],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#deployments',
            text: '=✅ *Build Successful*\n\nWorkflow: {{$json["workflow_run"]["name"]}}\nBranch: {{$json["workflow_run"]["head_branch"]}}'
          },
          name: 'Notify Success',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [650, 350],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'GitHub Actions': { main: [[{ node: 'Build Failed?', type: 'main', index: 0 }]] },
        'Build Failed?': { main: [[{ node: 'Alert Failure', type: 'main', index: 0 }], [{ node: 'Notify Success', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== CONTENT =====
  'rss-to-social': {
    id: 'rss-to-social',
    name: 'RSS to Social Media',
    category: TEMPLATE_CATEGORIES.CONTENT,
    description: 'Automatically post new RSS feed items to social media',
    tags: ['rss', 'content', 'automation', 'twitter'],
    difficulty: 'beginner',
    estimatedSetupTime: '10 minutes',
    requiredCredentials: ['twitterApi'],
    workflow: {
      name: 'RSS to Twitter',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 2 }] }
          },
          name: 'Every 2 Hours',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            url: 'https://your-blog.com/rss.xml'
          },
          name: 'RSS Feed',
          type: 'n8n-nodes-base.rssFeedRead',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            functionCode: 'return items.slice(0, 1);'
          },
          name: 'Get Latest',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'tweet',
            operation: 'create',
            text: '=📝 New post: {{$json["title"]}}\n\n{{$json["link"]}}'
          },
          name: 'Tweet',
          type: 'n8n-nodes-base.twitter',
          typeVersion: 1,
          position: [850, 300],
          credentials: { twitterApi: { id: 'REPLACE', name: 'Twitter' } }
        }
      ],
      connections: {
        'Every 2 Hours': { main: [[{ node: 'RSS Feed', type: 'main', index: 0 }]] },
        'RSS Feed': { main: [[{ node: 'Get Latest', type: 'main', index: 0 }]] },
        'Get Latest': { main: [[{ node: 'Tweet', type: 'main', index: 0 }]] }
      }
    }
  },

  'content-approval': {
    id: 'content-approval',
    name: 'Content Approval Workflow',
    category: TEMPLATE_CATEGORIES.CONTENT,
    description: 'Review and approve content submissions before publishing',
    tags: ['content', 'approval', 'workflow', 'collaboration'],
    difficulty: 'advanced',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Content Approval',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'submit-content',
            responseMode: 'onReceived'
          },
          name: 'Submit Content',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#content-review',
            text: '=📄 *New Content Submission*\n\nTitle: {{$json["title"]}}\nAuthor: {{$json["author"]}}\n\nReview here: {{$json["review_url"]}}'
          },
          name: 'Request Review',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [450, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            resume: 'webhook',
            options: { limit: 604800 }
          },
          name: 'Wait for Approval',
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["status"]}}', operation: 'equals', value2: 'approved' }]
            }
          },
          name: 'Approved?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            method: 'POST',
            url: '=https://cms.company.com/api/publish',
            jsonParameters: true,
            bodyParametersJson: '={{ { "contentId": $json["contentId"] } }}'
          },
          name: 'Publish Content',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [1050, 250]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '={{$json["author_slack"]}}',
            text: '=Your content "{{$json["title"]}}" has been rejected. Feedback: {{$json["feedback"]}}'
          },
          name: 'Notify Rejection',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 350],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Submit Content': { main: [[{ node: 'Request Review', type: 'main', index: 0 }]] },
        'Request Review': { main: [[{ node: 'Wait for Approval', type: 'main', index: 0 }]] },
        'Wait for Approval': { main: [[{ node: 'Approved?', type: 'main', index: 0 }]] },
        'Approved?': { main: [[{ node: 'Publish Content', type: 'main', index: 0 }], [{ node: 'Notify Rejection', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== CRM =====
  'lead-enrichment': {
    id: 'lead-enrichment',
    name: 'Automatic Lead Enrichment',
    category: TEMPLATE_CATEGORIES.CRM,
    description: 'Enrich new CRM leads with data from external APIs',
    tags: ['crm', 'leads', 'enrichment', 'automation'],
    difficulty: 'advanced',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['hubspotApi'],
    workflow: {
      name: 'Lead Enrichment',
      nodes: [
        {
          parameters: {
            eventsUi: { eventValues: [{ name: 'contact.creation' }] }
          },
          name: 'New Contact',
          type: 'n8n-nodes-base.hubspotTrigger',
          typeVersion: 1,
          position: [250, 300],
          webhookId: 'GENERATE_ON_ACTIVATION',
          credentials: { hubspotApi: { id: 'REPLACE', name: 'HubSpot' } }
        },
        {
          parameters: {
            method: 'GET',
            url: '=https://api.clearbit.com/v2/companies/find?domain={{$json["properties"]["email"].split("@")[1]}}',
            options: { headers: { entries: [{ name: 'Authorization', value: 'Bearer YOUR_CLEARBIT_KEY' }] } }
          },
          name: 'Get Company Data',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 300]
        },
        {
          parameters: {
            resource: 'contact',
            operation: 'update',
            contactId: '={{$json["objectId"]}}',
            updateFields: {
              company: '={{$json["name"]}}',
              industry: '={{$json["category"]["industry"]}}',
              company_size: '={{$json["metrics"]["employees"]}}'
            }
          },
          name: 'Update Contact',
          type: 'n8n-nodes-base.hubspot',
          typeVersion: 2,
          position: [650, 300],
          credentials: { hubspotApi: { id: 'REPLACE', name: 'HubSpot' } }
        }
      ],
      connections: {
        'New Contact': { main: [[{ node: 'Get Company Data', type: 'main', index: 0 }]] },
        'Get Company Data': { main: [[{ node: 'Update Contact', type: 'main', index: 0 }]] }
      }
    }
  },

  'follow-up-automation': {
    id: 'follow-up-automation',
    name: 'Sales Follow-up Automation',
    category: TEMPLATE_CATEGORIES.CRM,
    description: 'Automated follow-up emails for sales prospects',
    tags: ['crm', 'sales', 'follow-up', 'email'],
    difficulty: 'intermediate',
    estimatedSetupTime: '20 minutes',
    requiredCredentials: ['hubspotApi'],
    workflow: {
      name: 'Sales Follow-up',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'days', daysInterval: 1 }] }
          },
          name: 'Daily',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'contact',
            operation: 'getAll',
            returnAll: false,
            limit: 100,
            filters: { properties: ['email', 'lastname', 'last_contact_date'], propertyWithHistory: 'lifecyclestage=lead' }
          },
          name: 'Get Leads',
          type: 'n8n-nodes-base.hubspot',
          typeVersion: 2,
          position: [450, 300],
          credentials: { hubspotApi: { id: 'REPLACE', name: 'HubSpot' } }
        },
        {
          parameters: {
            conditions: {
              dateTime: [{ value1: '={{$json["properties"]["last_contact_date"]}}', operation: 'before', value2: '={{$now.minus({days: 3}).toISO()}}' }]
            }
          },
          name: 'No Contact 3+ Days?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'sales@company.com',
            toEmail: '={{$json["properties"]["email"]}}',
            subject: 'Quick follow-up',
            text: '=Hi {{$json["properties"]["firstname"]}},\n\nJust checking in to see if you had any questions about our product.\n\nBest,\nSales Team'
          },
          name: 'Send Follow-up',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [850, 300]
        }
      ],
      connections: {
        Daily: { main: [[{ node: 'Get Leads', type: 'main', index: 0 }]] },
        'Get Leads': { main: [[{ node: 'No Contact 3+ Days?', type: 'main', index: 0 }]] },
        'No Contact 3+ Days?': { main: [[{ node: 'Send Follow-up', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== ANALYTICS =====
  'website-uptime-monitor': {
    id: 'website-uptime-monitor',
    name: 'Website Uptime Monitor',
    category: TEMPLATE_CATEGORIES.MONITORING,
    description: 'Monitor website uptime and alert on downtime',
    tags: ['monitoring', 'uptime', 'alerts', 'website'],
    difficulty: 'beginner',
    estimatedSetupTime: '10 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Uptime Monitor',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] }
          },
          name: 'Every 5 Minutes',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://your-website.com',
            options: { timeout: 10000, redirect: { redirect: { followRedirects: true } } }
          },
          name: 'Check Website',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 300]
        },
        {
          parameters: {
            conditions: {
              number: [{ value1: '={{$json["statusCode"]}}', operation: 'notEqual', value2: 200 }]
            }
          },
          name: 'Is Down?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#alerts',
            text: '=🚨 *Website Down!*\n\nURL: https://your-website.com\nStatus: {{$json["statusCode"]}}\nTime: {{$now.toLocaleString()}}'
          },
          name: 'Alert Team',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Every 5 Minutes': { main: [[{ node: 'Check Website', type: 'main', index: 0 }]] },
        'Check Website': { main: [[{ node: 'Is Down?', type: 'main', index: 0 }]] },
        'Is Down?': { main: [[{ node: 'Alert Team', type: 'main', index: 0 }]] }
      }
    }
  },

  'google-analytics-report': {
    id: 'google-analytics-report',
    name: 'Daily Analytics Report',
    category: TEMPLATE_CATEGORIES.ANALYTICS,
    description: 'Send daily Google Analytics reports via email',
    tags: ['analytics', 'google-analytics', 'reporting', 'email'],
    difficulty: 'intermediate',
    estimatedSetupTime: '20 minutes',
    requiredCredentials: ['googleAnalyticsApi'],
    workflow: {
      name: 'Analytics Report',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: '0 9 * * *' }] }
          },
          name: 'Daily at 9 AM',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            propertyId: 'YOUR_GA4_PROPERTY_ID',
            returnAll: false,
            limit: 10,
            metrics: [{ metricName: 'sessions' }, { metricName: 'pageviews' }, { metricName: 'bounceRate' }],
            dimensions: [{ dimensionName: 'date' }],
            startDate: '7daysAgo',
            endDate: 'today'
          },
          name: 'Get Analytics Data',
          type: 'n8n-nodes-base.googleAnalytics',
          typeVersion: 1,
          position: [450, 300],
          credentials: { googleAnalyticsApi: { id: 'REPLACE', name: 'Google Analytics' } }
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'analytics@company.com',
            toEmail: 'team@company.com',
            subject: '=Daily Analytics Report - {{$now.format("YYYY-MM-DD")}}',
            text: '=📊 Website Analytics (Last 7 Days)\n\nSessions: {{$json["metrics"]["sessions"]}}\nPageviews: {{$json["metrics"]["pageviews"]}}\nBounce Rate: {{$json["metrics"]["bounceRate"]}}%'
          },
          name: 'Send Report',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [650, 300]
        }
      ],
      connections: {
        'Daily at 9 AM': { main: [[{ node: 'Get Analytics Data', type: 'main', index: 0 }]] },
        'Get Analytics Data': { main: [[{ node: 'Send Report', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== AI / RAG =====
  'chatbot-rag': {
    id: 'chatbot-rag',
    name: 'Chatbot with RAG',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'AI chatbot with Retrieval-Augmented Generation using vector database',
    tags: ['ai', 'rag', 'chatbot', 'vector-db', 'qdrant'],
    difficulty: 'advanced',
    estimatedSetupTime: '45 minutes',
    requiredCredentials: ['openAiApi', 'qdrantApi'],
    workflow: {
      name: 'RAG Chatbot',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'chat',
            responseMode: 'lastNode'
          },
          name: 'Chat Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'search',
            collectionName: 'knowledge_base',
            query: '={{$json["question"]}}',
            limit: 5
          },
          name: 'Search Knowledge',
          type: 'n8n-nodes-base.qdrant',
          typeVersion: 1,
          position: [450, 300],
          credentials: { qdrantApi: { id: 'REPLACE', name: 'Qdrant' } }
        },
        {
          parameters: {
            model: 'gpt-4',
            messages: {
              values: [
                { role: 'system', content: 'You are a helpful assistant. Use the context to answer questions.' },
                { role: 'user', content: '=Context: {{$json["results"]}}\n\nQuestion: {{$json["question"]}}' }
              ]
            }
          },
          name: 'OpenAI Chat',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [650, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        }
      ],
      connections: {
        'Chat Webhook': { main: [[{ node: 'Search Knowledge', type: 'main', index: 0 }]] },
        'Search Knowledge': { main: [[{ node: 'OpenAI Chat', type: 'main', index: 0 }]] }
      }
    }
  },

  'ai-content-generator': {
    id: 'ai-content-generator',
    name: 'AI Content Generator',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'Generate blog posts, articles, and marketing copy using AI',
    tags: ['ai', 'openai', 'content', 'generation'],
    difficulty: 'intermediate',
    estimatedSetupTime: '20 minutes',
    requiredCredentials: ['openAiApi'],
    workflow: {
      name: 'AI Content Generator',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'generate-content',
            responseMode: 'lastNode'
          },
          name: 'Request Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            model: 'gpt-4',
            messages: {
              values: [
                { role: 'system', content: 'You are a professional content writer.' },
                { role: 'user', content: '=Write a {{$json["content_type"]}} about {{$json["topic"]}} in {{$json["tone"]}} tone. Length: {{$json["length"]}} words.' }
              ]
            }
          },
          name: 'Generate Content',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [450, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        },
        {
          parameters: {
            operation: 'create',
            documentId: { value: 'YOUR_DOC_ID' },
            text: '={{$json["choices"][0]["message"]["content"]}}'
          },
          name: 'Save to Google Docs',
          type: 'n8n-nodes-base.googleDocs',
          typeVersion: 1,
          position: [650, 300],
          credentials: { googleDocsApi: { id: 'REPLACE', name: 'Google Docs' } }
        }
      ],
      connections: {
        'Request Webhook': { main: [[{ node: 'Generate Content', type: 'main', index: 0 }]] },
        'Generate Content': { main: [[{ node: 'Save to Google Docs', type: 'main', index: 0 }]] }
      }
    }
  },

  'ai-conversational-agent': {
    id: 'ai-conversational-agent',
    name: 'AI Conversational Agent',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'Build multi-turn conversational AI agent with memory',
    tags: ['ai', 'agent', 'conversation', 'memory'],
    difficulty: 'advanced',
    estimatedSetupTime: '40 minutes',
    requiredCredentials: ['openAiApi', 'redis'],
    workflow: {
      name: 'AI Agent',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'agent',
            responseMode: 'lastNode'
          },
          name: 'Agent Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'get',
            key: '=conversation_{{$json["user_id"]}}'
          },
          name: 'Get Conversation History',
          type: 'n8n-nodes-base.redis',
          typeVersion: 1,
          position: [450, 300],
          credentials: { redis: { id: 'REPLACE', name: 'Redis' } }
        },
        {
          parameters: {
            model: 'gpt-4',
            messages: {
              values: [
                { role: 'system', content: 'You are a helpful AI assistant.' },
                { role: 'assistant', content: '={{$json["history"]}}' },
                { role: 'user', content: '={{$json["message"]}}' }
              ]
            }
          },
          name: 'AI Response',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [650, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        },
        {
          parameters: {
            operation: 'set',
            key: '=conversation_{{$json["user_id"]}}',
            value: '={{$json["choices"][0]["message"]["content"]}}',
            expire: true,
            ttl: 3600
          },
          name: 'Save History',
          type: 'n8n-nodes-base.redis',
          typeVersion: 1,
          position: [850, 300],
          credentials: { redis: { id: 'REPLACE', name: 'Redis' } }
        }
      ],
      connections: {
        'Agent Webhook': { main: [[{ node: 'Get Conversation History', type: 'main', index: 0 }]] },
        'Get Conversation History': { main: [[{ node: 'AI Response', type: 'main', index: 0 }]] },
        'AI Response': { main: [[{ node: 'Save History', type: 'main', index: 0 }]] }
      }
    }
  },

  'auto-summarizer': {
    id: 'auto-summarizer',
    name: 'Document Auto Summarizer',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'Automatically summarize long documents and articles',
    tags: ['ai', 'summarization', 'nlp', 'automation'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['openAiApi'],
    workflow: {
      name: 'Auto Summarizer',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'summarize',
            responseMode: 'lastNode'
          },
          name: 'Document Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            model: 'gpt-4',
            messages: {
              values: [
                { role: 'system', content: 'You are an expert at summarizing documents.' },
                { role: 'user', content: '=Summarize this in 3 bullet points:\n\n{{$json["text"]}}' }
              ]
            }
          },
          name: 'Generate Summary',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [450, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'ai@company.com',
            toEmail: '={{$json["recipient"]}}',
            subject: '=Summary: {{$json["title"]}}',
            text: '={{$json["choices"][0]["message"]["content"]}}'
          },
          name: 'Email Summary',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [650, 300]
        }
      ],
      connections: {
        'Document Webhook': { main: [[{ node: 'Generate Summary', type: 'main', index: 0 }]] },
        'Generate Summary': { main: [[{ node: 'Email Summary', type: 'main', index: 0 }]] }
      }
    }
  },

  'ai-image-generator': {
    id: 'ai-image-generator',
    name: 'AI Image Generator',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'Generate images from text descriptions using DALL-E',
    tags: ['ai', 'image', 'dall-e', 'generation'],
    difficulty: 'intermediate',
    estimatedSetupTime: '20 minutes',
    requiredCredentials: ['openAiApi'],
    workflow: {
      name: 'Image Generator',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'generate-image',
            responseMode: 'lastNode'
          },
          name: 'Image Request',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'image',
            operation: 'create',
            prompt: '={{$json["description"]}}',
            size: '1024x1024',
            n: 1
          },
          name: 'Generate Image',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [450, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        },
        {
          parameters: {
            method: 'GET',
            url: '={{$json["data"][0]["url"]}}',
            options: { response: { responseFormat: 'file' } }
          },
          name: 'Download Image',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'upload',
            name: '=generated_{{$now.toFormat("yyyyMMdd_HHmmss")}}.png',
            parents: [{ id: 'YOUR_FOLDER_ID' }]
          },
          name: 'Save to Drive',
          type: 'n8n-nodes-base.googleDrive',
          typeVersion: 1,
          position: [850, 300],
          credentials: { googleDriveApi: { id: 'REPLACE', name: 'Google Drive' } }
        }
      ],
      connections: {
        'Image Request': { main: [[{ node: 'Generate Image', type: 'main', index: 0 }]] },
        'Generate Image': { main: [[{ node: 'Download Image', type: 'main', index: 0 }]] },
        'Download Image': { main: [[{ node: 'Save to Drive', type: 'main', index: 0 }]] }
      }
    }
  },

  'text-to-speech': {
    id: 'text-to-speech',
    name: 'Text-to-Speech Automation',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'Convert text to speech audio files automatically',
    tags: ['ai', 'tts', 'audio', 'openai'],
    difficulty: 'intermediate',
    estimatedSetupTime: '20 minutes',
    requiredCredentials: ['openAiApi'],
    workflow: {
      name: 'Text to Speech',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'text-to-speech',
            responseMode: 'lastNode'
          },
          name: 'TTS Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'audio',
            operation: 'create',
            model: 'tts-1',
            input: '={{$json["text"]}}',
            voice: 'alloy'
          },
          name: 'Generate Audio',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [450, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        },
        {
          parameters: {
            operation: 'upload',
            name: '=audio_{{$now.toFormat("yyyyMMdd_HHmmss")}}.mp3',
            parents: [{ id: 'AUDIO_FOLDER_ID' }]
          },
          name: 'Save Audio',
          type: 'n8n-nodes-base.googleDrive',
          typeVersion: 1,
          position: [650, 300],
          credentials: { googleDriveApi: { id: 'REPLACE', name: 'Google Drive' } }
        }
      ],
      connections: {
        'TTS Webhook': { main: [[{ node: 'Generate Audio', type: 'main', index: 0 }]] },
        'Generate Audio': { main: [[{ node: 'Save Audio', type: 'main', index: 0 }]] }
      }
    }
  },

  'sentiment-analysis': {
    id: 'sentiment-analysis',
    name: 'Sentiment Analysis Pipeline',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'Analyze sentiment of customer feedback and reviews',
    tags: ['ai', 'sentiment', 'nlp', 'analysis'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['openAiApi', 'slackApi'],
    workflow: {
      name: 'Sentiment Analysis',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'analyze-sentiment',
            responseMode: 'onReceived'
          },
          name: 'Feedback Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            model: 'gpt-3.5-turbo',
            messages: {
              values: [
                { role: 'system', content: 'Analyze sentiment. Respond with only: positive, negative, or neutral.' },
                { role: 'user', content: '={{$json["feedback"]}}' }
              ]
            }
          },
          name: 'Analyze Sentiment',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [450, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["choices"][0]["message"]["content"]}}', operation: 'equals', value2: 'negative' }]
            }
          },
          name: 'Is Negative?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#customer-alerts',
            text: '=⚠️ *Negative Feedback Alert*\n\nFeedback: {{$json["feedback"]}}\nCustomer: {{$json["customer_name"]}}'
          },
          name: 'Alert Team',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Feedback Webhook': { main: [[{ node: 'Analyze Sentiment', type: 'main', index: 0 }]] },
        'Analyze Sentiment': { main: [[{ node: 'Is Negative?', type: 'main', index: 0 }]] },
        'Is Negative?': { main: [[{ node: 'Alert Team', type: 'main', index: 0 }]] }
      }
    }
  },

  'document-qa': {
    id: 'document-qa',
    name: 'Document Q&A System',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'Answer questions about uploaded documents using AI',
    tags: ['ai', 'qa', 'documents', 'rag'],
    difficulty: 'advanced',
    estimatedSetupTime: '40 minutes',
    requiredCredentials: ['openAiApi', 'qdrantApi'],
    workflow: {
      name: 'Document Q&A',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'document-qa',
            responseMode: 'lastNode'
          },
          name: 'Question Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'embedding',
            operation: 'create',
            input: '={{$json["question"]}}'
          },
          name: 'Embed Question',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [450, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        },
        {
          parameters: {
            operation: 'search',
            collectionName: 'documents',
            vector: '={{$json["data"][0]["embedding"]}}',
            limit: 3
          },
          name: 'Search Documents',
          type: 'n8n-nodes-base.qdrant',
          typeVersion: 1,
          position: [650, 300],
          credentials: { qdrantApi: { id: 'REPLACE', name: 'Qdrant' } }
        },
        {
          parameters: {
            model: 'gpt-4',
            messages: {
              values: [
                { role: 'system', content: 'Answer based on the context provided.' },
                { role: 'user', content: '=Context: {{$json["results"]}}\n\nQuestion: {{$json["question"]}}' }
              ]
            }
          },
          name: 'Generate Answer',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [850, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        }
      ],
      connections: {
        'Question Webhook': { main: [[{ node: 'Embed Question', type: 'main', index: 0 }]] },
        'Embed Question': { main: [[{ node: 'Search Documents', type: 'main', index: 0 }]] },
        'Search Documents': { main: [[{ node: 'Generate Answer', type: 'main', index: 0 }]] }
      }
    }
  },

  'ai-content-moderator': {
    id: 'ai-content-moderator',
    name: 'AI Content Moderator',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'Automatically moderate user-generated content for safety',
    tags: ['ai', 'moderation', 'safety', 'openai'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['openAiApi'],
    workflow: {
      name: 'Content Moderator',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'moderate-content',
            responseMode: 'lastNode'
          },
          name: 'Content Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'moderation',
            operation: 'create',
            input: '={{$json["content"]}}'
          },
          name: 'Moderate',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [450, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        },
        {
          parameters: {
            conditions: {
              boolean: [{ value1: '={{$json["results"][0]["flagged"]}}', value2: true }]
            }
          },
          name: 'Is Flagged?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            method: 'POST',
            url: '=https://api.yourapp.com/block-content',
            jsonParameters: true,
            bodyParametersJson: '={{ { "contentId": $json["content_id"], "reason": $json["results"][0]["categories"] } }}'
          },
          name: 'Block Content',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [850, 250]
        },
        {
          parameters: {
            method: 'POST',
            url: '=https://api.yourapp.com/approve-content',
            jsonParameters: true,
            bodyParametersJson: '={{ { "contentId": $json["content_id"] } }}'
          },
          name: 'Approve Content',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [850, 350]
        }
      ],
      connections: {
        'Content Webhook': { main: [[{ node: 'Moderate', type: 'main', index: 0 }]] },
        'Moderate': { main: [[{ node: 'Is Flagged?', type: 'main', index: 0 }]] },
        'Is Flagged?': { main: [[{ node: 'Block Content', type: 'main', index: 0 }], [{ node: 'Approve Content', type: 'main', index: 0 }]] }
      }
    }
  },

  'knowledge-base-builder': {
    id: 'knowledge-base-builder',
    name: 'AI Knowledge Base Builder',
    category: TEMPLATE_CATEGORIES.AI_RAG,
    description: 'Build searchable knowledge base from documents with embeddings',
    tags: ['ai', 'knowledge-base', 'embeddings', 'qdrant'],
    difficulty: 'advanced',
    estimatedSetupTime: '45 minutes',
    requiredCredentials: ['openAiApi', 'qdrantApi'],
    workflow: {
      name: 'Knowledge Base Builder',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'add-document',
            responseMode: 'onReceived'
          },
          name: 'Document Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'const text = $input.item.json.text;\nconst chunks = text.match(/.{1,1000}/g) || [];\nreturn chunks.map(chunk => ({ json: { chunk, doc_id: $input.item.json.doc_id } }));'
          },
          name: 'Chunk Document',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            resource: 'embedding',
            operation: 'create',
            input: '={{$json["chunk"]}}'
          },
          name: 'Create Embeddings',
          type: 'n8n-nodes-base.openAi',
          typeVersion: 1,
          position: [650, 300],
          credentials: { openAiApi: { id: 'REPLACE', name: 'OpenAI' } }
        },
        {
          parameters: {
            operation: 'insert',
            collectionName: 'knowledge_base',
            vector: '={{$json["data"][0]["embedding"]}}',
            payload: '={{ { "text": $json["chunk"], "doc_id": $json["doc_id"] } }}'
          },
          name: 'Store in Qdrant',
          type: 'n8n-nodes-base.qdrant',
          typeVersion: 1,
          position: [850, 300],
          credentials: { qdrantApi: { id: 'REPLACE', name: 'Qdrant' } }
        }
      ],
      connections: {
        'Document Webhook': { main: [[{ node: 'Chunk Document', type: 'main', index: 0 }]] },
        'Chunk Document': { main: [[{ node: 'Create Embeddings', type: 'main', index: 0 }]] },
        'Create Embeddings': { main: [[{ node: 'Store in Qdrant', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== DATA =====
  'etl-pipeline': {
    id: 'etl-pipeline',
    name: 'ETL Pipeline',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Extract, Transform, Load data between systems',
    tags: ['etl', 'data', 'pipeline', 'transformation'],
    difficulty: 'advanced',
    estimatedSetupTime: '40 minutes',
    requiredCredentials: ['postgres', 'googleSheetsApi'],
    workflow: {
      name: 'ETL Pipeline',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 6 }] }
          },
          name: 'Every 6 Hours',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: 'SELECT * FROM source_table WHERE updated_at > NOW() - INTERVAL \'6 hours\''
          },
          name: 'Extract Data',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [450, 300],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        },
        {
          parameters: {
            functionCode: 'return items.map(item => ({\n  json: {\n    id: item.json.id,\n    name: item.json.name.toUpperCase(),\n    value: parseFloat(item.json.value),\n    processed_at: new Date().toISOString()\n  }\n}));'
          },
          name: 'Transform Data',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'appendOrUpdate',
            documentId: { value: 'TARGET_SHEET_ID' },
            sheetName: { value: 'Data' },
            columns: { mappingMode: 'autoMapInputData' }
          },
          name: 'Load to Sheets',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [850, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        }
      ],
      connections: {
        'Every 6 Hours': { main: [[{ node: 'Extract Data', type: 'main', index: 0 }]] },
        'Extract Data': { main: [[{ node: 'Transform Data', type: 'main', index: 0 }]] },
        'Transform Data': { main: [[{ node: 'Load to Sheets', type: 'main', index: 0 }]] }
      }
    }
  },

  'data-validator': {
    id: 'data-validator',
    name: 'Data Validation Workflow',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Validate data quality and completeness',
    tags: ['validation', 'data-quality', 'schema'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Data Validator',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'validate-data',
            responseMode: 'lastNode'
          },
          name: 'Data Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'const errors = [];\nconst data = $input.item.json;\n\nif (!data.email?.includes(\'@\')) errors.push(\'Invalid email\');\nif (!data.name || data.name.length < 2) errors.push(\'Name too short\');\nif (data.age && data.age < 0) errors.push(\'Invalid age\');\n\nreturn [{ json: { valid: errors.length === 0, errors, data } }];'
          },
          name: 'Validate',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            conditions: {
              boolean: [{ value1: '={{$json["valid"]}}', value2: false }]
            }
          },
          name: 'Is Invalid?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#data-alerts',
            text: '=❌ *Data Validation Failed*\n\nErrors:\n{{$json["errors"].join("\\n")}}\n\nData: {{JSON.stringify($json["data"])}}'
          },
          name: 'Alert Errors',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 250],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            method: 'POST',
            url: 'https://api.yourapp.com/process-data',
            jsonParameters: true,
            bodyParametersJson: '={{$json["data"]}}'
          },
          name: 'Process Valid Data',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [850, 350]
        }
      ],
      connections: {
        'Data Webhook': { main: [[{ node: 'Validate', type: 'main', index: 0 }]] },
        'Validate': { main: [[{ node: 'Is Invalid?', type: 'main', index: 0 }]] },
        'Is Invalid?': { main: [[{ node: 'Alert Errors', type: 'main', index: 0 }], [{ node: 'Process Valid Data', type: 'main', index: 0 }]] }
      }
    }
  },

  'multi-source-aggregator': {
    id: 'multi-source-aggregator',
    name: 'Multi-Source Data Aggregator',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Aggregate data from multiple APIs and databases',
    tags: ['aggregation', 'data', 'multi-source', 'api'],
    difficulty: 'advanced',
    estimatedSetupTime: '35 minutes',
    requiredCredentials: ['postgres', 'mongoDb'],
    workflow: {
      name: 'Data Aggregator',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 1 }] }
          },
          name: 'Hourly',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: 'SELECT * FROM sales WHERE date = CURRENT_DATE'
          },
          name: 'Get SQL Data',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [450, 200],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        },
        {
          parameters: {
            operation: 'find',
            collection: 'analytics',
            options: { limit: 100 }
          },
          name: 'Get MongoDB Data',
          type: 'n8n-nodes-base.mongoDb',
          typeVersion: 1,
          position: [450, 300],
          credentials: { mongoDb: { id: 'REPLACE', name: 'MongoDB' } }
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://api.external.com/metrics',
            options: { headers: { entries: [{ name: 'Authorization', value: 'Bearer TOKEN' }] } }
          },
          name: 'Get API Data',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 400]
        },
        {
          parameters: {
            mode: 'combine',
            combinationMode: 'mergeByPosition'
          },
          name: 'Merge All',
          type: 'n8n-nodes-base.merge',
          typeVersion: 2,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: '=INSERT INTO aggregated_data (sql_value, mongo_value, api_value, timestamp) VALUES (\'{{$json["sql_data"]}}\', \'{{$json["mongo_data"]}}\', \'{{$json["api_data"]}}\', NOW())'
          },
          name: 'Save Aggregated',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [850, 300],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        }
      ],
      connections: {
        'Hourly': { main: [[{ node: 'Get SQL Data', type: 'main', index: 0 }, { node: 'Get MongoDB Data', type: 'main', index: 0 }, { node: 'Get API Data', type: 'main', index: 0 }]] },
        'Get SQL Data': { main: [[{ node: 'Merge All', type: 'main', index: 0 }]] },
        'Get MongoDB Data': { main: [[{ node: 'Merge All', type: 'main', index: 1 }]] },
        'Get API Data': { main: [[{ node: 'Merge All', type: 'main', index: 2 }]] },
        'Merge All': { main: [[{ node: 'Save Aggregated', type: 'main', index: 0 }]] }
      }
    }
  },

  'realtime-data-sync': {
    id: 'realtime-data-sync',
    name: 'Real-Time Data Sync',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Sync data in real-time between systems',
    tags: ['sync', 'realtime', 'webhook', 'data'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['postgres'],
    workflow: {
      name: 'Real-Time Sync',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'data-change',
            responseMode: 'onReceived'
          },
          name: 'Change Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["action"]}}', operation: 'equals', value2: 'create' }]
            }
          },
          name: 'Action Type',
          type: 'n8n-nodes-base.switch',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: '=INSERT INTO target_table (id, data) VALUES ({{$json["id"]}}, \'{{JSON.stringify($json["data"])}}\')'
          },
          name: 'Create Record',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [650, 200],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: '=UPDATE target_table SET data = \'{{JSON.stringify($json["data"])}}\' WHERE id = {{$json["id"]}}'
          },
          name: 'Update Record',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [650, 300],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: '=DELETE FROM target_table WHERE id = {{$json["id"]}}'
          },
          name: 'Delete Record',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [650, 400],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        }
      ],
      connections: {
        'Change Webhook': { main: [[{ node: 'Action Type', type: 'main', index: 0 }]] },
        'Action Type': { main: [[{ node: 'Create Record', type: 'main', index: 0 }], [{ node: 'Update Record', type: 'main', index: 0 }], [{ node: 'Delete Record', type: 'main', index: 0 }]] }
      }
    }
  },

  'data-cleanup': {
    id: 'data-cleanup',
    name: 'Data Cleanup Automation',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Automatically clean and normalize messy data',
    tags: ['cleanup', 'normalization', 'data-quality'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: [],
    workflow: {
      name: 'Data Cleanup',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'clean-data',
            responseMode: 'lastNode'
          },
          name: 'Data Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'return items.map(item => {\n  const data = item.json;\n  return {\n    json: {\n      name: data.name?.trim().replace(/\\s+/g, \' \'),\n      email: data.email?.toLowerCase().trim(),\n      phone: data.phone?.replace(/[^0-9+]/g, \'\'),\n      address: data.address?.trim(),\n      created_at: new Date().toISOString()\n    }\n  };\n});'
          },
          name: 'Clean & Normalize',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            functionCode: 'const seen = new Set();\nreturn items.filter(item => {\n  const key = item.json.email;\n  if (seen.has(key)) return false;\n  seen.add(key);\n  return true;\n});'
          },
          name: 'Remove Duplicates',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            method: 'POST',
            url: 'https://api.yourapp.com/import-clean-data',
            jsonParameters: true,
            bodyParametersJson: '={{$json}}'
          },
          name: 'Import Clean Data',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [850, 300]
        }
      ],
      connections: {
        'Data Webhook': { main: [[{ node: 'Clean & Normalize', type: 'main', index: 0 }]] },
        'Clean & Normalize': { main: [[{ node: 'Remove Duplicates', type: 'main', index: 0 }]] },
        'Remove Duplicates': { main: [[{ node: 'Import Clean Data', type: 'main', index: 0 }]] }
      }
    }
  },

  'csv-transformer': {
    id: 'csv-transformer',
    name: 'Advanced CSV Transformer',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Transform CSV files with complex data mappings',
    tags: ['csv', 'transformation', 'mapping'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['googleDriveApi'],
    workflow: {
      name: 'CSV Transformer',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 12 }] }
          },
          name: 'Twice Daily',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'download',
            fileId: { value: 'SOURCE_CSV_FILE_ID' }
          },
          name: 'Download CSV',
          type: 'n8n-nodes-base.googleDrive',
          typeVersion: 1,
          position: [450, 300],
          credentials: { googleDriveApi: { id: 'REPLACE', name: 'Google Drive' } }
        },
        {
          parameters: {
            operation: 'toJson',
            options: { delimiter: ',', includeEmptyRows: false }
          },
          name: 'Parse CSV',
          type: 'n8n-nodes-base.csv',
          typeVersion: 2,
          position: [650, 300]
        },
        {
          parameters: {
            functionCode: 'return items.map(item => ({\n  json: {\n    fullName: `${item.json.firstName} ${item.json.lastName}`,\n    contactEmail: item.json.email,\n    totalAmount: parseFloat(item.json.amount) * 1.2,\n    status: item.json.status === \'1\' ? \'active\' : \'inactive\',\n    processedDate: new Date().toISOString()\n  }\n}));'
          },
          name: 'Transform Data',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            operation: 'fromJson',
            options: { delimiter: ',' }
          },
          name: 'Convert to CSV',
          type: 'n8n-nodes-base.csv',
          typeVersion: 2,
          position: [1050, 300]
        },
        {
          parameters: {
            operation: 'upload',
            name: '=transformed_{{$now.toFormat("yyyyMMdd")}}.csv',
            parents: [{ id: 'OUTPUT_FOLDER_ID' }]
          },
          name: 'Upload Result',
          type: 'n8n-nodes-base.googleDrive',
          typeVersion: 1,
          position: [1250, 300],
          credentials: { googleDriveApi: { id: 'REPLACE', name: 'Google Drive' } }
        }
      ],
      connections: {
        'Twice Daily': { main: [[{ node: 'Download CSV', type: 'main', index: 0 }]] },
        'Download CSV': { main: [[{ node: 'Parse CSV', type: 'main', index: 0 }]] },
        'Parse CSV': { main: [[{ node: 'Transform Data', type: 'main', index: 0 }]] },
        'Transform Data': { main: [[{ node: 'Convert to CSV', type: 'main', index: 0 }]] },
        'Convert to CSV': { main: [[{ node: 'Upload Result', type: 'main', index: 0 }]] }
      }
    }
  },

  'api-data-collector': {
    id: 'api-data-collector',
    name: 'API Data Collector',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Collect and store data from multiple APIs',
    tags: ['api', 'collector', 'aggregation', 'storage'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['postgres'],
    workflow: {
      name: 'API Collector',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] }
          },
          name: 'Every 30 Minutes',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://api.service1.com/data',
            options: { headers: { entries: [{ name: 'Authorization', value: 'Bearer API_KEY_1' }] } }
          },
          name: 'API 1',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 200]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://api.service2.com/metrics',
            options: { headers: { entries: [{ name: 'X-API-Key', value: 'API_KEY_2' }] } }
          },
          name: 'API 2',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 400]
        },
        {
          parameters: {
            mode: 'combine',
            combinationMode: 'mergeByPosition'
          },
          name: 'Merge APIs',
          type: 'n8n-nodes-base.merge',
          typeVersion: 2,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: '=INSERT INTO api_data (source, data, collected_at) VALUES (\'combined\', \'{{JSON.stringify($json)}}\', NOW())'
          },
          name: 'Store Data',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [850, 300],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        }
      ],
      connections: {
        'Every 30 Minutes': { main: [[{ node: 'API 1', type: 'main', index: 0 }, { node: 'API 2', type: 'main', index: 0 }]] },
        'API 1': { main: [[{ node: 'Merge APIs', type: 'main', index: 0 }]] },
        'API 2': { main: [[{ node: 'Merge APIs', type: 'main', index: 1 }]] },
        'Merge APIs': { main: [[{ node: 'Store Data', type: 'main', index: 0 }]] }
      }
    }
  },

  'database-migration': {
    id: 'database-migration',
    name: 'Database Migration Workflow',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Migrate data between different database systems',
    tags: ['migration', 'database', 'postgres', 'mongodb'],
    difficulty: 'advanced',
    estimatedSetupTime: '40 minutes',
    requiredCredentials: ['postgres', 'mongoDb'],
    workflow: {
      name: 'DB Migration',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'migrate',
            responseMode: 'lastNode'
          },
          name: 'Trigger Migration',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: '=SELECT * FROM {{$json["source_table"]}} LIMIT {{$json["batch_size"] || 1000}}'
          },
          name: 'Extract from SQL',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [450, 300],
          credentials: { postgres: { id: 'REPLACE', name: 'Source PostgreSQL' } }
        },
        {
          parameters: {
            functionCode: 'return items.map(item => ({\n  json: {\n    _id: item.json.id,\n    data: item.json,\n    migrated_at: new Date()\n  }\n}));'
          },
          name: 'Transform Schema',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'insertMany',
            collection: '={{$json["target_collection"]}}',
            fields: 'data,migrated_at'
          },
          name: 'Load to MongoDB',
          type: 'n8n-nodes-base.mongoDb',
          typeVersion: 1,
          position: [850, 300],
          credentials: { mongoDb: { id: 'REPLACE', name: 'Target MongoDB' } }
        }
      ],
      connections: {
        'Trigger Migration': { main: [[{ node: 'Extract from SQL', type: 'main', index: 0 }]] },
        'Extract from SQL': { main: [[{ node: 'Transform Schema', type: 'main', index: 0 }]] },
        'Transform Schema': { main: [[{ node: 'Load to MongoDB', type: 'main', index: 0 }]] }
      }
    }
  },

  'data-backup-orchestrator': {
    id: 'data-backup-orchestrator',
    name: 'Data Backup Orchestrator',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Orchestrate multi-source data backups',
    tags: ['backup', 'orchestration', 'multi-source'],
    difficulty: 'advanced',
    estimatedSetupTime: '45 minutes',
    requiredCredentials: ['postgres', 'mongoDb', 'googleDriveApi'],
    workflow: {
      name: 'Backup Orchestrator',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: '0 2 * * *' }] }
          },
          name: 'Daily 2 AM',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: 'SELECT * FROM critical_data'
          },
          name: 'Backup PostgreSQL',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [450, 200],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        },
        {
          parameters: {
            operation: 'find',
            collection: 'users',
            options: { limit: 10000 }
          },
          name: 'Backup MongoDB',
          type: 'n8n-nodes-base.mongoDb',
          typeVersion: 1,
          position: [450, 400],
          credentials: { mongoDb: { id: 'REPLACE', name: 'MongoDB' } }
        },
        {
          parameters: {
            functionCode: 'const data = { postgres: items[0]?.json, mongodb: items[1]?.json, timestamp: new Date().toISOString() };\nreturn [{ json: data, binary: { data: { data: Buffer.from(JSON.stringify(data, null, 2)), mimeType: \'application/json\' } } }];'
          },
          name: 'Create Backup File',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'upload',
            name: '=backup_{{$now.toFormat("yyyyMMdd_HHmmss")}}.json',
            parents: [{ id: 'BACKUP_FOLDER_ID' }]
          },
          name: 'Upload to Drive',
          type: 'n8n-nodes-base.googleDrive',
          typeVersion: 1,
          position: [850, 300],
          credentials: { googleDriveApi: { id: 'REPLACE', name: 'Google Drive' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#ops',
            text: '=✅ Daily backup completed: {{$now.format("YYYY-MM-DD HH:mm")}}'
          },
          name: 'Notify Success',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Daily 2 AM': { main: [[{ node: 'Backup PostgreSQL', type: 'main', index: 0 }, { node: 'Backup MongoDB', type: 'main', index: 0 }]] },
        'Backup PostgreSQL': { main: [[{ node: 'Create Backup File', type: 'main', index: 0 }]] },
        'Backup MongoDB': { main: [[{ node: 'Create Backup File', type: 'main', index: 1 }]] },
        'Create Backup File': { main: [[{ node: 'Upload to Drive', type: 'main', index: 0 }]] },
        'Upload to Drive': { main: [[{ node: 'Notify Success', type: 'main', index: 0 }]] }
      }
    }
  },

  'data-quality-checker': {
    id: 'data-quality-checker',
    name: 'Data Quality Checker',
    category: TEMPLATE_CATEGORIES.DATA,
    description: 'Monitor and report on data quality metrics',
    tags: ['data-quality', 'monitoring', 'metrics'],
    difficulty: 'intermediate',
    estimatedSetupTime: '35 minutes',
    requiredCredentials: ['postgres', 'slackApi'],
    workflow: {
      name: 'Quality Checker',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 4 }] }
          },
          name: 'Every 4 Hours',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'executeQuery',
            query: 'SELECT COUNT(*) as total, COUNT(email) as with_email, COUNT(DISTINCT email) as unique_emails FROM users'
          },
          name: 'Check Data Quality',
          type: 'n8n-nodes-base.postgres',
          typeVersion: 2,
          position: [450, 300],
          credentials: { postgres: { id: 'REPLACE', name: 'PostgreSQL' } }
        },
        {
          parameters: {
            functionCode: 'const data = $input.item.json;\nconst emailCompleteness = (data.with_email / data.total * 100).toFixed(2);\nconst duplicateRate = ((data.with_email - data.unique_emails) / data.with_email * 100).toFixed(2);\nconst issues = [];\n\nif (emailCompleteness < 95) issues.push(`Low email completeness: ${emailCompleteness}%`);\nif (duplicateRate > 5) issues.push(`High duplicate rate: ${duplicateRate}%`);\n\nreturn [{ json: { metrics: data, emailCompleteness, duplicateRate, issues, hasIssues: issues.length > 0 } }];'
          },
          name: 'Calculate Metrics',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            conditions: {
              boolean: [{ value1: '={{$json["hasIssues"]}}', value2: true }]
            }
          },
          name: 'Has Issues?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#data-quality',
            text: '=⚠️ *Data Quality Issues Detected*\n\n{{$json["issues"].join("\\n")}}\n\nEmail Completeness: {{$json["emailCompleteness"]}}%\nDuplicate Rate: {{$json["duplicateRate"]}}%'
          },
          name: 'Alert Issues',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Every 4 Hours': { main: [[{ node: 'Check Data Quality', type: 'main', index: 0 }]] },
        'Check Data Quality': { main: [[{ node: 'Calculate Metrics', type: 'main', index: 0 }]] },
        'Calculate Metrics': { main: [[{ node: 'Has Issues?', type: 'main', index: 0 }]] },
        'Has Issues?': { main: [[{ node: 'Alert Issues', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== BUSINESS =====
  'invoice-processor': {
    id: 'invoice-processor',
    name: 'Invoice Processing Automation',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Automatically process and categorize invoices',
    tags: ['invoice', 'accounting', 'automation', 'finance'],
    difficulty: 'advanced',
    estimatedSetupTime: '40 minutes',
    requiredCredentials: ['gmailApi', 'googleDriveApi'],
    workflow: {
      name: 'Invoice Processor',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 2 }] }
          },
          name: 'Every 2 Hours',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'getAll',
            filters: { q: 'subject:invoice has:attachment is:unread' },
            format: 'simple'
          },
          name: 'Get Invoice Emails',
          type: 'n8n-nodes-base.gmail',
          typeVersion: 1,
          position: [450, 300],
          credentials: { gmailApi: { id: 'REPLACE', name: 'Gmail' } }
        },
        {
          parameters: {
            functionCode: 'const attachments = [];\nfor (const item of items) {\n  if (item.json.attachments) {\n    for (const att of item.json.attachments) {\n      if (att.mimeType === \'application/pdf\') {\n        attachments.push({ json: { ...item.json, attachment: att } });\n      }\n    }\n  }\n}\nreturn attachments;'
          },
          name: 'Extract PDFs',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'upload',
            name: '=invoice_{{$json["from"]}}_{{$now.toFormat("yyyyMMdd")}}.pdf',
            parents: [{ id: 'INVOICES_FOLDER_ID' }]
          },
          name: 'Save to Drive',
          type: 'n8n-nodes-base.googleDrive',
          typeVersion: 1,
          position: [850, 300],
          credentials: { googleDriveApi: { id: 'REPLACE', name: 'Google Drive' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'addLabel',
            messageId: '={{$json["id"]}}',
            labelIds: ['Label_123']
          },
          name: 'Mark Processed',
          type: 'n8n-nodes-base.gmail',
          typeVersion: 1,
          position: [1050, 300],
          credentials: { gmailApi: { id: 'REPLACE', name: 'Gmail' } }
        }
      ],
      connections: {
        'Every 2 Hours': { main: [[{ node: 'Get Invoice Emails', type: 'main', index: 0 }]] },
        'Get Invoice Emails': { main: [[{ node: 'Extract PDFs', type: 'main', index: 0 }]] },
        'Extract PDFs': { main: [[{ node: 'Save to Drive', type: 'main', index: 0 }]] },
        'Save to Drive': { main: [[{ node: 'Mark Processed', type: 'main', index: 0 }]] }
      }
    }
  },

  'lead-qualification': {
    id: 'lead-qualification',
    name: 'Lead Qualification Engine',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Automatically qualify and score leads',
    tags: ['lead', 'qualification', 'scoring', 'sales'],
    difficulty: 'advanced',
    estimatedSetupTime: '35 minutes',
    requiredCredentials: ['hubspotApi', 'slackApi'],
    workflow: {
      name: 'Lead Qualifier',
      nodes: [
        {
          parameters: {
            eventsUi: { eventValues: [{ name: 'contact.creation' }] }
          },
          name: 'New Lead',
          type: 'n8n-nodes-base.hubspotTrigger',
          typeVersion: 1,
          position: [250, 300],
          webhookId: 'GENERATE_ON_ACTIVATION',
          credentials: { hubspotApi: { id: 'REPLACE', name: 'HubSpot' } }
        },
        {
          parameters: {
            functionCode: 'let score = 0;\nconst props = $input.item.json.properties;\n\nif (props.company) score += 20;\nif (props.jobtitle?.includes(\'Director\') || props.jobtitle?.includes(\'Manager\')) score += 30;\nif (props.num_employees > 50) score += 25;\nif (props.industry === \'Technology\') score += 15;\nif (props.email?.includes(\'@gmail\') || props.email?.includes(\'@yahoo\')) score -= 20;\n\nconst quality = score >= 70 ? \'hot\' : score >= 40 ? \'warm\' : \'cold\';\nreturn [{ json: { ...$input.item.json, leadScore: score, quality } }];'
          },
          name: 'Score Lead',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            resource: 'contact',
            operation: 'update',
            contactId: '={{$json["objectId"]}}',
            updateFields: {
              customPropertiesUi: {
                customPropertiesValues: [
                  { property: 'lead_score', value: '={{$json["leadScore"]}}' },
                  { property: 'lead_quality', value: '={{$json["quality"]}}' }
                ]
              }
            }
          },
          name: 'Update HubSpot',
          type: 'n8n-nodes-base.hubspot',
          typeVersion: 2,
          position: [650, 300],
          credentials: { hubspotApi: { id: 'REPLACE', name: 'HubSpot' } }
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["quality"]}}', operation: 'equals', value2: 'hot' }]
            }
          },
          name: 'Is Hot Lead?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#sales',
            text: '=🔥 *Hot Lead Alert!*\n\nName: {{$json["properties"]["firstname"]}} {{$json["properties"]["lastname"]}}\nCompany: {{$json["properties"]["company"]}}\nScore: {{$json["leadScore"]}}\n\nView in HubSpot: https://app.hubspot.com/contacts/{{$json["objectId"]}}'
          },
          name: 'Alert Sales Team',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'New Lead': { main: [[{ node: 'Score Lead', type: 'main', index: 0 }]] },
        'Score Lead': { main: [[{ node: 'Update HubSpot', type: 'main', index: 0 }]] },
        'Update HubSpot': { main: [[{ node: 'Is Hot Lead?', type: 'main', index: 0 }]] },
        'Is Hot Lead?': { main: [[{ node: 'Alert Sales Team', type: 'main', index: 0 }]] }
      }
    }
  },

  'customer-onboarding': {
    id: 'customer-onboarding',
    name: 'Customer Onboarding Flow',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Automate customer onboarding process',
    tags: ['onboarding', 'customer', 'automation', 'email'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: [],
    workflow: {
      name: 'Customer Onboarding',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'new-customer',
            responseMode: 'onReceived'
          },
          name: 'New Customer',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'welcome@company.com',
            toEmail: '={{$json["email"]}}',
            subject: '=Welcome {{$json["name"]}}!',
            text: '=Hi {{$json["name"]}},\\n\\nWelcome to our platform! We\'re excited to have you.\\n\\nBest regards,\\nThe Team'
          },
          name: 'Send Welcome Email',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [450, 300]
        },
        {
          parameters: {
            amount: 1,
            unit: 'days'
          },
          name: 'Wait 1 Day',
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'success@company.com',
            toEmail: '={{$json["email"]}}',
            subject: 'Getting started guide',
            text: '=Hi {{$json["name"]}},\\n\\nHere\'s how to get the most out of our platform...\\n\\nBest,\\nSuccess Team'
          },
          name: 'Send Guide',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [850, 300]
        },
        {
          parameters: {
            amount: 3,
            unit: 'days'
          },
          name: 'Wait 3 Days',
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          position: [1050, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'feedback@company.com',
            toEmail: '={{$json["email"]}}',
            subject: 'How are you doing?',
            text: '=Hi {{$json["name"]}},\\n\\nWe\'d love to hear your feedback!\\n\\nBest,\\nThe Team'
          },
          name: 'Request Feedback',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [1250, 300]
        }
      ],
      connections: {
        'New Customer': { main: [[{ node: 'Send Welcome Email', type: 'main', index: 0 }]] },
        'Send Welcome Email': { main: [[{ node: 'Wait 1 Day', type: 'main', index: 0 }]] },
        'Wait 1 Day': { main: [[{ node: 'Send Guide', type: 'main', index: 0 }]] },
        'Send Guide': { main: [[{ node: 'Wait 3 Days', type: 'main', index: 0 }]] },
        'Wait 3 Days': { main: [[{ node: 'Request Feedback', type: 'main', index: 0 }]] }
      }
    }
  },

  'support-ticket-router': {
    id: 'support-ticket-router',
    name: 'Support Ticket Router',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Automatically route support tickets to right team',
    tags: ['support', 'tickets', 'routing', 'automation'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Ticket Router',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'new-ticket',
            responseMode: 'lastNode'
          },
          name: 'New Ticket',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'const keywords = {\n  billing: [\'payment\', \'invoice\', \'charge\', \'refund\'],\n  technical: [\'error\', \'bug\', \'crash\', \'not working\'],\n  sales: [\'pricing\', \'demo\', \'upgrade\', \'plan\']\n};\n\nconst text = $input.item.json.description.toLowerCase();\nlet category = \'general\';\n\nfor (const [cat, words] of Object.entries(keywords)) {\n  if (words.some(word => text.includes(word))) {\n    category = cat;\n    break;\n  }\n}\n\nreturn [{ json: { ...$input.item.json, category } }];'
          },
          name: 'Categorize Ticket',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["category"]}}', operation: 'equals', value2: 'billing' }]
            }
          },
          name: 'Route by Category',
          type: 'n8n-nodes-base.switch',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#billing-support',
            text: '=💰 *New Billing Ticket*\\n\\nFrom: {{$json["customer_email"]}}\\nSubject: {{$json["subject"]}}\\n\\n{{$json["description"]}}'
          },
          name: 'To Billing',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 200],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#tech-support',
            text: '=🔧 *New Technical Ticket*\\n\\nFrom: {{$json["customer_email"]}}\\nSubject: {{$json["subject"]}}\\n\\n{{$json["description"]}}'
          },
          name: 'To Technical',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#sales-support',
            text: '=💼 *New Sales Ticket*\\n\\nFrom: {{$json["customer_email"]}}\\nSubject: {{$json["subject"]}}\\n\\n{{$json["description"]}}'
          },
          name: 'To Sales',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 400],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'New Ticket': { main: [[{ node: 'Categorize Ticket', type: 'main', index: 0 }]] },
        'Categorize Ticket': { main: [[{ node: 'Route by Category', type: 'main', index: 0 }]] },
        'Route by Category': { main: [[{ node: 'To Billing', type: 'main', index: 0 }], [{ node: 'To Technical', type: 'main', index: 0 }], [{ node: 'To Sales', type: 'main', index: 0 }]] }
      }
    }
  },

  'meeting-scheduler': {
    id: 'meeting-scheduler',
    name: 'Smart Meeting Scheduler',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Automatically schedule meetings based on availability',
    tags: ['scheduling', 'calendar', 'meetings', 'automation'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['googleCalendarApi'],
    workflow: {
      name: 'Meeting Scheduler',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'schedule-meeting',
            responseMode: 'lastNode'
          },
          name: 'Meeting Request',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'getAll',
            calendar: 'primary',
            timeMin: '={{$now.toISO()}}',
            timeMax: '={{$now.plus({days: 7}).toISO()}}',
            returnAll: true
          },
          name: 'Get Availability',
          type: 'n8n-nodes-base.googleCalendar',
          typeVersion: 1,
          position: [450, 300],
          credentials: { googleCalendarApi: { id: 'REPLACE', name: 'Google Calendar' } }
        },
        {
          parameters: {
            functionCode: 'const events = $input.all();\nconst duration = $input.item.json.duration || 30;\nconst now = new Date();\nconst endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);\n\nconst slots = [];\nfor (let d = new Date(now); d < endDate; d.setMinutes(d.getMinutes() + 30)) {\n  const slotEnd = new Date(d.getTime() + duration * 60 * 1000);\n  const isFree = !events.some(e => {\n    const start = new Date(e.json.start.dateTime);\n    const end = new Date(e.json.end.dateTime);\n    return (d >= start && d < end) || (slotEnd > start && slotEnd <= end);\n  });\n  if (isFree && d.getHours() >= 9 && d.getHours() < 17) {\n    slots.push(d.toISOString());\n    if (slots.length >= 5) break;\n  }\n}\n\nreturn [{ json: { availableSlots: slots, requestedDuration: duration } }];'
          },
          name: 'Find Slots',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'scheduler@company.com',
            toEmail: '={{$json["attendee_email"]}}',
            subject: 'Available meeting times',
            text: '=Here are the available time slots:\\n\\n{{$json["availableSlots"].join("\\n")}}\\n\\nPlease confirm your preferred time.'
          },
          name: 'Send Options',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [850, 300]
        }
      ],
      connections: {
        'Meeting Request': { main: [[{ node: 'Get Availability', type: 'main', index: 0 }]] },
        'Get Availability': { main: [[{ node: 'Find Slots', type: 'main', index: 0 }]] },
        'Find Slots': { main: [[{ node: 'Send Options', type: 'main', index: 0 }]] }
      }
    }
  },

  'document-approval': {
    id: 'document-approval',
    name: 'Document Approval Workflow',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Multi-step document approval process',
    tags: ['approval', 'workflow', 'documents', 'collaboration'],
    difficulty: 'advanced',
    estimatedSetupTime: '40 minutes',
    requiredCredentials: ['slackApi', 'googleDriveApi'],
    workflow: {
      name: 'Document Approval',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'submit-document',
            responseMode: 'onReceived'
          },
          name: 'Submit Document',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '={{$json["manager_slack"]}}',
            text: '=📄 *Document Approval Request*\\n\\nSubmitted by: {{$json["submitter"]}}\\nTitle: {{$json["title"]}}\\n\\nView: {{$json["document_url"]}}\\n\\nApprove: {{$json["webhook_url"]}}/approve\\nReject: {{$json["webhook_url"]}}/reject'
          },
          name: 'Request Manager Approval',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [450, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            resume: 'webhook',
            options: { limit: 172800 }
          },
          name: 'Wait for Manager',
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["decision"]}}', operation: 'equals', value2: 'approve' }]
            }
          },
          name: 'Manager Approved?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '={{$json["director_slack"]}}',
            text: '=📄 *Final Approval Needed*\\n\\nDocument: {{$json["title"]}}\\nManager: Approved\\n\\nView: {{$json["document_url"]}}\\n\\nApprove: {{$json["webhook_url"]}}/final-approve'
          },
          name: 'Request Director Approval',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 250],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'workflow@company.com',
            toEmail: '={{$json["submitter_email"]}}',
            subject: '=Document Rejected: {{$json["title"]}}',
            text: '=Your document has been rejected.\\n\\nFeedback: {{$json["feedback"]}}'
          },
          name: 'Notify Rejection',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [1050, 350]
        }
      ],
      connections: {
        'Submit Document': { main: [[{ node: 'Request Manager Approval', type: 'main', index: 0 }]] },
        'Request Manager Approval': { main: [[{ node: 'Wait for Manager', type: 'main', index: 0 }]] },
        'Wait for Manager': { main: [[{ node: 'Manager Approved?', type: 'main', index: 0 }]] },
        'Manager Approved?': { main: [[{ node: 'Request Director Approval', type: 'main', index: 0 }], [{ node: 'Notify Rejection', type: 'main', index: 0 }]] }
      }
    }
  },

  'contract-management': {
    id: 'contract-management',
    name: 'Contract Management System',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Track and manage contract lifecycle',
    tags: ['contract', 'legal', 'expiry', 'alerts'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['googleSheetsApi', 'slackApi'],
    workflow: {
      name: 'Contract Manager',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'days', daysInterval: 1 }] }
          },
          name: 'Daily Check',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'read',
            documentId: { value: 'CONTRACTS_SHEET_ID' },
            sheetName: { value: 'Contracts' },
            options: { dataStartRow: 2 }
          },
          name: 'Get Contracts',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [450, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        },
        {
          parameters: {
            functionCode: 'const today = new Date();\nconst warningDays = 30;\nconst expiring = [];\n\nfor (const item of items) {\n  const expiryDate = new Date(item.json.expiry_date);\n  const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));\n  \n  if (daysUntilExpiry > 0 && daysUntilExpiry <= warningDays) {\n    expiring.push({\n      json: {\n        ...item.json,\n        daysUntilExpiry,\n        urgency: daysUntilExpiry <= 7 ? \'critical\' : daysUntilExpiry <= 14 ? \'high\' : \'medium\'\n      }\n    });\n  }\n}\n\nreturn expiring;'
          },
          name: 'Check Expiry',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#legal',
            text: '=⚠️ *Contract Expiring Soon*\\n\\nContract: {{$json["contract_name"]}}\\nVendor: {{$json["vendor"]}}\\nExpiry: {{$json["expiry_date"]}}\\nDays remaining: {{$json["daysUntilExpiry"]}}\\nUrgency: {{$json["urgency"]}}'
          },
          name: 'Alert Team',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Daily Check': { main: [[{ node: 'Get Contracts', type: 'main', index: 0 }]] },
        'Get Contracts': { main: [[{ node: 'Check Expiry', type: 'main', index: 0 }]] },
        'Check Expiry': { main: [[{ node: 'Alert Team', type: 'main', index: 0 }]] }
      }
    }
  },

  'expense-tracker': {
    id: 'expense-tracker',
    name: 'Expense Tracking Automation',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Track and categorize business expenses',
    tags: ['expenses', 'finance', 'tracking', 'receipts'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['gmailApi', 'googleSheetsApi'],
    workflow: {
      name: 'Expense Tracker',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 6 }] }
          },
          name: 'Every 6 Hours',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'getAll',
            filters: { q: 'subject:(receipt OR invoice) is:unread' },
            format: 'simple'
          },
          name: 'Get Receipts',
          type: 'n8n-nodes-base.gmail',
          typeVersion: 1,
          position: [450, 300],
          credentials: { gmailApi: { id: 'REPLACE', name: 'Gmail' } }
        },
        {
          parameters: {
            functionCode: 'return items.map(item => {\n  const subject = item.json.subject;\n  const amountMatch = subject.match(/\\$([0-9,.]+)/);\n  const amount = amountMatch ? parseFloat(amountMatch[1].replace(\',\', \'\')) : 0;\n  \n  let category = \'Other\';\n  if (subject.toLowerCase().includes(\'uber\') || subject.toLowerCase().includes(\'lyft\')) category = \'Transportation\';\n  else if (subject.toLowerCase().includes(\'hotel\') || subject.toLowerCase().includes(\'airbnb\')) category = \'Lodging\';\n  else if (subject.toLowerCase().includes(\'amazon\') || subject.toLowerCase().includes(\'office\')) category = \'Supplies\';\n  \n  return {\n    json: {\n      date: item.json.date,\n      vendor: item.json.from?.name || \'Unknown\',\n      amount,\n      category,\n      description: subject\n    }\n  };\n});'
          },
          name: 'Parse Expense',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'appendOrUpdate',
            documentId: { value: 'EXPENSES_SHEET_ID' },
            sheetName: { value: 'Expenses' },
            columns: { mappingMode: 'autoMapInputData' }
          },
          name: 'Log to Sheet',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [850, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        }
      ],
      connections: {
        'Every 6 Hours': { main: [[{ node: 'Get Receipts', type: 'main', index: 0 }]] },
        'Get Receipts': { main: [[{ node: 'Parse Expense', type: 'main', index: 0 }]] },
        'Parse Expense': { main: [[{ node: 'Log to Sheet', type: 'main', index: 0 }]] }
      }
    }
  },

  'time-tracking': {
    id: 'time-tracking',
    name: 'Time Tracking Automation',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Automatically track time spent on tasks',
    tags: ['time-tracking', 'productivity', 'reporting'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['googleSheetsApi'],
    workflow: {
      name: 'Time Tracker',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'track-time',
            responseMode: 'lastNode'
          },
          name: 'Time Entry',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'const start = new Date($input.item.json.start_time);\nconst end = new Date($input.item.json.end_time);\nconst hours = (end - start) / (1000 * 60 * 60);\n\nreturn [{\n  json: {\n    user: $input.item.json.user,\n    project: $input.item.json.project,\n    task: $input.item.json.task,\n    date: start.toISOString().split(\'T\')[0],\n    hours: hours.toFixed(2),\n    billable: $input.item.json.billable || true\n  }\n}];'
          },
          name: 'Calculate Hours',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            operation: 'appendOrUpdate',
            documentId: { value: 'TIMESHEET_ID' },
            sheetName: { value: 'Hours' },
            columns: { mappingMode: 'autoMapInputData' }
          },
          name: 'Log Hours',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [650, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        }
      ],
      connections: {
        'Time Entry': { main: [[{ node: 'Calculate Hours', type: 'main', index: 0 }]] },
        'Calculate Hours': { main: [[{ node: 'Log Hours', type: 'main', index: 0 }]] }
      }
    }
  },

  'resource-allocation': {
    id: 'resource-allocation',
    name: 'Resource Allocation System',
    category: TEMPLATE_CATEGORIES.BUSINESS,
    description: 'Optimize resource allocation across projects',
    tags: ['resources', 'allocation', 'planning', 'optimization'],
    difficulty: 'advanced',
    estimatedSetupTime: '40 minutes',
    requiredCredentials: ['googleSheetsApi', 'slackApi'],
    workflow: {
      name: 'Resource Allocator',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'allocate-resource',
            responseMode: 'lastNode'
          },
          name: 'Allocation Request',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'read',
            documentId: { value: 'RESOURCES_SHEET_ID' },
            sheetName: { value: 'Availability' },
            options: {}
          },
          name: 'Check Availability',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [450, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        },
        {
          parameters: {
            functionCode: 'const requested = $input.item.json;\nconst resources = $input.all();\n\nconst available = resources.filter(r => \n  r.json.skill === requested.skill && \n  r.json.available_hours >= requested.hours_needed\n);\n\nif (available.length === 0) {\n  return [{ json: { success: false, message: \'No resources available\' } }];\n}\n\nconst best = available.sort((a, b) => b.json.rating - a.json.rating)[0];\n\nreturn [{\n  json: {\n    success: true,\n    resource: best.json.name,\n    skill: best.json.skill,\n    hours: requested.hours_needed,\n    project: requested.project\n  }\n}];'
          },
          name: 'Find Best Match',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            conditions: {
              boolean: [{ value1: '={{$json["success"]}}', value2: true }]
            }
          },
          name: 'Found Match?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#projects',
            text: '=✅ *Resource Allocated*\\n\\nProject: {{$json["project"]}}\\nResource: {{$json["resource"]}}\\nSkill: {{$json["skill"]}}\\nHours: {{$json["hours"]}}'
          },
          name: 'Notify Success',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 250],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#projects',
            text: '=❌ *Resource Allocation Failed*\\n\\nProject: {{$json["project"]}}\\nReason: {{$json["message"]}}'
          },
          name: 'Notify Failure',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 350],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Allocation Request': { main: [[{ node: 'Check Availability', type: 'main', index: 0 }]] },
        'Check Availability': { main: [[{ node: 'Find Best Match', type: 'main', index: 0 }]] },
        'Find Best Match': { main: [[{ node: 'Found Match?', type: 'main', index: 0 }]] },
        'Found Match?': { main: [[{ node: 'Notify Success', type: 'main', index: 0 }], [{ node: 'Notify Failure', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== DEVOPS =====
  'cicd-pipeline-trigger': {
    id: 'cicd-pipeline-trigger',
    name: 'CI/CD Pipeline Trigger',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Trigger CI/CD pipelines on git events',
    tags: ['cicd', 'github', 'deployment', 'automation'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['githubApi', 'slackApi'],
    workflow: {
      name: 'CI/CD Trigger',
      nodes: [
        {
          parameters: {
            events: ['push'],
            repository: 'owner/repo'
          },
          name: 'Git Push Event',
          type: 'n8n-nodes-base.githubTrigger',
          typeVersion: 1,
          position: [250, 300],
          webhookId: 'GENERATE_ON_ACTIVATION',
          credentials: { githubApi: { id: 'REPLACE', name: 'GitHub' } }
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["ref"]}}', operation: 'equals', value2: 'refs/heads/main' }]
            }
          },
          name: 'Is Main Branch?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            method: 'POST',
            url: 'https://api.github.com/repos/OWNER/REPO/actions/workflows/deploy.yml/dispatches',
            authentication: 'predefinedCredentialType',
            nodeCredentialType: 'githubApi',
            jsonParameters: true,
            bodyParametersJson: '={{ { "ref": "main" } }}'
          },
          name: 'Trigger Deploy',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [650, 300],
          credentials: { githubApi: { id: 'REPLACE', name: 'GitHub' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#deployments',
            text: '=🚀 *Deployment Started*\n\nBranch: main\nCommit: {{$json["after"].substring(0, 7)}}\nAuthor: {{$json["pusher"]["name"]}}'
          },
          name: 'Notify Deploy',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Git Push Event': { main: [[{ node: 'Is Main Branch?', type: 'main', index: 0 }]] },
        'Is Main Branch?': { main: [[{ node: 'Trigger Deploy', type: 'main', index: 0 }]] },
        'Trigger Deploy': { main: [[{ node: 'Notify Deploy', type: 'main', index: 0 }]] }
      }
    }
  },

  'deployment-notifier': {
    id: 'deployment-notifier',
    name: 'Deployment Status Notifier',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Notify team about deployment status changes',
    tags: ['deployment', 'notifications', 'status', 'devops'],
    difficulty: 'beginner',
    estimatedSetupTime: '15 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Deploy Notifier',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'deployment-status',
            responseMode: 'onReceived'
          },
          name: 'Status Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'const status = $input.item.json.status;\nconst emoji = { success: \'✅\', failure: \'❌\', pending: \'⏳\' }[status] || \'ℹ️\';\nconst color = { success: \'#36a64f\', failure: \'#ff0000\', pending: \'#ffa500\' }[status] || \'#000000\';\n\nreturn [{ json: { ...$input.item.json, emoji, color } }];'
          },
          name: 'Format Status',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#deployments',
            text: '={{$json["emoji"]}} *Deployment {{$json["status"].toUpperCase()}}*\n\nEnvironment: {{$json["environment"]}}\nVersion: {{$json["version"]}}\nDuration: {{$json["duration"]}}s'
          },
          name: 'Send Notification',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [650, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Status Webhook': { main: [[{ node: 'Format Status', type: 'main', index: 0 }]] },
        'Format Status': { main: [[{ node: 'Send Notification', type: 'main', index: 0 }]] }
      }
    }
  },

  'log-aggregator': {
    id: 'log-aggregator',
    name: 'Log Aggregation System',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Collect and aggregate logs from multiple sources',
    tags: ['logs', 'aggregation', 'monitoring', 'devops'],
    difficulty: 'advanced',
    estimatedSetupTime: '35 minutes',
    requiredCredentials: ['mongoDb'],
    workflow: {
      name: 'Log Aggregator',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'log',
            responseMode: 'onReceived'
          },
          name: 'Log Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'return [{\n  json: {\n    timestamp: new Date().toISOString(),\n    level: $input.item.json.level || \'info\',\n    service: $input.item.json.service,\n    message: $input.item.json.message,\n    metadata: $input.item.json.metadata || {},\n    environment: $input.item.json.environment || \'production\'\n  }\n}];'
          },
          name: 'Enrich Log',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            operation: 'insert',
            collection: 'logs',
            fields: 'timestamp,level,service,message,metadata,environment'
          },
          name: 'Store Log',
          type: 'n8n-nodes-base.mongoDb',
          typeVersion: 1,
          position: [650, 300],
          credentials: { mongoDb: { id: 'REPLACE', name: 'MongoDB' } }
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["level"]}}', operation: 'equals', value2: 'error' }]
            }
          },
          name: 'Is Error?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#errors',
            text: '=🚨 *Error Logged*\n\nService: {{$json["service"]}}\nMessage: {{$json["message"]}}\nTime: {{$json["timestamp"]}}'
          },
          name: 'Alert Error',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Log Webhook': { main: [[{ node: 'Enrich Log', type: 'main', index: 0 }]] },
        'Enrich Log': { main: [[{ node: 'Store Log', type: 'main', index: 0 }]] },
        'Store Log': { main: [[{ node: 'Is Error?', type: 'main', index: 0 }]] },
        'Is Error?': { main: [[{ node: 'Alert Error', type: 'main', index: 0 }]] }
      }
    }
  },

  'error-alerting': {
    id: 'error-alerting',
    name: 'Intelligent Error Alerting',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Smart error detection and team alerting',
    tags: ['errors', 'alerting', 'monitoring', 'sentry'],
    difficulty: 'intermediate',
    estimatedSetupTime: '20 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Error Alerter',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'error',
            responseMode: 'onReceived'
          },
          name: 'Error Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'const error = $input.item.json;\nconst severity = error.level === \'fatal\' ? \'critical\' : error.level === \'error\' ? \'high\' : \'medium\';\nconst emoji = { critical: \'🔴\', high: \'🟠\', medium: \'🟡\' }[severity];\n\nreturn [{\n  json: {\n    ...error,\n    severity,\n    emoji,\n    shouldPage: severity === \'critical\'\n  }\n}];'
          },
          name: 'Assess Severity',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#incidents',
            text: '={{$json["emoji"]}} *{{$json["severity"].toUpperCase()}} Error*\n\nError: {{$json["error_message"]}}\nService: {{$json["service"]}}\nStack: {{$json["stack_trace"]}}\n\nDashboard: {{$json["dashboard_url"]}}'
          },
          name: 'Alert Team',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [650, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            conditions: {
              boolean: [{ value1: '={{$json["shouldPage"]}}', value2: true }]
            }
          },
          name: 'Should Page?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            method: 'POST',
            url: 'https://api.pagerduty.com/incidents',
            authentication: 'genericCredentialType',
            jsonParameters: true,
            bodyParametersJson: '={{ { "incident": { "type": "incident", "title": $json["error_message"], "service": { "id": "SERVICE_ID", "type": "service_reference" } } } }}'
          },
          name: 'Page On-Call',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [1050, 300]
        }
      ],
      connections: {
        'Error Webhook': { main: [[{ node: 'Assess Severity', type: 'main', index: 0 }]] },
        'Assess Severity': { main: [[{ node: 'Alert Team', type: 'main', index: 0 }]] },
        'Alert Team': { main: [[{ node: 'Should Page?', type: 'main', index: 0 }]] },
        'Should Page?': { main: [[{ node: 'Page On-Call', type: 'main', index: 0 }]] }
      }
    }
  },

  'performance-monitor': {
    id: 'performance-monitor',
    name: 'Performance Monitoring System',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Monitor application performance metrics',
    tags: ['performance', 'monitoring', 'metrics', 'apm'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['slackApi', 'mongoDb'],
    workflow: {
      name: 'Perf Monitor',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] }
          },
          name: 'Every 5 Minutes',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://your-app.com/metrics',
            options: {}
          },
          name: 'Get Metrics',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 300]
        },
        {
          parameters: {
            operation: 'insert',
            collection: 'performance_metrics',
            fields: 'timestamp,response_time,cpu_usage,memory_usage,requests_per_sec'
          },
          name: 'Store Metrics',
          type: 'n8n-nodes-base.mongoDb',
          typeVersion: 1,
          position: [650, 300],
          credentials: { mongoDb: { id: 'REPLACE', name: 'MongoDB' } }
        },
        {
          parameters: {
            conditions: {
              number: [{ value1: '={{$json["response_time"]}}', operation: 'larger', value2: 1000 }]
            }
          },
          name: 'Is Slow?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#performance',
            text: '=⚠️ *Performance Degradation*\n\nResponse Time: {{$json["response_time"]}}ms\nCPU: {{$json["cpu_usage"]}}%\nMemory: {{$json["memory_usage"]}}%'
          },
          name: 'Alert Degradation',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Every 5 Minutes': { main: [[{ node: 'Get Metrics', type: 'main', index: 0 }]] },
        'Get Metrics': { main: [[{ node: 'Store Metrics', type: 'main', index: 0 }]] },
        'Store Metrics': { main: [[{ node: 'Is Slow?', type: 'main', index: 0 }]] },
        'Is Slow?': { main: [[{ node: 'Alert Degradation', type: 'main', index: 0 }]] }
      }
    }
  },

  'backup-verifier': {
    id: 'backup-verifier',
    name: 'Backup Verification System',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Verify backup integrity automatically',
    tags: ['backup', 'verification', 'integrity', 'reliability'],
    difficulty: 'advanced',
    estimatedSetupTime: '35 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Backup Verifier',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 6 }] }
          },
          name: 'Every 6 Hours',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://backup-service.com/api/latest',
            options: {}
          },
          name: 'Get Latest Backup',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 300]
        },
        {
          parameters: {
            functionCode: 'const backup = $input.item.json;\nconst backupTime = new Date(backup.created_at);\nconst ageHours = (new Date() - backupTime) / (1000 * 60 * 60);\n\nconst checks = {\n  ageCheck: ageHours < 24,\n  sizeCheck: backup.size_mb > 0 && backup.size_mb < 10000,\n  checksumValid: backup.checksum === backup.expected_checksum\n};\n\nconst allPassed = Object.values(checks).every(v => v);\n\nreturn [{ json: { ...backup, checks, allPassed, ageHours: ageHours.toFixed(1) } }];'
          },
          name: 'Verify Backup',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            conditions: {
              boolean: [{ value1: '={{$json["allPassed"]}}', value2: false }]
            }
          },
          name: 'Has Issues?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#ops-critical',
            text: '=🚨 *Backup Verification FAILED*\n\nAge: {{$json["ageHours"]}}h (max 24h)\nSize: {{$json["size_mb"]}}MB\nChecksum: {{$json["checks"]["checksumValid"] ? "✅" : "❌"}}\n\nAction required!'
          },
          name: 'Alert Failure',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 250],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#ops',
            text: '=✅ Backup verified successfully\n\nAge: {{$json["ageHours"]}}h\nSize: {{$json["size_mb"]}}MB'
          },
          name: 'Confirm Success',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 350],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Every 6 Hours': { main: [[{ node: 'Get Latest Backup', type: 'main', index: 0 }]] },
        'Get Latest Backup': { main: [[{ node: 'Verify Backup', type: 'main', index: 0 }]] },
        'Verify Backup': { main: [[{ node: 'Has Issues?', type: 'main', index: 0 }]] },
        'Has Issues?': { main: [[{ node: 'Alert Failure', type: 'main', index: 0 }], [{ node: 'Confirm Success', type: 'main', index: 0 }]] }
      }
    }
  },

  'container-health-check': {
    id: 'container-health-check',
    name: 'Container Health Monitor',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Monitor Docker container health status',
    tags: ['docker', 'containers', 'health', 'monitoring'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'Container Health',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'minutes', minutesInterval: 10 }] }
          },
          name: 'Every 10 Minutes',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            command: 'docker ps --format "{{.Names}}|{{.Status}}" | grep -v "Up" || true'
          },
          name: 'Check Containers',
          type: 'n8n-nodes-base.executeCommand',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            conditions: {
              string: [{ value1: '={{$json["stdout"]}}', operation: 'isNotEmpty' }]
            }
          },
          name: 'Unhealthy Containers?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#infra-alerts',
            text: '=🚨 *Unhealthy Containers Detected*\n\n```\n{{$json["stdout"]}}\n```\n\nPlease investigate immediately.'
          },
          name: 'Alert Team',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            method: 'POST',
            url: 'https://your-api.com/restart-containers',
            jsonParameters: true,
            bodyParametersJson: '={{ { "containers": $json["stdout"].split("\\n") } }}'
          },
          name: 'Attempt Restart',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [1050, 300]
        }
      ],
      connections: {
        'Every 10 Minutes': { main: [[{ node: 'Check Containers', type: 'main', index: 0 }]] },
        'Check Containers': { main: [[{ node: 'Unhealthy Containers?', type: 'main', index: 0 }]] },
        'Unhealthy Containers?': { main: [[{ node: 'Alert Team', type: 'main', index: 0 }]] },
        'Alert Team': { main: [[{ node: 'Attempt Restart', type: 'main', index: 0 }]] }
      }
    }
  },

  'ssl-cert-monitor': {
    id: 'ssl-cert-monitor',
    name: 'SSL Certificate Monitor',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Monitor SSL certificate expiration dates',
    tags: ['ssl', 'certificates', 'security', 'monitoring'],
    difficulty: 'intermediate',
    estimatedSetupTime: '20 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'SSL Monitor',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'days', daysInterval: 1 }] }
          },
          name: 'Daily Check',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            command: 'echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates'
          },
          name: 'Check Certificate',
          type: 'n8n-nodes-base.executeCommand',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            functionCode: 'const output = $input.item.json.stdout;\nconst expiryMatch = output.match(/notAfter=(.+)/);\nif (!expiryMatch) return [{ json: { error: \'Could not parse cert\' } }];\n\nconst expiryDate = new Date(expiryMatch[1]);\nconst daysUntilExpiry = Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24));\n\nreturn [{\n  json: {\n    expiryDate: expiryDate.toISOString(),\n    daysUntilExpiry,\n    isExpiring: daysUntilExpiry <= 30,\n    isCritical: daysUntilExpiry <= 7\n  }\n}];'
          },
          name: 'Parse Expiry',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            conditions: {
              boolean: [{ value1: '={{$json["isExpiring"]}}', value2: true }]
            }
          },
          name: 'Is Expiring?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#security',
            text: '={{$json["isCritical"] ? "🔴" : "🟠"}} *SSL Certificate Expiring*\n\nDomain: your-domain.com\nExpiry: {{$json["expiryDate"]}}\nDays remaining: {{$json["daysUntilExpiry"]}}\n\n{{$json["isCritical"] ? "⚠️ URGENT: Renew immediately!" : "Please renew soon."}}'
          },
          name: 'Alert Expiry',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1050, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Daily Check': { main: [[{ node: 'Check Certificate', type: 'main', index: 0 }]] },
        'Check Certificate': { main: [[{ node: 'Parse Expiry', type: 'main', index: 0 }]] },
        'Parse Expiry': { main: [[{ node: 'Is Expiring?', type: 'main', index: 0 }]] },
        'Is Expiring?': { main: [[{ node: 'Alert Expiry', type: 'main', index: 0 }]] }
      }
    }
  },

  'api-health-checker': {
    id: 'api-health-checker',
    name: 'API Health Checker',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Monitor API endpoints health and availability',
    tags: ['api', 'health', 'monitoring', 'uptime'],
    difficulty: 'beginner',
    estimatedSetupTime: '15 minutes',
    requiredCredentials: ['slackApi'],
    workflow: {
      name: 'API Health Check',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] }
          },
          name: 'Every 5 Minutes',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://api.your-service.com/health',
            options: { timeout: 5000 }
          },
          name: 'Health Check',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 300],
          continueOnFail: true
        },
        {
          parameters: {
            conditions: {
              number: [{ value1: '={{$json["statusCode"]}}', operation: 'notEqual', value2: 200 }]
            }
          },
          name: 'Is Down?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#incidents',
            text: '=🚨 *API Health Check FAILED*\n\nEndpoint: https://api.your-service.com/health\nStatus: {{$json["statusCode"] || "timeout"}}\nTime: {{$now.format("HH:mm:ss")}}\n\n@channel - Immediate action required!'
          },
          name: 'Alert Downtime',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Every 5 Minutes': { main: [[{ node: 'Health Check', type: 'main', index: 0 }]] },
        'Health Check': { main: [[{ node: 'Is Down?', type: 'main', index: 0 }]] },
        'Is Down?': { main: [[{ node: 'Alert Downtime', type: 'main', index: 0 }]] }
      }
    }
  },

  'db-backup-automation': {
    id: 'db-backup-automation',
    name: 'Database Backup Automation',
    category: TEMPLATE_CATEGORIES.DEVOPS,
    description: 'Automated database backup with rotation',
    tags: ['database', 'backup', 'automation', 'postgres'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['googleDriveApi', 'slackApi'],
    workflow: {
      name: 'DB Backup',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: '0 3 * * *' }] }
          },
          name: 'Daily 3 AM',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            command: 'pg_dump -U postgres -h localhost production_db | gzip > /tmp/backup_$(date +%Y%m%d).sql.gz'
          },
          name: 'Create Backup',
          type: 'n8n-nodes-base.executeCommand',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            command: 'cat /tmp/backup_$(date +%Y%m%d).sql.gz | base64'
          },
          name: 'Encode Backup',
          type: 'n8n-nodes-base.executeCommand',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'upload',
            name: '=db_backup_{{$now.toFormat("yyyyMMdd")}}.sql.gz',
            parents: [{ id: 'DB_BACKUP_FOLDER_ID' }]
          },
          name: 'Upload to Drive',
          type: 'n8n-nodes-base.googleDrive',
          typeVersion: 1,
          position: [850, 300],
          credentials: { googleDriveApi: { id: 'REPLACE', name: 'Google Drive' } }
        },
        {
          parameters: {
            command: 'find /tmp -name "backup_*.sql.gz" -mtime +7 -delete'
          },
          name: 'Cleanup Old Backups',
          type: 'n8n-nodes-base.executeCommand',
          typeVersion: 1,
          position: [1050, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#ops',
            text: '=✅ Database backup completed\n\nDate: {{$now.format("YYYY-MM-DD HH:mm")}}\nFile: db_backup_{{$now.toFormat("yyyyMMdd")}}.sql.gz'
          },
          name: 'Confirm Backup',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [1250, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        }
      ],
      connections: {
        'Daily 3 AM': { main: [[{ node: 'Create Backup', type: 'main', index: 0 }]] },
        'Create Backup': { main: [[{ node: 'Encode Backup', type: 'main', index: 0 }]] },
        'Encode Backup': { main: [[{ node: 'Upload to Drive', type: 'main', index: 0 }]] },
        'Upload to Drive': { main: [[{ node: 'Cleanup Old Backups', type: 'main', index: 0 }]] },
        'Cleanup Old Backups': { main: [[{ node: 'Confirm Backup', type: 'main', index: 0 }]] }
      }
    }
  },

  // ===== MARKETING =====
  'social-media-publisher': {
    id: 'social-media-publisher',
    name: 'Multi-Platform Social Publisher',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Publish content across multiple social platforms',
    tags: ['social-media', 'publishing', 'twitter', 'linkedin'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['twitterApi', 'linkedInApi'],
    workflow: {
      name: 'Social Publisher',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'publish',
            responseMode: 'lastNode'
          },
          name: 'Content Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            resource: 'tweet',
            operation: 'create',
            text: '={{$json["message"]}}'
          },
          name: 'Post to Twitter',
          type: 'n8n-nodes-base.twitter',
          typeVersion: 1,
          position: [450, 200],
          credentials: { twitterApi: { id: 'REPLACE', name: 'Twitter' } }
        },
        {
          parameters: {
            resource: 'post',
            operation: 'create',
            text: '={{$json["message"]}}'
          },
          name: 'Post to LinkedIn',
          type: 'n8n-nodes-base.linkedIn',
          typeVersion: 1,
          position: [450, 300],
          credentials: { linkedInApi: { id: 'REPLACE', name: 'LinkedIn' } }
        },
        {
          parameters: {
            method: 'POST',
            url: 'https://graph.facebook.com/v12.0/me/feed',
            authentication: 'genericCredentialType',
            jsonParameters: true,
            bodyParametersJson: '={{ { "message": $json["message"] } }}'
          },
          name: 'Post to Facebook',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 400]
        },
        {
          parameters: {
            mode: 'combine',
            combinationMode: 'mergeByPosition'
          },
          name: 'Merge Results',
          type: 'n8n-nodes-base.merge',
          typeVersion: 2,
          position: [650, 300]
        }
      ],
      connections: {
        'Content Webhook': { main: [[{ node: 'Post to Twitter', type: 'main', index: 0 }, { node: 'Post to LinkedIn', type: 'main', index: 0 }, { node: 'Post to Facebook', type: 'main', index: 0 }]] },
        'Post to Twitter': { main: [[{ node: 'Merge Results', type: 'main', index: 0 }]] },
        'Post to LinkedIn': { main: [[{ node: 'Merge Results', type: 'main', index: 1 }]] },
        'Post to Facebook': { main: [[{ node: 'Merge Results', type: 'main', index: 2 }]] }
      }
    }
  },

  'email-campaign-manager': {
    id: 'email-campaign-manager',
    name: 'Email Campaign Manager',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Manage and send email marketing campaigns',
    tags: ['email', 'campaign', 'marketing', 'automation'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['googleSheetsApi'],
    workflow: {
      name: 'Email Campaign',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'start-campaign',
            responseMode: 'onReceived'
          },
          name: 'Campaign Trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'read',
            documentId: { value: 'SUBSCRIBERS_SHEET_ID' },
            sheetName: { value: 'Contacts' },
            options: {}
          },
          name: 'Get Subscribers',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [450, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        },
        {
          parameters: {
            functionCode: 'return items.filter(item => item.json.subscribed === true && item.json.email_verified === true);'
          },
          name: 'Filter Active',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'campaigns@company.com',
            toEmail: '={{$json["email"]}}',
            subject: '={{$json["campaign_subject"]}}',
            text: '=Hi {{$json["first_name"]}},\n\n{{$json["campaign_body"]}}\n\nUnsubscribe: {{$json["unsubscribe_link"]}}'
          },
          name: 'Send Campaign Email',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [850, 300]
        },
        {
          parameters: {
            amount: 100,
            unit: 'milliseconds'
          },
          name: 'Rate Limit',
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          position: [1050, 300]
        }
      ],
      connections: {
        'Campaign Trigger': { main: [[{ node: 'Get Subscribers', type: 'main', index: 0 }]] },
        'Get Subscribers': { main: [[{ node: 'Filter Active', type: 'main', index: 0 }]] },
        'Filter Active': { main: [[{ node: 'Send Campaign Email', type: 'main', index: 0 }]] },
        'Send Campaign Email': { main: [[{ node: 'Rate Limit', type: 'main', index: 0 }]] }
      }
    }
  },

  'lead-magnet-automation': {
    id: 'lead-magnet-automation',
    name: 'Lead Magnet Automation',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Automate lead magnet delivery and follow-up',
    tags: ['lead-magnet', 'automation', 'marketing', 'email'],
    difficulty: 'intermediate',
    estimatedSetupTime: '25 minutes',
    requiredCredentials: ['googleDriveApi'],
    workflow: {
      name: 'Lead Magnet',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'download-lead-magnet',
            responseMode: 'onReceived'
          },
          name: 'Download Request',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'download',
            fileId: { value: 'LEAD_MAGNET_FILE_ID' }
          },
          name: 'Get Lead Magnet',
          type: 'n8n-nodes-base.googleDrive',
          typeVersion: 1,
          position: [450, 300],
          credentials: { googleDriveApi: { id: 'REPLACE', name: 'Google Drive' } }
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'hello@company.com',
            toEmail: '={{$json["email"]}}',
            subject: 'Your Free Guide is Ready!',
            text: '=Hi {{$json["name"]}},\n\nThank you for your interest! Here\'s your free guide.\n\nBest,\nThe Team',
            attachments: 'data'
          },
          name: 'Send Lead Magnet',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [650, 300]
        },
        {
          parameters: {
            amount: 1,
            unit: 'hours'
          },
          name: 'Wait 1 Hour',
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'hello@company.com',
            toEmail: '={{$json["email"]}}',
            subject: 'Did you enjoy the guide?',
            text: '=Hi {{$json["name"]}},\n\nI hope you found the guide helpful! Would you like to learn more?\n\nReply to this email or book a call: {{$json["booking_link"]}}'
          },
          name: 'Follow-up Email',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [1050, 300]
        }
      ],
      connections: {
        'Download Request': { main: [[{ node: 'Get Lead Magnet', type: 'main', index: 0 }]] },
        'Get Lead Magnet': { main: [[{ node: 'Send Lead Magnet', type: 'main', index: 0 }]] },
        'Send Lead Magnet': { main: [[{ node: 'Wait 1 Hour', type: 'main', index: 0 }]] },
        'Wait 1 Hour': { main: [[{ node: 'Follow-up Email', type: 'main', index: 0 }]] }
      }
    }
  },

  'webinar-registration': {
    id: 'webinar-registration',
    name: 'Webinar Registration Flow',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Manage webinar registrations and reminders',
    tags: ['webinar', 'registration', 'events', 'reminders'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['googleSheetsApi'],
    workflow: {
      name: 'Webinar Registration',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'webinar-register',
            responseMode: 'onReceived'
          },
          name: 'Registration Form',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'appendOrUpdate',
            documentId: { value: 'WEBINAR_SHEET_ID' },
            sheetName: { value: 'Registrations' },
            columns: { mappingMode: 'autoMapInputData' }
          },
          name: 'Save Registration',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [450, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'events@company.com',
            toEmail: '={{$json["email"]}}',
            subject: 'You\'re registered for the webinar!',
            text: '=Hi {{$json["name"]}},\n\nThanks for registering!\n\nWebinar: {{$json["webinar_title"]}}\nDate: {{$json["webinar_date"]}}\nJoin link: {{$json["webinar_link"]}}\n\nSee you there!'
          },
          name: 'Confirmation Email',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [650, 300]
        },
        {
          parameters: {
            amount: 24,
            unit: 'hours'
          },
          name: 'Wait 24h',
          type: 'n8n-nodes-base.wait',
          typeVersion: 1,
          position: [850, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'events@company.com',
            toEmail: '={{$json["email"]}}',
            subject: 'Reminder: Webinar tomorrow!',
            text: '=Hi {{$json["name"]}},\n\nJust a reminder about tomorrow\'s webinar!\n\nDate: {{$json["webinar_date"]}}\nJoin: {{$json["webinar_link"]}}'
          },
          name: 'Reminder Email',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [1050, 300]
        }
      ],
      connections: {
        'Registration Form': { main: [[{ node: 'Save Registration', type: 'main', index: 0 }]] },
        'Save Registration': { main: [[{ node: 'Confirmation Email', type: 'main', index: 0 }]] },
        'Confirmation Email': { main: [[{ node: 'Wait 24h', type: 'main', index: 0 }]] },
        'Wait 24h': { main: [[{ node: 'Reminder Email', type: 'main', index: 0 }]] }
      }
    }
  },

  'newsletter-automation': {
    id: 'newsletter-automation',
    name: 'Newsletter Automation',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Automate newsletter creation and distribution',
    tags: ['newsletter', 'email', 'content', 'automation'],
    difficulty: 'intermediate',
    estimatedSetupTime: '35 minutes',
    requiredCredentials: ['googleSheetsApi'],
    workflow: {
      name: 'Newsletter',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: '0 10 * * 1' }] }
          },
          name: 'Weekly Monday 10 AM',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            url: 'https://your-blog.com/rss.xml'
          },
          name: 'Get Latest Posts',
          type: 'n8n-nodes-base.rssFeedRead',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            functionCode: 'const posts = items.slice(0, 5);\nconst html = posts.map(p => `<h3>${p.json.title}</h3><p>${p.json.contentSnippet}</p><a href="${p.json.link}">Read more</a>`).join(\'<br><br>\');\n\nreturn [{ json: { newsletter_html: html, week: new Date().toISOString().split(\'T\')[0] } }];'
          },
          name: 'Build Newsletter',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'read',
            documentId: { value: 'SUBSCRIBERS_SHEET_ID' },
            sheetName: { value: 'Active' },
            options: {}
          },
          name: 'Get Subscribers',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [850, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'newsletter@company.com',
            toEmail: '={{$json["email"]}}',
            subject: '=Weekly Newsletter - {{$json["week"]}}',
            html: '={{$json["newsletter_html"]}}'
          },
          name: 'Send Newsletter',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [1050, 300]
        }
      ],
      connections: {
        'Weekly Monday 10 AM': { main: [[{ node: 'Get Latest Posts', type: 'main', index: 0 }]] },
        'Get Latest Posts': { main: [[{ node: 'Build Newsletter', type: 'main', index: 0 }]] },
        'Build Newsletter': { main: [[{ node: 'Get Subscribers', type: 'main', index: 0 }]] },
        'Get Subscribers': { main: [[{ node: 'Send Newsletter', type: 'main', index: 0 }]] }
      }
    }
  },

  'content-calendar': {
    id: 'content-calendar',
    name: 'Content Calendar Manager',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Manage and schedule content publication',
    tags: ['content', 'calendar', 'scheduling', 'publishing'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: ['googleSheetsApi', 'slackApi'],
    workflow: {
      name: 'Content Calendar',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'hours', hoursInterval: 1 }] }
          },
          name: 'Hourly Check',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            operation: 'read',
            documentId: { value: 'CONTENT_CALENDAR_ID' },
            sheetName: { value: 'Schedule' },
            options: {}
          },
          name: 'Get Scheduled Content',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [450, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        },
        {
          parameters: {
            functionCode: 'const now = new Date();\nconst dueContent = items.filter(item => {\n  const pubDate = new Date(item.json.publish_date);\n  return pubDate <= now && item.json.status === \'scheduled\';\n});\n\nreturn dueContent;'
          },
          name: 'Filter Due Content',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            resource: 'message',
            operation: 'post',
            channel: '#content-team',
            text: '=📅 *Content Due for Publication*\n\nTitle: {{$json["title"]}}\nType: {{$json["content_type"]}}\nPlatform: {{$json["platform"]}}\n\n{{$json["content_url"]}}'
          },
          name: 'Notify Team',
          type: 'n8n-nodes-base.slack',
          typeVersion: 1,
          position: [850, 300],
          credentials: { slackApi: { id: 'REPLACE', name: 'Slack' } }
        },
        {
          parameters: {
            method: 'POST',
            url: '=https://api.cms.com/publish',
            jsonParameters: true,
            bodyParametersJson: '={{ { "id": $json["content_id"] } }}'
          },
          name: 'Auto Publish',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [1050, 300]
        }
      ],
      connections: {
        'Hourly Check': { main: [[{ node: 'Get Scheduled Content', type: 'main', index: 0 }]] },
        'Get Scheduled Content': { main: [[{ node: 'Filter Due Content', type: 'main', index: 0 }]] },
        'Filter Due Content': { main: [[{ node: 'Notify Team', type: 'main', index: 0 }]] },
        'Notify Team': { main: [[{ node: 'Auto Publish', type: 'main', index: 0 }]] }
      }
    }
  },

  'seo-reporter': {
    id: 'seo-reporter',
    name: 'SEO Performance Reporter',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Generate and send SEO performance reports',
    tags: ['seo', 'reporting', 'analytics', 'performance'],
    difficulty: 'intermediate',
    estimatedSetupTime: '30 minutes',
    requiredCredentials: [],
    workflow: {
      name: 'SEO Reporter',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'cronExpression', expression: '0 9 1 * *' }] }
          },
          name: 'Monthly 1st at 9 AM',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://api.semrush.com/analytics/v1/',
            options: {
              qs: {
                parameters: [
                  { name: 'type', value: 'domain_ranks' },
                  { name: 'key', value: 'YOUR_API_KEY' },
                  { name: 'domain', value: 'your-domain.com' }
                ]
              }
            }
          },
          name: 'Get SEO Metrics',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 300]
        },
        {
          parameters: {
            functionCode: 'const data = $input.item.json;\nconst report = {\n  month: new Date().toLocaleString(\'default\', { month: \'long\', year: \'numeric\' }),\n  organic_traffic: data.organic_traffic,\n  keywords: data.keywords_count,\n  backlinks: data.backlinks_count,\n  domain_rank: data.rank\n};\n\nreturn [{ json: report }];'
          },
          name: 'Format Report',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'sendEmail',
            fromEmail: 'reports@company.com',
            toEmail: 'marketing@company.com',
            subject: '=Monthly SEO Report - {{$json["month"]}}',
            text: '=SEO Performance Report\n\nOrganic Traffic: {{$json["organic_traffic"]}}\nKeywords Ranking: {{$json["keywords"]}}\nBacklinks: {{$json["backlinks"]}}\nDomain Rank: {{$json["domain_rank"]}}'
          },
          name: 'Send Report',
          type: 'n8n-nodes-base.emailSend',
          typeVersion: 2,
          position: [850, 300]
        }
      ],
      connections: {
        'Monthly 1st at 9 AM': { main: [[{ node: 'Get SEO Metrics', type: 'main', index: 0 }]] },
        'Get SEO Metrics': { main: [[{ node: 'Format Report', type: 'main', index: 0 }]] },
        'Format Report': { main: [[{ node: 'Send Report', type: 'main', index: 0 }]] }
      }
    }
  },

  'analytics-aggregator': {
    id: 'analytics-aggregator',
    name: 'Marketing Analytics Aggregator',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Aggregate analytics from multiple marketing channels',
    tags: ['analytics', 'aggregation', 'reporting', 'multi-channel'],
    difficulty: 'advanced',
    estimatedSetupTime: '40 minutes',
    requiredCredentials: ['googleSheetsApi'],
    workflow: {
      name: 'Analytics Aggregator',
      nodes: [
        {
          parameters: {
            rule: { interval: [{ field: 'days', daysInterval: 1 }] }
          },
          name: 'Daily',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://api.facebook.com/v12.0/me/insights',
            options: {}
          },
          name: 'Facebook Insights',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 200]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://api.twitter.com/2/tweets/metrics',
            options: {}
          },
          name: 'Twitter Analytics',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 300]
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://api.linkedin.com/v2/organizationalEntityShareStatistics',
            options: {}
          },
          name: 'LinkedIn Stats',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [450, 400]
        },
        {
          parameters: {
            mode: 'combine',
            combinationMode: 'mergeByPosition'
          },
          name: 'Merge Analytics',
          type: 'n8n-nodes-base.merge',
          typeVersion: 2,
          position: [650, 300]
        },
        {
          parameters: {
            operation: 'appendOrUpdate',
            documentId: { value: 'ANALYTICS_SHEET_ID' },
            sheetName: { value: 'Daily' },
            columns: { mappingMode: 'autoMapInputData' }
          },
          name: 'Save to Sheet',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [850, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        }
      ],
      connections: {
        'Daily': { main: [[{ node: 'Facebook Insights', type: 'main', index: 0 }, { node: 'Twitter Analytics', type: 'main', index: 0 }, { node: 'LinkedIn Stats', type: 'main', index: 0 }]] },
        'Facebook Insights': { main: [[{ node: 'Merge Analytics', type: 'main', index: 0 }]] },
        'Twitter Analytics': { main: [[{ node: 'Merge Analytics', type: 'main', index: 1 }]] },
        'LinkedIn Stats': { main: [[{ node: 'Merge Analytics', type: 'main', index: 2 }]] },
        'Merge Analytics': { main: [[{ node: 'Save to Sheet', type: 'main', index: 0 }]] }
      }
    }
  },

  'ab-testing-workflow': {
    id: 'ab-testing-workflow',
    name: 'A/B Testing Workflow',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Manage A/B tests and track results',
    tags: ['ab-testing', 'optimization', 'testing', 'analytics'],
    difficulty: 'advanced',
    estimatedSetupTime: '35 minutes',
    requiredCredentials: ['googleSheetsApi'],
    workflow: {
      name: 'A/B Testing',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'ab-test-event',
            responseMode: 'onReceived'
          },
          name: 'Event Webhook',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'const variant = Math.random() < 0.5 ? \'A\' : \'B\';\nreturn [{ json: { ...$input.item.json, variant, timestamp: new Date().toISOString() } }];'
          },
          name: 'Assign Variant',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            operation: 'appendOrUpdate',
            documentId: { value: 'AB_TEST_SHEET_ID' },
            sheetName: { value: 'Results' },
            columns: { mappingMode: 'autoMapInputData' }
          },
          name: 'Log Result',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [650, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        },
        {
          parameters: {
            operation: 'read',
            documentId: { value: 'AB_TEST_SHEET_ID' },
            sheetName: { value: 'Results' },
            options: {}
          },
          name: 'Get All Results',
          type: 'n8n-nodes-base.googleSheets',
          typeVersion: 4,
          position: [850, 300],
          credentials: { googleSheetsApi: { id: 'REPLACE', name: 'Google Sheets' } }
        },
        {
          parameters: {
            functionCode: 'const results = items;\nconst variantA = results.filter(r => r.json.variant === \'A\');\nconst variantB = results.filter(r => r.json.variant === \'B\');\n\nconst conversionA = variantA.filter(r => r.json.converted).length / variantA.length;\nconst conversionB = variantB.filter(r => r.json.converted).length / variantB.length;\n\nreturn [{\n  json: {\n    variant_a_conversion: (conversionA * 100).toFixed(2),\n    variant_b_conversion: (conversionB * 100).toFixed(2),\n    winner: conversionA > conversionB ? \'A\' : \'B\',\n    sample_size: results.length\n  }\n}];'
          },
          name: 'Calculate Stats',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [1050, 300]
        }
      ],
      connections: {
        'Event Webhook': { main: [[{ node: 'Assign Variant', type: 'main', index: 0 }]] },
        'Assign Variant': { main: [[{ node: 'Log Result', type: 'main', index: 0 }]] },
        'Log Result': { main: [[{ node: 'Get All Results', type: 'main', index: 0 }]] },
        'Get All Results': { main: [[{ node: 'Calculate Stats', type: 'main', index: 0 }]] }
      }
    }
  },

  'customer-journey-tracker': {
    id: 'customer-journey-tracker',
    name: 'Customer Journey Tracker',
    category: TEMPLATE_CATEGORIES.MARKETING,
    description: 'Track and analyze customer journey touchpoints',
    tags: ['customer-journey', 'analytics', 'tracking', 'funnel'],
    difficulty: 'advanced',
    estimatedSetupTime: '40 minutes',
    requiredCredentials: ['mongoDb'],
    workflow: {
      name: 'Journey Tracker',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'track-event',
            responseMode: 'onReceived'
          },
          name: 'Track Event',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300]
        },
        {
          parameters: {
            functionCode: 'return [{\n  json: {\n    user_id: $input.item.json.user_id,\n    event_type: $input.item.json.event_type,\n    page: $input.item.json.page,\n    timestamp: new Date().toISOString(),\n    metadata: $input.item.json.metadata || {}\n  }\n}];'
          },
          name: 'Enrich Event',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [450, 300]
        },
        {
          parameters: {
            operation: 'insert',
            collection: 'customer_journey',
            fields: 'user_id,event_type,page,timestamp,metadata'
          },
          name: 'Store Event',
          type: 'n8n-nodes-base.mongoDb',
          typeVersion: 1,
          position: [650, 300],
          credentials: { mongoDb: { id: 'REPLACE', name: 'MongoDB' } }
        },
        {
          parameters: {
            operation: 'find',
            collection: 'customer_journey',
            options: {
              query: '={{ { "user_id": $json["user_id"] } }}',
              sort: '={{ { "timestamp": 1 } }}'
            }
          },
          name: 'Get User Journey',
          type: 'n8n-nodes-base.mongoDb',
          typeVersion: 1,
          position: [850, 300],
          credentials: { mongoDb: { id: 'REPLACE', name: 'MongoDB' } }
        },
        {
          parameters: {
            functionCode: 'const journey = $input.all();\nconst stages = [\'awareness\', \'consideration\', \'decision\', \'purchase\'];\nconst currentStage = journey[journey.length - 1]?.json.event_type;\nconst stageIndex = stages.indexOf(currentStage);\n\nreturn [{\n  json: {\n    user_id: $input.item.json.user_id,\n    current_stage: currentStage,\n    stage_progress: `${stageIndex + 1}/${stages.length}`,\n    journey_length: journey.length,\n    time_in_funnel: new Date() - new Date(journey[0].json.timestamp)\n  }\n}];'
          },
          name: 'Analyze Journey',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [1050, 300]
        }
      ],
      connections: {
        'Track Event': { main: [[{ node: 'Enrich Event', type: 'main', index: 0 }]] },
        'Enrich Event': { main: [[{ node: 'Store Event', type: 'main', index: 0 }]] },
        'Store Event': { main: [[{ node: 'Get User Journey', type: 'main', index: 0 }]] },
        'Get User Journey': { main: [[{ node: 'Analyze Journey', type: 'main', index: 0 }]] }
      }
    }
  }
};

module.exports = {
  TEMPLATES,
  TEMPLATE_CATEGORIES
};