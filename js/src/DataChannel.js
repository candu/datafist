var DataChannel = new Class({
  initialize: function(data, source) {
    this._data = Array.clone(data);
    this._data.sort(function(a, b) { return a.t - b.t; });
    this._index = {};
    for (var i = 0; i < this._data.length; i++) {
      this._index[this._data[i].t] = this._data[i].x;
    }
    this._source = source || 'Fist command line';
    // TODO: maybe identify type when channel is created?
    var dataType = NumberType;
    if (this._data.length > 0) {
      dataType = Type.fromValue(this._data[0].x);
    }
    this._type = ChannelType(dataType);
  },
  at: function(t) {
    if (!this._index.hasOwnProperty(t)) {
      return 0;
    }
    return this._index[t];
  },
  iter: function() {
    return new Iterator(this._data.map(function(a) {
      return a.t;
    }));
  },
  type: function() {
    return this._type;
  },
  describe: function() {
    return 'imported from ' + this._source;
  }
});
