const mongoose = require('mongoose');

const reachPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
    },
    minimumViews: {
      type: Number,
      required: [true, 'Minimum views count is required'],
      min: [1000, 'Minimum views must start at 1,000'],
    },
    price: {
      type: Number,
      required: [true, 'Package price is required'],
      min: [0, 'Price must be positive'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ReachPackage', reachPackageSchema);
