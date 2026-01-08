import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // List the last 3 successful checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 3,
      status: 'complete', // Only paid orders
    });

    // Format the data for the frontend
    const sales = sessions.data.map(session => {
        // Get the item names from the metadata we saved in create-checkout.js
        const items = session.metadata.items || "Premium Assets";
        
        // Get location (City or Country)
        let location = "Unknown";
        if (session.customer_details && session.customer_details.address) {
            location = session.customer_details.address.city || session.customer_details.address.country || "Global";
        }

        return {
            items: items.split(',')[0], // Just show the first item to keep it short
            location: location,
            time: session.created // Timestamp
        };
    });

    return res.status(200).json({ sales });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
