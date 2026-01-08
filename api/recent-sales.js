import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // 1. Fetch last 10 orders to prevent repetition
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      status: 'complete',
    });

    const sales = sessions.data.map(session => {
        const items = session.metadata.items || "Premium Assets";
        
        // 2. PRIVACY LOGIC: Get First Name & Country Code only
        let name = "Customer";
        let country = "Global";

        if (session.customer_details) {
            // Get First Name (Split by space and take the first part)
            if (session.customer_details.name) {
                name = session.customer_details.name.split(' ')[0]; 
            }
            
            // Get Country Code (e.g., 'GB', 'US') - No City!
            if (session.customer_details.address && session.customer_details.address.country) {
                country = session.customer_details.address.country;
            }
        }

        return {
            item: items.split(',')[0], // Item Name
            name: name,                // First Name (e.g. "Marley")
            country: country           // Country Code (e.g. "GB")
        };
    });

    return res.status(200).json({ sales });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
