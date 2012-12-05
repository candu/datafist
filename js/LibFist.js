var _unaryOp = function(a, op) {
  if (typeOf(a) === 'number') {
    return op(a);
  }
  return {
    at: function(t) {
      return op(a.at(t));
    },
    iter: function() {
      return a.iter();
    }
  };
};

var _filterOp = function(a, p) {
  return {
    at: function(t) {
      if (p(t)) {
        return a.at(t);
      }
      // TODO: deal with non-numeric values
      return 0;
    },
    iter: function() {
      return FilterIterator(a.iter(), p);
    }
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
      iter: function() {
        return b.iter();
      }
    };
  }
  if (typeOf(b) === 'number') {
    return {
      at: function(t) {
        return op(a.at(t), b);
      },
      iter: function() {
        return a.iter();
      }
    };
  }
  return {
    at: function(t) {
      return op(a.at(t), b.at(t));
    },
    iter: function() {
      return UnionIterator([a.iter(), b.iter()]);
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
  __fullName: 'Arithmetic Operators',
  add: new FistFunction(function(args) {
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
        return UnionIterator(channels.map(function(c) { return c.iter(); }));
      }
    };
  }).signature('(+ number)', 'number')
    .signature('(+ (| number channel))', 'channel')
    .describe('Takes the sum of its parameters.'),
  multiply: new FistFunction(function(args) {
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
        return UnionIterator(channels.map(function(c) { return c.iter(); }));
      }
    };
  }).signature('(+ number)', 'number')
    .signature('(+ (| number channel))', 'channel')
    .describe('Takes the product of its parameters.'),
  subtract: new FistFunction(function(args) {
    argTypes = args.map(typeOf);
    if (args.length === 1) {
      return _unaryOp(args[0], function(a) {
        return -a;
      });
    }
    return _binaryOp(args[0], args[1], function(a, b) {
      return a - b;
    });
  }).signature('number', 'number')
    .signature('channel', 'channel')
    .signature('(-> number number)', 'number')
    .signature('(-> (| number channel) (| number channel))', 'channel')
    .describe(
      'With one parameter, negates that parameter. ' +
      'With two parameters, subtracts the second parameter from the first.'
    ),
  divideFloat: new FistFunction(function(args) {
    return _binaryOp(args[0], args[1], function(a, b) {
      return a / b;
    })
  }).signature('(-> number number)', 'number')
    .signature('(-> (| number channel) (| number channel))', 'channel')
    .describe('Divides the first parameter by the second.'),
  divideInt: new FistFunction(function(args) {
    return _binaryOp(args[0], args[1], function(a, b) {
      return Math.floor(a / b);
    });
  }).signature('(-> number number)', 'number')
    .signature('(-> (| number channel) (| number channel))', 'channel')
    .describe(
      'Divides the first parameter by the second. ' +
      'The resulting number or channel values are rounded down ' +
      'to the nearest integer.'
    ),
  mod: new FistFunction(function(args) {
    return _binaryOp(args[0], args[1], function(a, b) {
      return a % b;
    });
  }).signature('(-> number number)', 'number')
    .signature('(-> channel number)', 'channel')
    .describe(
      'Computes the first parameter modulo the second.'
    ),
  bucket: new FistFunction(function(args) {
    argCheck('//*', args, '(+ (| number channel) number)');
    return _binaryOp(args[0], args[1], function(a, b) {
      return Math.floor(a / b) * b;
    });
  }).signature('(-> number number)', 'number')
    .signature('(-> channel number)', 'channel')
    .describe(
      'Computes the highest integer multiple of the second parameter less ' +
      'than the first parameter. For instance, (//* 19 5) is 15. Useful ' +
      'for dividing data into equal-sized buckets (e.g. for histograms).'
    )
};

