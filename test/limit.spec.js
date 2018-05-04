const Limit = require('../src/limit');

describe('limit', function() {
  describe('.options', function() {
    it('should set the default options when set to an empty object.', function(done) {
      const limit = new Limit();
      limit.options = {};
      expect(limit.options).to.deep.equal({
        def: 10,
        max: 200,
      });
      done();
    });
    it('should set the default options when set to undefined', function(done) {
      const limit = new Limit();
      limit.options = undefined;
      expect(limit.options).to.deep.equal({
        def: 10,
        max: 200,
      });
      done();
    });
    it('should set the `def` option and leave `max` as the default.', function(done) {
      const limit = new Limit();
      limit.options = { def: 15 };
      expect(limit.options).to.deep.equal({
        def: 15,
        max: 200,
      });
      done();
    });
    it('should set the `max` option and leave `def` as the default.', function(done) {
      const limit = new Limit();
      limit.options = { max: 50 };
      expect(limit.options).to.deep.equal({
        def: 10,
        max: 50,
      });
      done();
    });
    it('should set the `max` option and leave `def` as the default.', function(done) {
      const limit = new Limit();
      limit.options = { max: 50 };
      expect(limit.options).to.deep.equal({
        def: 10,
        max: 50,
      });
      done();
    });
    it('should set the `max` option and leave `def` as the default.', function(done) {
      const limit = new Limit();
      limit.options = { max: 50 };
      expect(limit.options).to.deep.equal({
        def: 10,
        max: 50,
      });
      done();
    });
    it('should not be changed by changing the outside object.', function(done) {
      const options = { def: 15, max: 300 };
      const limit = new Limit();
      limit.options = options;
      options.def = 50;
      options.max = 500;
      expect(limit.options).to.deep.equal({
        def: 15,
        max: 300,
      });
      done();
    });
    it('should clone the options when getting.', function(done) {
      const limit = new Limit();
      limit.options = { def: 15, max: 300 };

      limit.options.def = 30;
      limit.options.max = 100;

      expect(limit.options).to.deep.equal({
        def: 15,
        max: 300,
      });
      done();
    });
  });
  describe('.value', function() {
    it('should set default value when not set.', function(done) {
      const limit = new Limit();
      expect(limit.value).to.equal(10);
      done();
    });
    it('should set default value when set to null.', function(done) {
      const limit = new Limit();
      this.value = null;
      expect(limit.value).to.equal(10);
      done();
    });
    it('should fallback to a default value when not set.', function(done) {
      const limit = new Limit(undefined, { def: 20 });
      expect(limit.value).to.equal(20);
      done();
    });
    it('should be converted to an integer.', function(done) {
      const limit = new Limit();
      limit.value = 2.6;
      expect(limit.value).to.equal(2);
      limit.value = '4';
      expect(limit.value).to.equal(4);
      done();
    });
    it('should fallback to a default value when less than 1.', function(done) {
      const limit = new Limit(undefined, { def: 20 });
      limit.value = 0;
      expect(limit.value).to.equal(20);
      limit.value = -1;
      expect(limit.value).to.equal(20);
      done();
    });
    it('should fallback to the max value when greater than max.', function(done) {
      const limit = new Limit(undefined, { max: 20 });
      limit.value = 21;
      expect(limit.value).to.equal(20);
      done();
    });
  });
});
