// booking.js
(function () {
  // Require login (if you want booking to require authentication now)
  // If you're not ready for that yet, comment this out.
  if (window.Auth && !Auth.isLoggedIn()) {
    const returnTo = encodeURIComponent(window.location.href);
    window.location.href = `login.html?returnTo=${returnTo}`;
    return;
  }

 const params = new URLSearchParams(window.location.search);
const classId = params.get("classId");

let booking = null;

async function loadSelectedClass() {
  if (!classId) {
    document.getElementById("sumDateTime").textContent =
      "Missing class details. Go back to Schedule and click Book.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("classes")
    .select("*")
    .eq("id", classId)
    .single();

  if (error) {
    console.error("Error loading selected class:", error);
    document.getElementById("sumDateTime").textContent =
      "Could not load class details.";
    return;
  }

  booking = {
    id: data.id,
    date: data.class_date,
    time: data.start_time,
    service: data.title,
    staff: "Jessica Eriksen",
    location: "Southwest Nimbus Avenue",
    price: `$${(data.price_cents / 100).toFixed(2)}`,
    priceCents: data.price_cents,
    duration: `${data.start_time} - ${data.end_time}`
  };

  document.getElementById("sumService").textContent = booking.service;
  document.getElementById("sumDateTime").textContent =
    `${booking.date} • ${booking.time} • ${booking.duration}`;
  document.getElementById("sumStaff").textContent = `Teacher: ${booking.staff}`;
  document.getElementById("sumLocation").textContent = booking.location;
  document.getElementById("sumPrice").textContent = booking.price;
}

loadSelectedClass();

  const form = document.getElementById("bookingForm");
  const alertBox = document.getElementById("bookingAlert");
  const successBox = document.getElementById("bookingSuccess");
  const submitBtn = document.getElementById("submitBtn");

  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
    successBox.classList.add("d-none");
  }

  function showSuccess(msg) {
    successBox.textContent = msg;
    successBox.classList.remove("d-none");
    alertBox.classList.add("d-none");
  }

  function saveBooking(record) {
    const key = "lotus_bookings";
    const existing = JSON.parse(sessionStorage.getItem(key) || "[]");
    existing.push(record);
    sessionStorage.setItem(key, JSON.stringify(existing));
  }

async function sendConfirmationEmail(record) {
  // These keys are fine to use for demo/static sites
  // (Later, move email sending to a backend for production.)
  const SERVICE_ID = "service_g6neiyk";
  const TEMPLATE_ID = "template_9f075oi";

  const templateParams = {
    // These variable names MUST match what you used in your EmailJS template
    first_name: record.attendee.firstName,
    last_name: record.attendee.lastName,
    email: record.attendee.email,

    class_date: record.class.date,
    class_time: record.class.time,
    class_service: record.class.service,
    staff: record.class.staff,
    location: record.class.location,
    duration: record.class.duration,
    price: record.class.price,

    booking_id: record.id
  };

  return emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
}

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Validate class info
    if (!booking || !booking.date || !booking.time) {
      showError("Missing class details. Please go back to Schedule and click Book again.");
      return;
    }

    // Basic form validation
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const phone = document.getElementById("phone").value.trim();
    const notes = document.getElementById("notes").value.trim();
    const agree = document.getElementById("agree").checked;

    if (!firstName || !lastName || !email) {
      showError("Please fill out first name, last name, and email.");
      return;
    }

    if (!agree) {
      showError("Please agree to the studio policies (placeholder).");
      return;
    }

   submitBtn.disabled = true;
submitBtn.textContent = "Redirecting to payment...";

fetch("/api/create-checkout-session", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    classId: booking.id,
    className: booking.service,
    priceCents: booking.priceCents
  })
})
.then(res => res.json())
.then(data => {
  if (data.url) {
    window.location.href = data.url;
  } else {
    showError("Could not start Stripe checkout.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Complete Booking";
  }
})
.catch(err => {
  console.error(err);
  showError("Payment setup failed.");
  submitBtn.disabled = false;
  submitBtn.textContent = "Complete Booking";
});
  });
})();