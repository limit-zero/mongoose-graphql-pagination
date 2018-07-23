const { Schema } = require('mongoose');
const { paginablePlugin } = require('../../src/plugins');

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

schema.plugin(paginablePlugin);

schema.index({ name: 1, _id: 1 }, { unique: true });
schema.index({ name: -1, _id: -1 }, { unique: true });

module.exports = schema;
