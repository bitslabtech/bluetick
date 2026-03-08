require('dotenv').config();
const Article = require('./models/Article');
const KBCategory = require('./models/KBCategory');
const { sequelize } = require('./config/database');

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Create Categories
        const categoriesData = [
            { name: 'Getting Started', icon: 'Rocket', order: 1 },
            { name: 'WhatsApp Business', icon: 'MessageSquare', order: 2 },
            { name: 'API & Integration', icon: 'Code', order: 3 },
            { name: 'Troubleshooting', icon: 'AlertTriangle', order: 4 }
        ];

        for (const cat of categoriesData) {
            await KBCategory.findOrCreate({ where: { name: cat.name }, defaults: cat });
        }

        // 2. Create Articles
        const articles = [
            // Getting Started
            {
                title: 'Introduction to WaManager',
                category: 'Getting Started',
                content: '# Welcome to WaManager\n\nWaManager is a powerful WhatsApp Cloud API management platform designed to help you scale your customer communications effortlessly.\n\n### Key Features:\n- **Team Inbox**: Collaborate with your team on customer chats.\n- **Bulk Messaging**: Send campaigns to thousands of contacts.\n- **Automation**: Use quick replies and templates to speed up responses.\n\nTo get started, navigate to the **Settings** page to connect your Meta WhatsApp Business account.',
                isPublished: true
            },
            {
                title: 'Connecting your WhatsApp Business Account',
                category: 'Getting Started',
                content: '# Connecting Meta WhatsApp API\n\nTo start sending messages, you need to connect your Meta WhatsApp Business API account.\n\n### Steps:\n1. Go to [Meta for Developers](https://developers.facebook.com).\n2. Create a WhatsApp App.\n3. Get your **Phone Number ID** and **Permanent Access Token**.\n4. Paste them into **Settings > Meta API** in WaManager.\n\nOnce connected, your status will turn green in the sidebar.',
                isPublished: true
            },
            {
                title: 'Importing your first Contacts',
                category: 'Getting Started',
                content: '# Importing Contacts\n\nYou can add contacts individually or bulk import them using an Excel/CSV file.\n\n### Bulk Import:\n1. Navigate to **Contacts**.\n2. Click **Import**.\n3. Download our sample CSV template.\n4. Fill in the data and upload.\n\n*Note: Ensure phone numbers include the country code without the + sign (e.g., 919876543210).*',
                isPublished: true
            },
            // WhatsApp Business
            {
                title: 'Understanding Message Templates',
                category: 'WhatsApp Business',
                content: '# Using Message Templates\n\nMeta requires you to use pre-approved templates for business-initiated messages. \n\n### Rules:\n- **Approval**: Templates usually take 1-2 hours for Meta to approve.\n- **Variables**: Use `{{1}}`, `{{2}}` for dynamic content like names or order IDs.\n- **Buttons**: You can add Quick Reply or Call-to-Action buttons (URL/Phone).\n\nYou can create templates directly in the **Campaign > Manage Templates** section of WaManager.',
                isPublished: true
            },
            {
                title: 'The 24-Hour Service Window',
                category: 'WhatsApp Business',
                content: '# The 24-Hour Window\n\nWhen a user sends you a message, a **24-hour service window** opens. \n\n- **During the window**: You can send any message (text, image, doc) for free (or session cost).\n- **Outside the window**: You MUST use a Meta-approved **Template Message** to restart the conversation.\n\nWaManager automatically detects this window and will prompt you to use a template if the window is expired.',
                isPublished: true
            },
            {
                title: 'Meta Commerce & Catalog Integration',
                category: 'WhatsApp Business',
                content: '# Selling on WhatsApp\n\nBoost your sales by integrating your Facebook Catalog.\n\n### Features:\n- **Single Product Messages**: Send one product with an "Add to Cart" button.\n- **Multi-Product Messages**: Send up to 30 products in a list.\n\nTo use this, ensure your Catalog is connected to your WABA in the Meta Business Suite.',
                isPublished: true
            },
            // API & Integration
            {
                title: 'Using the WaManager API',
                category: 'API & Integration',
                content: '# Developer API\n\nIntegrate WaManager with your internal CRM using our REST API.\n\n### Authentication:\nAll requests require an `Authorization` header with your API Key.\n\n`GET /api/v1/contacts` - List all contacts.\n`POST /api/v1/send/text` - Send a text message.\n\nCheck the **API Docs** tab in your dashboard for the full interactive Swagger documentation.',
                isPublished: true
            },
            {
                title: 'Setting up Webhooks',
                category: 'API & Integration',
                content: '# Real-time Updates with Webhooks\n\nReceive instant notifications for incoming messages and status updates (Sent, Delivered, Read).\n\n### How to setup:\n1. Provide your public URL in **Settings > Advanced**.\n2. WaManager will send a POST request with a JSON payload whenever an event occurs.\n3. Your server should respond with `200 OK` to acknowledge receipt.',
                isPublished: true
            },
            {
                title: 'Zapier & Pabbly Integration',
                category: 'API & Integration',
                content: '# No-Code Integrations\n\nYou can connect WaManager to 5000+ apps via Zapier or Pabbly Connect.\n\n- **Trigger**: When a new message is received in WaManager.\n- **Action**: Add a row in Google Sheets or create a ticket in Zendesk.\n\nSearch for "WaManager" in the Zapier app directory to get started.',
                isPublished: true
            },
            // Troubleshooting
            {
                title: 'Why are my messages failing?',
                category: 'Troubleshooting',
                content: '# Troubleshooting Message Failures\n\nIf your messages are stuck on "Failed", check the following:\n\n1. **Meta Credits**: Ensure your Meta payment method is valid.\n2. **Template Mismatch**: Ensure variables in your template match the expected count.\n3. **Opt-Out**: The user might have blocked your number.\n4. **WABA Status**: Check if your account is restricted in Meta Business Manager.',
                isPublished: true
            },
            {
                title: 'Resetting your Meta Token',
                category: 'Troubleshooting',
                content: '# Token Expiry Issues\n\nIf your sidebar status is red and you see "Unauthorized", your Meta Access Token might have expired.\n\n### Fix:\n1. Log in to Meta for Developers.\n2. Generate a new **System User Accessory Token**.\n3. Update it in **Settings > Meta API**.\n\n*Pro Tip: Use a Permanent Token (System User) to avoid resetting every 60 days.*',
                isPublished: true
            },
            {
                title: 'Common Webhook Errors',
                category: 'Troubleshooting',
                content: '# Webhook Debugging\n\n- **Error 500**: Your server crashed while processing the payload. Check your logs.\n- **Timeout**: Your server took longer than 5 seconds to respond.\n- **Verification Error**: Ensure your webhook secret matches exactly.\n\nUse tools like **Webhook.site** to inspect the raw incoming payloads during development.',
                isPublished: true
            }
        ];

        for (const art of articles) {
            await Article.findOrCreate({ where: { title: art.title }, defaults: art });
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seed();
