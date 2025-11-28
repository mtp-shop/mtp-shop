import { buffer } from 'micro';
import Stripe from 'stripe';
import axios from 'axios';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const amount = (session.amount_total / 100).toFixed(2);
    const currency = session.currency.toUpperCase();
    const email = session.customer_details?.email || "No email";
    const name = session.customer_details?.name || "Guest";
    const itemsBought = session.metadata?.items || "Items not listed";

    try {
      await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        embeds: [{
            title: "💰 STRIPE PAYMENT RECEIVED",
            color: 16711680, // Red
            fields: [
              { name: "Customer", value: name, inline: true },
              { name: "Amount", value: `${amount} ${currency}`, inline: true },
              { name: "Items", value: itemsBought },
              { name: "Email", value: email }
            ],
            footer: { text: "TPS TEMPLE | Vercel System" },
            timestamp: new Date().toISOString()
          }]
      });
    } catch (err) { console.error("Discord Error", err); }
  }

  res.status(200).json({ received: true });
}
