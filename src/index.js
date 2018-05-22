const Pagination = require('./pagination');
const ElasticPagination = require('./elasticsearch/pagination');
const TypeAhead = require('./type-ahead');
const paginationResolvers = require('./resolvers');

module.exports = {
  Pagination,
  TypeAhead,
  ElasticPagination,
  paginationResolvers,
};
