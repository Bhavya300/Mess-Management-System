const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    const role = (data.role || "").toLowerCase().trim();

    if (role === "owner" || role === "admin") {
      window.location.href = "optionsAdmin.html";
    } else if (role === "user") {
      window.location.href = "optionsUser.html";
    } else {
      alert("Invalid credentials");
    }
  });
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = "user";

    const res = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const dataText = await res.text();
    alert(dataText);
    if (dataText === "User Registered") {
      window.location.href = "login.html";
    }
  });
}

const optionForm = document.getElementById("optionForm");
if (optionForm) {
  const payment_btn = document.getElementById("payment_btn");
  const menu_btn = document.getElementById("menu_btn");
  const details_btn = document.getElementById("details_btn");

  if (payment_btn) {
    payment_btn.addEventListener("click", () => {
      const isAdminPage =
        window.location.pathname.includes("optionsAdmin.html");
      if (isAdminPage) {
        window.location.href = "MessBookings.html";
        return;
      }
      window.location.href = "payment.html";
    });
  }

  if (details_btn) {
    details_btn.addEventListener("click", () => {
      const isAdminPage =
        window.location.pathname.includes("optionsAdmin.html");
      window.location.href = isAdminPage
        ? "updateMenu.html"
        : "bookingDetails.html";
    });
  }

  if (menu_btn) {
    menu_btn.addEventListener("click", () => {
      window.location.href = "menuCard.html";
    });
  }
}

async function loadAdminBookings() {
  const container = document.getElementById("booking-list");
  if (!container) return;

  container.innerHTML = '<p class="empty-state">Loading bookings...</p>';

  try {
    const res = await fetch("/all-bookings");
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      container.innerHTML = `<p class="empty-state">${errorData.error || "Unable to load bookings."}</p>`;
      return;
    }

    const bookings = await res.json();
    if (!Array.isArray(bookings) || bookings.length === 0) {
      container.innerHTML = '<p class="empty-state">No bookings found.</p>';
      return;
    }

    const rows = bookings
      .map((booking) => {
        const from = booking.valid_from ? booking.valid_from : "N/A";
        const till = booking.valid_till ? booking.valid_till : "N/A";
        const today = new Date();
        const start = booking.valid_from ? new Date(booking.valid_from) : null;
        const end = booking.valid_till ? new Date(booking.valid_till) : null;
        const isActive = start && end && today >= start && today <= end;
        const statusText = isActive ? "Ongoing" : "Done";
        const statusClass = isActive ? "status-active" : "status-inactive";

        return `
          <tr>
            <td>${booking.name || "User"}</td>
            <td>₹${Number(booking.amount || 0).toFixed(2)}</td>
            <td>${from}</td>
            <td>${till}</td>
            <td><span class="status-banner ${statusClass}">${statusText}</span></td>
          </tr>`;
      })
      .join("");

    container.innerHTML = `
      <table class="booking-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Amount Paid</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="empty-state">Something went wrong.</p>';
  }
}

if (document.getElementById("booking-list")) {
  loadAdminBookings();
}

const menuform = document.getElementById("menuForm");
if (menuform) {
  menuform.addEventListener("submit", async (e) => {
    e.preventDefault();

    const meal_type = e.target.meal_type.value;
    const items = e.target.items.value;

    const res = await fetch("/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meal_type, items }),
    });

    const text = await res.text();
    alert(text);
  });
}

const paymentForm = document.getElementById("paymentForm");
const paymentStatus = document.getElementById("paymentStatus");

if (paymentForm) {
  paymentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const amount = document.getElementById("amount").value * 100; // Razorpay expects amount in paise

    const response = await fetch("/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });

    const order = await response.json();

    const options = {
      key: "rzp_test_okDc7v7NsZLjjQ",
      amount: order.amount,
      currency: "INR",
      name: "Mess Management",
      description: "Mess Bill Payment",
      order_id: order.id,
      handler: function (response) {
        paymentStatus.textContent =
          "Payment successful! Payment ID: " + response.razorpay_payment_id;
      },
      prefill: {
        email: "student@email.com", // Optionally, fill with logged-in user's email
      },
      theme: {
        color: "#3399cc",
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  });
}

const _detailsBtn = document.getElementById("details_btn");
if (_detailsBtn) _detailsBtn.addEventListener("click", fetchBookingDetails);

async function fetchBookingDetails() {
  const bookingId = sessionStorage.getItem("bookingId");
  const detailsDiv = document.getElementById("details");
  detailsDiv.innerHTML = ""; // Clear previous content

  if (!bookingId) {
    detailsDiv.innerText = "No booking found.";
    return;
  }

  try {
    const res = await fetch(`/confirmation?id=${bookingId}`);
    if (!res.ok) {
      detailsDiv.innerText = "Booking not found.";
      return;
    }
    const html = await res.text();
    detailsDiv.innerHTML = html;
  } catch (err) {
    detailsDiv.innerText = "Something went wrong.";
    console.error(err);
  }
}
