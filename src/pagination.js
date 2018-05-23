const deepMerge = require('deepmerge');
const Sort = require('./sort');
const Limit = require('./limit');

class Pagination {
  /**
   * Constructor.
   *
   * @param {Model} Model The Mongoose model to query against.
   * @param {object} params The criteria, pagination, and sort params.
   * @param {object} params.criteria Query criteria to apply to the paginated query.
   * @param {object} params.pagination The pagination parameters.
   * @param {number} params.pagination.first The number of documents to return.
   *                                         Will default the the limit classes default.
   * @param {string} params.pagination.after The ID to start querying from.
   *                                         Should not be an obfuscated cursor value.
   * @param {object} params.sort The sort parameters
   * @param {string} params.sort.field The sort field name.
   * @param {string} params.sort.order The sort order. Either 1/-1 or asc/desc.
   * @param {object} options Additional sort and limit options. See the corresponding classes.
   */
  constructor(Model, { criteria = {}, pagination = {}, sort = {} } = {}, options = {}) {
    this.promises = {};

    // Set the Model to use for querying.
    this.Model = Model;

    // Set/merge any query criteria.
    this.criteria = deepMerge({}, criteria);

    // Set the limit and after cursor.
    const { first, after } = pagination;
    this.first = new Limit(first, options.limit);
    this.after = after;

    // Set the sort criteria.
    const { field, order } = sort;
    this.sort = new Sort(field, order, options.sort);
  }

  /**
   * Gets the total number of documents found.
   * Based on any initially set query criteria.
   *
   * @return {Promise}
   */
  getTotalCount() {
    const run = () => this.Model
      .find(this.criteria)
      .comment(this.createComment('getTotalCount')).count();

    if (!this.promises.count) {
      this.promises.count = run();
    }
    return this.promises.count;
  }

  /**
   * Gets the document edges for the current limit and sort.
   *
   * @return {Promise}
   */
  getEdges() {
    const run = async () => {
      const criteria = await this.getQueryCriteria();
      const docs = await this.Model.find(criteria)
        .sort(this.sort.value)
        .limit(this.first.value)
        .collation(this.sort.collation)
        .comment(this.createComment('getEdges'));
      return docs.map(doc => ({ node: doc, cursor: doc.id }));
    };
    if (!this.promises.edge) {
      this.promises.edge = run();
    }
    return this.promises.edge;
  }

  /**
   * Gets the end cursor value of the current limit and sort.
   * In this case, the cursor will be the document id, non-obfuscated.
   *
   * @return {Promise}
   */
  getEndCursor() {
    const run = async () => {
      const edges = await this.getEdges();
      if (!edges.length) return null;
      return edges[edges.length - 1].cursor;
    };
    if (!this.promises.cursor) {
      this.promises.cursor = run();
    }
    return this.promises.cursor;
  }

  /**
   * Determines if another page is available.
   *
   * @return {Promise}
   */
  async hasNextPage() {
    const run = async () => {
      const criteria = await this.getQueryCriteria();
      const count = await this.Model.find(criteria)
        .select({ _id: 1 })
        .skip(this.first.value)
        .limit(1)
        .sort(this.sort.value)
        .collation(this.sort.collation)
        .comment(this.createComment('hasNextPage'))
        .count();
      return Boolean(count);
    };
    if (!this.promises.nextPage) {
      this.promises.nextPage = run();
    }
    return this.promises.nextPage;
  }

  /**
   * @private
   * @param {string} id
   * @param {object} fields
   * @return {Promise}
   */
  findCursorModel(id, fields) {
    const run = async () => {
      const doc = await this.Model.findOne({ _id: id })
        .select(fields)
        .comment(this.createComment('findCursorModel'));
      if (!doc) throw new Error(`No record found for ID '${id}'`);
      return doc;
    };
    if (!this.promises.model) {
      this.promises.model = run();
    }
    return this.promises.model;
  }

  /**
   * @private
   * @return {Promise}
   */
  getQueryCriteria() {
    const run = async () => {
      const { field, order } = this.sort;

      const filter = deepMerge({}, this.criteria);
      const limits = {};
      const ors = [];

      if (this.after) {
        let doc;
        const op = order === 1 ? '$gt' : '$lt';
        if (field === '_id') {
          // Sort by ID only.
          doc = await this.findCursorModel(this.after, { _id: 1 });
          filter._id = { [op]: doc.id };
        } else {
          doc = await this.findCursorModel(this.after, { [field]: 1 });
          limits[op] = doc[field];
          ors.push({
            [field]: doc[field],
            _id: { [op]: doc.id },
          });
          filter.$or = [{ [field]: limits }, ...ors];
        }
      }
      return filter;
    };

    if (!this.promises.criteria) {
      this.promises.criteria = run();
    }
    return this.promises.criteria;
  }

  /**
   * @private
   * @param {string} method
   * @return {string}
   */
  createComment(method) {
    return `Pagination: ${this.Model.modelName} - ${method}`;
  }
}

module.exports = Pagination;
