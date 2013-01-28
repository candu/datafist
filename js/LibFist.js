'use strict';

// TODO: have separate constructs for categorical, spatial channels

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
  __fullName: 'Arithmetic Operations',
  add: new FistFunction(function(args) {
    var channels = [],
        numberSum = 0;
    for (var i = 0; i < args.values.length; i++) {
      var arg = args.values[i],
          argType = Fist.evaluateType(args.__sexps.values[i]);
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
  }).type('(fn (name (+ channel?) "values") (max (ref "values")))')
    .describe('Takes the sum of its values.'),
  multiply: new FistFunction(function(args) {
    var channels = [],
        numberProd = 1;
    for (var i = 0; i < args.values.length; i++) {
      var arg = args.values[i],
          argType = Fist.evaluateType(args.__sexps.values[i]);
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
  }).type('(fn (name (+ channel?) "values") (max (ref "values")))')
    .describe('Takes the product of its values.'),
  subtract: new FistFunction(function(args) {
    if (args.b === undefined) {
      return _unaryOp(args.a, function(a) {
        return -a;
      });
    }
    return _binaryOp(args.a, args.b, function(a, b) {
      return a - b;
    });
  }).type('(fn (-> (name channel? "a") (name (? channel?) "b")) (max (ref "a") (ref "b")))')
    .describe(
      'If only a is provided, negates a. ' +
      'If (a, b) are both provided, produces the difference a - b.'
    ),
  divideFloat: new FistFunction(function(args) {
    return _binaryOp(args.a, args.b, function(a, b) {
      return a / b;
    })
  }).type('(fn (-> (name channel? "a") (name channel? "b")) (max (ref "a") (ref "b")))')
    .describe(
      'Produces the quotient a / b including any fractional part.'
    ),
  divideInt: new FistFunction(function(args) {
    return _binaryOp(args.a, args.b, function(a, b) {
      return Math.floor(a / b);
    });
  }).type('(fn (-> (name channel? "a") (name channel? "b")) (max (ref "a") (ref "b")))')
    .describe(
      'Produces the quotient a / b rounded down to the nearest integer.'
    ),
  mod: new FistFunction(function(args) {
    return _binaryOp(args.a, args.b, function(a, b) {
      return a % b;
    });
  }).type('(fn (-> (name channel? "a") (name number "b")) (max (ref "a") (ref "b")))')
    .describe(
      'Produces the modulus a % b, or the remainder left over from ' +
      'the quotient a / b. For instance, (% 8 5) is 3.'
    ),
  bucket: new FistFunction(function(args) {
    return _binaryOp(args.a, args.b, function(a, b) {
      return Math.floor(a / b) * b;
    });
  }).type('(fn (-> (name channel? "a") (name number "b")) (ref "a"))')
    .describe(
      'Produces the highest multiple of b less ' +
      'than a. For instance, (//* 19 5) is 15. This can be ' +
      'used to place the data in a into equal-sized buckets.'
    )
};

var OpsMath = {
  __fullName: 'Math Operations',
  sqrt: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.sqrt(x);
    });
  }).type('(fn (-> (name channel? "x")) (ref "x"))')
    .describe(
      'Takes the square root of x.'
    ),
  pow: new FistFunction(function(args) {
    return _binaryOp(args.x, args.a, function(x, a) {
      return Math.pow(x, a);
    });
  }).type('(fn (-> (name channel? "x") (name number "a")) (ref "x"))')
    .describe(
      'With two parameters (x, a), produces x^a ' +
      '(x to the power of a).'
    ),
  exp: new FistFunction(function(args) {
    if (args.a === undefined) {
      return _unaryOp(args.x, function(x) {
        return Math.exp(x);
      });
    }
    return _binaryOp(args.x, args.a, function(x, a) {
      return Math.pow(a, x);
    });
  }).type('(fn (-> (name channel? "x") (name (? number) "a")) (ref "x"))')
    .describe(
      'If only x is provided, produces e^x (e to the power of x, ' +
      'where e is roughly 2.718). If both (x, a) are provided, ' +
      'produces a^x (a to the power of x).'
    ),
  log: new FistFunction(function(args) {
    if (args.b === undefined) {
      return _unaryOp(args.x, function(x) {
        return Math.log(x);
      });
    }
    return _binaryOp(args.x, args.b, function(x, b) {
      return Math.log(x) / Math.log(b);
    });
  }).type('(fn (-> (name channel? "x") (name (? number) "b")) (ref "x"))')
    .describe(
      'If only x is provided, produces ln x (the logarithm of x base e, ' +
      'where e is roughly 2.718). If both (x, b) are provided, ' +
      'produces x log b (the logarithm of x base b).'
    ),
  abs: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.abs(x);
    });
  }).type('(fn (name channel? "x") (ref "x"))')
    .describe(
      'Produces the absolute value of x.'
    ),
  floor: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.floor(x);
    });
  }).type('(fn (name channel? "x") (ref "x"))')
    .describe(
      'Rounds x down to the nearest integer.'
    ),
  round: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.round(x);
    });
  }).type('(fn (name channel? "x") (ref "x"))')
    .describe(
      'Rounds x up or down to the nearest integer.'
    ),
  ceil: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.ceil(x);
    });
  }).type('(fn (name channel? "x") (ref "x"))')
    .describe(
      'Rounds x up to the nearest integer.'
    )
};

