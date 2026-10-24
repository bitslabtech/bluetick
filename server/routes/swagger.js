const express = require('express');
const router = express.Router();

const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'WhatsApp Cloud SaaS API Documentation',
        version: '1.0.0',
        description: 'Comprehensive API documentation for WhatsApp Cloud Platform, including Superadmin Notifications, Inactivity Alerts, and Broadcasts.'
    },
    servers: [
        {
            url: '/',
            description: 'Current Environment'
        }
    ],
    tags: [
        { name: 'Superadmin Notifications', description: 'System-wide in-app notifications and automated WhatsApp inactivity alerts' },
        { name: 'WhatsApp Store', description: 'Catalog, orders, and POS management' }
    ],
    paths: {
        '/api/notifications/inactivity/config': {
            get: {
                tags: ['Superadmin Notifications'],
                summary: 'Get Inactivity Notification Configuration',
                description: 'Fetches current inactivity threshold settings, targeting rules, selected template, and active stats.',
                responses: {
                    200: {
                        description: 'Current inactivity configuration and live metrics',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        config: {
                                            type: 'object',
                                            properties: {
                                                enabled: { type: 'boolean', example: true },
                                                days: { type: 'integer', example: 7 },
                                                targetType: { type: 'string', enum: ['all', 'plans'], example: 'all' },
                                                targetPlans: { type: 'array', items: { type: 'string' }, example: ['Pro', 'Enterprise'] },
                                                templateName: { type: 'string', example: 'user_inactivity_reminder' },
                                                languageCode: { type: 'string', example: 'en_US' },
                                                hasButtonUrl: { type: 'boolean', example: true },
                                                buttonUrl: { type: 'string', example: 'login' },
                                                lastRunAt: { type: 'string', format: 'date-time' },
                                                totalSent: { type: 'integer', example: 42 }
                                            }
                                        },
                                        currentInactiveCount: { type: 'integer', example: 15 },
                                        alreadyAlertedCount: { type: 'integer', example: 10 },
                                        pendingAlertCount: { type: 'integer', example: 5 }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            put: {
                tags: ['Superadmin Notifications'],
                summary: 'Update Inactivity Notification Configuration',
                description: 'Save inactivity threshold (days), target audience (all or specific plans), Meta WhatsApp template, and dynamic button URL.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    enabled: { type: 'boolean', example: true },
                                    days: { type: 'integer', example: 7 },
                                    targetType: { type: 'string', enum: ['all', 'plans'], example: 'plans' },
                                    targetPlans: { type: 'array', items: { type: 'string' }, example: ['Free', 'Basic'] },
                                    templateName: { type: 'string', example: 'we_miss_you_v1' },
                                    languageCode: { type: 'string', example: 'en_US' },
                                    hasButtonUrl: { type: 'boolean', example: true },
                                    buttonUrl: { type: 'string', example: 'login' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Configuration updated successfully'
                    }
                }
            }
        },
        '/api/notifications/inactivity/preview': {
            get: {
                tags: ['Superadmin Notifications'],
                summary: 'Preview Inactive Users Matching Criteria',
                description: 'Real-time dry run listing users whose last login exceeds the threshold.',
                parameters: [
                    { name: 'days', in: 'query', schema: { type: 'integer', default: 7 } },
                    { name: 'targetType', in: 'query', schema: { type: 'string', enum: ['all', 'plans'] } },
                    { name: 'targetPlans', in: 'query', schema: { type: 'string' }, description: 'Comma-separated plan names' }
                ],
                responses: {
                    200: {
                        description: 'List of inactive users matching the criteria',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        count: { type: 'integer' },
                                        users: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    id: { type: 'string', format: 'uuid' },
                                                    name: { type: 'string' },
                                                    email: { type: 'string' },
                                                    phone: { type: 'string' },
                                                    plan: { type: 'string' },
                                                    lastLogin: { type: 'string', format: 'date-time' },
                                                    daysInactive: { type: 'integer' },
                                                    alreadyAlerted: { type: 'boolean' }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/notifications/inactivity/trigger': {
            post: {
                tags: ['Superadmin Notifications'],
                summary: 'Trigger Inactivity WhatsApp Alerts Now (Manual Execution)',
                description: 'Manually runs the inactivity scan and dispatches WhatsApp template messages to eligible users immediately.',
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    force: { type: 'boolean', default: true },
                                    days: { type: 'integer', example: 7 },
                                    targetType: { type: 'string', enum: ['all', 'plans'] },
                                    targetPlans: { type: 'array', items: { type: 'string' } },
                                    templateName: { type: 'string', example: 'we_miss_you_v1' },
                                    languageCode: { type: 'string', example: 'en_US' },
                                    hasButtonUrl: { type: 'boolean', example: true },
                                    buttonUrl: { type: 'string', example: 'login' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Execution report with sent, failed, and skipped counts'
                    }
                }
            }
        },
        '/api/notifications/inactivity/logs': {
            get: {
                tags: ['Superadmin Notifications'],
                summary: 'Get Inactivity Notification Audit Logs',
                description: 'Returns historical records of inactivity alerts dispatched to users.',
                parameters: [
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
                ],
                responses: {
                    200: {
                        description: 'Array of audit log records'
                    }
                }
            }
        },
        '/api/notifications': {
            get: {
                tags: ['Superadmin Notifications'],
                summary: 'Get In-App Broadcasts',
                description: 'Fetches in-app broadcast notifications sent by superadmins.',
                responses: { 200: { description: 'List of broadcasts' } }
            },
            post: {
                tags: ['Superadmin Notifications'],
                summary: 'Create New In-App Broadcast',
                description: 'Creates a system-wide or targeted in-app notification.',
                responses: { 200: { description: 'Broadcast created' } }
            }
        },
        '/api/wastore/{id}': {
            put: {
                tags: ['WhatsApp Store'],
                summary: 'Update Store Details & Address',
                description: 'Updates WhatsApp Store configuration including physical address, country, state, city, and pincode.',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'The store ID'
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'My Fashion Store' },
                                    address: { type: 'string', example: 'Shop 12, Phoenix Marketcity' },
                                    country: { type: 'string', example: 'India' },
                                    state: { type: 'string', example: 'Maharashtra' },
                                    city: { type: 'string', example: 'Mumbai' },
                                    pincode: { type: 'string', example: '400070' },
                                    phone: { type: 'string', example: '+91 9876543210' },
                                    email: { type: 'string', example: 'store@example.com' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: 'Store updated successfully'
                    },
                    404: {
                        description: 'Store not found'
                    }
                }
            }
        }
    }
};

// Return OpenAPI JSON spec
router.get('/json', (req, res) => {
    res.json(openApiSpec);
});
router.get('/swagger.json', (req, res) => {
    res.json(openApiSpec);
});

// Serve interactive Swagger UI HTML
router.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>WhatsApp Cloud API Docs | Swagger UI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; }
        .topbar { display: none !important; }
        .swagger-ui .info .title { color: #f8fafc; font-size: 26px; }
        .swagger-ui .info p, .swagger-ui .info li { color: #94a3b8; }
        .swagger-ui .scheme-container { background: #1e293b; box-shadow: none; border-bottom: 1px solid #334155; }
        .swagger-ui .opblock { border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
        .swagger-ui .opblock-tag { color: #f1f5f9; border-bottom: 1px solid #334155; font-size: 18px; margin: 20px 0 10px; }
        .custom-header { background: #1e293b; color: #fff; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; }
        .custom-header h1 { font-size: 18px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; }
        .custom-header a { color: #818cf8; text-decoration: none; font-size: 14px; font-weight: 600; }
        .custom-header a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="custom-header">
        <h1>⚡ WhatsApp Cloud SaaS — API Documentation (/swagger)</h1>
        <a href="/swagger/json" target="_blank">View OpenAPI JSON ↗</a>
    </div>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: "/swagger/json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout"
            });
        };
    </script>
</body>
</html>`);
});

module.exports = router;
