const deepMerge = require('deepmerge');

const { assign, keys } = Object;

class Sort {
  /**
   * Constructor.
   *
   * @param {string} field
   * @param {number} order
   * @param {object} options
   */
  constructor(field, order, options) {
    this.options = options;
    this.values = {};
    this.field = field;
    this.order = order;
  }

  /**
   * Sets the sort options.
   *
   * @param {object} [options={}]
   * @param {object} collation The MongoDB sort collation options.
   * @param {string} [createdField=createdAt] A field that signifies the model's created date.
   *                                          Defaults to `createdAt` as this is the default
   *                                          used by Mongoose when using `timestamps: true`.
   */
  set options({ collation, createdField = 'createdAt' } = {}) {
    this.opts = { createdField };
    this.collation = collation;
  }

  /**
   * Gets the sort options.
   * Will clone the object, so changing the returning values
   * will not effect the internal options.
   *
   * @return {object}
   */
  get options() {
    return deepMerge({}, this.opts);
  }

  /**
   * Gets the sort value object, for use with MongoDB sorting.
   *
   * @return {object}
   */
  get value() {
    const { field, order } = this;
    const sort = { [field]: order };
    if (field !== '_id') sort._id = order;
    return sort;
  }

  /**
   * Gets the sort value as an object, but reversed.
   *
   * @return {object}
   */
  get valueReversed() {
    const { value } = this;
    return keys(value).reduce((obj, key) => assign(obj, { [key]: value[key] === 1 ? -1 : 1 }), {});
  }

  /**
   * Sets the sort field name.
   * If not provided, it will default to `id` and, ultimately `_id`.
   * If a `createdField` was set as an option, and the `field` matches this,
   * the value will also resolve to the `_id` field.
   *
   * @param {string} field
   */
  set field(field) {
    const toResolve = field || 'id';
    const { resolveToId } = this;
    this.values.field = toResolve && !resolveToId.includes(toResolve) ? toResolve : '_id';
  }

  /**
   * Gets the sort field name.
   *
   * @return {string}
   */
  get field() {
    return this.values.field;
  }

  /**
   * Sets the sort order direction.
   *
   * @param {number} order
   */
  set order(order) {
    if (order === 'asc') {
      this.values.order = 1;
    } else if (order === 'desc') {
      this.values.order = -1;
    } else {
      this.values.order = parseInt(order, 10) === -1 ? -1 : 1;
    }
  }

  /**
   * Gets the sort order/direction (e.g. 1 or -1).
   *
   * @return {number}
   */
  get order() {
    return this.values.order;
  }

  /**
   * Sets the MongoDB collation options.
   * By default, will set `locale` to en_US.
   *
   * @see https://docs.mongodb.com/manual/reference/collation/
   * @param {object} options The collation options.
   */
  set collation(options) {
    const defaults = { locale: 'en_US' };
    this.opts.collation = assign({}, defaults, options);
  }

  /**
   * Returns the MongoDB collation options.
   *
   * @return {object}
   */
  get collation() {
    return this.options.collation;
  }

  /**
   * Determines which model fields should resolve to the primary `_id`.
   * If a `createdField` was specified, this field will also resolve to the id.
   *
   * @return {string[]}
   */
  get resolveToId() {
    const resolveToId = ['id', '_id'];
    const { createdField } = this.opts;
    if (createdField) resolveToId.push(createdField);
    return resolveToId;
  }
}

module.exports = Sort;
