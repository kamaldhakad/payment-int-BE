require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// CORS setup
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// One-Time Payment Intent
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { saveCard, email, amount } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    let customerId;

    if (saveCard) {
      if (!email) {
        return res
          .status(400)
          .json({ error: "Email is required to save card" });
      }
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      ...(saveCard ? { setup_future_usage: "off_session" } : {}),
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Subscription flow (uses price ID and always saves card)
app.post("/create-subscription", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const customer = await stripe.customers.create({ email });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    });

    res.send({
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Setup Intent (save card only)
app.post("/create-setup-intent", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const customer = await stripe.customers.create({ email });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
    });

    res.send({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error("Error creating setup intent:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
