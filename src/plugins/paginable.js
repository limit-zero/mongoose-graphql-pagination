const Pagination = require('../pagination');

module.exports = function paginable(schema) {
  // eslint-disable-next-line no-param-reassign
  schema.statics.paginate = function paginate({ criteria, pagination, sort } = {}) {
    return new Pagination(this, { criteria, pagination, sort });
  };
};