// TODO: allow these to operate directly on strings
var OpsString = {
  __fullName: 'String Operations',
  substring: new FistFunction(function(args) {
    return _unaryOp(args.c, function(s) {
      var n = s.length,
          start = args.start,
          end = args.end || n;
      if (start < 0) {
        start += n;
      }
      if (end < 0) {
        end += n;
      }
      return s.substring(start, end);
    });
  }).type('(fn (-> (name channel "c") (name number "start") (name (? number) "end")) channel)')
    .describe(
      'Produces a channel whose values are fixed-position substrings of ' +
      'the values of c.'
    ),
  length: new FistFunction(function(args) {
    return _unaryOp(args.c, function(s) {
      return s.length;
    });
  }).type('(fn (name channel "c") channel)')
    .describe(
      'Produces a channel whose values are the lengths, or number of ' +
      'characters, of the values of c.'
    )
};

var OpsLocation = {
  __exports: [
    ['distanceFrom', 'distance-from']
  ],
  __fullName: 'Location Operations',
  distanceFrom: new FistFunction(function(args) {
    var _plat = args.pointLat.toRad(),
        _plng = args.pointLng.toRad(),
        _R = 6371009.0;   // mean Earth radius, in meters
    return {
      at: function(t) {
        var lat = args.lat.at(t).toRad(),
            lng = args.lng.at(t).toRad(),
            dLat = lat - _plat,
            dLng = lng - _plng;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.sin(dLng / 2) * Math.sin(dLng / 2) *
                Math.cos(_plat) * Math.cos(lat);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return _R * c;
      },
      iter: function() {
        return IntersectionIterator([args.lat.iter(), args.lng.iter()]);
      }
    };
  }).type('(fn (-> (name channel "lat") (name channel "lng") (name number "pointLat") (name number "pointLng")) channel)')
    .describe(
      'Produces a channel whose values are the distances of each data ' +
      'point (lat, lng) from (pointLat, pointLng).'
    )
};

