const mongoose = require('mongoose');
const bluebird = require('bluebird');

const { MONGO_DSN } = process.env;
mongoose.Promise = bluebird;

const connection = mongoose.createConnection(MONGO_DSN, {
  promiseLibrary: bluebird,
  useNewUrlParser: true,
});

module.exports = connection;
