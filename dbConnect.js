
const mongoose = require('mongoose')
mongoose.connect(process.env.DataBaseURL).then(() => console.log("Database connected Succesfully")).catch((err) => console.log(err, "Database not connected"));
