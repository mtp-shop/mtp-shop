const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  try {
    const { cart, discountCode } = JSON.parse(event.body);

    // --- DEV MODE BYPASS (1956) ---
    if (discountCode === "1956") {
        console.log("Dev Mode 1956 Activated");

        try {
            await axios.post(process.env.DISCORD_WEBHOOK_URL, {
                username: "TPS Shop Bot",
                embeds: [{
                    title: "🛠️ DEV BYPASS SUCCESS",
                    description: "Code `1956` used.",
                    color: 5763719, // Green
                    fields: [
                        { name: "Items", value: cart.map(i => `${i.qty}x ${i.title}`).join('\n') || "Unknown" },
                        { name: "Amount", value: "£0.00", inline: true }
                    ],
                    timestamp: new Date().toISOString()
                }]
            });
        } catch (err) { console.error("Discord Error:", err.message); }

        return {
            statusCode: 200, headers,
            body: JSON.stringify({ bypassUrl: `${event.headers.origin}/index.html?payment=dev_success` }),
        };
    }

    // --- NORMAL STRIPE FLOW ---
    const itemSummary = cart.map(i => `${i.qty}x ${i.title}`).join(', ');

    const line_items = cart.map(item => {
      let priceValue = parseFloat(item.price.replace('£', '').replace('+', ''));
      if(discountCode === "XMAS") priceValue = priceValue * 0.8;

      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: item.title,
            // FIX: Use the actual image from the cart instead of a placeholder
            images: [item.img], 
          },
          unit_amount: Math.round(priceValue * 100),
        },
        quantity: item.qty,
      };
    });

    const session = await stripe.checkout.sessions.create({
      // Enable Card + PayPal + Apple/Google Pay automatically based on dashboard settings
      payment_method_types: ['card', 'paypal'], 
      line_items: line_items,
      mode: 'payment',
      invoice_creation: { enabled: true },
      metadata: { items: itemSummary },
      success_url: `${event.headers.origin}/index.html?payment=success`,
      cancel_url: `${event.headers.origin}/cart.html?payment=cancelled`,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ id: session.id }) };

  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
