module.exports = {
  connection: {
    totalCount: paginated => paginated.getTotalCount(),
    edges: paginated => paginated.getEdges(),
    pageInfo: paginated => ({
      hasNextPage: () => paginated.hasNextPage(),
      endCursor: () => paginated.getEndCursor(),
    }),
  },
  // This is here for BC.
  // Previously, the paginated instance did _not_ return
  // an array of node+cursor object. Now it does, as Mongo and Elastic
  // each need to return different cursor values.
  edge: edge => edge,
};
