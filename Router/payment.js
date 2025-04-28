const express = require('express');
const router = express.Router();
const expressRawRouter = express.Router();
require('dotenv').config();
const User = require('../Schema');
const Auth = require('../middleware/authMiddleware');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log(stripe);

// Payment Intent
router.post('/payment_intent', Auth, async (req, res) => {
  const userId = req.user?._id;
  const { amount, packageType } = req.body;
  console.log(req.body);

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
        packageType: packageType
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

// Stripe Webhook (RAW BODY)
expressRawRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {

  const sig = req.headers['stripe-signature'];
  console.log(sig);
  console.log("1");

  let event;
  try {
    //stripe_webhook_secret
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const metadata = paymentIntent.metadata;
    const userId = metadata?.userId;
    const packageType = metadata?.packageType;

    if (userId && packageType) {
      try {
        const user = await User.findById(userId);
        if (user) {
          let creditsToAdd = 0;
          if (packageType === 'small') creditsToAdd = 5;
          else if (packageType === 'medium') creditsToAdd = 15;
          else if (packageType === 'large') creditsToAdd = 50;

          user.credits += creditsToAdd;
          await user.save();
          console.log(`✅ Updated ${creditsToAdd} credits for user ${user.email}`);
        }
      } catch (error) {
        console.error('Error updating user credits:', error.message);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;
module.exports.stripeWebhook = expressRawRouter;
