const express = require('express')
const app = express();
const mongoose = require('mongoose')
app.use(express.json());
const OpenAI = require('openai')
const User = require('./Schema');
const bcrypt = require('bcrypt');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Auth = require('./middleware/authMiddleware')
const creditCheck=require('./middleware/creditCheck')
const cookieParser = require('cookie-parser')
const PORT=process.env.PORT || 8001
app.use(express.json());
app.use(cookieParser())
require('dotenv').config();
mongoose.connect(process.env.DataBaseURL).then(() => console.log("Database connected Succesfully")).catch((err) => console.log(err, "Database not connected"))
const saltRound = 10;
//auth Routing
const userRoutes = require('./Router/auth');
const chatRoutes = require('./Router/chatAI');
app.use('/', userRoutes);
app.use('/',chatRoutes);

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post('/payment_intent', async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount, 
      currency: 'inr', 
      payment_method_types: ['card', 'upi', 'netbanking', 'wallet']
    });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/photoAPI', Auth, async (req, resp) => {
  console.log("body", req.body)
  console.log(req.body?.ImagePrompt)
  try {
    const BASE_URL = 'https://aigurulab.tech';
    const result = await axios.post(BASE_URL + '/api/generate-image',
      {
        width: 1024,
        height: 1024,
        input: req.body.ImagePrompt,
        model: 'sdxl',
        aspectRatio: "1:1"
      },
      {
        headers: {
          'x-api-key': process.env.PhotoAPI, // Your API Key
          'Content-Type': 'application/json', // Content Type
        },
      })
    console.log(result.data.image)
    resp.status(201).send(result.data.image);
  } catch (error) {
    console.log("Error in photogeneration API: ", error);
    resp.status(404).send("Error: ", error);
  }
})

app.get('/fetch', Auth, creditCheck, async (req, res) => {
  console.log("working");
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('history'); // only select history field

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.history);

  } catch (error) {
    console.error("❌ Error fetching user history:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete('/delete/:index', Auth, async (req, res) => {
  const userId = req.user._id;
  const index = parseInt(req.params.index, 10);
  console.log(userId, index);

  try {
    const user = await User.findById(userId);

    if (!user || !user.history || index < 0 || index >= user.history.length) {
      return res.status(404).json({ success: false, message: 'Invalid index or no history found' });
    }

    user.history.splice(index, 1);
    await user.save();

    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
})

app.listen(PORT, () => {
  console.log('Server at 8001 is started')
})