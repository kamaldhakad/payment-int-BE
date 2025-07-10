// backend/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// ✅ Correct CORS setup
app.use(
  cors({
    origin: "http://localhost:5173", // or your frontend domain
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// Payment Intent Route
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { saveCard, email, amount } = req.body;

    if (!amount) return res.status(400).json({ error: "Amount is required" });

    let customerId = null;
    if (saveCard && email) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: customerId || undefined,
      automatic_payment_methods: { enabled: true },
      ...(saveCard ? { setup_future_usage: "off_session" } : {}),
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Payment intent error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Subscription Route
app.post("/create-subscription", async (req, res) => {
  try {
    const { email } = req.body;
    const customer = await stripe.customers.create({ email });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    res.send({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setup Intent Route
app.post("/create-setup-intent", async (req, res) => {
  try {
    const { email } = req.body;
    const customer = await stripe.customers.create({ email });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
    });

    res.send({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
