const express = require('express');
const router = express.Router();
const User = require('../Schema');
const Auth=require('../middleware/authMiddleware');
const creditCheck=require('../middleware/creditCheck');

router.post(`/chatapi/:id`, Auth,creditCheck, async (req, res) => {
  const { id } = req.params;
  const prompt = req.body?.prompt;
  const userId = req.user?._id;

  if (!prompt) {
    return res.status(400).json({ error: "Input is required" });
  }

  try {
    const completion = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI4}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemma-3-4b-it:free",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    const data = await completion.json();

    // Save history and decrease credit if id == '2'
    if (id === '2' && userId) {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            history: {
              response: data,
              createdAt: new Date(),
            },
          },
          $inc: { credits: -1 }, // ✅ match your schema field name
        },
        { new: true }
      );

      if (updatedUser.credits < 0) {
        // Optional: prevent credit from going below 0
        updatedUser.credits = 0;
        await updatedUser.save();
      }
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("❌ Error from OpenRouter:", error?.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});


module.exports = router;