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


 function formatTime(timeString) {
  if (!timeString) return "";

  let [hour, minute] = timeString.split(":");
  hour = parseInt(hour, 10);

  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${period}`;
}

if (customerEmail) {
  await resend.emails.send({
    from: "Lotus Spirit Studio Bookings <bookings@lotusspiritstudio.online>",
    to: customerEmail,
    subject: "Your Lotus Spirit Studio class is confirmed",
    html: `
      <div style="margin:0; padding:0; background-color:#f6f2ee; font-family:Arial, sans-serif; color:#2a2a2a;">
        <div style="max-width:640px; margin:0 auto; padding:32px 16px;">

          <div style="background-color:#4d0012; padding:28px 24px; text-align:center; border-radius:18px 18px 0 0;">
            <img
              src="https://lotusspiritstudio.online/Lotus%20Spirit_Logo_2.3.png"
              alt="Lotus Spirit Studio"
              width="180"
              style="display:block; margin:0 auto;"
            >
          </div>

          <div style="background-color:#ffffff; padding:32px 28px; border-radius:0 0 18px 18px; border:1px solid #eadfd8;">
            <h1 style="margin:0 0 12px; color:#4d0012; font-size:26px; font-weight:600;">
              Your class is confirmed
            </h1>

            <p style="font-size:16px; line-height:1.6; margin:0 0 18px;">
              Hello ${customerName || "there"},
            </p>

            <p style="font-size:16px; line-height:1.6; margin:0 0 24px;">
              Thank you for booking with Lotus Spirit Studio. Your spot has been reserved, and we’re excited to practice with you soon.
            </p>

            <div style="background-color:#f6f2ee; border:1px solid #eadfd8; border-radius:14px; padding:22px; margin:24px 0;">
              <h2 style="margin:0 0 16px; color:#4d0012; font-size:20px;">
                Class Details
              </h2>

              <p style="margin:0; font-size:15px; line-height:1.8;">
                <strong>Class:</strong> ${classData.title || "Yoga Class"}<br>
                <strong>Date:</strong> ${classData.class_date}<br>
                <strong>Time:</strong> ${formatTime(classData.start_time)} - ${formatTime(classData.end_time)}<br>
                <strong>Teacher:</strong> Jessica Eriksen<br>
                <strong>Location:</strong> 8116 SW Nimbus Ave #4d, Beaverton, OR, USA<br>
                <strong>Price:</strong> $16
              </p>
            </div>

            <p style="text-align:center; margin:24px 0 12px;">
  Need to cancel? Manage your booking below.
</p>

<div style="text-align:center; margin-bottom:24px;">
  <a
    href="https://lotusspiritstudio.online/bookings.html"
    style="
      display:inline-block;
      background-color:#4d0012;
      color:#ffffff;
      text-decoration:none;
      padding:14px 28px;
      border-radius:8px;
      font-weight:600;
    ">
    Manage My Bookings
  </a>
</div>

            <p style="font-size:15px; line-height:1.6; margin:0 0 20px;">
              Please arrive a few minutes early so you have time to settle in before class begins.
            </p>

            <p style="font-size:15px; line-height:1.6; margin:0;">
              With gratitude,<br>
              <strong style="color:#4d0012;">Lotus Spirit Studio</strong>
            </p>
          </div>

          <p style="text-align:center; color:#6d5b5d; font-size:12px; margin:18px 0 0;">
            Lotus Spirit Studio • Beaverton, Oregon
          </p>

        </div>
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