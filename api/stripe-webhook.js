const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

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

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.mode === "payment") {
        await handleClassBooking(session);
      }

      if (session.mode === "subscription") {
        await handleVideoSubscription(session);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", invoice.subscription);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook handling error:", error);
    return res.status(500).send("Webhook handling error");
  }
};

async function handleClassBooking(session) {
  const classId = session.metadata.classId;
  const customerEmail = session.customer_details?.email || "";
  const customerName = session.customer_details?.name || "there";

  const { data: classData, error: classError } = await supabaseAdmin
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (classError) {
    throw classError;
  }

  const { error: bookingError } = await supabaseAdmin.from("bookings").insert({
    class_id: classId,
    customer_name: customerName,
    customer_email: customerEmail,
    payment_status: "paid",
    stripe_session_id: session.id,
  });

  if (bookingError) {
    throw bookingError;
  }

  if (customerEmail) {
    await resend.emails.send({
      from: "Lotus Spirit Studio <bookings@lotusspiritstudio.online>",
      to: customerEmail,
      subject: "Your Lotus Spirit Studio class is confirmed",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2a2a2a;">
          <h2 style="color: #4d0012;">Your class is confirmed!</h2>

          <p>Hi ${customerName},</p>

          <p>Thank you for booking with Lotus Spirit Studio. Your payment was completed successfully.</p>

          <h3>Class Details</h3>
          <p>
            <strong>Class:</strong> ${classData.title}<br>
            <strong>Date:</strong> ${classData.class_date}<br>
            <strong>Time:</strong> ${classData.start_time} - ${classData.end_time}<br>
            <strong>Location:</strong> Southwest Nimbus Avenue
          </p>

          <p>We’re excited to practice with you soon.</p>

          <p style="margin-top: 24px;">Lotus Spirit Studio</p>
        </div>
      `,
    });
  }
}

async function handleVideoSubscription(session) {
  const customerEmail = session.customer_details?.email || session.customer_email || "";
  const customerName = session.customer_details?.name || "there";

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        customer_email: customerEmail,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "customer_email",
      }
    );

  if (error) {
    throw error;
  }

  if (customerEmail) {
    await resend.emails.send({
      from: "Lotus Spirit Studio <bookings@lotusspiritstudio.online>",
      to: customerEmail,
      subject: "Your Lotus Spirit video membership is active",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2a2a2a;">
          <h2 style="color: #4d0012;">Your video membership is active!</h2>

          <p>Hi ${customerName},</p>

          <p>Thank you for subscribing to the Lotus Spirit Studio video library.</p>

          <p>You now have access to on-demand practices, classes, and wellness videos.</p>

          <p>
            <a href="https://lotusspiritstudio.online/videos.html">
              Go to the Video Library
            </a>
          </p>

          <p style="margin-top: 24px;">Lotus Spirit Studio</p>
        </div>
      `,
    });
  }
}