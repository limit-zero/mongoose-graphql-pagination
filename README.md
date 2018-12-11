# GraphQL Mongoose Cursor Pagination with Elasticsearch Support
Adds support for Relay-like cursor pagination with Mongoose models/documents. This library also provides type-ahead (autocomplete) functionality (with pagination) using MongoDB regular expression queries. In addition, you can optionally paginate hydrated Mongoose models from Elasticsearch.

## Install
`yarn add @limit0/mongoose-graphql-pagination`


## Usage
Pagination, type-ahead, and Elastic+Mongoose pagination support are available via the `Pagination`, `TypeAhead` and `SearchPagination` classes, respectively. **All classes should be considered, "single use," and should be instantiated once per query or request.**

### Pagination
Returns paginated results from MongoDB for the provided Mongoose model.

 To begin using, require the class
```js
const { Pagination } = require('@limit0/mongoose-graphql-pagination');
```
Use the class constructor to configure the settings for the paginated query.

#### constructor(Model, { criteria = {}, pagination = {}, sort = {}, projection }, options = {})
`Model`: The Mongoose model instance to query. _Required._

`criteria`: A query criteria object to apply to the paginated query. Can be any MongoDB query. For example: `{ deleted: false }` or `{ age: { $gt: 30 } }`. The criteria will be deeply merged, but will ignore "special" objects such as `ObjectId` and, by default, will only merge "plain objects." Optional.

`pagination`: The pagination parameters object. Can accept a `first` and/or `after` property. The `first` value specifies the limit/page size. The `after` value specifies the cursor to start at when paginating. For example: `{ first: 50, after: 'some-cursor-value' }` would return the first 50 edges after the provided cursor. By default the results will be limited to 10 edges. Optional.

`sort`: Specifies the sort options. The `field` property specifies the field to sort by, and the order defines the direction. For example: `{ field: 'name', order: -1 }` would sort the edges by name, descending. By default the edges are sorted by ID, ascending. Optional.

`projection`: Specifies the fields to return from the database. For example: `{ field: 1 }` or `{ field: 0 }` would include or exclude the specified field, respectively. If left `undefined`, or as an empty object, all fields will be returned (which is the default behavior). Optional.

`options`: Specifies additional configuration options, such as default limit, max limit, sort collation, object merge options, and sort created field.

Complete example:
```js
const { Pagination } = require('@limit0/mongoose-graphql-pagination');
const YourModel = require('./your-model');

const paginated = new Pagination(YourModel, {
  criteria: { deleted: false },
  pagination: { first: 25 },
  sort: { field: 'name', order: -1 },
});
// Retrieve the edges...
const edges = paginated.getEdges();
```

Once the instance is created, use the methods listed below to access the paginated info.

#### getTotalCount()
Returns the total number of documents that match the query criteria, regardless of page size (limit).

#### getEdges()
Returns the edges (Mongoose document nodes) that match the query criteria. The results will be limited by the `first` value.

#### getEndCursor()
Returns the cursor value (non-obfuscated) of the last edge that matches the current criteria. This value will resolve to the Mongoose document ID, and can be converted into an obfuscated ID when returned by the GraphQL server. Will return `null` if no results were found.

#### hasNextPage()
Determines if another page of edges is available, based on the current criteria.

### Type-Ahead (Auto Complete)
Type ahead support is implemented using MongoDB regular expression queries. To begin using, require the class:
```js
const { TypeAhead } = require('@limit0/mongoose-graphql-pagination');
```
Use the class constructor to configure the settings for the type-ahead query.

#### constructor(field, term, criteria = {}, options = {})
`field`: The field to query/search against. For example: `name`. _Required._

`term`: The search term. Can/should be a partial phrase. _Required._

`criteria`: Additional MongoDB query criteria to apply when querying. For example `{ deleted: false }`. The criteria will be deeply merged, but will ignore "special" objects such as `ObjectId` and, by default, will only merge "plain objects." Optional.

`options`: The type-ahead configuration options object. Has three type-ahead related properties:
```js
{
  // Determines how the regex is constructed.
  // Can either be `starts-with`, `ends-with`, `exact-match` or `contains`.
  // Defaults to `contains`.
  position: 'contains',
  // Whether to escape regex special characters.
  // Defaults to `true`.
  escape: true,
  // Whether to treat the regex query as case sensitive.
  // Defaults to `false`.
  caseSensitive: false,
}
```
In addition, the `options` will also accept the optional `mergeOptions` object property htat can be used to override the default merge rules.

#### paginate(Model, pagination = {}, options = {})
Creates a `Pagination` instance using the constructed `TypeAhead` options.

#### buildCriteria()
Returns the MongoDB criteria that can be used for querying the database. Generally, this will not be used and, instead, should be indirectly accessed via the `paginate` method.

Complete example:
```js
const { TypeAhead } = require('@limit0/mongoose-graphql-pagination');
const YourModel = require('./your-model');

const typeahead = new TypeAhead('name', 'foo', {
  deleted: false,
}, {
  position: 'starts-with',
});
const paginated = typeahead.paginate(YourModel, { first: 25 });
// Retrieve the edges...
const edges = paginated.getEdges();
```

