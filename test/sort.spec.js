const Sort = require('../src/sort');

describe('sort', function() {
  describe('.field', function() {
    it('should fallback to _id when not set in constructor.', function(done) {
      const sort = new Sort();
      expect(sort.field).to.equal('_id');
      done();
    });
    it('should fallback to _id when not set.', function(done) {
      const sort = new Sort();
      sort.field = null;
      expect(sort.field).to.equal('_id');
      done();
    });
    it('should be set to _id when createdField is set and matches', function(done) {
      const sort = new Sort('createdAt', null, { createdField: 'createdAt' });
      expect(sort.field).to.equal('_id');
      done();
    });
  });
  describe('.order', function() {
    it('should set the order to 1 when not specified.', function(done) {
      const sort = new Sort();
      expect(sort.order).to.equal(1);
      done();
    });
    it('should set the order to 1 when set to asc.', function(done) {
      const sort = new Sort();
      sort.order = 'asc';
      expect(sort.order).to.equal(1);
      done();
    });
    it('should set the order to -1 when set to desc.', function(done) {
      const sort = new Sort();
      sort.order = 'desc';
      expect(sort.order).to.equal(-1);
      done();
    });
    it('should set the order to 1 when not parseable as -1.', function(done) {
      const sort = new Sort();
      ['foo', '', 100, null, -2].forEach((v) => {
        sort.order = v;
        expect(sort.order).to.equal(1);
      });
      done();
    });
    it('should parse integer values and set.', function(done) {
      const sort = new Sort();
      [1, '1', 1.1].forEach((v) => {
        sort.order = v;
        expect(sort.order).to.equal(1);
      });
      [-1, '-1', -1.1].forEach((v) => {
        sort.order = v;
        expect(sort.order).to.equal(-1);
      });
      done();
    });
  });
  describe('.value', function() {
    it('should return a sort object on construct with defaults.', function(done) {
      const sort = new Sort();
      expect(sort.value).to.deep.equal({ _id: 1 });
      done();
    });
    it('should return a sort object with proper order.', function(done) {
      const sort = new Sort();
      sort.order = -1;
      expect(sort.value).to.deep.equal({ _id: -1 });
      done();
    });
    it('should return a sort object with proper field.', function(done) {
      const sort = new Sort();
      sort.field = 'name';
      expect(sort.value).to.deep.equal({ name: 1, _id: 1 });
      done();
    });
    it('should return a sort object with proper field and order.', function(done) {
      const sort = new Sort();
      sort.field = 'name';
      sort.order = -1;
      expect(sort.value).to.deep.equal({ name: -1, _id: -1 });
      done();
    });
    it('should return a sort object with proper field and order, with createdField.', function(done) {
      const sort = new Sort('createdAt', -1, { createdField: 'createdAt' });
      expect(sort.value).to.deep.equal({ _id: -1 });
      done();
    });
  });
  describe('.valueReversed', function() {
    it('should return a sort object on construct with defaults.', function(done) {
      const sort = new Sort();
      expect(sort.valueReversed).to.deep.equal({ _id: -1 });
      done();
    });
    it('should return a sort object with proper order.', function(done) {
      const sort = new Sort();
      sort.order = -1;
      expect(sort.valueReversed).to.deep.equal({ _id: 1 });
      done();
    });
    it('should return a sort object with proper field.', function(done) {
      const sort = new Sort();
      sort.field = 'name';
      expect(sort.valueReversed).to.deep.equal({ name: -1, _id: -1 });
      done();
    });
    it('should return a sort object with proper field and order.', function(done) {
      const sort = new Sort();
      sort.field = 'name';
      sort.order = -1;
      expect(sort.valueReversed).to.deep.equal({ name: 1, _id: 1 });
      done();
    });
    it('should return a sort object with proper field and order, with createdField.', function(done) {
      const sort = new Sort('createdAt', -1, { createdField: 'createdAt' });
      expect(sort.valueReversed).to.deep.equal({ _id: 1 });
      done();
    });
  });
  describe('.collation', function() {
    it('should set the default collation.', function(done) {
      const sort = new Sort();
      expect(sort.collation).to.deep.equal({ locale: 'en_US' });
      done();
    });
    it('should extend the default options.', function(done) {
      const sort = new Sort();
      sort.collation = { caseFirst: 'upper' };
      expect(sort.collation).to.deep.equal({ locale: 'en_US', caseFirst: 'upper' });
      done();
    });
    it('should extend and override the default options.', function(done) {
      const sort = new Sort();
      sort.collation = { caseFirst: 'upper', locale: 'en_UK' };
      expect(sort.collation).to.deep.equal({ locale: 'en_UK', caseFirst: 'upper' });
      done();
    });
  });
  describe('.options', function() {
    it('should not be changed by changing the outside object.', function(done) {
      const options = { createdField: 'foo', collation: { locale: 'en_UK' } };
      const sort = new Sort();
      sort.options = options;
      options.createdField = 'bar';
      options.collation.locale = 'fr';
      expect(sort.options).to.deep.equal({
        createdField: 'foo',
        collation: { locale: 'en_UK' }
      });
      done();
    });
    it('should clone the options when getting.', function(done) {
      const sort = new Sort();
      sort.options = { createdField: 'foo', collation: { locale: 'en_UK' } };

      sort.options.createdField = 'bar';
      sort.options.collation.locale = 'fr';

      expect(sort.options).to.deep.equal({
        createdField: 'foo',
        collation: { locale: 'en_UK' }
      });
      done();
    });
  });
});
