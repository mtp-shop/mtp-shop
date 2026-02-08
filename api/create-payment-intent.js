import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // --- CORS HEADERS ---
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

    // --- 1. HANDLE DEV BYPASS (Code 1956) ---
    // If the special dev code is sent, we skip Stripe entirely.
    if (discountCode === "1956") {
        return res.status(200).json({ 
            bypass: true, 
            url: 'https://tpstemple.vercel.app/success.html' 
        });
    }

    // --- 2. CALCULATE TOTAL ON SERVER ---
    let totalAmount = 0;

    // Iterate through cart items to calculate raw total
    cart.forEach(item => {
        // Remove currency symbols and parse
        let priceString = item.price.toString().replace('£', '').replace('+', '').trim();
        let priceVal = parseFloat(priceString);
        
        if (!isNaN(priceVal)) {
            totalAmount += priceVal * item.qty;
        }
    });

    // --- 3. APPLY DISCOUNTS ---
    if (discountCode === "195612") {
        totalAmount = 0.30; // Stripe Test Amount (30p)
    } 
    else if (discountCode === "BUNDLE15") {
        totalAmount = totalAmount * 0.85; // 15% OFF
    }
    else if (discountCode === "XMAS") {
        totalAmount = totalAmount * 0.80; // 20% OFF
    }

    // Convert to pennies (Stripe requires integer cents/pence)
    const amountInPennies = Math.round(totalAmount * 100);

    // --- 4. VALIDATION ---
    // Stripe minimum is roughly £0.30 (30 pennies)
    if (amountInPennies < 30) {
        return res.status(400).json({ error: "Order total is too low for card payment." });
    }

    // --- 5. CREATE PAYMENT INTENT ---
    // This creates a pending transaction ID on Stripe
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInPennies,
        currency: 'gbp',
        automatic_payment_methods: {
            enabled: true,
        },
        metadata: {
            // Save a summary of items to the Stripe Dashboard
            items: cart.map(i => `${i.qty}x ${i.title}`).join(', ').substring(0, 500)
        }
    });

    // Return the secret key to the frontend so it can draw the payment form
    return res.status(200).json({ 
        clientSecret: paymentIntent.client_secret 
    });

  } catch (error) {
    console.error("Stripe Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
