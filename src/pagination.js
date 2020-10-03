const deepMerge = require('deepmerge');
const ObjectId = require("mongoose").Types.ObjectId;
const { getNestedValue } = require("./utils");

class Pagination {
  /**
   * Constructor.
   *
   * @param {Model} Model The Mongoose model to query against.
   * @param {object} params The criteria, pagination, and sort params.
   * @param {object} params.baseAggregationPipeline Base Aggregation Pipeline.
   * @param {object} params.pagination The pagination parameters.
   * @param {number} params.pagination.first The number of documents to return.
   *                                         Will default the the limit classes default.
   * @param {string} params.pagination.after The ID to start querying from.
   *                                         Should not be an obfuscated cursor value.
   * @param {object} params.sort The sort parameters
   * @param {string} params.sort.field The sort field name.
   * @param {string} params.sort.order The sort order. 1/-1.
   */
  constructor(Model, {
    baseAggregationPipeline = {},
    pagination = {},
    sort = {},
    filters = [],
    search = null,
  } = {}) {
    this.promises = {};

    // Set the Model to use for querying.
    this.Model = Model;

    // Set base aggregation pipeline.
    this.aggregationPipeline = baseAggregationPipeline;

    // Search programmatically later (Azure Cosmos DB compatibility).
    this.search = search;

    // Set after cursor.
    if (Boolean(pagination.after)) {
      this.aggregationPipeline.push({
        $match: {
          _id: { $gt: ObjectId(pagination.after) }
        }
      });
    }

    for (let filter of filters) {
      this.aggregationPipeline.push(
        {
          $match: {
            [ filter.field ]: filter.value
          },
        }
      );
    }

    // Set sorting.
    if (Boolean(sort.field) && Boolean(sort.order)) {
      this.aggregationPipeline.push(
        {
          $sort: {
            [sort.field]: sort.order
          }
        }
      );
    }

    // Set page limit (per page).
    this.perPage = pagination.first || 25;
    this.aggregationPipeline.push({
      $limit: this.perPage
    });
  }

  /**
   * Gets the total number of documents found.
   * Based on any initially set query criteria.
   *
   * @return {Promise}
   */
  getTotalCount() {
    const run = async () => {
      let aggregationPipelineNoPagination = this.aggregationPipeline.slice(0, -1).filter(item => !Boolean(getNestedValue(item, '$match._id.$gt')));
      if (Boolean(this.search)) {
        const results = await this.Model.aggregate(aggregationPipelineNoPagination);
        return this.find(results, this.search).length;
      }
      aggregationPipelineNoPagination.push({
        $count: "count"
      });
      const countResults = await this.Model.aggregate(aggregationPipelineNoPagination);
      const count = (countResults.length > 0) ? countResults[0]["count"] : 0;
      return count;
    };
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
      let docs = await this.Model.aggregate(this.aggregationPipeline);
      if (Boolean(this.search)) {
        docs = this.find(docs, this.search);
      }
      return docs.map(doc => ({ node: doc, cursor: doc._id }));
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
      let aggregationPipelineNoPerPage = this.aggregationPipeline.slice(0, -1);
      aggregationPipelineNoPerPage.push({
        $count: "count"
      });
      const countResults = await this.Model.aggregate(aggregationPipelineNoPerPage);
      const count = (countResults.length > 0) ? countResults[0]["count"] : 0;
      return count > this.perPage;
    };
    if (!this.promises.nextPage) {
      this.promises.nextPage = run();
    }
    return this.promises.nextPage;
  }

  /**
   *
   * Filter Mongoose results that contains specified string
   * @param results Mongoose results.
   * @param search  string to find (supports regex)
   *
   * @return Mongoose results
   */
  find(results, search) {
    let regex = new RegExp(search);

    results = results.filter(function(result) {
      for (let value of Object.values(result)) {
        if (regex.exec(value)) {
          return true;
        }
      }
      return false;
    });
    return results;
  }
}

module.exports = Pagination;
