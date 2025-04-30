const express = require('express');
const router = express.Router();
const axios = require('axios'); 
const User = require('../Schema');
const Auth = require('../middleware/authMiddleware');
const creditCheck = require('../middleware/creditCheck');
require('dotenv').config();

router.post('/chatapi/:id', Auth, creditCheck, async (req, res) => {
    const { id } = req.params;
    const prompt = req.body?.prompt;
    const userId = req.user?._id;

    if (!prompt) {
        return res.status(400).json({ error: "Input is required" });
    }

    try {
        // 1. Get response from OpenRouter
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

        // 2. Generate image
        
        // 3. Save history & update user if id == '2'
        if (id === '2' && userId) {


            let imageURL = null;
            try {
                const imageRes = await axios.post(
                    'https://aigurulab.tech/api/generate-image',
                    {
                        width: 1024,
                        height: 1024,
                        input: "Give me Photo for this Prompt: " + prompt,
                        model: 'sdxl',
                        aspectRatio: "1:1",
                    },
                    {
                        headers: {
                            'x-api-key': process.env.PhotoAPI,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                imageURL = imageRes.data.image;
            } catch (imageError) {
                console.error("Image generation error:", imageError?.response?.data || imageError.message);
            }
            const updateFields = {
                $inc: { credits: -1 },
                $push: {
                    history: {
                        response: data,
                        createdAt: new Date(),
                        ...(imageURL && { imageURL }), // include image if available
                    },
                },
            };

            const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });

            if (updatedUser.credits < 0) {
                updatedUser.credits = 0;
                await updatedUser.save();
            }

            return res.status(200).json({
                response: data,
                image: imageURL,
            });
        }

        // 4. Send final response
        return res.status(200).json(data);

    } catch (error) {
        console.error("❌ Error in chatapi route:", error?.response?.data || error.message);
        return res.status(500).json({ error: "Something went wrong" });
    }
});

module.exports = router;
