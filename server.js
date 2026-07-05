const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const Razorpay = require("razorpay");
const session = require("express-session");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "secretkey",
    resave: false,
    saveUninitialized: true,
  }),
);

const PORT = process.env.PORT || 3000;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const razorpaySecret =
  process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: razorpaySecret,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to database");
    ensureBookingColumns().catch((migrationErr) => {
      console.error("Booking table migration failed:", migrationErr.message);
    });
  }
});

async function ensureBookingColumns() {
  try {
    const [rows] = await db
      .promise()
      .execute("SHOW COLUMNS FROM bookings LIKE 'amount'");
    if (rows.length === 0) {
      await db
        .promise()
        .execute(
          "ALTER TABLE bookings ADD COLUMN amount DECIMAL(10,2) DEFAULT NULL",
        );
    }
  } catch (err) {
    if (err.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }
}

app.get("/testapi", (req, res) => {
  res.json({ msg: "API works!" });
});

app.get("/status", (req, res) => {
  res.send("Server is alive");
});

app.get("/test", (req, res) => {
  res.send("Test route is working");
});

app.get("/user-info", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "User not logged in" });
  }

  const { name, email } = req.session.user;
  res.json({ name, email });
});

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.post("/create-order", async (req, res) => {
  try {
    const { amount, days } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      payment_capture: 1,
    });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

app.get("/get_menu", (req, res) => {
  const mealType = String(req.query.type || "").trim();

  if (!mealType) {
    return res
      .status(400)
      .json({ error: "Meal type query parameter is required" });
  }

  const normalizedMealType = mealType.toLowerCase();
  const sql = "SELECT items FROM menu WHERE LOWER(meal_type) = ?";

  db.query(sql, [normalizedMealType], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    if (result.length === 0) {
      return res.json([]);
    }

    // Gathers ['Dosa', 'Chutney', 'Tea'] -> combines into "Dosa, Chutney, Tea"
    const combinedItems = result.map((row) => row.items).join(", ");

    // Sends back a perfectly clean, non-repeating format
    res.json([
      {
        meal_type: mealType,
        items: combinedItems,
      },
    ]);
  });
});

app.get(["/my-booking", "/user-booking"], async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "User not logged in" });
  }

  const userId = req.session.user.id;
  const [rows] = await db
    .promise()
    .execute(
      "SELECT * FROM bookings WHERE user_id = ? ORDER BY valid_from DESC, valid_till DESC",
      [userId],
    );

  if (rows.length === 0) return res.json([]);
  res.json(rows);
});

app.get("/all-bookings", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "User not logged in" });
  }

  const role = (req.session.user.role || "").toLowerCase();
  if (role !== "owner" && role !== "admin") {
    return res.status(403).json({ error: "Access denied" });
  }

  const [rows] = await db
    .promise()
    .execute(
      "SELECT * FROM bookings ORDER BY valid_from DESC, valid_till DESC",
    );

  const bookings = rows.map((booking) => {
    const today = new Date();
    const start = booking.valid_from ? new Date(`${booking.valid_from}`) : null;
    const end = booking.valid_till ? new Date(`${booking.valid_till}`) : null;
    const isActive = start && end && today >= start && today <= end;

    return {
      ...booking,
      status: isActive ? "Ongoing" : "Done",
    };
  });

  res.json(bookings);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).send("Server error");

    if (results.length === 0) {
      return res.json({ role: null });
    }
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ role: null });
    }
    req.session.user = user;
    res.json({
      role: user.role,
    });
  });
});

app.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);
  const sql =
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, email, hash, role], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).send("User already exists");
      }
      return res.status(500).send("Error registering user");
    }
    res.send("User Registered");
  });
});

app.post("/update", async (req, res) => {
  const mealType = String(req.body.meal_type || "")
    .trim()
    .toLowerCase();
  const items = String(req.body.items || "").trim();

  if (!mealType || !items) {
    return res.status(400).send("Meal type and items are required");
  }

  try {
    const [result] = await db.promise().execute(
      `INSERT INTO menu (meal_type, items) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE items = VALUES(items)`,
      [mealType, items],
    );
    if (result.affectedRows === 2) {
      return res.send("Menu updated successfully");
    } else {
      return res.send("New menu entry created successfully");
    }
  } catch (err) {
    return res.status(500).send("Internal server error updating menu");
  }
});

const crypto = require("crypto");

app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      days,
      amount,
    } = req.body;

    if (!req.session.user) {
      return res
        .status(401)
        .json({ success: false, error: "User not logged in" });
    }

    if (!razorpay_payment_id || !razorpay_order_id) {
      return res
        .status(400)
        .json({ success: false, error: "Missing Razorpay payment details" });
    }

    const userId = req.session.user.id;
    const name = req.session.user.name;

    const valid_from = new Date();
    const valid_till = new Date();
    valid_till.setDate(valid_from.getDate() + parseInt(days || 0));

    const paidAmount = Number(amount || 0);

    const [result] = await db.promise().execute(
      `INSERT INTO bookings (user_id, name, days, valid_from, valid_till, amount, payment_id, order_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        days,
        valid_from.toISOString().split("T")[0],
        valid_till.toISOString().split("T")[0],
        paidAmount,
        razorpay_payment_id,
        razorpay_order_id,
      ],
    );

    return res.json({
      success: true,
      booking: {
        id: result.insertId,
        user_id: userId,
        name,
        days,
        valid_from: valid_from.toISOString().split("T")[0],
        valid_till: valid_till.toISOString().split("T")[0],
        amount: paidAmount,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.use(express.static("public"));

app.listen(3000, () => {
  console.log(`Server running on port ${PORT}`);
});
