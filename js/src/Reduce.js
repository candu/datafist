var Reduce = {
  _count: function(xs) {
    return xs.length;
  },
  _sum: function(xs) {
    var x = 0;
    for (var i = 0; i < xs.length; i++) {
      x += xs[i];
    }
    return x;
  },
  _average: function(xs) {
    return this._sum(xs) / this._count(xs);
  },
  get: function(reduce) {
    var fn = this['_' + reduce].bind(this);
    if (fn === undefined) {
      throw new Error('unrecognized reduce operation: ' + args.reduce);
    }
    return fn;
  }
};
