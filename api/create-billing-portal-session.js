const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("customer_email", email)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data?.stripe_customer_id) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${baseUrl}/dashboard.html`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error("Billing portal error:", error);
    return res.status(500).json({ error: "Could not create billing portal session" });
  }
};