import "dotenv/config";
import express from "express";
import Razorpay from "razorpay";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const orders = [];

// Create Order
app.post("/create-order", async (req, res) => {
  const amount = req.body.amount;

  const options = {
    amount: amount * 100, // Rupees to paise
    currency: "INR",
    receipt: `receipt_${Math.floor(Math.random() * 1000)}_${Date.now()}`,
  };

  try {
    const order = await instance.orders.create(options);
    // Saving to DB Simulation LOL
    orders.push(order);
    console.log("\nCurrent orders:", orders);

    res.json({ order });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Verify Payment
// app.post("/verify-payment", (req, res) => {});

// Webhook Handler
app.post(
  "/webhook/razorpay",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("Razorpay webhook got hit");

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ message: "Webhook secret not configured" });
    }

    const signature = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.log("Invalid webhook signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = JSON.parse(req.body.toString());
    console.log("Signature verified");

    if (event.event === "payment.captured") {
      // Handle payment captured event
      const payment = event.payload.payment.entity;
      console.log("Payment Confirmed:", payment.id);
    }

    res.status(200).json({ message: "Webhook received" });
  },
);

app.listen(3000, () => {
  console.log("Listening at port 3000...");
});