var OpsMath = {
  __fullName: 'Math Operators',
  sqrt: new FistFunction(function(args) {
    argCheck('sqrt', args, '(| number channel)');
    return _unaryOp(args[0], function(a) {
      return Math.sqrt(a);
    });
  }).signature('number', 'number')
    .signature('channel', 'channel')
    .describe(
      'Takes the square root of a number or channel.'
    ),
  pow: new FistFunction(function(args) {
    argCheck('pow', args, '(+ (| number channel) number)');
    return _binaryOp(args[0], function(a, b) {
      return Math.pow(a, b);
    });
  }).signature('(-> number number)', 'number')
    .signature('(-> channel number)', 'channel')
    .describe(
      'With two parameters (x, a), computes x^a.'
    ),
  exp: new FistFunction(function(args) {
    argCheck('exp', args, '(+ (? number) (| number channel))');
    if (args.length === 1) {
      return _unaryOp(args[0], function(a) {
        return Math.exp(a);
      });
    }
    return _binaryOp(args[0], args[1], function(a, b) {
      return Math.pow(a, b);
    });
  }).signature('number', 'number')
    .signature('channel', 'channel')
    .signature('(-> number number)', 'number')
    .signature('(-> number channel)', 'channel')
    .describe(
      'With one parameter x, computes e^x. With two parameters ' +
      '(a, x), computes a^x.'
    ),
  log: new FistFunction(function(args) {
    argCheck('log', args, '(+ (| number channel), (? number))');
    if (args.length === 1) {
      return _unaryOp(args[0], function(a) {
        return Math.log(a);
      });
    }
    return _binaryOp(args[0], args[1], function(a, b) {
      return Math.log(a) / Math.log(b);
    });
  }).signature('number', 'number')
    .signature('channel', 'channel')
    .signature('(-> number number)', 'number')
    .signature('(-> channel number)', 'channel')
    .describe(
      'With one parameter x, computes ln x. With two parameters ' +
      '(x, b), computes x log b.'
    ),
  floor: new FistFunction(function(args) {
    argCheck('floor', args, '(| number channel)');
    return _unaryOp(args[0], function(a) {
      return Math.floor(a);
    });
  }).signature('number', 'number')
    .signature('channel', 'channel')
    .describe(
      'Rounds its parameter down.'
    ),
  round: new FistFunction(function(args) {
    argCheck('round', args, '(| number channel)');
    return _unaryOp(args[0], function(a) {
      return Math.round(a);
    });
  }).signature('number', 'number')
    .signature('channel', 'channel')
    .describe(
      'Rounds its parameter to the nearest integer.'
    ),
  ceil: new FistFunction(function(args) {
    argCheck('ceil', args, '(| number channel)');
    return _unaryOp(args[0], function(a) {
      return Math.ceil(a);
    });
  }).signature('number', 'number')
    .signature('channel', 'channel')
    .describe(
      'Rounds its parameter up.'
    )
};

var OpsString = {};

var OpsChannel = {
  __exports: [
    ['timeShift', 'time-shift'],
  ],
  __fullName: 'Channel Operators',
  timeShift: new FistFunction(function(args) {
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
  }).signature('(-> channel (| number string))', 'channel')
    .describe(
      'With two parameters (c, dt), time-shifts c by dt milliseconds. ' +
      'For instance, (time-shift c 3600000) shifts c forward one hour, ' +
      'whereas (time-shift c "-1 minute") shifts c back one minute.'
    )
};

