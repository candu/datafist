var _unaryOp = function(a, op) {
  if (typeOf(a) === 'number') {
    return op(a);
  }
  return {
    at: function(t) {
      return op(a.at(t));
    },
    iter: a.iter
  };
};

var _binaryOp = function(a, b, op) {
  if (typeOf(a) === 'number') {
    if (typeOf(b) === 'number') {
      return op(a, b);
    }
    return {
      at: function(t) {
        return op(a, b.at(t));
      },
      iter: b.iter
    };
  }
  if (typeOf(b) === 'number') {
    return {
      at: function(t) {
        return op(a.at(t), b);
      },
      iter: a.iter
    };
  }
  return {
    at: function(t) {
      return op(a.at(t), b.at(t));
    },
    iter: function() {
      return MergeIterator(args.map(function(c) { return c.iter(); }));
    }
  };
};

var OpsArith = {
  __exports: [
    ['add', '+'],
    ['subtract', '-'],
    ['multiply', '*'],
    ['divideFloat', '/'],
    ['divideInt', '//'],
    ['mod', '%'],
    ['bucket', '//*']
  ],
  add: function(args) {
    argCheck('+', args, '(* (| number channel))');
    var channels = [],
        numberSum = 0;
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      var argType = typeOf(arg);
      if (argType === 'number') {
        numberSum += arg;
      } else {
        channels.push(arg);
      }
    }
    if (channels.length === 0) {
      return numberSum;
    }
    return {
      at: function(t) {
        var total = numberSum;
        for (var i = 0; i < channels.length; i++) {
          total += channels[i].at(t);
        }
        return total;
      },
      iter: function() {
        return MergeIterator(channels.map(function(c) { return c.iter(); }));
      }
    };
  },
  multiply: function(args) {
    argCheck('*', args, '(* (| number channel))');
    var channels = [],
        numberProd = 1;
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      var argType = typeOf(arg);
      if (argType === 'number') {
        numberProd *= arg;
      } else {
        channels.push(arg);
      }
    }
    if (channels.length === 0) {
      return numberProd;
    }
    return {
      at: function(t) {
        var total = numberProd;
        for (var i = 0; i < channels.length; i++) {
          total *= channels[i].at(t);
        }
        return total;
      },
      iter: function() {
        return MergeIterator(channels.map(function(c) { return c.iter(); }));
      }
    };
  },
  subtract: function(args) {
    argCheck('-', args, '(+ (| number channel) (? (| number channel)))');
    argTypes = args.map(typeOf);
    if (args.length === 1) {
      return _unaryOp(args[0], function(a) {
        return -a;
      });
    }
    return _binaryOp(args[0], args[1], function(a, b) {
      return a - b;
    });
  },
  divideFloat: function(args) {
    argCheck('/', args, '(+ (| number channel) (| number channel))');
    return _binaryOp(args[0], args[1], function(a, b) {
      return a / b;
    });
  },
  divideInt: function(args) {
    argCheck('//', args, '(+ (| number channel) (| number channel))');
    return _binaryOp(args[0], args[1], function(a, b) {
      return Math.floor(a / b);
    });
  },
  mod: function(args) {
    argCheck('%', args, '(+ (| number channel) number)');
    return _binaryOp(args[0], args[1], function(a, b) {
      return a % b;
    });
  },
  bucket: function(args) {
    argCheck('//*', args, '(+ (| number channel) number)');
    return _binaryOp(args[0], args[1], function(a, b) {
      return Math.floor(a / b) * b;
    });
  }
};

var OpsMath = {
  sqrt: function(args) {
    argCheck('sqrt', args, '(| number channel)');
    return _unaryOp(args[0], function(a) {
      return Math.sqrt(a);
    });
  },
  pow: function(args) {
    argCheck('pow', args, '(+ (| number channel) number)');
    return _binaryOp(args[0], function(a, b) {
      return Math.pow(a, b);
    });
  },
  exp: function(args) {
    argCheck('exp', args, '(+ (? number) (| number channel))');
    if (args.length === 1) {
      return _unaryOp(args[0], function(a) {
        return Math.exp(a);
      });
    }
    return _binaryOp(args[0], args[1], function(a, b) {
      return Math.pow(a, b);
    });
  },
  log: function(args) {
    argCheck('log', args, '(+ (| number channel), (? number))');
    if (args.length === 1) {
      return _unaryOp(args[0], function(a) {
        return Math.log(a);
      });
    }
    return _binaryOp(args[0], args[1], function(a, b) {
      return Math.log(a) / Math.log(b);
    });
  },
  floor: function(args) {
    argCheck('floor', args, '(| number channel)');
    return _unaryOp(args[0], function(a) {
      return Math.floor(a);
    });
  },
  round: function(args) {
    argCheck('round', args, '(| number channel)');
    return _unaryOp(args[0], function(a) {
      return Math.round(a);
    });
  },
  ceil: function(args) {
    argCheck('ceil', args, '(| number channel)');
    return _unaryOp(args[0], function(a) {
      return Math.ceil(a);
    });
  },
};

