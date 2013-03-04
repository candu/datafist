'use strict';

Object.isEmpty = function(obj) {
  for (var i in obj) {
    return false;
  }
  return true;
}

Event.prototype.stop = function() {
  this.preventDefault();
  this.stopPropagation();
};

Event.prototype.isFileDrag = function() {
  return (
    this.dataTransfer !== undefined &&
    this.dataTransfer.items.length > 0 &&
    this.dataTransfer.items[0].kind === 'file'
  );
};

Error.prototype.trap = function(type) {
  if (!(this instanceof type)) {
    throw this;
  }
};

String.prototype.hash = function() {
  var hash = 0;
  for (var i = 0; i < this.length; i++) {
    var c = this.charCodeAt(i);
    hash = (hash << 5) - hash + this.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
};

Number.prototype.toRad = function() {
  return this * Math.PI / 180;
};

Number.prototype.toDeg = function() {
  return this * 180 / Math.PI;
};

/**
 * Converts the result of a call to d3.select() into a mootools $() object.
 * (d3 plays nicely with mootools, jQuery, etc. objects already.)
 */
function $d3(selection) {
  return $(selection[0][0]);
}

/**
 * Auto-nicing for d3.time.scale(); this decides which of the default
 * time nicing intervals are best for the given domain.
 *
 * Since d3.time.scale().nice() doesn't pass on the current domain to its
 * nicing function, this has to be called as follows:
 *
 * var scale = d3.time.scale().domain(tmin, tmax);
 * AutoNice.time(scale);
 * scale.range(0, plotW);
 */
var AutoNice = {
  _niceSteps: [
    1e3,
    6e4,
    36e5,
    864e5,
    6048e5,
    2592e6,
    31536e6,
    Infinity
  ],
  _niceMethods: [
    null,
    d3.time.second,
    d3.time.minute,
    d3.time.hour,
    d3.time.day,
    d3.time.week,
    d3.time.month,
    d3.time.year
  ],
  _niceLimits: null,
  _getNiceLimits: function() {
    if (this._niceLimits === null) {
      this._niceLimits = [];
      for (var i = 0; i < this._niceSteps.length - 1; i++) {
        var limit = Math.sqrt(this._niceSteps[i] * this._niceSteps[i + 1]);
        this._niceLimits.push(limit);
      }
    }
    return this._niceLimits;
  },
  time: function(scale) {
    var niceLimits = this._getNiceLimits();
    var domain = scale.domain(),
        dt = Math.abs(domain[1] - domain[0]),
        i = d3.bisect(this._niceLimits, dt),
        m = this._niceMethods[i];
    if (m !== null) {
      scale.nice(m);
    }
  }
};

var Random = {
  uniform: function(min, max) {
    return min + (max - min) * Math.random();
  },
  range: function(start, end) {
    // this is correct; see http://stackoverflow.com/questions/11730263/will-javascript-random-function-ever-return-a-0-or-1
    return Math.floor(this.uniform(start, end));
  },
  choice: function(choices) {
    return choices[Random.range(0, choices.length)];
  },
  gaussian: function() {
    var U, V, S, X, Y;
    while (true) {
      U = 2 * Math.random() - 1;
      V = 2 * Math.random() - 1;
      S = U * U + V * V;
      if (0 < S && S < 1) {
        return U * Math.sqrt(-2.0 * Math.log(S) / S);
      }
    }
  },
  combination: function(n, k) {
    // see http://stackoverflow.com/questions/2394246/algorithm-to-select-a-single-random-combination-of-values
    var S = {};
    for (var i = n - k; i < n; i++) {
      var T = this.range(0, i);
      if (S[T] === undefined) {
        S[T] = true;
      } else {
        S[i] = true;
      }
    }
    var keys = Object.keys(S).map(function(x) {
      return parseInt(x);
    });
    return keys.sort(function(a, b) { return a - b; });
  }
};

var Interval = {
  intersect: function(a, b) {
    if (a[1] < b[0] || a[0] > b[1]) {
      return null;
    }
    var ps = [a[0], a[1], b[0], b[1]];
    ps.sort();
    return [ps[1], ps[2]];
  },
  nice: function(a) {
    return d3.scale.linear().domain(a).nice().domain();
  }
};

var Time = {
  get: function(x) {
    // TODO: think about timezone handling?
    if (typeOf(x) === 'string') {
      return +(new Date(x));
    }
    return x;
  }
};

var TimeDelta = {
  _regex: /^(-?\d+(\.\d+)?([eE][-+]?\d+)?)?\s*(\w+)$/,
  _unit: function(s) {
    switch (s) {
      case 'ms':
      case 'msec':
      case 'msecs':
      case 'millisecond':
      case 'milliseconds':
        return 1;
      case 's':
      case 'sec':
      case 'secs':
      case 'second':
      case 'seconds':
        return 1000;
      case 'm':
      case 'min':
      case 'mins':
      case 'minute':
      case 'minutes':
        return 1000 * 60;
      case 'h':
      case 'hr':
      case 'hrs':
      case 'hour':
      case 'hours':
        return 1000 * 60 * 60;
      case 'd':
      case 'ds':
      case 'day':
      case 'days':
        return 1000 * 60 * 60 * 24;
      case 'w':
      case 'wk':
      case 'wks':
      case 'week':
      case 'weeks':
        return 1000 * 60 * 60 * 24 * 7;
      default:
        return null;
    }
  },
  parse: function(s) {
    var match = this._regex.exec(s);
    if (match === null) {
      return null;
    }
    var unit = this._unit(match[4]);
    if (unit === null) {
      return null;
    }
    if (match[1] === undefined) {
      return unit;
    }
    return parseFloat(match[1]) * unit;
  },
  get: function(x) {
    if (typeOf(x) === 'string') {
      return this.parse(x);
    }
    return x;
  }
};

var Stats = {
  linregress: function(data) {
    var n = 0,
        mx = 0,     // mean of xs
        my = 0,     // mean of ys
        ssxx = 0,   // sums-of-squares coefficients
        ssyy = 0,
        ssxy = 0;
    data.each(function (d) {
      n++;
      mx += (d.x - mx) / n;
      my += (d.y - my) / n;
      ssxx += d.x * d.x;
      ssyy += d.y * d.y;
      ssxy += d.x * d.y;
    });
    ssxx -= n * mx * mx;
    ssyy -= n * my * my;
    ssxy -= n * mx * my;
    var b = ssxy / ssxx,
        a = my - b * mx,
        R = b * ssxy / ssyy;
    var L = d3.scale.linear()
      .domain([0, 1])
      .range([a, a + b]);
    return {L: L, R: R};
  }
};

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
