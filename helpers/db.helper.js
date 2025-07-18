const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URL);

    console.log(`MongoDB is connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

// Catch unhandled promise rejections (global error handling for async)
process.on('unhandledRejection', (error) => {
  console.error(`Unhandled Rejection: ${error.message}`);
  process.exit(1);
});

module.exports = connectDB;
