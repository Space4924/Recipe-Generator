const express = require('express');
const router = express.Router();
const expressRawRouter = express.Router();
require('dotenv').config();
const User = require('../Schema');
const Auth = require('../middleware/authMiddleware');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 💳 Create Payment Intent
router.post('/payment_intent', Auth, async (req, res) => {
  const userId = req.user?._id;
  const { amount, credits } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized. User ID missing." });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'inr',
      payment_method_types: ['card'],
      metadata: {
        userId: userId.toString(),
        credits: credits.toString() // Ensure credits are string for Stripe metadata
      }
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 📩 Stripe Webhook Handler (needs RAW body)
expressRawRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  console.log("sig",sig);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const metadata = paymentIntent.metadata;
    const userId = metadata?.userId;
    const credits = parseInt(metadata?.credits);

    if (userId && credits) {
      try {
        const user = await User.findById(userId);
        if (user) {
          user.credits += credits;
          await user.save();
          console.log(`✅ Added ${credits} credits to user ${user.email}`);
        }
      } catch (error) {
        console.error('Error updating user credits:', error.message);
      }
    }
  }

  res.json({ received: true });
});

// 🛡️ Export both routers
module.exports = router;
module.exports.stripeWebhook = expressRawRouter;