var OpsTime = {
  __exports: [
    ['timeShift', 'time-shift'],
    ['timeBucket', 'time-bucket'],
    ['timeIdentity', 'time-identity'],
    ['hourOfDay', 'hour-of-day'],
    ['dayOfWeek', 'day-of-week'],
    ['monthOfYear', 'month-of-year']
  ],
  __fullName: 'Time Operations',
  timeShift: new FistFunction(function(args) {
    var _dt = TimeDelta.get(args.dt);
    return {
      at: function(t) {
        return args.c.at(t - _dt);
      },
      iter: function() {
        var _iter = args.c.iter();
        return {
          next: function() {
            return _iter.next() + _dt;
          },
          peek: function() {
            return _iter.peek() + _dt;
          }
        };
      }
    };
  }).type('(fn (-> (name channel "c") (name timedelta "dt")) channel)')
    .describe(
      'Time-shifts c by dt milliseconds. ' +
      'For instance, (time-shift c 3600000) shifts c forward one hour, ' +
      'whereas (time-shift c "-1 minute") shifts c back one minute.'
    ),
  timeBucket: new FistFunction(function(args) {
    var _iter = args.c.iter(),
        _dt = TimeDelta.get(args.dt),
        _data = [],
        _reduce = Reduce.get(args.reduce),
        _n = 0;
    while (true) {
      try {
        var t = _iter.next(),
            x = args.c.at(t);
        t = Math.floor(t / _dt) * _dt;
        if (_n === 0 || t > _data[_n - 1].t) {
          _data.push({t: t, xs: []});
          _n++;
        }
        _data[_n - 1].xs.push(x);
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    _data = _data.map(function(bucket) {
      return {t: bucket.t, x: _reduce(bucket.xs)};
    });
    return new DataChannel(_data);
  }).type('(fn (-> (name channel "c") (name string "reduce") (name timedelta "dt")) channel)')
    .describe(
      'Groups the data from c into time buckets of width dt, then ' +
      'combines the data in each bucket according to reduce. ' +
      'reduce can be one of "count", "sum", or "average", which ' +
      'specifies the combining operation.'
    ),
  timeIdentity: new FistFunction(function(args) {
    return {
      at: function(t) {
        return t;
      },
      iter: function() {
        return args.c.iter();
      }
    }
  }).type('(fn (name channel "c") channel)')
    .describe(
      'Produces a channel whose values are the timestamps of c.'
    ),
  hourOfDay: new FistFunction(function(args) {
    return {
      at: function(t) {
        return new Date(t).getHours();
      },
      iter: function() {
        return args.c.iter();
      }
    }
  }).type('(fn (name channel "c") channel)')
    .describe(
      'Produces a channel whose values are the hours of day (0-23) ' +
      'corresponding to the timestamps of c.'
    ),
  dayOfWeek: new FistFunction(function(args) {
    return {
      at: function(t) {
        return new Date(t).getDay();
      },
      iter: function() {
        return args.c.iter();
      }
    }
  }).type('(fn (name channel "c") channel)')
    .describe(
      'Produces a channel whose values are the days of week (0-6) ' +
      'corresponding to the timestamps of c.'
    ),
  monthOfYear: new FistFunction(function(args) {
    return {
      at: function(t) {
        return new Date(t).getMonth() + 1;
      },
      iter: function() {
        return args.c.iter();
      }
    }
  }).type('(fn (name channel "c") channel)')
    .describe(
      'Produces a channel whose values are the months of year (1-12) ' +
      'corresponding to the timestamps of c.'
    )
};

var OpsSmooth = {
  __exports: [
    ['rollingAverage', 'rolling-average'],
    ['slidingWindow', 'sliding-window'],
    ['medianFilter', 'median-filter'],
    ['rateOfChange', 'rate-of-change'],
    ['cumulativeSum', 'cumulative-sum']
  ],
  __fullName: 'Smoothing Operations',
  rollingAverage: new FistFunction(function(args) {
    var _iter = args.c.iter(),
        _halfLife = TimeDelta.get(args.halfLife),
        _data = [];
    while (true) {
      try {
        var t = _iter.next(),
            x = args.c.at(t),
            n = _data.length;
        if (n > 0) {
          var dt = t - _data[n - 1].t,
              beta = Math.pow(0.5, dt / _halfLife),
              mu = _data[n - 1].x;
          x = beta * mu + (1 - beta) * x;
        }
        _data.push({t: t, x: x});
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    return new DataChannel(_data);
  }).type('(fn (-> (name channel "c") (name timedelta "halfLife")) channel)')
    .describe(
      'Applies a rolling average to c ' +
      'that decays by 50% over halfLife milliseconds.'
    ),
  slidingWindow: new FistFunction(function(args) {
    var _iter = args.c.iter(),
        _data = [],
        _buf = new Array(args.windowSize),
        _i = -1,
        _n = 0,
        _sum = 0;
    while (true) {
      try {
        var t = _iter.next(),
            x = args.c.at(t);
        _i++;
        if (_i === args.windowSize) {
          _i = 0;
        }
        if (_buf[_i] === undefined) {
          _sum += x;
          _n++;
        } else {
          _sum += x - _buf[_i];
        }
        _buf[_i] = x;
        _data.push({t: t, x: _sum / _n});
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    return new DataChannel(_data);
  }).type('(fn (-> (name channel "c") (name number "windowSize")) channel)')
    .describe(
      'Applies a sliding window ' +
      'average to c that uses the last windowSize data points.'
    ),
  medianFilter: new FistFunction(function(args) {
    var _iter = args.c.iter(),
        _data = [],
        _size = args.filterSize * 2 + 1,
        _buf = new Array(_size),
        _i = -1,
        _j = args.filterSize,
        _n = 0;
    while (true) {
      try {
        var t = _iter.next(),
            x = args.c.at(t);
        _i++;
        _j++;
        if (_i === _size) {
          _i = 0;
        }
        if (_j === _size) {
          _j = 0;
        }
        if (_buf[_i] === undefined) {
          _n++;
        }
        _buf[_i] = {t: t, x: x};
        if (_n <= args.filterSize) {
          continue;
        }
        var jt = _buf[_j].t,
            filter = _buf.slice(0, _n);
        filter.sort(function(a, b) { return a.x - b.x; });
        if (_n % 2 === 0) {
          var a = filter[_n / 2 - 1].x,
              b = filter[_n / 2].x;
          _data.push({t: jt, x: (a + b) / 2});
        } else {
          var a = filter[(_n - 1) / 2].x;
          _data.push({t: jt, x: a});
        }
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    while (_n > args.filterSize + 1) {
      _i++;
      _j++;
      if (_i === _size) {
        _i = 0;
      }
      if (_j === _size) {
        _j = 0;
      }
      _buf[_i] = undefined;
      _n--;
      var jt = _buf[_j].t,
          filter = [],
          k = _i;
      while (filter.length < _n) {
        k++;
        if (k === _size) {
          k = 0;
        }
        filter.push(_buf[k]);
      }
      filter.sort(function(a, b) { return a.x - b.x; });
      if (_n % 2 === 0) {
        var a = filter[_n / 2 - 1].x,
            b = filter[_n / 2].x;
        _data.push({t: jt, x: (a + b) / 2});
      } else {
        var a = filter[(_n - 1) / 2].x;
        _data.push({t: jt, x: a});
      }
    }
    return new DataChannel(_data);
  }).type('(fn (-> (name channel "c") (name number "filterSize")) channel)')
    .describe(
      'Applies a median filter to c that uses the last filterSize ' +
      'data points. This can be used to reduce noise in data.'
    ),
  rateOfChange: new FistFunction(function(args) {
    var _iter = args.c.iter(),
        _rateUnit = TimeDelta.get(args.rateUnit),
        _last = null,
        _data = [];
    while (true) {
      try {
        var t = _iter.next(),
            x = args.c.at(t);
        if (_last === null) {
          _last = {t: t - _rateUnit, x: x};
        }
        var dt = (t - _last.t) / _rateUnit,
            dx = x - _last.x;
        _data.push({t: t, x: dx / dt});
        _last = {t: t, x: x};
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    return new DataChannel(_data);
  }).type('(fn (-> (name channel "c") (name (? timedelta) "rateUnit")) channel)')
    .describe(
      'Calculates the rate of change of c per rateUnit milliseconds. ' +
      'For instance, (rate-of-change c "1 hour") is change per hour.'
    ),
  cumulativeSum: new FistFunction(function(args) {
    var _iter = args.c.iter(),
        _sum = 0,
        _data = [];
    while (true) {
      try {
        var t = _iter.next(),
            x = args.c.at(t);
        _sum += x;
        _data.push({t: t, x: _sum});
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    return new DataChannel(_data);
  }).type('(fn (name channel "c") channel)')
    .describe(
      'Calculates the cumulative sum of c, or total of all data points ' +
      'in c up to each point in time.'
    ),
};

var OpsJoin = {
  __fullName: 'Join Operations',
  join: new FistFunction(function(args) {
    return {
      at: function(t) {
        return args.c.at(t);
      },
      iter: function() {
        var iters = args.joins.map(function(j) { return j.iter(); });
        iters.unshift(args.c.iter());
        return IntersectionIterator(iters);
      }
    }
  }).type('(fn (-> (name channel "c") (name (+ channel) "joins")) channel)')
    .describe(
      'Produces a channel with values from c, filtered to only those ' +
      'timestamps present in both c and each of the joins channels.'
    )
};

var OpsFilterValue = {
  __exports: [
    ['lt', 'value-less-than'],
    ['lteq', 'value-at-most'],
    ['eq', 'value-is'],
    ['neq', 'value-is-not'],
    ['gteq', 'value-at-least'],
    ['gt', 'value-more-than'],
    ['valueBetween', 'value-between']
  ],
  __fullName: 'Value Filters',
  lt: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) < args.x;
    });
  }).type('(fn (-> (name channel "c") (name number "x")) channel)')
    .describe(
      'Filters c to contain only values less than x.'
    ),
  lteq: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) <= args.x;
    });
  }).type('(fn (-> (name channel "c") (name number "x")) channel)')
    .describe(
      'Filters c to contain only values less than or equal to x.'
    ),
  eq: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      // TODO: this won't work properly for dates or other objects
      return args.c.at(t) === args.x;
    });
  }).type('(fn (-> (name channel "c") (name (| number string) "x")) channel)')
    .describe(
      'Filters c to contain only values equal to x.'
    ),
  neq: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      // TODO: this won't work properly for dates or other objects
      return args.c.at(t) !== args.x;
    });
  }).type('(fn (-> (name channel "c") (name (| number string) "x")) channel)')
    .describe(
      'Filters c to contain only values not equal to x.'
    ),
  gteq: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) >= args.x;
    });
  }).type('(fn (-> (name channel "c") (name number "x")) channel)')
    .describe(
      'Filters c to contain only values greater than or equal to x.'
    ),
  gt: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) > args.x;
    });
  }).type('(fn (-> (name channel "c") (name number "x")) channel)')
    .describe(
      'Filters c to contain only values greater than x.'
    ),
  valueBetween: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      var x = args.c.at(t);
      return x >= args.x1 && x < args.x2;
    });
  }).type('(fn (-> (name channel "c") (name number "x1") (name number "x2")) channel)')
    .describe(
      'Filters c to contain only values between x1 (inclusive) and ' +
      'x2 (exclusive).'
    )
};

