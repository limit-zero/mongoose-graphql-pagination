const { Schema } = require('mongoose');

const schema = new Schema({
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

schema.index({ name: 1, _id: 1 }, { unique: true });
schema.index({ name: -1, _id: -1 }, { unique: true });

module.exports = schema;
