var FistFunction = new Class({
  initialize: function(fn) {
    this._fn = fn;
    this._type = null;
    this._description = null;
  },
  call: function(context, args) {
    return this._fn.call(context, args);
  },
  type: function(type) {
    if (type === undefined) {
      return this._type;
    }
    this._type = type;
    return this;
  },
  describe: function(description) {
    if (description === undefined) {
      return this._description;
    }
    this._description = description;
    return this;
  }
});
