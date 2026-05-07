const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable) {
  const chunks = [];

  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const sig = req.headers["stripe-signature"];
  const rawBody = await buffer(req);

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const classId = session.metadata.classId;
    const customerEmail = session.customer_details?.email || "";
    const customerName = session.customer_details?.name || "";

    const { error } = await supabaseAdmin.from("bookings").insert({
      class_id: classId,
      customer_name: customerName,
      customer_email: customerEmail,
      payment_status: "paid",
      stripe_session_id: session.id,
    });

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).send("Database error");
    }
  }

  return res.status(200).json({ received: true });
};