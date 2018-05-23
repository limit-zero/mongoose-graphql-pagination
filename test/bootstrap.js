global.Promise = require('bluebird');
global.chai = require('chai');
global.expect = chai.expect;
global.sinon = require('sinon');

chai.use(require('chai-as-promised'));
