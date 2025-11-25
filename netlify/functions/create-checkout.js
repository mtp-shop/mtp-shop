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
    const siteUrl = event.headers.origin;

    const line_items = cart.map(item => {
      let priceValue = parseFloat(item.price.replace('£', '').replace('+', ''));
      
     // CHECK FOR 100% OFF CODE FIRST
      if(discountCode === "1956") {
          priceValue = 0; 
      } 
      else if(discountCode === "XMAS") {
          priceValue = priceValue * 0.8;
      }

      const amountInPence = Math.round(priceValue * 100);

      let imageUrl = item.img;
      if (!imageUrl.startsWith('http')) {
          const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
          imageUrl = `${siteUrl}/${cleanPath}`;
      }

      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: item.title,
            images: [imageUrl],
          },
          unit_amount: amountInPence,
        },
        quantity: item.qty,
      };
    });

    const session = await stripe.checkout.sessions.create({
      // --- ADDED 'paypal' HERE ---
      payment_method_types: ['card', 'paypal'],
      // ---------------------------
      
      line_items: line_items,
      mode: 'payment',
      invoice_creation: { enabled: true },
      allow_promotion_codes: false,
      success_url: `${siteUrl}/index.html?payment=success`,
      cancel_url: `${siteUrl}/cart.html?payment=cancelled`,
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
