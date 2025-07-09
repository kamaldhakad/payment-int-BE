require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

app.post("/create-payment-intent", async (req, res) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 5000,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
  });
  res.send({ clientSecret: paymentIntent.client_secret });
});

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

app.post("/create-setup-intent", async (req, res) => {
  const customer = await stripe.customers.create({ email: req.body.email });
  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ["card"],
  });
  res.send({ clientSecret: setupIntent.client_secret });
});

app.listen(4242, () => console.log("Backend running on port 4242"));
