const { Client } = require('elasticsearch');

const { ELASTIC_HOST } = process.env;

module.exports = new Client({
  host: ELASTIC_HOST,
  log: {
    type: 'stdio',
    levels: [],
  },
});
