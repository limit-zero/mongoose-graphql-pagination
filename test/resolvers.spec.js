require('./connection');
const Model = require('./mongoose/model');
const Pagination = require('../src/pagination');
const resolvers = require('../src/resolvers');

describe('resolvers', function() {
  const paginated = new Pagination(Model);
  let model;
  before(async function() {
    model = await (new Model({ name: 'foo', deleted: false })).save();
  });
  after(async function() {
    await Model.remove();
  });
  describe('.connection', function() {
    const { connection } = resolvers;
    describe('#totalCount', function() {
      it('should return the total count.', async function() {
        await expect(connection.totalCount(paginated)).to.eventually.equal(1);
      });
    });
    describe('#edges', function() {
      it('should return an array with the doc.', async function() {
        const promise = connection.edges(paginated);
        await expect(promise).to.eventually.be.an('array').with.property('length', 1);
        const edges = await promise;
        expect(edges[0].id).to.equal(model.id);
      });
    });
    describe('#pageInfo', function() {
      it('should return the cursor and next page functions.', async function() {
        const fns = connection.pageInfo(paginated);
        await expect(fns.hasNextPage()).to.eventually.be.false;
        await expect(fns.endCursor()).to.eventually.be.null;
      });
    });
  });
  describe('.edge', function() {
    const { edge } = resolvers;
    describe('#node', function() {
      it('should return the document.', async function() {
        await expect(edge.node(model)).to.deep.equal(model);
      });
    });
    describe('#cursor', function() {
      it('should return the document id.', async function() {
        await expect(edge.cursor(model)).to.equal(model.id);
      });
    });
  });
});
