const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Stripe = require('stripe');
const Razorpay = require('razorpay');

class PaymentService {
    /**
     * Get the currently active and enabled payment gateway from Superadmin Settings
     * Priority: Admin selected defaultGateway -> First enabled -> throw error
     */
    static async getActiveGateway() {
        let settings = null;
        try {
            const adminUser = await User.findOne({ where: { isAdmin: true }, order: [['createdAt', 'ASC']] });
            if (adminUser) {
                settings = await Settings.findOne({ where: { userId: adminUser.id } });
            }
        } catch (e) {
            console.error('Settings lookup error in PaymentService:', e.message);
        }

        const gateways = settings?.paymentGateways || {};
        
        // 1. Check if the designated defaultGateway is valid and enabled
        const defaultGtw = gateways.defaultGateway;
        if (defaultGtw && gateways[defaultGtw] && gateways[defaultGtw].enabled) {
            return {
                name: defaultGtw,
                config: gateways[defaultGtw]
            };
        }

        // 2. Fallback to the first enabled gateway if no valid default is found
        const order = ['razorpay', 'stripe', 'phonepe', 'cashfree'];
        for (const gtw of order) {
            if (gateways[gtw] && gateways[gtw].enabled) {
                return {
                    name: gtw,
                    config: gateways[gtw]
                };
            }
        }

        // 3. Environment variable fallback (legacy/dev support)
        if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
            return {
                name: 'razorpay',
                config: {
                    keyId: process.env.RAZORPAY_KEY_ID,
                    keySecret: process.env.RAZORPAY_KEY_SECRET
                }
            };
        }

