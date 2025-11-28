const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios'); // Required for sending Dev Mode alerts

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
        console.log("Dev Mode 1956 Activated - Bypassing Stripe");

        // 1. Send Notification to Discord Manually (Since Stripe won't trigger webhook)
        try {
            await axios.post(process.env.DISCORD_WEBHOOK_URL, {
                embeds: [{
                    title: "🛠️ DEV OVERRIDE ORDER",
                    description: "Code `1956` used. 100% Discount Applied.",
                    color: 5763719, // Green Color
                    fields: [
                        { name: "Status", value: "✅ Bypass Successful", inline: true },
                        { name: "Amount", value: "£0.00 (Free)", inline: true },
                        { name: "Items", value: cart.map(i => `${i.qty}x ${i.title}`).join('\n') || "Unknown" }
                    ],
                    footer: { text: "TPS TEMPLE | Dev System" },
                    timestamp: new Date().toISOString()
                }]
            });
        } catch (err) {
            console.error("Discord notification failed", err);
        }

        // 2. Return Success URL immediately (Skip Stripe)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ bypassUrl: `${event.headers.origin}/index.html?payment=dev_success` }),
        };
    }

    // --- NORMAL STRIPE FLOW ---
    const line_items = cart.map(item => {
      let priceValue = parseFloat(item.price.replace('£', '').replace('+', ''));
      
      if(discountCode === "XMAS") {
          priceValue = priceValue * 0.8; // 20% Off
      }

      const amountInPence = Math.round(priceValue * 100);

      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: item.title,
            images: ['https://i.imgur.com/yW1iXw5.png'], 
          },
          unit_amount: amountInPence,
        },
        quantity: item.qty,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      invoice_creation: { enabled: true },
      allow_promotion_codes: true, 
      success_url: `${event.headers.origin}/index.html?payment=success`,
      cancel_url: `${event.headers.origin}/cart.html?payment=cancelled`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id: session.id }),
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};