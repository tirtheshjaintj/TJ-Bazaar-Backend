require('dotenv').config()
const express=require('express');
const app=express();
const test=require("./routes/test.route");
const user=require("./routes/user.route");
const seller=require("./routes/seller.route");
const product=require("./routes/product.route");
const connectDB = require('./helpers/db.helper');
connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended:true}))

app.use("/",test);
app.use("/api/user",user);
app.use("/api/seller",seller);
app.use("/api/product",product);

app.listen(process.env.PORT,()=>console.log(`Server Started at ${process.env.PORT}`));