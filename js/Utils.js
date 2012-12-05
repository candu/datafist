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

/**
 * Converts the result of a call to d3.select() into a mootools $() object.
 * (d3 plays nicely with mootools, jQuery, etc. objects already.)
 */
function $d3(selection) {
  return $(selection[0][0]);
}

function argCheck(name, args, pattern) {
  // TODO: implement this
}

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
  }
};
