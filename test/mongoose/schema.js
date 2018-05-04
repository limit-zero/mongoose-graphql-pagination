const { Schema } = require('mongoose');

module.exports = new Schema({
  name: {
    type: String,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});
