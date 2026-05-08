const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const baseUrl =
      process.env.BASE_URL || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer_email: email,

      line_items: [
        {
          price: process.env.STRIPE_VIDEO_PRICE_ID,
          quantity: 1,
        },
      ],

      success_url: `${baseUrl}/videos.html?subscribed=true`,
      cancel_url: `${baseUrl}/subscribe.html`,

      metadata: {
        type: "video_subscription",
      },
    });

    return res.status(200).json({
      url: session.url,
    });

  } catch (error) {
    console.error("Subscription checkout error:", error);

    return res.status(500).json({
      error: "Could not create subscription checkout",
    });
  }
};