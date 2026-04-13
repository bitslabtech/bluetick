import React, { useState } from 'react';
import { Terminal, Copy, Check, Webhook, Zap, ShieldCheck, Users, LayoutTemplate, MessageSquare, Activity, BarChart2, Send } from 'lucide-react';

const ApiDocs = () => {
    const [copiedContent, setCopiedContent] = useState(null);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedContent(id);
        setTimeout(() => setCopiedContent(null), 2000);
    };

    const MultiLanguageCodeBlock = ({ id, snippets }) => {
        const [activeLangIndex, setActiveLangIndex] = useState(0);
        const activeSnippet = snippets[activeLangIndex];

        return (
            <div className="relative group rounded-xl overflow-hidden bg-slate-950 dark:bg-black/40 border border-slate-800 dark:border-white/10 my-4 transform transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between px-2 py-2 bg-slate-900 dark:bg-black/60 border-b border-slate-800 dark:border-white/5 overflow-x-auto hide-scrollbar">
                    <div className="flex items-center gap-1">
                        {snippets.map((snippet, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveLangIndex(idx)}
                                className={`px-3 py-1.5 text-xs font-bold font-mono rounded-lg transition-colors whitespace-nowrap ${
                                    activeLangIndex === idx 
                                        ? 'bg-slate-800 text-white' 
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                }`}
                            >
                                {snippet.language}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => handleCopy(activeSnippet.code, `${id}-${activeLangIndex}`)}
                        className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-800 dark:hover:bg-white/10 ml-2"
                        title="Copy to clipboard"
                    >
                        {copiedContent === `${id}-${activeLangIndex}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <div className="p-4 overflow-x-auto">
                    <pre className="text-sm font-mono text-slate-300">
                        <code>{activeSnippet.code}</code>
                    </pre>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Table of Contents sidebar */}
            <div className="w-full md:w-64 shrink-0 hidden md:flex flex-col gap-2 sticky top-4 self-start">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3 mb-2">On this page</h4>
                <a href="#authentication" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Authentication
                </a>
                <a href="#ping" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Health Check
                </a>
                <a href="#contacts" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Contacts API
                </a>
                <a href="#templates" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4" /> Templates API
                </a>
                <a href="#messaging" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Messaging API
                </a>
                <a href="#bulk" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <Send className="w-4 h-4" /> Bulk Send
                </a>
                <a href="#status" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Message Status
                </a>
                <a href="#usage" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" /> Usage API
                </a>
                <a href="#webhooks" className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                    <Webhook className="w-4 h-4" /> Webhooks (Events)
                </a>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 space-y-12 pb-20">
                {/* Intro */}
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">REST API Reference (V1)</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                        Integrate WhatsApp messaging directly into your backend apps, CRMs, or eCommerce software. 
                        Our modern API follows predictable standard REST conventions and uses secure HMAC hashing for webhook events.
                    </p>
                </div>

                <hr className="border-slate-200 dark:border-white/10" />

                {/* Authentication */}
                <div id="authentication" className="scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Authentication</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Authenticate your API requests by including your secret API key in the <code className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded font-mono text-sm text-indigo-600 dark:text-indigo-300">x-api-key</code> request header.
                    </p>
                    
                    <MultiLanguageCodeBlock 
                        id="auth-curl"
                        snippets={[
                            {
                                language: 'cURL',
                                code: `curl -X GET https://[your-saas-domain]/api/v1/contacts \\
  -H "x-api-key: sk_live_your_secret_key_here"`
                            },
                            {
                                language: 'Node.js',
                                code: `const axios = require('axios');

// Example: Fetching your contacts to verify authentication
const response = await axios.get('https://[your-saas-domain]/api/v1/contacts', {
    headers: { 'x-api-key': 'sk_live_your_secret_key_here' }
});`
                            },
                            {
                                language: 'Python',
                                code: `import requests

# Example: Fetching your contacts to verify authentication
url = "https://[your-saas-domain]/api/v1/contacts"
headers = {"x-api-key": "sk_live_your_secret_key_here"}

response = requests.get(url, headers=headers)`
                            },
                            {
                                language: 'PHP',
                                code: `// Example: Fetching your contacts to verify authentication
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://[your-saas-domain]/api/v1/contacts");
curl_setopt($ch, CURLOPT_HTTPHEADER, array("x-api-key: sk_live_your_secret_key_here"));
$result = curl_exec($ch);
curl_close($ch);`
                            }
                        ]}
                    />
                    
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl mt-4">
                        <h4 className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
                            <Terminal className="w-4 h-4" /> Keep your keys safe
                        </h4>
                        <p className="text-sm text-amber-700 dark:text-amber-400/80">
                            Never expose your API key in front-end code (like React/Flutter/Vue). Always proxy requests through your own backend server.
                        </p>
                    </div>
                </div>

                <hr className="border-slate-200 dark:border-white/10" />

                {/* Contacts API */}
                <div id="contacts" className="scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Contacts API</h3>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Synchronize your internal CRM contacts securely with the SaaS messaging platform layout.
                    </p>

                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3 mt-8">List Contacts</h4>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono font-bold text-xs rounded-md">GET</span>
                        <code className="text-slate-800 dark:text-slate-200 font-mono text-sm">/api/v1/contacts</code>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Returns a paginated list of your saved contacts. Supports <code className="text-xs">?limit=50&offset=0</code> parameters.</p>

                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3 mt-10">Create/Import Contact</h4>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-mono font-bold text-xs rounded-md">POST</span>
                        <code className="text-slate-800 dark:text-slate-200 font-mono text-sm">/api/v1/contacts</code>
                    </div>
                    
                    <MultiLanguageCodeBlock 
                        id="create-contact"
                        snippets={[
                            {
                                language: 'Node.js',
                                code: `const axios = require('axios');

const response = await axios.post('https://[your-saas-domain]/api/v1/contacts', {
    name: "John Doe",
    phone: "15551234567",         // Country code required, no + symbol
    email: "john@example.com",    // Optional
    tags: ["VIP", "Web Lead"]     // Optional CRM tags
}, {
    headers: { 'x-api-key': 'sk_live_your_secret_key_here' }
});

console.log('Contact imported!');`
                            },
                            {
                                language: 'cURL',
                                code: `curl -X POST https://[your-saas-domain]/api/v1/contacts \\
  -H "x-api-key: sk_live_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "John Doe",
    "phone": "15551234567",
    "tags": ["VIP"]
  }'`
                            }
                        ]}
                    />
                </div>

                <hr className="border-slate-200 dark:border-white/10" />

                {/* Templates API */}
                <div id="templates" className="scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
                            <LayoutTemplate className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Templates API</h3>
                    </div>

                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3 mt-4">List Approved Templates</h4>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono font-bold text-xs rounded-md">GET</span>
                        <code className="text-slate-800 dark:text-slate-200 font-mono text-sm">/api/v1/templates</code>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Returns all Meta-approved templates that you can currently send. Perfect for populating a dropdown in your own software UI.
                    </p>

                    <MultiLanguageCodeBlock 
                        id="get-templates"
                        snippets={[
                            {
                                language: 'Node.js',
                                code: `const axios = require('axios');

const response = await axios.get('https://[your-saas-domain]/api/v1/templates', {
    headers: { 'x-api-key': 'sk_live_your_secret_key_here' }
});

console.log('Available Templates:', response.data.data);`
                            }
                        ]}
                    />
                </div>

                <hr className="border-slate-200 dark:border-white/10" />

                {/* Send Message */}
                <div id="messaging" className="scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg">
                            <Zap className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Messaging API</h3>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Send outbound messages programmatically. WhatsApp has two message types: Templates (Marketing/Utility triggers) and Session messages (standard chat).
                    </p>

                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3 mt-8">Send Template (Trigger Notification)</h4>
                    <div className="flex items-center gap-3 mb-6">
                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-mono font-bold text-xs rounded-md">POST</span>
                        <code className="text-slate-800 dark:text-slate-200 font-mono text-sm">/api/v1/messages/template</code>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                        Use this to start a conversation or send an automated alert (e.g. Order Placed). Bypasses the 24-hour rule.
                    </p>

                    <MultiLanguageCodeBlock 
                        id="send-template"
                        snippets={[
                            {
                                language: 'Node.js',
                                code: `const axios = require('axios');

const response = await axios.post('https://[your-saas-domain]/api/v1/messages/template', {
    to: '15551234567',
    templateName: 'order_confirmation',
    languageCode: 'en_US',
    components: [
        {
            type: "body",
            parameters: [
                { type: "text", text: "John Doe" }, // Variable {{1}}
                { type: "text", text: "#ORD-999" }  // Variable {{2}}
            ]
        }
    ]
}, {
    headers: { 'x-api-key': 'sk_live_your_secret_key_here' }
});`
                            },
                            {
                                language: 'cURL',
                                code: `curl -X POST https://[your-saas-domain]/api/v1/messages/template \\
  -H "x-api-key: sk_live_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "15551234567",
    "templateName": "order_confirmation",
    "languageCode": "en_US",
    "components": [{
      "type": "body",
      "parameters": [
        {"type": "text", "text": "John Doe"}
      ]
    }]
  }'`
                            }
                        ]}
                    />

                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3 mt-10">Send Session Message (Standard Chat)</h4>
                    <div className="flex items-center gap-3 mb-6">
                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-mono font-bold text-xs rounded-md">POST</span>
                        <code className="text-slate-800 dark:text-slate-200 font-mono text-sm">/api/v1/messages/session</code>
                    </div>

                    <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                        Use this to send free-form text. <strong className="text-amber-600">Note:</strong> This will ONLY work if the customer has sent you a message within the last 24 hours.
                    </p>

                    <MultiLanguageCodeBlock 
                        id="send-session"
                        snippets={[
                            {
                                language: 'Node.js',
                                code: `const axios = require('axios');

const response = await axios.post('https://[your-saas-domain]/api/v1/messages/session', {
    to: '15551234567',
    text: "Hello! Our support agent will be right with you."
}, {
    headers: { 'x-api-key': 'sk_live_your_secret_key_here' }
});`
                            },
                            {
                                language: 'cURL',
                                code: `curl -X POST https://[your-saas-domain]/api/v1/messages/session \\
  -H "x-api-key: sk_live_your_secret_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "15551234567",
    "text": "Hello! Our support agent will be right with you."
  }'`
                            }
                        ]}
                    />
                </div>

                <hr className="border-slate-200 dark:border-white/10" />

                {/* HEALTH CHECK */}
                <div id="ping" className="scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-lg">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Health Check</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Verify your API key is valid, your subscription is active, and see your current usage quota. Integrate this into your app startup to detect connectivity issues early.
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono font-bold text-xs rounded-md">GET</span>
                        <code className="text-slate-800 dark:text-slate-200 font-mono text-sm">/api/v1/ping</code>
                    </div>
                    <MultiLanguageCodeBlock
                        id="ping"
                        snippets={[
                            {
                                language: 'cURL',
                                code: `curl -X GET https://[your-saas-domain]/api/v1/ping \\
  -H "x-api-key: sk_live_your_secret_key_here"`
                            },
                            {
                                language: 'Node.js',
                                code: `const axios = require('axios');

const res = await axios.get('https://[your-saas-domain]/api/v1/ping', {
    headers: { 'x-api-key': 'sk_live_your_secret_key_here' }
});

// Example response:
// {
//   "status": "ok",
//   "plan": "Pro",
//   "usage": {
//     "messagesUsed": 142,
//     "messagesLimit": 1000,
//     "messagesRemaining": 858
//   },
//   "keyScopes": ["messages:send", "contacts:read"]
// }
console.log('Connected! Plan:', res.data.plan);`
                            }
                        ]}
                    />
                </div>

                <hr className="border-slate-200 dark:border-white/10" />

                {/* Webhooks */}
                <div id="webhooks" className="scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Webhook className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Receiving Webhooks</h3>
                    </div>
                    
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Configure webhooks to be notified when events happen (like a new WhatsApp message from a customer). 
                        We will make a <code className="px-1.5 py-0.5 font-mono text-xs bg-slate-100 dark:bg-white/10 rounded">POST</code> request to your URL.
                    </p>

                    <h4 className="font-bold text-slate-900 dark:text-white mb-3 mt-8">Verifying the Signature (HMAC)</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        To ensure the webhook is actually coming from us and not a malicious third-party, we sign every payload using HMAC SHA256. 
                        Compare the generated signature to the <code className="px-1.5 py-0.5 font-mono text-xs bg-slate-100 dark:bg-white/10 rounded">x-webhook-signature</code> header.
                    </p>

                    <MultiLanguageCodeBlock 
                        id="webhook-verify"
                        snippets={[
                            {
                                language: 'Node.js (Express)',
                                code: `const crypto = require('crypto');
const express = require('express');
const app = express();

// Use express.raw() to get the unmodified body string for precise hashing
app.post('/my-webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const payloadBuffer = req.body;
    
    // The Webhook Secret generated in your dashboard
    const endpointSecret = 'whsec_your_generated_secret';

    const expectedSignature = crypto
        .createHmac('sha256', endpointSecret)
        .update(payloadBuffer) // Update with raw string/buffer!
        .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        // Validation success! Safe to parse body.
        const data = JSON.parse(payloadBuffer.toString());
        console.log("Received Secure Event:", data.event);
        res.status(200).send('OK');
    } else {
        // Invalid signature
        res.status(401).send('Invalid signature');
    }
});`
                            },
                            {
                                language: 'PHP',
                                code: `$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';

$endpointSecret = 'whsec_your_generated_secret';

// Compute the HMAC SHA256 signature
$expectedSignature = hash_hmac('sha256', $payload, $endpointSecret);

// Use hash_equals to prevent timing attacks
if (hash_equals($expectedSignature, $signature)) {
    // Signature valid! Safe to process.
    $data = json_decode($payload, true);
    error_log("Received Event: " . $data['event']);
    http_response_code(200);
    echo "OK";
} else {
    // Invalid signature
    http_response_code(401);
    echo "Invalid signature";
}`
                            },
                            {
                                language: 'Python (Flask)',
                                code: `import hmac
import hashlib
from flask import Flask, request, abort

app = Flask(__name__)

@app.route('/my-webhook', methods=['POST'])
def webhook_receiver():
    signature = request.headers.get('x-webhook-signature')
    payload = request.get_data() # Get raw bytes
    
    endpoint_secret = b'whsec_your_generated_secret'
    
    expected_signature = hmac.new(
        endpoint_secret, 
        msg=payload, 
        digestmod=hashlib.sha256
    ).hexdigest()
    
    if hmac.compare_digest(expected_signature, signature):
        data = request.json
        print("Received Event:", data.get("event"))
        return "OK", 200
    else:
        abort(401, "Invalid signature")`
                            }
                        ]}
                    />
                </div>

                <hr className="border-slate-200 dark:border-white/10" />

                {/* BULK SEND */}
                <div id="bulk" className="scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg">
                            <Send className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Bulk Send</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Send the same template to multiple recipients in a single API call. Perfect for order notifications, event reminders, or promotional messages. Supports up to 50 recipients per call.
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-mono font-bold text-xs rounded-md">POST</span>
                        <code className="text-slate-800 dark:text-slate-200 font-mono text-sm">/api/v1/messages/bulk</code>
                    </div>
                    <MultiLanguageCodeBlock
                        id="bulk-send"
                        snippets={[
                            {
                                language: 'Node.js',
                                code: `const axios = require('axios');

// Example: Send order confirmation to all customers who ordered today
const response = await axios.post('https://[your-saas-domain]/api/v1/messages/bulk', {
    recipients: ['15551234567', '15559876543', '919876543210'],
    templateName: 'order_confirmation',
    languageCode: 'en_US',
    components: [
        {
            type: "body",
            parameters: [
                { type: "text", text: "Order #1234" }
            ]
        }
    ]
}, {
    headers: { 'x-api-key': 'sk_live_your_secret_key_here' }
});

// Response:
// {
//   "success": true,
//   "summary": { "total": 3, "sent": 3, "failed": 0, "skipped": 0 },
//   "results": [
//     { "to": "15551234567", "status": "sent", "messageId": "wamid.xxx" },
//     { "to": "15559876543", "status": "sent", "messageId": "wamid.yyy" },
//     { "to": "919876543210", "status": "sent", "messageId": "wamid.zzz" }
//   ]
// }
console.log('Sent:', response.data.summary.sent, 'messages');`
                            },
                            {
                                language: 'PHP',
                                code: `$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://[your-saas-domain]/api/v1/messages/bulk");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "x-api-key: sk_live_your_secret_key_here",
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "recipients" => ["15551234567", "919876543210"],
    "templateName" => "order_confirmation",
    "languageCode" => "en_US"
]));
$result = json_decode(curl_exec($ch), true);
curl_close($ch);
echo "Sent: " . $result['summary']['sent'];`
                            }
                        ]}
                    />
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl mt-4">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1 text-sm">Limit Behavior</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400/80">
                            If your monthly message limit is hit mid-batch, remaining recipients will automatically get status <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded font-mono text-xs">skipped</code>. No error — the response always includes a full per-recipient result.
                        </p>
                    </div>
                </div>

                <hr className="border-slate-200 dark:border-white/10" />

                {/* MESSAGE STATUS */}
                <div id="status" className="scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Message Status</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Check the delivery status of any message using its <code className="px-1.5 py-0.5 font-mono text-xs bg-slate-100 dark:bg-white/10 rounded">messageId</code> returned when it was sent.
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono font-bold text-xs rounded-md">GET</span>
                        <code className="text-slate-800 dark:text-slate-200 font-mono text-sm">/api/v1/status/:messageId</code>
                    </div>
                    <MultiLanguageCodeBlock
                        id="msg-status"
                        snippets={[
                            {
                                language: 'Node.js',
                                code: `const axios = require('axios');

const messageId = 'wamid.HBgNOTE5OTk4...'; // Returned from send call

const res = await axios.get(
    \`https://[your-saas-domain]/api/v1/status/\${messageId}\`,
    { headers: { 'x-api-key': 'sk_live_your_secret_key_here' } }
);

// Response:
// {
//   "messageId": "wamid.HBgN...",
//   "status": "read",          // sent | delivered | read | failed
//   "type": "template",
//   "to": "15551234567",
//   "contactName": "John Doe",
//   "sentAt": "2024-01-15T10:23:00.000Z"
// }
console.log('Status:', res.data.status);`
                            }
                        ]}
                    />
                </div>

                <hr className="border-slate-200 dark:border-white/10" />

                {/* USAGE API */}
                <div id="usage" className="scroll-mt-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                            <BarChart2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Usage API</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Query your own API usage statistics programmatically. Useful for building internal admin dashboards or monitoring scripts.
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono font-bold text-xs rounded-md">GET</span>
                        <code className="text-slate-800 dark:text-slate-200 font-mono text-sm">/api/v1/usage</code>
                    </div>
                    <MultiLanguageCodeBlock
                        id="get-usage"
                        snippets={[
                            {
                                language: 'Node.js',
                                code: `const axios = require('axios');

const res = await axios.get('https://[your-saas-domain]/api/v1/usage', {
    headers: { 'x-api-key': 'sk_live_your_secret_key_here' }
});

// Response summary:
// {
//   "plan": { "name": "Pro", "messageLimit": 1000, "messagesUsedThisMonth": 142, "messagesRemaining": 858 },
//   "apiCalls": { "totalThisMonth": 45, "successThisMonth": 43, "errorsThisMonth": 2, "successRate": "96%" },
//   "recentCalls": [ ... last 20 API calls with endpoint, status, timing ]
// }
console.log('Messages remaining:', res.data.plan.messagesRemaining);`
                            }
                        ]}
                    />
                </div>
            </div>
        </div>
    );
};

export default ApiDocs;
