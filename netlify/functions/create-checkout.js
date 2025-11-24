const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

    const line_items = cart.map(item => {
      let priceValue = parseFloat(item.price.replace('£', '').replace('+', ''));
      
      if(discountCode === "XMAS") {
          priceValue = priceValue * 0.8;
      }

      const amountInPence = Math.round(priceValue * 100);

      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: item.title,
            images: ['https://i.imgur.com/yW1iXw5.png'], // Generic logo or item.img
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
      // THIS ENABLES EMAIL COLLECTION AND RECEIPTS
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
    console.error("Stripe Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
