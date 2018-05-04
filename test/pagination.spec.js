require('./connection');
const Model = require('./mongoose/model');
const Pagination = require('../src/pagination');

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
    await Model.remove();
  });

  it('should return an object', function(done) {
    expect(new Pagination()).to.be.an('object');
    done();
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
  });

  describe('#getEndCursor', function() {
    [1, 5, 10, 15].forEach((first) => {
      const pagination = { first };
      const paginated = new Pagination(Model, { pagination });
      it(`should return the correct cursor value when requesting ${first} records while ascending.`, async function() {
        const expected = first > models.length ? null : models[first - 1].id;
        await expect(paginated.getEndCursor()).to.eventually.equal(expected);
      });
    });
    [1, 5, 10, 15].forEach((first) => {
      const pagination = { first };
      const sort = { order: -1 };
      const paginated = new Pagination(Model, { pagination }, { sort });
      it(`should return the correct cursor value when requesting ${first} records while descending.`, async function() {
        const flipped = models.slice(0).reverse();
        const expected = first > models.length ? null : models[first - 1].id;
        await expect(paginated.getEndCursor()).to.eventually.equal(expected);
      });
    });
    it(`should return null when nothing could be found.`, async function() {
      const pagination = { first: 1 };
      const criteria = { badField: 'foo' };
      const paginated = new Pagination(Model, { criteria, pagination });
      await expect(paginated.getEndCursor()).to.eventually.equal(null);
    });
  });

  describe('#getEdges', function() {
    it('should return a natural list of models.', async function() {
      const ids = models.slice(0, 5).map(model => model.id);
      const sort = { field: 'id', order: 1 };
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { sort, pagination });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array');
      const results = await promise;
      expect(results.map(model => model.id)).to.deep.equal(ids);
    });

    it('should return a list for models, sorted by name, ascending.', async function() {
      const expected = ['40oz', 'Abba', 'another', 'bar', 'Bar'];
      const sort = { field: 'name', order: 1 };
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { sort, pagination });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array');
      const results = await promise;
      expect(results.map(model => model.name)).to.deep.equal(expected);
    });

    it('should return a list for models, sorted by name, descending.', async function() {
      const expected = ['some', 'Foo', 'foo', 'Bar', 'bar'];
      const sort = { field: 'name', order: -1 };
      const pagination = { first: 5 };
      const paginated = new Pagination(Model, { sort, pagination });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array');
      const results = await promise;
      expect(results.map(model => model.name)).to.deep.equal(expected);
    });

    it('should return a list for models, sorted by name, ascending, with query criteria.', async function() {
      const expected = ['40oz', 'Abba', 'bar', 'Bar', 'foo', 'Foo'];
      const criteria = { deleted: false };
      const sort = { field: 'name', order: 1 };
      const pagination = { first: 10 };
      const paginated = new Pagination(Model, { sort, pagination, criteria });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array');
      const results = await promise;
      expect(results.map(model => model.name)).to.deep.equal(expected);
    });

    it('should return an empty array when no results could be found.', async function() {
      const criteria = { badField: 'foo' };
      const sort = { field: 'name', order: 1 };
      const pagination = { first: 10 };
      const paginated = new Pagination(Model, { sort, pagination, criteria });
      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array').with.property('length', 0);
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
  });

});
