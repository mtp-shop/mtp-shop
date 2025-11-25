const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const amount = (session.amount_total / 100).toFixed(2);
    const currency = session.currency.toUpperCase();
    const email = session.customer_details?.email || "No email provided";
    const paymentStatus = session.payment_status;

    try {
      await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        embeds: [
          {
            title: "💰 NEW ORDER RECEIVED",
            color: 16719647,
            fields: [
              { name: "Amount", value: `**${amount} ${currency}**`, inline: true },
              { name: "Customer", value: `\`${email}\``, inline: true },
              { name: "Status", value: paymentStatus === 'paid' ? "✅ Paid" : "⚠️ Unpaid", inline: false },
              { name: "Stripe ID", value: `\`${session.id}\``, inline: false }
            ],
            footer: { text: "TPS TEMPLE | Automated System" },
            timestamp: new Date().toISOString()
          }
        ]
      });
      console.log("Discord notification sent.");
    } catch (discordError) {
      console.error("Error sending to Discord:", discordError);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
