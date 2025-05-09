const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    unique: true,
    validate: {
      validator: function (v) {
        // Regular expression for name validation (letters and spaces only)
        return /^[a-zA-Z\s]+$/.test(v);
      },
      message: props => `${props.value} is not a valid name! Only letters and spaces are allowed.`
    }
  }
}, { timestamps: true });

const category = mongoose.model('category', categorySchema);
module.exports = category;