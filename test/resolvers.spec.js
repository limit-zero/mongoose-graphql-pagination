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
    await Model.deleteMany({});
  });
  describe('.connection', function() {
    const { connection } = resolvers;
    describe('#totalCount', function() {
      it('should return the total count.', async function() {
        await expect(connection.totalCount(paginated)).to.eventually.equal(1);
      });
    });
    describe('#edges', function() {
      it('should return the proper edges.', async function() {
        const promise = connection.edges(paginated);
        await expect(promise).to.eventually.be.an('array').with.property('length', 1);
        const edges = await promise;
        expect(edges[0].node.id).to.deep.equal(model.id);
      });
    });
    describe('#pageInfo', function() {
      it('should return the cursor and next page functions.', async function() {
        const fns = connection.pageInfo(paginated);
        await expect(fns.hasNextPage()).to.eventually.be.false;
        await expect(fns.endCursor()).to.eventually.equal(model.id);
      });
    });
  });
  describe('.edge', function() {
    const { edge } = resolvers;
    it('should be a function that returns whatever is passed to it.', function(done) {
      expect(edge).to.be.a('function');
      expect(edge('foo')).to.equal('foo');
      done();
    });
  });
});