var OpsFilterTime = {
  __exports: [
    ['since', 'time-since'],
    ['until', 'time-until'],
    ['between', 'time-between']
  ],
  __fullName: 'Time Filters',
  since: new FistFunction(function(args) {
    var _since = Time.get(args.since);
    return _filterOp(args.c, function(t) {
      return t >= _since;
    });
  }).type('(fn (-> (name channel "c") (name time "since")) channel)')
    .describe(
      'Filters c to contain only data points from on or after since.'
    ),
  until: new FistFunction(function(args) {
    var _until = Time.get(args.until);
    return _filterOp(args.c, function(t) {
      return t < _until;
    });
  }).type('(fn (-> (name channel "c") (name time "until")) channel)')
    .describe(
      'Filters c to contain only data points from before until.'
    ),
  between: new FistFunction(function(args) {
    var _since = Time.get(args.since),
        _until = Time.get(args.until);
    return _filterOp(args.c, function(t) {
      return t >= _since && t < _until;
    });
  }).type('(fn (-> (name channel "c") (name time "since") (name time "until")) channel)')
    .describe(
      'Filters c to contain only data points from between since ' +
      '(inclusive) and until (exclusive).'
    )
};

var OpsFilterString = {
  __exports: [
    ['startsWith', 'starts-with'],
    ['endsWith', 'ends-with']
  ],
  __fullName: 'String Filters',
  startsWith: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      var s = args.c.at(t);
      return s.indexOf(args.prefix) === 0;
    });
  }).type('(fn (-> (name channel "c") (name string "prefix")) channel)')
    .describe(
      'Filters c to contain only values that start with prefix.'
    ),
  endsWith: new FistFunction(function(args) {
    var _suffixLen = args.suffix.length;
    return _filterOp(args.c, function(t) {
      var s = args.c.at(t),
          i = s.lastIndexOf(args.suffix);
      return i !== -1 && i === s.length - _suffixLen;
    });
  }).type('(fn (-> (name channel "c") (name string "suffix")) channel)')
    .describe(
      'Filters c to contain only values that end with suffix.'
    )
};

