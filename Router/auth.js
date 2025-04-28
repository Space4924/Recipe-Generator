const express = require('express');
const router = express.Router();
const User = require('../Schema');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const saltRound = 10;

router.post('/register', async (req, resp) => {
    const { name, email, phoneNo, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return resp.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // saltRound = 10
        const newUser = new User({ name, email, phoneNo, password: hashedPassword });
        await newUser.save();

        const token = jwt.sign(
            { _id: newUser._id, email: newUser.email }, // <== includes _id
            process.env.JWT_SECRET,
            { expiresIn: '10d' }
        );


        return resp.status(201).json({
            status: 'OK',
            message: 'User created successfully',
            token,
            user: { name, email, phoneNo, credits: 2 }
            // user:req.body
        });

    } catch (error) {
        console.error("Error creating user:", error);
        return resp.status(500).json({
            status: "Error",
            message: "Internal Server Error",
            error: error.message
        });
    }
});

router.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    console.log("1");
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials - User not found' });
        }
        console.log("2");
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials - Password mismatch' });
        }
        console.log("3");
        const token = jwt.sign(
            { _id: user._id, email: user.email }, // <== includes _id
            process.env.JWT_SECRET,
            { expiresIn: '10d' }
        );
        console.log("4");
        console.log(token);

        res.status(200).json({ message: 'Sign in successful', token, user: { email, password, name: user.name, credits: user.credits } });
    } catch (error) {
        console.error('Error during sign in:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;