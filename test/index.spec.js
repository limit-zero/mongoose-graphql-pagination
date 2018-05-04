const models = require('../src/index');

describe('index', function() {
  it('should be an object with the Pagination object.', function(done) {
    expect(models).to.be.an('object').with.all.keys(
      'Pagination',
      'TypeAhead',
    );
    done();
  });
});
