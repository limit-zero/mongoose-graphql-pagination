require('./connection');
const Model = require('./mongoose/model');
const Pagination = require('../src/pagination');

describe('pagination', function() {
  it('should return an object', function(done) {
    expect(new Pagination()).to.be.an('object');
    done();
  });
  it('should do', function(done) {
    done();
  });
});
