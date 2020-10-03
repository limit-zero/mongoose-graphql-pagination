function getNestedValue(obj, key) {
  return key.split(".").reduce(function(o, x) {
      return (typeof o == "undefined" || o === null) ? o : o[x];
  }, obj);
}

module.exports = { getNestedValue };
