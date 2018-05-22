require('./connection');
const Model = require('./mongoose/model');
const client = require('./elasticsearch/client');
const SearchPagination = require('../src/search-pagination');
const sandbox = sinon.createSandbox();

const data = [
  { name: 'foo' },
  { name: 'foo' },
  { name: 'bar' },
  { name: 'bar' },
  { name: 'foo' },
  { name: 'foo' },
  { name: 'bar' },
  { name: 'bar' },
];

const createDocuments = () => {
  return Promise.all(data.map((props) => {
    const doc = new Model(props);
    return doc.save();
  }));
};

const index = 'graphql-pagination';
const type = 'model';

const indexDocuments = (docs) => {
  const promises = docs.map((doc) => {
    const { id, name } = doc;
    return client.index({
      index,
      type,
      id,
      body: { name },
    });
  });
  return Promise.all(promises);
};

describe('search-pagination', function() {
  let docs;
  before(async function() {
    // Create the ES index.
    const body = {
      mappings: { [type]: { properties: { name: { type: 'keyword' } } } },
    };
    await client.indices.create({ index, body });

    const mappings = await client.indices.getMapping({ index, type });

    // Create the documents in MongoDB via Mongoose.
    docs = await createDocuments();

    // Index the documents in ES.
    await indexDocuments(docs);
    await client.indices.refresh({ index });
  });
  after(async function() {
    await Model.remove();
    await client.indices.delete({ index });
  });

  beforeEach(function() {
    sandbox.spy(client, 'count');
  });
  afterEach(function() {
    sandbox.restore();
  });


  describe('#getTotalCount', function() {
    [1, 10, 50].forEach((first) => {
      const pagination = { first };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      it(`should return a consistent total count when requesting ${first} records.`, async function() {
        await expect(paginated.getTotalCount()).to.eventually.equal(data.length);
      });
    });
    [1, 10, 50].forEach((first) => {
      const pagination = { first };
      const body = { query: { term: { name: 'foo' } } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      it(`should return a consistent total count when requesting ${first} records, with query criteria.`, async function() {
        await expect(paginated.getTotalCount()).to.eventually.equal(4);
      });
    });
    it('should return 0 when nothing could be found.', async function() {
      const pagination = { first: 10 };
      const body = { query: { term: { name: 'baz' } } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      await expect(paginated.getTotalCount()).to.eventually.equal(0);
    });
    it('should only query the database once when called multiple times', async function() {
      const pagination = { first: 5 };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      const r1 = await paginated.getTotalCount();
      const r2 = await paginated.getTotalCount();
      expect(r1).to.equal(r2);
      sinon.assert.calledOnce(client.count);
    });
  });

  describe('#getSearchBody', function() {
    it('should contain the size and sort properties', function(done) {
      const pagination = { first: 5 };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });

      const result = paginated.getSearchBody();
      expect(result.size).to.equal(5);
      expect(result.sort).to.deep.equal([
        { _score: 'desc' },
        { _id: 'asc' },
      ]);
      done();
    });
    it('should override the size and sort if previously set.', function(done) {
      const pagination = { first: 5 };
      const body = { query: { match_all: {} }, size: 20, sort: { _id: 'desc' } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });

      const result = paginated.getSearchBody();
      expect(result.size).to.equal(5);
      expect(result.sort).to.deep.equal([
        { _score: 'desc' },
        { _id: 'asc' },
      ]);
      done();
    });
    it('should spread the passed `body` params.', function(done) {
      const pagination = { first: 5 };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });

      const expected = {
        query: { match_all: {} },
        size: 5,
        sort: [
          { _score: 'desc' },
          { _id: 'asc' },
        ],
      };

      const result = paginated.getSearchBody();
      expect(result).to.deep.equal(expected);
      done();
    });
    it('should add the `search_after` property when an `after` value is set.', function(done) {
      const after = JSON.stringify([1, '1234']);

      const pagination = { first: 5, after };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });

      const result = paginated.getSearchBody();
      expect(result.search_after).to.deep.equal([1, '1234']);
      done();

    });
  });

});
