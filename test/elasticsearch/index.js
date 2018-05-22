const client = require('./client');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let connected = false;
let delayed;

const connect = async () => {
  if (!connected) {
    if (delayed) {
      await delayed;
    }
    try {
      await client.cluster.health({});
      connected = true;
    } catch (e) {
      delayed = delay(3000);
      await connect();
    }
  }
};

const disconnect = async () => {
  if (connected) {
    await client.close();
  }
};

module.exports = { connect, disconnect };
