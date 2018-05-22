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
    sandbox.spy(client, 'search');
    sandbox.spy(Model, 'find');
    sandbox.spy(SearchPagination.prototype, 'getSearchBody');
    sandbox.spy(SearchPagination.prototype, 'getEndCursor');
    sandbox.spy(SearchPagination.prototype, 'getEdges');
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
    it('should only run once when called multiple times', async function() {
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

  describe('#hasNextPage', function() {
    [
      { first: 1, expected: true },
      { first: 5, expected: true },
      { first: 10, expected: false },
      { first: 15, expected: false },
    ].forEach(({ first, expected }) => {
      const pagination = { first };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      it(`should return ${expected} when requesting ${first} records.`, async function() {
        await expect(paginated.hasNextPage()).to.eventually.equal(expected);
      });
    });
    [
      { first: 1, expected: true },
      { first: 3, expected: true },
      { first: 4, expected: false },
      { first: 10, expected: false },
    ].forEach(({ first, expected }) => {
      const pagination = { first };
      const body = { query: { term: { name: 'foo' } } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      it(`should return ${expected} when requesting ${first} records, with query criteria`, async function() {
        await expect(paginated.hasNextPage()).to.eventually.equal(expected);
      });
    });
    it(`should return false when nothing could be found.`, async function() {
      const pagination = { first: 2 };
      const body = { query: { term: { name: 'baz' } } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      await expect(paginated.hasNextPage()).to.eventually.equal(false);
    });
    it('should only run once when called multiple times', async function() {
      const pagination = { first: 3 };
      const body = { query: { term: { name: 'foo' } } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      const r1 = await paginated.hasNextPage();
      const r2 = await paginated.hasNextPage();
      expect(r1).to.deep.equal(r2);
      sinon.assert.calledOnce(SearchPagination.prototype.getEndCursor);
    });
  });

  describe('#getEndCursor', function() {
    [1, 5, 8, 10, 15].forEach((first) => {
      const pagination = { first };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      it(`should return the correct cursor value when requesting ${first} records.`, async function() {
        const id = docs.length <= first ? docs[docs.length - 1].id : docs[first - 1].id;
        const cursor = JSON.stringify([1, id]);

        await expect(paginated.getEndCursor()).to.eventually.equal(cursor);
      });
    });
    it(`should return null when nothing could be found.`, async function() {
      const pagination = { first: 2 };
      const body = { query: { term: { name: 'baz' } } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      await expect(paginated.getEndCursor()).to.eventually.equal(null);
    });
    it('should only run once when called multiple times', async function() {
      const pagination = { first: 3 };
      const body = { query: { term: { name: 'foo' } } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      const r1 = await paginated.getEndCursor();
      const r2 = await paginated.getEndCursor();
      expect(r1).to.deep.equal(r2);
      sinon.assert.calledOnce(SearchPagination.prototype.getEdges);
    });
  });

  describe('#getEdges', function() {
    it('should return a natural list of documents.', async function() {
      const pagination = { first: 5 };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });

      const set = docs.slice(0, 5);
      const ids = set.map(doc => doc.id);
      const cursors = set.map(doc => JSON.stringify([1, doc.id]));

      const promise = await expect(paginated.getEdges()).to.eventually.be.an('array');
      const edges = await promise;
      expect(edges.map(edge => edge.node.id)).to.deep.equal(ids);
      expect(edges.map(edge => edge.cursor)).to.deep.equal(cursors);
    });
    it('should only run once when called multiple times', async function() {
      const pagination = { first: 3 };
      const body = { query: { term: { name: 'foo' } } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });
      const r1 = await paginated.getEdges();
      const r2 = await paginated.getEdges();
      expect(r1).to.deep.equal(r2);
      sinon.assert.calledOnce(client.search);
      sinon.assert.calledOnce(Model.find);
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
    it('should respect a different max limit option', function(done) {
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params }, { limit: { def: 2 } });

      const result = paginated.getSearchBody();
      expect(result.size).to.equal(2);
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

  describe('#getSearchParams', function() {
    it('should return the proper values.', function(done) {
      const pagination = { first: 5 };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });

      const expected = {
        index,
        type,
        body: {
          query: { match_all: {} },
          size: 5,
          sort: [
            { _score: 'desc' },
            { _id: 'asc' },
          ],
        }
      };

      expect(paginated.getSearchParams()).to.deep.equal(expected);
      done();
    });
    it('should called the `getSearchBody` method.', function(done) {
      const pagination = { first: 5 };
      const body = { query: { match_all: {} } };
      const params = { index, type, body }
      const paginated = new SearchPagination(Model, client, { params, pagination });

      paginated.getSearchParams();

      sinon.assert.called(SearchPagination.prototype.getSearchBody);
      done();
    });
  });
});
