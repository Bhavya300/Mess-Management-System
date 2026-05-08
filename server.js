const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
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

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL database");
  }
});

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
    console.error("Order creation failed:", error);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

app.get("/get_menu", (req, res) => {
  console.log("GET /get_menu hit");
  const sql = "SELECT meal_type, items FROM menu";

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching menu:", err);
      return res.status(500).json({ error: "Database error" });
    }
    console.log(result);
    res.json(result);
  });
});

app.get("/user-booking", async (req, res) => {
  const userId = req.session.user.id;
  const [rows] = await db.execute(
    "SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId],
  );

  if (rows.length === 0) return res.status(404).send("No booking found.");
  res.json(rows[0]);
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, results) => {
    if (err) return res.status(500).send("Server error");

    if (results.length > 0) {
      req.session.user = results[0];
      res.json({ role: results[0].role });
    } else {
      res.json({ role: null });
    }
  });
});

app.post("/signup", (req, res) => {
  const { name, email, password, role } = req.body;

  const sql =
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)";

  db.query(sql, [name, email, password, role], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).send("User already exists");
      }
      return res.status(500).send("Error registering user");
    }
    res.send("User Registered");
  });
});

app.post("/update", (req, res) => {
  const { meal_type, items } = req.body;

  const sql = `
    INSERT INTO menu (meal_type, items)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE items = VALUES(items)
  `;

  db.query(sql, [meal_type, items], (err) => {
    if (err) return res.status(500).send("Error updating menu");
    res.send("Menu updated successfully");
  });
});

const crypto = require("crypto");

app.post("/verify-payment", async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, days } =
    req.body;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    const userId = req.session.user.id; // get from session
    const name = req.session.user.name;

    const valid_from = new Date();
    const valid_till = new Date();
    valid_till.setDate(valid_from.getDate() + parseInt(days));

    await db.execute(
      `INSERT INTO bookings (user_id, name, days, valid_from, valid_till, payment_id, order_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name,
        days,
        valid_from.toISOString().split("T")[0],
        valid_till.toISOString().split("T")[0],
        razorpay_payment_id,
        razorpay_order_id,
      ],
    );

    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.use(express.static("public"));

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