var OpsString = {};

var OpsChannel = {
  __exports: [
    ['timeShift', 'time-shift']
  ],
  timeShift: function(args) {
    argCheck('time-shift', '(+ channel number)');
    return {
      at: function(t) {
        return args[0].at(t - args[1]);
      },
      iter: function() {
        var _iter = args[0].iter();
        return {
          next: function() {
            return _iter.next() + args[1];
          },
          peek: function() {
            return _iter.peek() + args[1];
          }
        };
      }
    };
  }
};

var OpsFilterComparison = {};
var OpsFilterTime = {};
var OpsFilterLocation = {};
var OpsFilterRegion = {};

var OpsReduce = {};

var GensData = {
  constant: function(args) {
    argCheck('constant', args, 'any');
    return function(t) {
      return args[0];
    };
  },
  choice: function(args) {
    return function(t) {
      return Random.choice(args);
    };
  },
  uniform: function(args) {
    argCheck('uniform', args, '(+ number number)');
    return function(t) {
      return Random.uniform(args[0], args[1]);
    };
  },
  gaussian: function(args) {
    argCheck('gaussian', args, '(+ number number)');
    return function(t) {
      return args[0] + args[1] * Random.gaussian();
    };
  }
};
var GensChannel = {
  __exports: [
    ['genRegular', 'gen-regular'],
    ['genUniform', 'gen-uniform'],
    ['genPoisson', 'gen-poisson']
  ],
  genRegular: function(args) {
    argCheck('gen-regular', args, '(+ number number number)');
    return function(subargs) {
      argCheck('gen-regular-fn', subargs, 'function');
      var _gen = subargs[0],
          _since = args[0],
          _until = args[1],
          _n = args[2],
          _dt = (_until - _since) / _n,
          _t = _since,
          _data = [];
      for (var i = 0; i < _n; i++) {
        _data.push({t: _t, x: _gen(_t)});
        _t += _dt;
      }
      return new DataChannel(_data);
    }
  },
  genUniform: function(args) {
    argCheck('gen-uniform', args, '(+ number number number)');
    return function(subargs) {
      argCheck('gen-uniform-fn', subargs, 'function');
      var _gen = subargs[0],
          _since = args[0],
          _until = args[1],
          _n = args[2],
          _dts = Random.combination(_until - _since, _n),
          _data = [];
      for (var i = 0; i < _n; i++) {
        var _t = _since + _dts[i];
        _data.push({t: _t, x: _gen(_t)});
      }
      return new DataChannel(_data);
    }
  },
  genPoisson: function(args) {
    argCheck('gen-poisson', args, '(+ function number number number)');
    return function(subargs) {
      argCheck('gen-poisson-fn', subargs, 'function');
      var _gen = subargs[0],
          _since = args[0],
          _until = args[1],
          _rate = args[2],    // average wait (ms)
          _data = [],
          _t = _since;
      while (_t < _until) {
        _data.push({t: _t, x: _gen(_t)});
        var _x = Math.max(1e-12, Math.random());
        var _dt = Math.max(1, Math.round(_rate * -Math.log(_x)));
        _t += _dt;
      }
      return new DataChannel(_data);
    };
  }
};

var View = {
  __exports: [
    ['viewChannel', 'view-channel'],
  ],
  viewChannel: function(args) {
    argCheck('view-channel', args, '(* channel)');
    this._viewInvoked('channel', args);
  }
};

var Display = {};

var LibFist = {
  import: function(fist) {
    fist.importModule(null, OpsArith);
    fist.importModule(null, OpsMath);
    fist.importModule(null, OpsString);
    fist.importModule(null, OpsChannel);

    fist.importModule(null, OpsFilterComparison);
    fist.importModule(null, OpsFilterTime);
    fist.importModule(null, OpsFilterLocation);
    fist.importModule(null, OpsFilterRegion);

    fist.importModule(null, OpsReduce);

    fist.importModule(null, GensData);
    fist.importModule(null, GensChannel);

    fist.importModule(null, View);
  }
};
