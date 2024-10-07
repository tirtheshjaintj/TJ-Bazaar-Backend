const express=require('express');
const app=express();
//Using ENV Here
require('dotenv').config();

const test=require("./routes/test.route");
const user=require("./routes/user.route");
const seller=require("./routes/seller.route");
const product=require("./routes/product.route");
const cart=require("./routes/cart.route");
const order=require("./routes/order.route");
const wishlist=require("./routes/wishlist.route");
const review=require("./routes/rating.route");
const connectDB = require('./helpers/db.helper');
const cors=require('cors');
const cookieParser = require('cookie-parser');
//MiddleWaress
const corsOptions = {
    origin: 'https://tjbazaar.netlify.app', // Allow your Netlify domain
    // origin:process.env.FRONTEND_URL,
    credentials: true
  };

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended:true}));

//DB Connection
connectDB();

//All Routers
app.use("/",test);
app.use("/api/user",user);
app.use("/api/seller",seller);
app.use("/api/product",product);
app.use("/api/order",order);
app.use("/api/cart",cart);
app.use("/api/wishlist",wishlist);
app.use("/api/review",review);

//Main Instance of server
app.listen(process.env.PORT,()=>console.log(`Server Started at ${process.env.PORT}`));