var OpsFilterLocation = {};
var OpsFilterRegion = {};

var GensData = {
  __fullName: 'Data Generators',
  constant: new FistFunction(function(args) {
    return function(t) {
      return args.x;
    };
  }).type('(fn (name number "x") (fn number number))')
    .describe(
      'Produces a data generator that, when evaluated at a timestamp, ' +
      'returns x.'
    ),
  choice: new FistFunction(function(args) {
    return function(t) {
      return Random.choice(args.values);
    };
  }).type('(fn (name (+ (| number string)) "values") (fn number number))')
    .describe(
      'Produces a data generator that, when evaluated at a timestamp, ' +
      'returns a value selected at random from values.'
    ),
  uniform: new FistFunction(function(args) {
    return function(t) {
      return Random.uniform(args.min, args.max);
    };
  }).type('(fn (-> (name number "min") (name number "max")) (fn number number))')
    .describe(
      'Produces a data generator that, when evaluated at a timestamp, ' +
      'returns a random value between min (inclusive) and max (exclusive).'
    ),
  gaussian: new FistFunction(function(args) {
    return function(t) {
      return args.mu + args.sigma * Random.gaussian();
    };
  }).type('(fn (-> (name number "mu") (name number "sigma")) (fn number number))')
    .describe(
      'Produces a data generator that, when evaluated at a timestamp, ' +
      'returns a normally distributed value with mean mu and ' +
      'standard deviation sigma.'
    ),
};
var GensChannel = {
  __exports: [
    ['genRegular', 'gen-regular'],
    ['genUniform', 'gen-uniform'],
    ['genPoisson', 'gen-poisson'],
    ['genFromChannel', 'gen-from-channel']
  ],
  __fullName: 'Channel Generators',
  genRegular: new FistFunction(function(args) {
    var _dt = (args.until - args.since) / args.n,
        _t = args.since,
        _data = [];
    for (var i = 0; i < args.n; i++) {
      _data.push({t: _t, x: args.gen(_t)});
      _t += _dt;
    }
    return new DataChannel(_data);
  }).type('(fn (-> (name (fn number number) "gen") (name number "since") (name number "until") (name number "n")) channel)')
    .describe(
      'Produces a channel by evaluating gen at n evenly spaced timestamps ' +
      'between since (inclusive) and until (exclusive).'
    ),
  genUniform: new FistFunction(function(args) {
    var _dts = Random.combination(args.until - args.since, args.n),
        _data = [];
    for (var i = 0; i < args.n; i++) {
      var _t = args.since + _dts[i];
      _data.push({t: _t, x: args.gen(_t)});
    }
    return new DataChannel(_data);
  }).type('(fn (-> (name (fn number number) "gen") (name number "since") (name number "until") (name number "n")) channel)')
    .describe(
      'Produces a channel by evaluating gen at n timestamps selected ' +
      'randomly from between since (inclusive) and until (exclusive).'
    ),
  genPoisson: new FistFunction(function(args) {
    var _t = args.since,
        _data = [];
    while (_t < args.until) {
      _data.push({t: _t, x: args.gen(_t)});
      var _x = Math.max(1e-12, Math.random()),
          _dt = Math.max(1, Math.round(args.rate * -Math.log(_x)));
      _t += _dt;
    }
    return new DataChannel(_data);
  }).type('(fn (-> (name (fn number number) "gen") (name number "since") (name number "until") (name number "rate")) channel)')
    .describe(
      'Produces a channel by evaluating gen roughly once every rate ' +
      'milliseconds between since (inclusive) and until (exclusive). ' +
      'The exact timestamps are computed using a Poisson distribution, ' +
      'which models events happening randomly over time (e.g. customers ' +
      'arriving at a store, emails sent to your inbox).'
    ),
  genFromChannel: new FistFunction(function(args) {
    return {
      at: function(t) {
        return args.gen(t);
      },
      iter: function() {
        return args.c.iter();
      }
    }
  }).type('(fn (-> (name (fn number number) "gen") (name channel "c")) channel)')
    .describe(
      'Produces a channel by evaluating gen at every timestamp present in c.'
    )
};

