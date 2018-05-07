# GraphQL Mongoose Cursor Pagination
Adds support for Relay-like cursor pagination with Mongoose models/documents.

## Install
`yarn add @limit0/mongoose-graphql-pagination`

## Usage
Pagination and type-ahead support are available via the `Pagination` and `TypeAhead` classes, respectively. Both classes should be considered, "single use," and should be instantiated once per query or request.

### Pagination
 To begin using, require the class
```js
const { Pagination } = require('@limit0/mongoose-graphql-pagination');
```
Use the class constructor to configure the settings for the paginated query.

#### constructor(Model, { criteria, pagination, sort }, options)
`*Model`: The Mongoose model instance to query. _Required._

`criteria`: A query criteria object to apply to the paginated query. Can be any MongoDB query. For example: `{ deleted: false }` or `{ age: { $gt: 30 } }`. Optional.

`pagination`: The pagination parameters object. Can accept a `first` and/or `after` property. The `first` value specifies the limit/page size. The `after` value specifies the cursor to start at when paginating. For example: `{ first: 50, after: 'some-cursor-value' }` would return the first 50 edges after the provided cursor. By default the results will be limited to 10 edges. Optional.

`sort`: Specifies the sort options. The `field` property specifies the field to sort by, and the order defines the direction. For example: `{ field: 'name', order: -1 }` would sort the edges by name, descending. By default the edges are sorted by ID, ascending. Optional.

`options`: Specifies additional configuration options, such as default limit, max limit, sort collation, and sort created field.

Complete example:
```js
const { Pagination } = require('@limit0/mongoose-graphql-pagination');
const YourModel = require('./your-model');

const paginated = new Pagination(YourModel, {
  { deleted: false },
  { first: 25 },
  { field: 'name', order: -1 },
})
```

Once the instance is created, use the methods listed below to access the paginated info.

#### getTotalCount()
Returns the total number of documents that match the query criteria, regardless of page size (limit).

#### getEdges()
Returns the edges (Mongoos document nodes) that match the query criteria. The results will be limited by the `first` value.

#### getEndCursor()
Returns the cursor value (non-obfuscated) of the last edge that matches the current criteria. This value will resolve to the Mongoose document ID, and can be converted into an obfuscated ID when returned by the GraphQL server. Will return `null` if no additional documents remain.

#### hasNextPage()
Determines if another page of edges is available, based on the current criteria.


### Type Ahead
Type ahead support is implemented using MongoDB regular expression queries. To begin using, require the class:
```js
const { TypeAhead } = require('@limit0/mongoose-graphql-pagination');
```
Use the class constructor to configure the settings for the type-ahead query.

#### constructor(field, term, criteria = {}, options = {})
`field`: The field to query/search against. For example: `name`. _Required._

`term`: The search term. Can/should be a partial phrase. _Required._

`criteria`: Additional MongoDB query criteria to apply when querying. For example `{ deleted: false }`. Optional.

`options`: The type-ahead configuration options object. Has three possible properties:
```js
{
  // Determines how the regex is constructed.
  // One of `starts-with`, `ends-with`, `exact-match` or `contains`.
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