var OpsFilterValue = {
  __exports: [
    ['lt', '<'],
    ['lteq', '<='],
    ['eq', '='],
    ['neq', '!='],
    ['gteq', '>='],
    ['gt', '>'],
    ['valueBetween', 'value-between']
  ],
  __fullName: 'Value Filters',
  lt: new FistFunction(function(args) {
    argCheck('<', args, 'number');
    return function(subargs) {
      argCheck('<-fn', subargs, 'channel');
      var _c = subargs[0],
          _bound = args[0];
      return _filterOp(_c, function(t) {
        return _c.at(t) < _bound;
      });
    }
  }).signature('number', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points less than its parameter.'
    ),
  lteq: new FistFunction(function(args) {
    argCheck('<=', args, 'number');
    return function(subargs) {
      argCheck('<=-fn', subargs, 'channel');
      var _c = subargs[0],
          _bound = args[0];
      return _filterOp(_c, function(t) {
        return _c.at(t) <= _bound;
      });
    }
  }).signature('number', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points less than or equal to its parameter.'
    ),
  eq: new FistFunction(function(args) {
    argCheck('=', args, 'any');
    return function(subargs) {
      argCheck('=-fn', subargs, 'channel');
      var _c = subargs[0],
          _bound = args[0];
      return _filterOp(_c, function(t) {
        // TODO: this won't work properly for dates or other objects
        return _c.at(t) === _bound;
      });
    }
  }).signature('any', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points equal to its parameter.'
    ),
  neq: new FistFunction(function(args) {
    argCheck('!=', args, 'any');
    return function(subargs) {
      argCheck('!=-fn', subargs, 'channel');
      var _c = subargs[0],
          _bound = args[0];
      return _filterOp(_c, function(t) {
        // TODO: this won't work properly for dates or other objects
        return _c.at(t) !== _bound;
      });
    }
  }).signature('any', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points not equal to its parameter.'
    ),
  gteq: new FistFunction(function(args) {
    argCheck('>=', args, 'number');
    return function(subargs) {
      argCheck('>=-fn', subargs, 'channel');
      var _c = subargs[0],
          _bound = args[0];
      return _filterOp(_c, function(t) {
        return _c.at(t) >= _bound;
      });
    }
  }).signature('number', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points greater than or equal to its parameter.'
    ),
  gt: new FistFunction(function(args) {
    argCheck('>=', args, 'number');
    return function(subargs) {
      argCheck('>=-fn', subargs, 'channel');
      var _c = subargs[0],
          _bound = args[0];
      return _filterOp(_c, function(t) {
        return _c.at(t) >= _bound;
      });
    }
  }).signature('number', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points greater than to its parameter.'
    ),
  valueBetween: new FistFunction(function(args) {
    argCheck('value-between', args, '(+ number number)');
    return function(subargs) {
      argCheck('value-between-fn', subargs, 'channel');
      var _c = subargs[0],
          _min = args[0],
          _max = args[1];
      return _filterOp(_c, function(t) {
        var x = _c.at(t);
        return x >= _min && x < _max;
      });
    }
  }).signature('(-> number number)', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points between the first parameter (inclusive) and the ' +
      'second parameter (exclusive).'
    )
};

var OpsFilterTime = {
  __fullName: 'Time Filters',
  since: new FistFunction(function(args) {
    argCheck('since', args, '(| number date)');
    return function(subargs) {
      argCheck('since-fn', subargs, 'channel');
      var _c = subargs[0],
          _since = +args[0];
      return _filterOp(_c, function(t) {
        return t >= _since;
      });
    };
  }).signature('(| number string)', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points timestamped on or after its parameter.'
    ),
  until: new FistFunction(function(args) {
    return function(subargs) {
      argCheck('until-fn', subargs, 'channel');
      var _c = subargs[0],
          _until = +args[0];
      return _filterOp(_c, function(t) {
        return t < _until;
      });
    };
  }).signature('(| number string)', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points timestamped before its parameter.'
    ),
  between: new FistFunction(function(args) {
    return function(subargs) {
      argCheck('between-fn', subargs, 'channel');
      var _c = subargs[0],
          _since = +args[0],
          _until = +args[1];
      return _filterOp(_c, function(t) {
        return t >= _since && t < _until;
      });
    };
  }).signature('(-> (| number string) (| number string))', 'function')
    .describe(
      'Creates a filter that, when applied to a channel, selects only ' +
      'those data points timestamped on or after the first parameter ' +
      'and before the second parameter.'
    )
};

var OpsFilterLocation = {};
var OpsFilterRegion = {};

var OpsReduce = {};

