const axios=require('axios');
const express=require('express');

const router=express.Router();
require('dotenv').config();
const Auth=require('../middleware/authMiddleware')


router.post('/photoAPI', Auth, async (req, resp) => {
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

  module.exports=router;
  