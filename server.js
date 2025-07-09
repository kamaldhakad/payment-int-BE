require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
  })
);

app.use(express.json());

// ✅ Create PaymentIntent with optional save card logic
app.post("/create-payment-intent", async (req, res) => {
  const { saveCard, email } = req.body;

  let customerId = null;

  if (saveCard) {
    // Create a customer only if we need to save card
    const customer = await stripe.customers.create({ email });
    customerId = customer.id;
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 5000,
    currency: "usd",
    customer: customerId || undefined,
    automatic_payment_methods: { enabled: true },
    ...(saveCard && {
      setup_future_usage: "off_session", // ✅ Save card for future
    }),
  });

  res.send({ clientSecret: paymentIntent.client_secret });
});

// ✅ Subscription flow (always saves card)
app.post("/create-subscription", async (req, res) => {
  const customer = await stripe.customers.create({ email: req.body.email });

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
});

// ✅ Save Card Only (SetupIntent)
app.post("/create-setup-intent", async (req, res) => {
  const customer = await stripe.customers.create({ email: req.body.email });
  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ["card"],
  });
  res.send({ clientSecret: setupIntent.client_secret });
});

app.listen(4242, () => console.log("Backend running on port 4242"));
