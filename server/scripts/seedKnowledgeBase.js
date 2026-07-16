const dotenv = require('dotenv');
dotenv.config();

const { sequelize } = require('../config/database');
const KBCategory = require('../models/KBCategory');
const Article = require('../models/Article');

async function seedKnowledgeBase() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        console.log('Clearing existing Knowledge Base data...');
        await Article.destroy({ where: {} });
        await KBCategory.destroy({ where: {} });

        console.log('Creating Categories...');
        const categories = await KBCategory.bulkCreate([
            { name: 'Getting Started', order: 1, icon: 'Book' },
            { name: 'WhatsApp Integration', order: 2, icon: 'Phone' },
            { name: 'Inbox & Live Chat', order: 3, icon: 'MessageSquare' },
            { name: 'Campaigns', order: 4, icon: 'Megaphone' },
            { name: 'Online Store', order: 5, icon: 'ShoppingBag' },
            { name: 'FlowBot', order: 6, icon: 'Bot' },
            { name: 'vCards & NFC', order: 7, icon: 'CreditCard' }
        ]);

        console.log('Creating Articles...');
        
        const articles = [
            {
                title: 'Welcome to WhatsApp Cloud',
                category: 'Getting Started',
                isPublished: true,
                content: `# Welcome to WhatsApp Cloud

We are thrilled to have you on board! WhatsApp Cloud is your all-in-one platform for managing customer conversations, automating replies, running marketing campaigns, and even selling products directly through WhatsApp.

## Your Dashboard Overview

When you first log in, you will land on your main Dashboard. Here is what you can find:
- **Quick Stats:** Overview of your messages sent, received, and campaign performance.
- **Recent Activity:** A quick look at the latest chats and tickets.
- **Quick Actions:** Shortcuts to create a new campaign, add a contact, or connect WhatsApp.

## Next Steps

To get the most out of the platform, we recommend following these initial steps:
1. Connect your WhatsApp Business number.
2. Import your existing contacts.
3. Set up your basic profile and team members.

If you need any help, our support team is just a click away!`
            },
            {
                title: 'Setting up your Profile and Account Settings',
                category: 'Getting Started',
                isPublished: true,
                content: `# Setting up your Profile

Your profile is how your team identifies you inside the platform.

## How to update your profile

- Click on your avatar in the top right corner of the screen.
- Select "Settings" from the dropdown menu.
- Under the "Profile" tab, you can update your Name, Email, and upload a new Profile Picture.
- Click "Save Changes" at the bottom of the page.

## Updating your Timezone

It is critical to set your correct timezone so that scheduled campaigns and analytics align with your local time.
- Go to Settings.
- Scroll down to the Preferences section.
- Select your Timezone from the dropdown list.
- Save changes.`
            },
            {
                title: 'How to connect your WhatsApp Business Account',
                category: 'WhatsApp Integration',
                isPublished: true,
                content: `# Connecting WhatsApp Cloud API

Connecting your WhatsApp number allows our platform to send and receive messages on your behalf using the official Meta Cloud API.

## Prerequisites

Before you start, ensure you have:
- A Facebook Business Manager account.
- A clean phone number (not currently registered with the regular WhatsApp or WhatsApp Business mobile app).
- A verified business in Facebook (recommended for higher messaging limits).

## Step-by-Step Guide

### Step 1: Go to WhatsApp Settings
Navigate to the **WhatsApp Settings** page from the main sidebar navigation.

### Step 2: Click Connect
Click on the "Connect WhatsApp" button. A secure popup from Meta will appear.

### Step 3: Login to Facebook
Log in to your Facebook account and select the Business Manager you want to link.

### Step 4: Add your Number
Follow the prompts to add your phone number. You will receive an SMS code to verify ownership.

### Step 5: Complete Setup
Once verified, the popup will close, and your number will show as "Connected" in your dashboard! You are now ready to send messages.`
            },
            {
                title: 'Navigating the Unified WhatsApp Inbox',
                category: 'Inbox & Live Chat',
                isPublished: true,
                content: `# The Unified Inbox

Your Inbox is where all customer conversations happen in real-time. It is designed to be fast, intuitive, and collaborative.

## Key Features

### 1. Conversation List
On the left side, you'll see all your active chats. They are sorted by the most recent message. Unread messages have a bold title and a notification dot.

### 2. Chat Area
The center area displays the full message history with a specific contact. You can send text, images, documents, and interactive templates directly from the composer at the bottom.

### 3. Contact Sidebar
On the right side, you'll find the CRM details of the person you are chatting with. You can:
- Update their Name, Email, and Custom Fields.
- Add Tags and Labels to segment them for future campaigns.
- View their past orders and interaction history.

## Quick Replies

Save time by using Quick Replies for common questions. Type \`/\` in the message composer to bring up a list of your saved quick replies, and hit Enter to insert one instantly!`
            },
            {
                title: 'How to create and schedule a Campaign',
                category: 'Campaigns',
                isPublished: true,
                content: `# Creating a WhatsApp Campaign

Campaigns allow you to send bulk messages to thousands of customers instantly or schedule them for a later date. This is perfect for newsletters, promotions, or event reminders.

## Creating a new Campaign

- Navigate to the **Campaigns** tab in the sidebar.
- Click the "Create Campaign" button in the top right.

### Step 1: Campaign Details
Give your campaign a recognizable name (e.g., "Summer Sale 2026"). This is only visible to you.

### Step 2: Select Audience
Choose who will receive this message. You can select specific Contact Groups, Tags, or upload a one-time CSV list.

### Step 3: Select Template
WhatsApp requires bulk messages to use pre-approved Templates. Select an approved template from the dropdown. If your template has variables (like {{1}} for the customer's name), you will map them here.

### Step 4: Schedule or Send
- Select "Send Now" to immediately dispatch the messages.
- Select "Schedule" to pick a specific date and time in the future.

Click "Launch Campaign" to finalize! You can track the delivery, read rates, and clicks in the Campaign Analytics tab.`
            },
            {
                title: 'Introduction to the Visual Flow Builder',
                category: 'FlowBot',
                isPublished: true,
                content: `# FlowBot Visual Builder

FlowBot is our powerful drag-and-drop chatbot builder. It allows you to automate entire conversations without writing a single line of code.

## How it works

A Flow is made up of **Nodes** connected by **Edges** (lines). 

### Trigger Node
Every flow starts with a Trigger. This could be a specific keyword sent by a customer (e.g., "Help"), or it could be triggered when a customer clicks a specific Facebook Ad.

### Action Nodes
Once triggered, you connect the flow to Action Nodes. These can:
- Send a Text Message.
- Send an Interactive List or Buttons.
- Send an Image or Video.
- Ask the user a question and wait for their response.

### Logic Nodes
You can create complex logic using Condition Nodes. For example: "If the user is tagged as VIP, send this message, otherwise send a different message."

## Best Practices

- Keep it simple: Start with a basic Welcome Menu flow before building complex trees.
- Always provide an escape route: Include a button that says "Talk to a Human" which routes the chat to your live inbox.`
            },
            {
                title: 'Setting up your Online Store',
                category: 'Online Store',
                isPublished: true,
                content: `# Launching your WhatsApp Online Store

Turn your WhatsApp into a powerful e-commerce platform. The Online Store feature allows customers to browse your products, add them to a cart, and checkout directly within WhatsApp.

## 1. Store Details

- Go to **Online Store** in the sidebar.
- Click on **Store Settings**.
- Enter your Store Name, Currency, and a brief description.
- Upload your brand's Logo.

## 2. Adding Categories

Organize your products to make them easy to find.
- Navigate to the **Categories** tab.
- Click "Add Category".
- Create categories like "Electronics", "Clothing", or "Summer Collection".

## 3. Adding Products

- Navigate to the **Products** tab and click "Add Product".
- Fill in the essential details: Title, Price, Description.
- Upload high-quality images.
- Assign the product to one of the Categories you created.
- (Optional) Set inventory limits if you have limited stock.

## 4. Payment Gateways

To accept online payments (Credit Cards, UPI, etc.), configure your Payment Gateways in the Settings tab. We support Stripe, Razorpay, and PayPal. You can also enable "Cash on Delivery" or "Pay via Bank Transfer".

Your store is now ready! You can share your store link in your WhatsApp catalog or run campaigns promoting specific products.`
            },
            {
                title: 'How to design and publish a Digital vCard',
                category: 'vCards & NFC',
                isPublished: true,
                content: `# Digital vCards

A Digital vCard is a modern, shareable mini-website that acts as your interactive business card.

## Creating a vCard

- Navigate to the **vCards** section.
- Click "Create New vCard".

### 1. Basic Information
Enter your Name, Job Title, Company, and Bio.

### 2. Contact Details
Add all the ways people can reach you: WhatsApp number, Email, Phone, Website, and physical Address.

### 3. Social Links
Connect your LinkedIn, Twitter, Instagram, and Facebook profiles so prospects can easily follow you.

### 4. Customizing the Design
- Go to the **Themes** tab.
- Select a layout that matches your brand style.
- Customize the primary colors and upload a background image or video.

## Publishing and Sharing

Once saved, your vCard generates a unique URL and a QR Code. 
- You can add this URL to your Instagram/Twitter bio.
- You can print the QR code on physical marketing materials.
- When you meet someone, simply show them the QR code on your phone for them to scan and instantly save your contact details!`
            }
        ];

        for (const articleData of articles) {
            await Article.create(articleData);
        }

        console.log('Knowledge Base seeded successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error seeding Knowledge Base:', error);
        process.exit(1);
    }
}

seedKnowledgeBase();
