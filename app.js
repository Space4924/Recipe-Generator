const express = require('express')
const app = express();
app.use(express.json());
const User = require('./Schema');
const Auth = require('./middleware/authMiddleware')
const cookieParser = require('cookie-parser')
const PORT=process.env.PORT || 8001
app.use(cookieParser())
require('dotenv').config();

//auth Routing
require('./dbConnect');
const userRoutes = require('./Router/auth');
const chatRoutes = require('./Router/chatAI');
const paymentRoutes=require('./Router/payment');
const photoAI=require('./Router/photoAI');

const paymentWebhook = require('./Router/payment').stripeWebhook;
app.use('/', paymentWebhook);

// const { stripeWebhook } = require('./Router/payment');
// app.use('/api', stripeWebhook);
app.use(express.json());
app.use('/',paymentRoutes);
app.use('/', userRoutes);
app.use('/',chatRoutes);
app.use('/',photoAI);

app.get('/fetch', Auth, async (req, res) => {
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