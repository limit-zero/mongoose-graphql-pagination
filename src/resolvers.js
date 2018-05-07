module.exports = {
  connection: {
    totalCount: paginated => paginated.getTotalCount(),
    edges: paginated => paginated.getEdges(),
    pageInfo: paginated => ({
      hasNextPage: () => paginated.hasNextPage(),
      endCursor: () => paginated.getEndCursor(),
    }),
  },
  edge: {
    node: document => document,
    cursor: document => document.id,
  },
};
