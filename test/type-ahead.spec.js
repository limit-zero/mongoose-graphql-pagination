require('./connection');
const TypeAhead = require('../src/type-ahead');
const Model = require('./mongoose/model');
const { Types } = require('mongoose');
const Pagination = require('../src/pagination');

const { ObjectId } = Types;

describe('type-ahead', function() {
  it('should not merge special objects by default.', async function() {
    const id = ObjectId('5b3980c956d5a405cc4007c5');
    const criteria = {
      foo: 'bar',
      id,
      bar: { a: 'b' },
    };
    const instance = new TypeAhead('foo', 'bar', criteria);
    expect(instance.criteria).to.deep.equal(criteria);
    expect(instance.criteria.id).to.be.an.instanceOf(ObjectId);
  });

  it('should merge special objects when specifically instructured to.', async function() {
    const mergeOptions = {};
    const id = ObjectId('5b3980c956d5a405cc4007c5');
    const criteria = {
      foo: 'bar',
      id,
      bar: { a: 'b' },
    };
    const instance = new TypeAhead('foo', 'bar', criteria, { mergeOptions });
    expect(instance.criteria.id).to.be.an('object');
    expect(instance.criteria.id).to.not.be.an.instanceOf(ObjectId);
  });

  describe('.field', function() {
    it('should throw an error when empty', function(done) {
      const message = 'A type ahead field must be specified.';
      expect(() => new TypeAhead('', 'foo')).to.throw(Error, message);
      const ta = new TypeAhead('name', 'foo');
      expect(() => ta.field = '').to.throw(Error, message);
      done();
    });
  });
  describe('.term', function() {
    it('should throw an error when empty', function(done) {
      const message = 'A type ahead term must be specified.';
      expect(() => new TypeAhead('name', '')).to.throw(Error, message);
      const ta = new TypeAhead('name', 'foo');
      expect(() => ta.term = '').to.throw(Error, message);
      done();
    });
  });
  describe('.criteria', function() {
    it('should clone the criteria when getting.', function(done) {
      const ta = new TypeAhead('name', 'foo');
      ta.criteria = { foo: 'bar', baz: { a: 1, b: 2 } };

      ta.criteria.foo = 'foo';
      ta.criteria.baz.a = 'a';

      expect(ta.criteria).to.deep.equal({ foo: 'bar', baz: { a: 1, b: 2 } });
      done();
    });
  });
  describe('.options', function() {
    it('should set the defaults when set to undefined', function(done) {
      const ta = new TypeAhead('name', 'foo');
      ta.options = undefined;
      expect(ta.options).to.deep.equal({ escape: true, caseSensitive: false, position: 'contains' });
      done();
    });
    it('should clone the options when getting.', function(done) {
      const ta = new TypeAhead('name', 'foo');
      ta.options = { caseSensitive: true, position: 'starts-with' };

      ta.options.caseSensitive = 'foo';
      ta.options.position = 'a';

      expect(ta.options).to.deep.equal({ escape: true, caseSensitive: true, position: 'starts-with' });
      done();
    });
  });
  describe('#buildRegex', function() {
    it('should build a default `contains` regex.', function(done) {
      const ta = new TypeAhead('name', 'foo');
      const regex = ta.buildRegex();
      expect(regex).to.be.an.instanceOf(RegExp);
      expect(regex.toString()).to.equal('/foo/i');
      done();
    });
    it('should build a `starts-with` regex.', function(done) {
      const ta = new TypeAhead('name', 'foo', {}, { position: 'starts-with' });
      const regex = ta.buildRegex();
      expect(regex).to.be.an.instanceOf(RegExp);
      expect(regex.toString()).to.equal('/^foo/i');
      done();
    });
    it('should build an `ends-with` regex.', function(done) {
      const ta = new TypeAhead('name', 'foo', {}, { position: 'ends-with' });
      const regex = ta.buildRegex();
      expect(regex).to.be.an.instanceOf(RegExp);
      expect(regex.toString()).to.equal('/foo$/i');
      done();
    });
    it('should build an `exact-match` regex.', function(done) {
      const ta = new TypeAhead('name', 'foo', {}, { position: 'exact-match' });
      const regex = ta.buildRegex();
      expect(regex).to.be.an.instanceOf(RegExp);
      expect(regex.toString()).to.equal('/^foo$/i');
      done();
    });
    it('should handle a case sensitive regex.', function(done) {
      const ta = new TypeAhead('name', 'foo', {}, { caseSensitive: true });
      const regex = ta.buildRegex();
      expect(regex).to.be.an.instanceOf(RegExp);
      expect(regex.toString()).to.equal('/foo/');
      done();
    });
    it('should escape the term by default.', function(done) {
      const ta = new TypeAhead('name', 'fo.o');
      const regex = ta.buildRegex();
      expect(regex).to.be.an.instanceOf(RegExp);
      expect(regex.toString()).to.equal('/fo\\.o/i');
      done();
    });
    it('should not escape the term if the option set.', function(done) {
      const ta = new TypeAhead('name', 'fo.o', {}, { escape: false });
      const regex = ta.buildRegex();
      expect(regex).to.be.an.instanceOf(RegExp);
      expect(regex.toString()).to.equal('/fo.o/i');
      done();
    });
    it('should not escape the term, be case sensitive, and have an exact match (when set).', function(done) {
      const ta = new TypeAhead('name', 'fo.o', {}, { escape: false, caseSensitive: true, position: 'exact-match' });
      const regex = ta.buildRegex();
      expect(regex).to.be.an.instanceOf(RegExp);
      expect(regex.toString()).to.equal('/^fo.o$/');
      done();
    });
  });
  describe('#buildCritiera', function() {
    it('should return the regex query and sort, when no outside criteria is set.', function(done) {
      const ta = new TypeAhead('name', 'foo');
      const value = new RegExp('foo', 'i');
      expect(ta.buildCriteria()).to.deep.equal({
        criteria: { name: value },
        sort: { field: 'name', order: 1 },
      });
      done();
    });
    it('should return the regex query and sort with outside criteria.', function(done) {
      const ta = new TypeAhead('name', 'foo', { baz: 'dill' });
      const value = new RegExp('foo', 'i');
      expect(ta.buildCriteria()).to.deep.equal({
        criteria: { name: value, baz: 'dill' },
        sort: { field: 'name', order: 1 },
      });
      done();
    });
    it('should return the regex query and sort with outside criteria, and override if criteria has same field.', function(done) {
      const ta = new TypeAhead('name', 'foo', { baz: 'dill', name: 'abc' });
      const value = new RegExp('foo', 'i');
      expect(ta.buildCriteria()).to.deep.equal({
        criteria: { name: value, baz: 'dill' },
        sort: { field: 'name', order: 1 },
      });
      done();
    });
  });
  describe('#paginate', function() {
    it('should return a Pagination instance with the criteria and sort applied.', function(done) {
      const ta = new TypeAhead('name', 'foo', { baz: 'dill', name: 'abc' });
      const value = new RegExp('foo', 'i');
      const paginated = ta.paginate(Model);
      expect(paginated).to.be.an.instanceOf(Pagination);
      expect(paginated.criteria).to.deep.equal({ name: value, baz: 'dill' });
      expect(paginated.sort.field).to.equal('name');
      expect(paginated.sort.order).to.equal(1);
      done();
    });
  });
});
