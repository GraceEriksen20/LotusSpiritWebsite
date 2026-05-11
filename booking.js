// booking.js
(function () {
  if (window.Auth && !Auth.isLoggedIn()) {
    sessionStorage.setItem(
      "lotus_return_to",
      window.location.pathname + window.location.search
    );

    window.location.href = "login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);

  let classId = params.get("classId");

  if (!classId) {
    classId = sessionStorage.getItem("lotus_pending_class_id");
  }

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

    if (successBox) {
      successBox.classList.add("d-none");
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!booking || !booking.date || !booking.time) {
      showError("Missing class details. Please go back to Schedule and click Book again.");
      return;
    }

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const agree = document.getElementById("agree").checked;

    if (!firstName || !lastName || !email) {
      showError("Please fill out first name, last name, and email.");
      return;
    }

    if (!agree) {
      showError("Please agree to the studio policies.");
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