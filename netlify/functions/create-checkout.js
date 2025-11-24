const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTION",
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: 'OK' };
  }

  try {
    const { cart, discountCode } = JSON.parse(event.body);

    // 1. Map your cart items to Stripe Line Items
    // NOTE: In a real secure app, you would look up prices from a database here
    // to prevent users from hacking the HTML to send "price: 0.01".
    const line_items = cart.map(item => {
      // Convert string price "£20.00" to pence integer (2000)
      let amount = parseFloat(item.price.replace('£', '').replace('+', '')) * 100;
      
      // Apply Discount Logic (Simple backend validation)
      if(discountCode === "XMAS") {
          amount = Math.round(amount * 0.8); // 20% off
      }

      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: item.title,
            images: [item.img.startsWith('http') ? item.img : 'https://yourwebsite.com/logo.png'], // Must be absolute URL
          },
          unit_amount: amount,
        },
        quantity: item.qty,
      };
    });

    // 2. Create Stripe Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: `${event.headers.origin}/index.html?success=true`,
      cancel_url: `${event.headers.origin}/cart.html?canceled=true`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id: session.id }),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
