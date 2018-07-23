require('../connection');
const Model = require('../mongoose/model');
const Pagination = require('../../src/pagination');
const sandbox = sinon.createSandbox();

describe('plugins/paginable', function() {
  describe('#paginate', function() {

    it('should return a Pagination instance.', async function() {
      expect(Model.paginate()).to.be.an.instanceOf(Pagination);
    });

    it('should pass the appropriate `Model` to the instance.', async function() {
      const paginated = Model.paginate();
      expect(paginated.Model.modelName).to.equal(Model.modelName);
    });

    it('should pass the appropriate `criteria` values to the instance.', async function() {
      const criteria = { foo: 'bar' };
      const paginated = Model.paginate({ criteria });
      expect(paginated.criteria).to.deep.equal(criteria);
    });

    it('should pass the appropriate `pagination` values to the instance.', async function() {
      const pagination = { first: 5, after: '1234' };
      const paginated = Model.paginate({ pagination });
      expect(paginated.first.value).to.equal(5);
      expect(paginated.after).to.equal('1234');
    });

    it('should pass the appropriate `sort` values to the instance.', async function() {
      const sort = { field: 'name', order: 'asc' };
      const paginated = Model.paginate({ sort });
      expect(paginated.sort.field).to.equal('name');
      expect(paginated.sort.order).to.equal(1);
    });
  });
});