var GensData = {
  __fullName: 'Data Generators',
  constant: new FistFunction(function(args) {
    argCheck('constant', args, 'any');
    return function(t) {
      return args[0];
    };
  }).signature('any', 'function')
    .describe(
      'Creates a data generator that, when evaluated at a timestamp, ' +
      'returns its parameter.'
    ),
  choice: new FistFunction(function(args) {
    return function(t) {
      return Random.choice(args);
    };
  }).signature('(+ any)', 'function')
    .describe(
      'Creates a data generator that, when evaluated at a timestamp, ' +
      'returns a value selected at random from its parameters.'
    ),
  uniform: new FistFunction(function(args) {
    return function(t) {
      return Random.uniform(args[0], args[1]);
    };
  }).signature('(-> number number)', 'function')
    .describe(
      'With two parameters (a, b) creates a data generator that, when ' +
      'evaluated at a timestamp, returns a uniform random value from ' +
      'the interval [a, b).'
    ),
  gaussian: new FistFunction(function(args) {
    return function(t) {
      return args[0] + args[1] * Random.gaussian();
    };
  }).signature('(-> number number)', 'function')
    .describe(
      'With two parameters (mu, sigma) creates a data generator that, when ' +
      'evaluated at a timestamp, returns a random value from the Gaussian ' +
      'distribution G(mu, sigma^2).'
    ),
};
var GensChannel = {
  __exports: [
    ['genRegular', 'gen-regular'],
    ['genUniform', 'gen-uniform'],
    ['genPoisson', 'gen-poisson']
  ],
  genRegular: new FistFunction(function(args) {
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
  }).signature('(-> number number number)', 'function')
    .describe(
      'With three parameters (start, end, n) creates a channel generator ' +
      'that, when applied to a data generator, builds a channel having n ' +
      'evenly spaced data points with timestamps on [start, end).'
    ),
  genUniform: new FistFunction(function(args) {
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
  }).signature('(-> number number number)', 'function')
    .describe(
      'With three parameters (start, end, n) creates a channel generator ' +
      'that, when applied to a data generator, builds a channel having n ' +
      'data points with timestamps randomly selected from [start, end).'
    ),
  genPoisson: new FistFunction(function(args) {
    argCheck('gen-poisson', args, '(+ number number number)');
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
  }).signature('(-> number number number)', 'function')
    .describe(
      'With three parameters (start, end, rate) creates a channel generator ' +
      'that, when applied to a data generator, builds a channel having ' +
      'roughly one data point every rate milliseconds with timestamp ' +
      'on [start, end).'
    )
};

var View = {
  __exports: [
    ['viewSparkline', 'view-sparkline'],
    ['viewHistogram', 'view-histogram'],
    ['viewRegression', 'view-regression']
  ],
  __fullName: 'Views',
  viewSparkline: new FistFunction(function(args, sexps) {
    argCheck('view-sparkline', args, '(* channel)');
    this._viewInvoked('sparkline', args, sexps);
  }).signature('(+ channel)', 'view')
    .describe(
      'Displays its channels as sparklines (line charts).'
    ),
  viewHistogram: new FistFunction(function(args, sexps) {
    argCheck('view-histogram', args, '(+ channel (? number))');
    this._viewInvoked('histogram', args, sexps);
  }).signature('channel', 'view')
    .signature('(-> channel number', 'view')
    .describe(
      'Displays its channel as a histogram. If the second parameter is ' +
      'provided, that is used as the histogram bucket width; otherwise, it ' +
      'looks for a //* operation applied to its channel.'
    ),
  viewRegression: new FistFunction(function(args, sexps) {
    argCheck('view-regression', args, '(+ channel channel)');
    this._viewInvoked('regression', args, sexps);
  }).signature('(-> channel channel)', 'view')
    .describe(
      'Displays its two channels as an XY plot, with the first channel ' +
      'as the X value and the second as the Y value. Also displays the ' +
      'line of best fit.'
    )
};

var Display = {};

var LibFist = {
  import: function(fist) {
    fist.importModule(null, OpsArith);
    fist.importModule(null, OpsMath);
    //fist.importModule(null, OpsString);
    fist.importModule(null, OpsChannel);

    fist.importModule(null, OpsFilterValue);
    fist.importModule(null, OpsFilterTime);
    //fist.importModule(null, OpsFilterLocation);
    //fist.importModule(null, OpsFilterRegion);

    //fist.importModule(null, OpsReduce);

    fist.importModule(null, GensData);
    fist.importModule(null, GensChannel);

    fist.importModule(null, View);
  }
};
