const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { classId, className, priceCents } = req.body;

    if (!classId || !className || !priceCents) {
      return res.status(400).json({ error: "Missing class payment details" });
    }

    const baseUrl =
      process.env.BASE_URL || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: className,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        classId,
      },
      success_url: `${baseUrl}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/booking.html?classId=${classId}`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return res.status(500).json({ error: "Could not create checkout session" });
  }
};