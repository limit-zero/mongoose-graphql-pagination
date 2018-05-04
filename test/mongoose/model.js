const mongoose = require('./index');
const schema = require('./schema');

module.exports = mongoose.model('model', schema);