        throw new Error('No payment gateways are configured and enabled. Please contact the administrator.');
    }

    /**
     * Create a payment intent/order across any supported gateway
     */
    static async createPaymentIntent({ amount, currency, description, orderNotes, userEmail, userName, successUrl, cancelUrl }) {
        const { name, config } = await this.getActiveGateway();
        
        // Amounts are passed in standard units (e.g. 10.00 USD)
        // Convert to smallest unit if needed
        const amountSmallestUnit = Math.round(parseFloat(amount) * 100);

        if (name === 'razorpay') {
            const rzp = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
            const order = await rzp.orders.create({
                amount: amountSmallestUnit,
                currency: currency || 'USD',
                receipt: `receipt_${Date.now()}`,
                notes: orderNotes
            });

            return {
                gateway: 'razorpay',
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: config.keyId,
                userName,
                userEmail
            };

        } else if (name === 'stripe') {
            const stripe = Stripe(config.secretKey);
            // Construct a flat metadata object stringifying notes if necessary
            const flatMetadata = {};
            for (const key in orderNotes) {
                flatMetadata[key] = String(orderNotes[key]);
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: (currency || 'usd').toLowerCase(),
                        product_data: {
                            name: description || 'Purchase',
                        },
                        unit_amount: amountSmallestUnit,
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `${successUrl}?payment_success=true&gateway=stripe&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl,
                customer_email: userEmail,
                metadata: flatMetadata
            });

            return {
                gateway: 'stripe',
                url: session.url,
                sessionId: session.id
            };

        } else if (name === 'phonepe') {
            const merchantId = config.merchantId;
            const saltKey = config.saltKey;
            const saltIndex = config.saltIndex || '1';
            const env = config.mode === 'PROD' ? 'PROD' : 'TEST';
            const apiBaseUrl = env === 'PROD' 
                ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay' 
                : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

            const transactionId = `txn_${Date.now()}`;
            
            const payload = {
                merchantId: merchantId,
                merchantTransactionId: transactionId,
                merchantUserId: String(orderNotes.userId || 'guest'),
                amount: amountSmallestUnit,
                redirectUrl: `${successUrl}?payment_success=true&gateway=phonepe&txn_id=${transactionId}`,
                redirectMode: "GET",
                callbackUrl: `${process.env.VITE_API_URL || 'http://localhost:5000'}/api/webhooks/phonepe`,
                paymentInstrument: {
                    type: "PAY_PAGE"
                }
            };

            const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
            const checksumString = base64Payload + "/pg/v1/pay" + saltKey;
            const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + "###" + saltIndex;

            const response = await axios.post(apiBaseUrl, {
                request: base64Payload
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': checksum
                }
            });

            if (response.data.success && response.data.data && response.data.data.instrumentResponse) {
                return {
                    gateway: 'phonepe',
                    url: response.data.data.instrumentResponse.redirectInfo.url,
                    transactionId
                };
            } else {
                throw new Error(response.data.message || 'PhonePe init failed');
            }

        } else if (name === 'cashfree') {
            const appId = config.appId;
            const secretKey = config.secretKey;
            const env = config.mode === 'PROD' ? 'PROD' : 'TEST';
            const apiBaseUrl = env === 'PROD' 
                ? 'https://api.cashfree.com/pg/orders' 
                : 'https://sandbox.cashfree.com/pg/orders';
            const apiVersion = '2023-08-01';

            const orderId = `order_${Date.now()}`;

            const payload = {
                order_id: orderId,
                order_amount: amount,
                order_currency: currency || 'INR',
                customer_details: {
                    customer_id: String(orderNotes.userId || 'guest'),
                    customer_email: userEmail || 'customer@example.com',
                    customer_phone: '9999999999' // fallback
                },
                order_meta: {
                    return_url: `${successUrl}?payment_success=true&gateway=cashfree&order_id=${orderId}`
                }
            };

            const response = await axios.post(apiBaseUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': appId,
                    'x-client-secret': secretKey,
                    'x-api-version': apiVersion
                }
            });

            if (response.data && response.data.payment_session_id) {
                return {
                    gateway: 'cashfree',
                    url: response.data.payment_link || `https://checkout.cashfree.com/pay/${response.data.payment_session_id}`,
                    orderId: orderId,
                    sessionId: response.data.payment_session_id
                };
            } else {
                throw new Error('Cashfree order creation failed');
            }
        }
    }

    /**
     * Verify payment status across any gateway
     */
    static async verifyPayment({ gateway, payload }) {
        const adminUser = await User.findOne({ where: { isAdmin: true }, order: [['createdAt', 'ASC']] });
        let settings = null;
        if (adminUser) {
            settings = await Settings.findOne({ where: { userId: adminUser.id } });
        }
        const gateways = settings?.paymentGateways || {};

        if (gateway === 'razorpay') {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;
            let keySecret = gateways.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;
            
            if (!keySecret) throw new Error('Razorpay secret key not configured.');

            const expectedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                throw new Error('Payment verification failed. Invalid signature.');
            }
            return true;

        } else if (gateway === 'stripe') {
            const { session_id } = payload;
            let secretKey = gateways.stripe?.secretKey;
            
            if (!secretKey) throw new Error('Stripe secret key not configured.');

            const stripe = Stripe(secretKey);
            const session = await stripe.checkout.sessions.retrieve(session_id);

            if (session.payment_status === 'paid') {
                return true;
            } else {
                throw new Error('Stripe payment is not paid yet.');
            }

        } else if (gateway === 'phonepe') {
            const { txn_id } = payload;
            const config = gateways.phonepe || {};
            const merchantId = config.merchantId;
            const saltKey = config.saltKey;
            const saltIndex = config.saltIndex || '1';
            const env = config.mode === 'PROD' ? 'PROD' : 'TEST';
            
            const statusUrlPath = `/pg/v1/status/${merchantId}/${txn_id}`;
            const apiBaseUrl = env === 'PROD' 
                ? `https://api.phonepe.com/apis/hermes${statusUrlPath}` 
                : `https://api-preprod.phonepe.com/apis/pg-sandbox${statusUrlPath}`;

            const checksumString = statusUrlPath + saltKey;
            const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + "###" + saltIndex;

            const response = await axios.get(apiBaseUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': checksum,
                    'X-MERCHANT-ID': merchantId
                }
            });

            if (response.data.success && response.data.code === 'PAYMENT_SUCCESS') {
                return true;
            } else {
                throw new Error('PhonePe payment was not successful.');
            }

        } else if (gateway === 'cashfree') {
            const { order_id } = payload;
            const config = gateways.cashfree || {};
            const appId = config.appId;
            const secretKey = config.secretKey;
            const env = config.mode === 'PROD' ? 'PROD' : 'TEST';
            const apiBaseUrl = env === 'PROD' 
                ? `https://api.cashfree.com/pg/orders/${order_id}` 
                : `https://sandbox.cashfree.com/pg/orders/${order_id}`;
            const apiVersion = '2023-08-01';

            const response = await axios.get(apiBaseUrl, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': appId,
                    'x-client-secret': secretKey,
                    'x-api-version': apiVersion
                }
            });

            if (response.data.order_status === 'PAID') {
                return true;
            } else {
                throw new Error('Cashfree payment is not marked as PAID.');
            }
        }

        throw new Error('Unknown payment gateway');
    }
}

module.exports = PaymentService;