var View = {
  __exports: [
    ['viewLine', 'view-line'],
    ['viewCrossfilter', 'view-crossfilter'],
    ['viewMap', 'view-map'],
    ['viewHistogram', 'view-histogram'],
    ['viewPlot', 'view-plot']
  ],
  __fullName: 'Views',
  viewLine: new FistFunction(function(args) {
    FistUI.onViewInvoked('line', args);
  }).type('(fn (name (+ channel) "channels") view)')
    .describe(
      'Displays its channels as line charts.'
    ),
  viewCrossfilter: new FistFunction(function(args) {
    FistUI.onViewInvoked('crossfilter', args);
  }).type('(fn (name (+ channel) "channels") view)')
    .describe(
      'Displays its channels as a series of distribution bar charts. ' +
      'Each chart can be filtered, which updates all other charts to ' +
      'show the filtered distribution across dimensions. Numeric data ' +
      'allows for range filtering, whereas categorical data is filtered ' +
      'by exact match against one or more categories.'
    ),
  viewMap: new FistFunction(function(args) {
    FistUI.onViewInvoked('map', args);
  }).type('(fn (name (+ channel) "channels") view)')
    .describe(
      'Displays each pair of channels as (lat, lng) points on a ' +
      'Mercator projection. If datafist is running in server mode and a ' +
      'valid Google Maps JavaScript API v3 key is provided, this will also ' +
      'fetch and display map tiles behind the data.'
    ),
  viewHistogram: new FistFunction(function(args) {
    FistUI.onViewInvoked('histogram', args);
  }).type('(fn (-> (name channel "channel") (name (? channel) "groupBy") (name (? number) "bucket") (name (? string) "reduce")) view)')
    .describe(
      'Displays its channel as a histogram. If groupBy is ' +
      'provided, the values of channel are grouped by the ' +
      'values of groupBy at the same timestamps. ' +
      'If bucket is provided, it is used as the width of the ' +
      'histogram buckets. If provided, reduce can be one of ' +
      '"count", "sum", or "average", which specifies how values ' +
      'in each bucket are to be combined.'
    ),
  viewPlot: new FistFunction(function(args) {
    FistUI.onViewInvoked('plot', args);
  }).type('(fn (-> (name channel "x") (name channel "y") (name (? channel) "area") (name (? channel) "color")) view)')
    .describe(
      'Uses the x and y channels to make an x-y plot. If x and y are ' +
      'highly correlated, also displays the line of best fit. If area is ' +
      'provided, it is used to determine the area of the (x, y) points. ' +
      'If color is provided, it is used to determine the color of the ' +
      '(x, y) points. Categorical data for color will use one color for ' +
      'each unique value, whereas numeric data will use a color gradient ' +
      'over the value range.'
    )
};

var LibFist = {
  modules: [
    View,
    OpsArith,
    OpsMath,
    OpsString,
    OpsLocation,
    OpsTime,
    OpsSmooth,
    OpsJoin,
    OpsFilterValue,
    OpsFilterTime,
    OpsFilterString,
    //OpsFilterLocation,
    //OpsFilterRegion,
    GensData,
    GensChannel
  ],
  import: function() {
    this.modules.each(function(module) {
      Fist.importModule(null, module);
    });
  }
};
