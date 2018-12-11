require('./connection');
const Model = require('./mongoose/model');
const { Types } = require('mongoose');
const Pagination = require('../src/pagination');
const sandbox = sinon.createSandbox();

const { ObjectId } = Types;

const data = [
  { name: 'foo', deleted: false },
  { name: 'Foo', deleted: false },
  { name: 'bar', deleted: false },
  { name: 'Bar', deleted: false },
  { name: 'Abba', deleted: false },
  { name: '40oz', deleted: false },
  { name: 'some', deleted: true },
  { name: 'another', deleted: true },
];

const createModels = () => {
  return Promise.all(data.map((props) => {
    const doc = new Model(props);
    return doc.save();
  }));
};

describe('pagination', function() {
  let models;
  before(async function() {
    models = await createModels();
  });
  after(async function() {
    await Model.deleteMany({});
  });

  beforeEach(function() {
    sandbox.spy(Model, 'countDocuments');
    sandbox.spy(Model, 'find');
    sandbox.spy(Model, 'findOne');
    sandbox.spy(Pagination.prototype, 'getEdges');
    sandbox.spy(Pagination.prototype, 'getQueryCriteria');
    sandbox.spy(Pagination.prototype, 'findCursorModel');
  });
  afterEach(function() {
    sandbox.restore();
  });

  it('should return an object', function(done) {
    expect(new Pagination()).to.be.an('object');
    done();
  });

  it('should not merge special objects by default.', async function() {
    const id = ObjectId('5b3980c956d5a405cc4007c5');
    const criteria = {
      foo: 'bar',
      id,
      bar: { a: 'b' },
    };
    const instance = new Pagination(Model, { criteria });
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
    const instance = new Pagination(Model, { criteria }, { mergeOptions });
    expect(instance.criteria.id).to.be.an('object');
    expect(instance.criteria.id).to.not.be.an.instanceOf(ObjectId);
  });

  describe('#getTotalCount', function() {
    [1, 10, 50].forEach((first) => {
      const pagination = { first };
      const paginated = new Pagination(Model, { pagination });
      it(`should return a consistent total count when requesting ${first} records.`, async function() {
        await expect(paginated.getTotalCount()).to.eventually.equal(data.length);
      });
    });
    [1, 10, 50].forEach((first) => {
      const pagination = { first };
      const criteria = { deleted: false };
      const paginated = new Pagination(Model, { criteria, pagination });
      it(`should return a consistent total count when requesting ${first} records, with query criteria.`, async function() {
        await expect(paginated.getTotalCount()).to.eventually.equal(data.length - 2);
      });
    });
    it(`should return 0 when nothing could be found.`, async function() {
      const pagination = { first: 1 };
      const criteria = { badField: 'foo' };
      const paginated = new Pagination(Model, { criteria, pagination });
      await expect(paginated.getTotalCount()).to.eventually.equal(0);
    });
    it('should only query the database once when called multiple times', async function() {
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { pagination });
      const r1 = await paginated.getTotalCount();
      const r2 = await paginated.getTotalCount();
      expect(r1).to.equal(r2);
      sinon.assert.calledOnce(Model.countDocuments);
    });
  });

  describe('#hasNextPage', function() {
    [
      { first: 1, expected: true },
      { first: 5, expected: true },
      { first: 10, expected: false },
      { first: 15, expected: false },
    ].forEach(({ first, expected }) => {
      const pagination = { first };
      const paginated = new Pagination(Model, { pagination });
      it(`should return ${expected} when requesting ${first} records.`, async function() {
        await expect(paginated.hasNextPage()).to.eventually.equal(expected);
      });
    });
    [
      { first: 1, expected: true },
      { first: 5, expected: true },
      { first: 10, expected: false },
      { first: 15, expected: false },
    ].forEach(({ first, expected }) => {
      const pagination = { first };
      const sort = { field: 'name', order: -1 };
      const paginated = new Pagination(Model, { pagination, sort });
      it(`should return ${expected} when requesting ${first} records while sorting.`, async function() {
        await expect(paginated.hasNextPage()).to.eventually.equal(expected);
      });
    });
    [
      { first: 1, expected: true },
      { first: 5, expected: true },
      { first: 6, expected: false },
      { first: 10, expected: false },
    ].forEach(({ first, expected }) => {
      const pagination = { first };
      const criteria = { deleted: false };
      const paginated = new Pagination(Model, { criteria, pagination });
      it(`should return ${expected} when requesting ${first} records, with query criteria`, async function() {
        await expect(paginated.hasNextPage()).to.eventually.equal(expected);
      });
    });
    it(`should return false when nothing could be found.`, async function() {
      const pagination = { first: 1 };
      const criteria = { badField: 'foo' };
      const paginated = new Pagination(Model, { criteria, pagination });
      await expect(paginated.hasNextPage()).to.eventually.equal(false);
    });
    it('should only query the database once when called multiple times', async function() {
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { pagination });
      const r1 = await paginated.hasNextPage();
      const r2 = await paginated.hasNextPage();
      expect(r1).to.deep.equal(r2);
      sinon.assert.calledOnce(Pagination.prototype.getQueryCriteria);
    });
  });

  describe('#getEndCursor', function() {
    [1, 5, 8, 10, 15].forEach((first) => {
      const pagination = { first };
      const paginated = new Pagination(Model, { pagination });
      it(`should return the correct cursor value when requesting ${first} records while ascending.`, async function() {
        const expected =  models.length <= first ? models[models.length - 1].id : models[first - 1].id;
        await expect(paginated.getEndCursor()).to.eventually.equal(expected);
      });
    });
    [1, 5, 8, 10, 15].forEach((first) => {
      const pagination = { first };
      const sort = { order: -1 };
      const paginated = new Pagination(Model, { pagination }, { sort });
      it(`should return the correct cursor value when requesting ${first} records while descending.`, async function() {
        const flipped = models.slice(0).reverse();
        const expected =  models.length <= first ? models[models.length - 1].id : models[first - 1].id;
        await expect(paginated.getEndCursor()).to.eventually.equal(expected);
      });
    });
    it(`should return null when nothing could be found.`, async function() {
      const pagination = { first: 1 };
      const criteria = { badField: 'foo' };
      const paginated = new Pagination(Model, { criteria, pagination });
      await expect(paginated.getEndCursor()).to.eventually.equal(null);
    });
    it('should only query the database once when called multiple times', async function() {
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { pagination });
      const r1 = await paginated.getEndCursor();
      const r2 = await paginated.getEndCursor();
      expect(r1).to.deep.equal(r2);
      sinon.assert.calledOnce(Pagination.prototype.getEdges);
    });
  });

  describe('#getEdges', function() {
    it('should return a natural list of models.', async function() {
      const ids = models.slice(0, 5).map(model => model.id);
      const sort = { field: 'id', order: 1 };
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { sort, pagination });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array');
      const edges = await promise;
      expect(edges.map(edge => edge.node.id)).to.deep.equal(ids);
    });

    it('should return a list for models, sorted by name, ascending.', async function() {
      const expected = ['40oz', 'Abba', 'another', 'bar', 'Bar'];
      const sort = { field: 'name', order: 1 };
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { sort, pagination });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array');
      const edges = await promise;
      expect(edges.map(edge => edge.node.name)).to.deep.equal(expected);
    });

    it('should return a list for models, sorted by name, descending.', async function() {
      const expected = ['some', 'Foo', 'foo', 'Bar', 'bar'];
      const sort = { field: 'name', order: -1 };
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { sort, pagination });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array');
      const edges = await promise;
      expect(edges.map(edge => edge.node.name)).to.deep.equal(expected);
    });

    it('should return a list for models, sorted by name, ascending, with query criteria.', async function() {
      const expected = ['40oz', 'Abba', 'bar', 'Bar', 'foo', 'Foo'];
      const criteria = { deleted: false };
      const sort = { field: 'name', order: 1 };
      const pagination = { first: 10 };
      const paginated = new Pagination(Model, { sort, pagination, criteria });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array');
      const edges = await promise;
      expect(edges.map(edge => edge.node.name)).to.deep.equal(expected);
    });

    it('should return an empty array when no results could be found.', async function() {
      const criteria = { badField: 'foo' };
      const sort = { field: 'name', order: 1 };
      const pagination = { first: 10 };
      const paginated = new Pagination(Model, { sort, pagination, criteria });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array').with.property('length', 0);
    });

    it('should only query the database once when called multiple times', async function() {
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { pagination });
      const r1 = await paginated.getEdges();
      const r2 = await paginated.getEdges();
      expect(r1).to.deep.equal(r2);
      sinon.assert.calledOnce(Pagination.prototype.getQueryCriteria);
    });

    it('should apply the projection', async function() {
      const pagination = { first: 10 };
      const projection = { name: 1 };
      const paginated = new Pagination(Model, { pagination, projection });
      const r1 = await paginated.getEdges();
      r1.forEach((edge, i) => {
        const { node } = edge;
        expect(node.deleted).to.be.undefined;
        expect(node.name).to.equal(data[i].name);
      });
    });

    [{}, undefined].forEach((projection) => {
      it(`should return all fields when the projection is '${projection}'`, async function() {
        const pagination = { first: 10 };
        const paginated = new Pagination(Model, { pagination, projection });
        const r1 = await paginated.getEdges();
        r1.forEach((edge, i) => {
          const { node } = edge;
          expect(node.deleted).to.equal(data[i].deleted);
          expect(node.name).to.equal(data[i].name);
        });
      });
    });

  });

  describe('#findCursorModel', function() {
    it('should find the appropriate model and fields.', async function() {
      const doc = models[0];
      const paginated = new Pagination(Model);
      const promise = paginated.findCursorModel(doc.id, { _id: 1 });
      await expect(promise).to.eventually.be.an.instanceOf(Model);
      const found = await promise;
      expect(found.id).to.equal(doc.id);
      expect(found.name).to.be.undefined;
    });
    it('should throw an error when no model could be found.', async function() {
      const id = '507f1f77bcf86cd799439011';
      const paginated = new Pagination(Model);
      await expect(paginated.findCursorModel(id)).to.be.rejectedWith(Error, /no record found/i);
    });
    it('should only query the database once when called multiple times', async function() {
      const doc = models[0];
      const paginated = new Pagination(Model);
      const r1 = await paginated.findCursorModel(doc.id, { _id: 1 });
      const r2 = await paginated.findCursorModel(doc.id, { _id: 1 });
      expect(r1).to.deep.equal(r2);
      sinon.assert.calledOnce(Model.findOne);
    });
  });

  describe('#getQueryCriteria', function() {
    it('should return the proper filter value when no options are present.', async function() {
      const options = { };
      const expected = { };
      const paginated = new Pagination(Model, options);
      // call it twice to simulate saved filter.
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
    });
    it('should return the proper filter value when an after value is present.', async function() {
      const model = models[0];
      const options = {
        pagination: { after: model.id },
      };
      const expected = {
        _id: { $gt: model.id },
      };
      const paginated = new Pagination(Model, options);
      // call it twice to simulate saved filter.
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
    });
    it('should return the proper filter value when an after value is present (descending).', async function() {
      const model = models[0];
      const options = {
        pagination: { after: model.id },
        sort: { order: -1 },
      };
      const expected = {
        _id: { $lt: model.id },
      };
      const paginated = new Pagination(Model, options);
      // call it twice to simulate saved filter.
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
    });
    it('should return the proper filter value when an after value is present, with a non-ID sort.', async function() {
      const model = models[0];
      const options = {
        pagination: { after: model.id },
        sort: { field: 'name' },
      };
      const expected = {
        $or: [
          { name: { $gt: model.name } },
          { name: model.name, _id: { $gt: model.id } },
        ],
      };
      const paginated = new Pagination(Model, options);
      // call it twice to simulate saved filter.
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
    });
    it('should return the proper filter value when an after value is present, with a non-ID sort (descending).', async function() {
      const model = models[0];
      const options = {
        pagination: { after: model.id },
        sort: { field: 'name', order: -1 },
      };
      const expected = {
        $or: [
          { name: { $lt: model.name } },
          { name: model.name, _id: { $lt: model.id } },
        ],
      };
      const paginated = new Pagination(Model, options);
      // call it twice to simulate saved filter.
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
    });
    it('should return the proper filter value when an after value is present, with a non-ID sort (descending), with additional criteria.', async function() {
      const model = models[0];
      const options = {
        criteria: { createdAt: model.createdAt },
        pagination: { after: model.id },
        sort: { field: 'name', order: -1 },
      };
      const expected = {
        createdAt: model.createdAt,
        $or: [
          { name: { $lt: model.name } },
          { name: model.name, _id: { $lt: model.id } },
        ],
      };
      const paginated = new Pagination(Model, options);
      // call it twice to simulate saved filter.
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
      await expect(paginated.getQueryCriteria()).to.eventually.deep.equal(expected);
    });
    it('should only query the database once when called multiple times', async function() {
      const model = models[0];
      const options = {
        pagination: { after: model.id },
        sort: { field: 'name', order: -1 },
      };
      const expected = {
        $or: [
          { name: { $lt: model.name } },
          { name: model.name, _id: { $lt: model.id } },
        ],
      };
      const paginated = new Pagination(Model, options);

      const r1 = await paginated.getQueryCriteria();
      const r2 = await paginated.getQueryCriteria();
      expect(r1).to.deep.equal(r2);
      sinon.assert.calledOnce(Pagination.prototype.findCursorModel);
    });
  });

});
