const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define the schema
const sellerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    validate: {
      validator: function (v) {
        // Regular expression for name validation (letters and spaces only)
        return /^[a-zA-Z\s]+$/.test(v);
      },
      message: props => `${props.value} is not a valid name! Only letters and spaces are allowed.`
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    validate: {
      validator: function (v) {
        // Regular expression for basic email validation
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email!`
    }
  },
  phone_number: {
    type: String, // Changed from Number to String for consistency
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function (v) {
        // Ensure the phone number contains exactly 10 digits
        return /^[0-9]{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number! It should contain exactly 10 digits.`
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    validate: {
      validator: function (v) {
        // Regular expression for address validation
        return /^[a-zA-Z0-9\s,.'-]{10,}$/.test(v);
      },
      message: props => `${props.value} is not a valid address!`
    }
  },
  gst_number: {
    type: String,
    required: [true, 'GST number is required'],
    unique: true,
    validate: {
      validator: function (v) {
        // Regular expression for GST number validation
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: props => `${props.value} is not a valid GST number!`
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    validate: {
      validator: function (v) {
        // Regular expression for password validation (minimum 8 characters long)
        return /^.{8,}$/.test(v);
      },
      message: props => `Password must be at least 8 characters long.`
    }
  },
  otp: {
    type: String,
    validate: {
      validator: function (val) {
        return !val || val?.length == 6;
      },
      message: () => `OTP must be 6 digits`
    }
  },
  verified: {
    type: Boolean,
    default: false, // Default to false for unverified
    required: true
  }
}, { timestamps: true });

// Middleware to hash password before saving
sellerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12); // Increased salt rounds
    next();
  } catch (error) {
    next(error);
  }
});
// Method to check if password is correct
sellerSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Compile the model
const Seller = mongoose.model('Seller', sellerSchema);

module.exports = Seller;
