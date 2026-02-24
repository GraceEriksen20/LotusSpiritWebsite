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

  const booking = {
    date: params.get("date") || "",
    time: params.get("time") || "",
    service: params.get("service") || "Yoga Class",
    staff: params.get("staff") || "Staff",
    location: params.get("location") || "In Studio",
    price: params.get("price") || "$16",
    duration: params.get("duration") || ""
  };

  // Fill summary UI
  document.getElementById("sumService").textContent = booking.service;
  document.getElementById("sumDateTime").textContent = booking.date && booking.time
    ? `${booking.date} • ${booking.time}${booking.duration ? " • " + booking.duration : ""}`
    : "Missing class details (go back to Schedule and click Book).";
  document.getElementById("sumStaff").textContent = `Teacher: ${booking.staff}`;
  document.getElementById("sumLocation").textContent = booking.location;
  document.getElementById("sumPrice").textContent = booking.price;

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
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(record);
    localStorage.setItem(key, JSON.stringify(existing));
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
    if (!booking.date || !booking.time) {
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

    // Demo payment check (not real)
    const cardNumber = document.getElementById("cardNumber").value.replace(/\s+/g, "");
    if (cardNumber && cardNumber.length < 12) {
      showError("Please enter a valid demo card number, or leave it blank for now.");
      return;
    }

    // Simulate payment processing
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing…";

    setTimeout(() => {
      const record = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        createdAt: new Date().toISOString(),
        userEmail: (Auth && Auth.getUser && Auth.getUser()?.email) || email,
        attendee: { firstName, lastName, email, phone, notes },
        class: booking,
        payment: {
          status: "paid-demo",
          amount: booking.price
        }
      };

      saveBooking(record);

      showSuccess("Booking confirmed! (Demo) Your booking has been saved.");
      submitBtn.textContent = "Booked ✓";

      // Optional: redirect to dashboard after 1.2s
      setTimeout(() => { // Send confirmation email (does not block booking success)
sendConfirmationEmail(record)
  .then(() => console.log("Confirmation email sent"))
  .catch((err) => console.error("Email failed:", err));
        window.location.href = "dashboard.html";
      }, 1200);
    }, 900);
  });
})();