### Search Pagination
Returns paginated and hydrated Mongoose/MongoDB results from Elasticsearch. This assumes that you are, in some fashion, saving _some_ data for a specific Mongoose model within Elasticsearch, as this will attempt to convert the Elastic results back into Mongoose documents from MongoDB. This also assumes that the `_id` value of the indexed document in Elasticsearch matches the `_id` value that is stored in MongoDB.

 To begin using, require the class
```js
const { SearchPagination } = require('@limit0/mongoose-graphql-pagination');
```
Use the class constructor to configure the settings for the paginated query.

#### constructor(Model, client, { params = {}, pagination = {} })
`Model`: The Mongoose model instance to use for re-querying MongoDB to hydrate the Elasticsearch results. _Required._

`client`: The Elasticsearch client instance created from the `elasticsearch` Node/JS API library. _Required._

`params`: The elastic [search parameters](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search) that will be sent to `client.search`. For example: `{ index: 'some-index', type: 'some-type', body: { query: { match_all: {} } } }` _Required_.

`pagination`: The pagination parameters object. Can accept a `first` and/or `after` property. The `first` value specifies the limit/page size. The `after` value specifies the cursor to start at when paginating. For example: `{ first: 50, after: 'some-cursor-value' }` would return the first 50 edges after the provided cursor. By default the results will be limited to 10 edges. Optional.

Complete example:
```js
const { SearchPagination } = require('@limit0/mongoose-graphql-pagination');
const elasticClient = require('./your-elasticsearch-client');
const YourModel = require('./your-model');

const params = {
  index: 'your-index',
  type: 'your-type',
  body: {
    query: { match_all: {} },
  },
};
const pagination = { first: 25 };

const paginated = new SearchPagination(YourModel, elasticClient, { params, pagination });
// Retrieve the edges...
const edges = paginated.getEdges();
```

Once the instance is created, use the methods listed below to access the paginated info.

#### getTotalCount()
Returns the total number of documents that match the search criteria, regardless of page size (limit).

#### getEdges()
Returns the edges (hydrated Mongoose document nodes from Elasticsearch hits) that match the search criteria. The results will be limited by the `first` value.

#### getEndCursor()
Returns the cursor value (non-obfuscated) of the last edge that matches the current criteria. This value will resolve to a JSON stringified version of the Elasticsearch `sort` value, and can be converted into an obfuscated ID when returned by the GraphQL server. Will return `null` if no results were found.

#### hasNextPage()
Determines if another page of edges is available, based on the current criteria.

### Pagination Resolvers
Finally, the `paginationResolvers` provide helper functions for using Pagination with a GraphQL server such as Apollo.

For example, if you had a GraphQL definition similar to this:
```graphql
scalar Cursor

type Query {
  allContacts(pagination: PaginationInput = {}, sort: ContactSortInput = {}): ContactConnection!
  searchContacts(pagination: PaginationInput = {}, phrase: String!): ContactConnection!
}

type ContactConnection {
  totalCount: Int!
  edges: [ContactEdge]!
  pageInfo: PageInfo!
}

type ContactEdge {
  node: Contact!
  cursor: Cursor!
}

type Contact {
  id: String!
  name: String!
  email: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: Cursor
}

input PaginationInput {
  first: Int! = 25
  after: Cursor
}

input ContactSortInput {
  field: ContactSortField! = createdAt
  order: Int! = -1
}

enum ContactSortField {
  name
  createdAt
  updatedAt
}
```

The following resolvers could be applied:
```js
const { CursorType } = require('@limit0/graphql-custom-types');
const { Pagination, paginationResolvers, SearchPagination } = require('@limit0/mongoose-graphql-pagination');

const elasticClient = require('./path-to/elasticsearch-client');
const Contact = require('./path-to/contact-model');

module.exports = {
  // The cursor type.
  // Will obfuscate the MongoID for `Pagination` and the Elastic sort value for `SearchPagination`
  Cursor: CursorType,

  // Apply the pagination resolvers for the connection.
  ContactConnection: paginationResolvers.connection,

  Query: {
    /**
     * Use pagination on the query.
     * Will query MongoDB via Mongoose for the provided model.
     */
    allContacts: (root, { pagination, sort }) => new Pagination(Contact, { pagination, sort }, {
      // Informs the sort that the `createdAt` field specifies a created date.
      // Will instead use the document ID when sorting.
      sort: { createdField: 'createdAt' },
    }),

    /**
     * Use search pagination on the query.
     * Will query Elasticsearch and then hydrate the results from
     * MongoDB (via Mongoose) for the provided model.
     */
    searchContacts: (root, { pagination, phrase }) => {
      // Set the parameters for the elastic client `search` method.
      // @see https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search
      const params = {
        index: 'index-where-contacts-exist',
        type: 'type-where-contacts-exist',
        body: { query: { match: { name: phrase } } },
      };
      return new SearchPagination(Contact, elasticClient, { params, pagination });
    }),
  },
};
```
