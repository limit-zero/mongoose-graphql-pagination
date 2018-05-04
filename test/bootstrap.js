global.Promise = require('bluebird');
global.chai = require('chai');
global.expect = chai.expect;

chai.use(require('chai-as-promised'));
