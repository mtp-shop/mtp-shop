import Stripe from 'stripe';
import axios from 'axios';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // 1. Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { cart, discountCode } = req.body;
    const origin = req.headers.origin || 'https://tpstemple.vercel.app';

    // --- DEV MODE BYPASS (1956) ---
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
                            { name: "Items", value: cart.map(i => `${i.qty}x ${i.title}`).join('\n') || "Unknown" },
                            { name: "Amount", value: "£0.00", inline: true }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                });
            }
        } catch (err) { console.error("Discord Error:", err.message); }

        return res.status(200).json({ bypassUrl: `https://tpstemple.vercel.app/success.html` });
    }

    // --- STRIPE FLOW ---
    const itemSummary = cart.map(i => `${i.qty}x ${i.title}`).join(', ');

    const line_items = cart.map(item => {
      let priceValue = parseFloat(item.price.replace('£', '').replace('+', ''));
      
      if(discountCode === "XMAS") {
          priceValue = priceValue * 0.8;
      } 
      else if (discountCode === "195612") {
          priceValue = 0.30;
      }

      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: item.title,
            images: [item.img], 
          },
          unit_amount: Math.round(priceValue * 100),
        },
        quantity: item.qty,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'paypal'], 
      line_items: line_items,
      mode: 'payment',
      invoice_creation: { enabled: true },
      metadata: { items: itemSummary }, // Saves items for Recent Sales API
      success_url: `https://tpstemple.vercel.app/success.html`,
      cancel_url: `${origin}/cart.html?payment=cancelled`,
    });

    return res.status(200).json({ id: session.id });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
