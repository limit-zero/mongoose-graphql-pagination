const deepMerge = require('deepmerge');
const Limit = require('./limit');

class Pagination {
  /**
   * Constructor.
   *
   * @param {Model} Model The Mongoose model to query against.
   * @param {Client} client The Elasticsearch client.
   * @param {object} params
   * @param {object} params.params The Elasticsearch search parameters.
   * @param {object} params.pagination
   * @param {number} params.pagination.first The number of documents to return.
   * @param {string} params.pagination.after The sort to start querying from.
   *                                         Should be an unobfuscated, JSON
   *                                         stringified verson of the `search_after` value.
   * @param {object} options Additional options.
   * @param {object} options.limit Limit options. See the `Limit` class for more info.
   */
  constructor(Model, client, { params = {}, pagination = {} } = {}, options = {}) {
    this.promises = {};

    // Set the Model and Elastic client to use for querying.
    this.Model = Model;
    this.client = client;

    // Merge/clone the Elastic search params.
    this.params = deepMerge({}, params);

    // Set the limit and parse the after value.
    const { first, after } = pagination;
    this.first = new Limit(first, options.limit);
    this.after = after ? JSON.parse(after) : null;
  }

  /**
   * Gets the total number of documents found.
   *
   * @return {Promise}
   */
  getTotalCount() {
    const run = async () => {
      const { index, type, body } = this.params;
      const { count } = await this.client.count({ index, type, body });
      return count;
    };
    if (!this.promises.count) {
      this.promises.count = run();
    }
    return this.promises.count;
  }

  /**
   * Gets the document edges.
   * Ensures that each edge's cursor is the JSON stringified version of each
   * result's `sort` value.
   *
   * @return {Promise}
   */
  getEdges() {
    const run = async () => {
      const params = this.getSearchParams();
      const results = await this.client.search(params);

      const { hits } = results.hits;

      const mapped = hits.reduce((obj, hit) => ({
        ...obj,
        [hit._id]: {
          score: hit._score, // eslint-disable-line no-underscore-dangle
          sort: hit.sort,
        },
      }), {});
      const mapVal = (doc, prop) => mapped[doc._id.toString()][prop];

      const docs = await this.Model.find({ _id: { $in: Object.keys(mapped) } });
      const sorted = docs.sort((a, b) => mapVal(b, 'score') - mapVal(a, 'score'));
      return sorted.map(node => ({
        node,
        cursor: JSON.stringify(mapVal(node, 'sort')),
      }));
    };

    if (!this.promises.edge) {
      this.promises.edge = run();
    }
    return this.promises.edge;
  }

  /**
   * Gets the end cursor value of the current limit and sort.
   * In this case, the cursor will be a JSON stringified version
   * of the last result's `sort` value, non-obfuscated.
   *
   * @return {Promise}
   */
  getEndCursor() {
    const run = async () => {
      const edges = await this.getEdges();
      const last = edges[edges.length - 1];
      return last ? last.cursor : null;
    };
    if (!this.promises.endCursor) {
      this.promises.endCursor = run();
    }
    return this.promises.endCursor;
  }

  /**
   * Determines if another page is available.
   *
   * @return {Promise}
   */
  hasNextPage() {
    const run = async () => {
      const cursor = await this.getEndCursor();
      if (!cursor) return false;

      const after = JSON.parse(cursor);
      const body = this.getSearchBody();
      const params = this.getSearchParams();

      body.size = 1;
      body.search_after = after;

      const results = await this.client.search({ ...params, body });
      const { hits } = results.hits;
      if (hits.length) return true;
      return false;
    };

    if (!this.promises.nextPage) {
      this.promises.nextPage = run();
    }
    return this.promises.nextPage;
  }

  /**
   * @private
   * @return {object}
   */
  getSearchParams() {
    const body = this.getSearchBody();
    const params = {
      ...this.params,
      body,
    };
    return params;
  }

  /**
   * @private
   * @return {object}
   */
  getSearchBody() {
    const body = {
      ...this.params.body,
      size: this.first.value,
      sort: [
        { _score: 'desc' },
        { _id: 'asc' },
      ],
    };
    if (this.after) {
      body.search_after = this.after;
    }
    return body;
  }
}

module.exports = Pagination;
