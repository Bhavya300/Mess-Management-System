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

    if (data.role === "owner") {
      window.location.href = "update.html";
    } else if (data.role === "user") {
      window.location.href = "options.html";
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

    const res = await fetch("http://localhost:3000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.text();
    alert(data);
    if (data === "User Registered") {
      window.location.href = "login.html";
    }
  });
}

const optionForm = document.getElementById("optionForm");
if (optionForm) {
  const payment_btn = document.getElementById("payment_btn");
  const menu_btn = document.getElementById("menu_btn");
  const details_btn = document.getElementById("details_btn");
  payment_btn.addEventListener("click", () => {
    window.location.href = "payment.html";
  });
  details_btn.addEventListener("click", () => {
    window.location.href = "details.html";
  });
  menu_btn.addEventListener("click", () => {
    window.location.href = "user.html";
  });
}

const menuform = document.getElementById("menuForm");
if (menuform) {
  menuform.addEventListener("submit", async (e) => {
    e.preventDefault();

    const meal_type = e.target.meal_type.value;
    const items = e.target.items.value;

    const res = await fetch("http://localhost:3000/update", {
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
    key: "rzp_test_okDc7v7NsZLjjQ", // Replace with your Razorpay Test Key ID
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

document
  .getElementById("details_btn")
  .addEventListener("click", fetchBookingDetails);

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
