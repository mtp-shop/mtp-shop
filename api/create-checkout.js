import Stripe from 'stripe';
import axios from 'axios';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    // 1. Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { cart, discountCode } = req.body;
        const origin = req.headers.origin || 'https://tpstemple.shop';

        // --- DEV BYPASS ---
        if (discountCode === "1956") {
            try {
                if (process.env.DISCORD_WEBHOOK_URL) {
                    await axios.post(process.env.DISCORD_WEBHOOK_URL, {
                        username: "TPS Shop Bot",
                        embeds: [{
                            title: "🛠️ DEV BYPASS SUCCESS",
                            description: "Code `1956` used.",
                            color: 5763719,
                            fields: [
                                { name: "Items", value: cart.map(i => `${i.qty}x ${i.title}`).join('\n') },
                                { name: "Amount", value: "£0.00", inline: true }
                            ],
                            timestamp: new Date().toISOString()
                        }]
                    });
                }
            } catch (err) { console.error("Discord Error:", err.message); }
            return res.status(200).json({ bypassUrl: `${origin}/success.html` });
        }

        const line_items = cart.map(item => {
            let priceValue = parseFloat(item.price.replace('£', '').replace('+', ''));
            if(discountCode === "XMAS") priceValue *= 0.8;
            else if (discountCode === "195612") priceValue = 0.30;
            else if (discountCode === "BUNDLE15") priceValue *= 0.85;

            return {
                price_data: {
                    currency: 'gbp',
                    product_data: { name: item.title, images: [item.img] },
                    unit_amount: Math.round(priceValue * 100),
                },
                quantity: item.qty,
            };
        });

        // --- CREATE SESSION (CLEAN VERSION) ---
        // Since your API version is upgraded, Stripe will automatically 
        // use the payment methods enabled in your Dashboard.
        const session = await stripe.checkout.sessions.create({
            ui_mode: 'embedded',
            line_items: line_items,
            mode: 'payment',
            invoice_creation: { enabled: true },
            return_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        });

        return res.status(200).json({ clientSecret: session.client_secret });

    } catch (error) {
        console.error("Stripe Session Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
