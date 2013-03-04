"use strict";

var StopIteration = new Class({
  Extends: Error,
  toString: function() {
    return "StopIteration";
  }
});

function Iterator(xs) {
  this._pos = 0;
  this._xs = xs || [];
}

Iterator.prototype._test = function() {
  if (this._pos >= this._xs.length) {
    throw new StopIteration();
  }
};

Iterator.prototype.next = function() {
  this._test();
  return this._xs[this._pos++];
};

Iterator.prototype.peek = function() {
  this._test();
  return this._xs[this._pos];
};

function FilterIterator(iter, p) {
  this._iter = iter;
  this._p = p || function(x) {
    return !!x;
  };
  this._cur = null;
  this._stop = false;
  this._next();
}

FilterIterator.prototype._next = function() {
  try {
    while (true) {
      this._cur = this._iter.next();
      if (this._p(this._cur)) {
        break;
      }
    }
  } catch (e) {
    if (!(e instanceof StopIteration)) {
      throw e;
    }
    this._stop = true;
  }
};

FilterIterator.prototype.next = function() {
  if (this._stop) {
    throw new StopIteration();
  }
  var ret = this._cur;
  this._next();
  return ret;
};

FilterIterator.prototype.peek = function() {
  if (this._stop) {
    throw new StopIteration();
  }
  return this._cur;
};

function MergeIterator(iters) {
  this._iters = iters.filter(function(a) {
    try {
      a.peek();
      return true;
    } catch (e) {
      if (!(e instanceof StopIteration)) {
        throw e;
      }
    }
    return false;
  });
  this._q = new Heap(this._iters, function(a, b) {
    return a.peek() - b.peek();
  });
  this._curIter = null;
  if (!this._q.empty()) {
    this._curIter = this._q.pop();
  }
}

MergeIterator.prototype.next = function() {
  if (this._q.empty() && this._curIter === null) {
    throw new StopIteration();
  }
  var ret = this._curIter.peek();
  try {
    this._curIter.next();
    this._curIter.peek();
    this._q.push(this._curIter);
  } catch (e) {
    if (!(e instanceof StopIteration)) {
      throw e;
    }
  }
  this._curIter = null;
  if (!this._q.empty()) {
    this._curIter = this._q.pop();
  }
  return ret;
};

MergeIterator.prototype.peek = function() {
  if (this._q.empty() && this._curIter === null) {
    throw new StopIteration();
  }
  return this._curIter.peek();
};

function UnionIterator(iters) {
  this._iter = new MergeIterator(iters);
  this._lastValue = null;
}

UnionIterator.prototype.next = function() {
  while (true) {
    var curValue = this._iter.next();
    if (curValue !== this._lastValue) {
      this._lastValue = curValue;
      return curValue;
    }
  }
};

UnionIterator.prototype.peek = function() {
  return this._iter.peek();
};

function IntersectionIterator(iters) {
  this._iter = new MergeIterator(iters);
  this._lastValue = null;
  this._lastCount = 0;
  this._fullCount = iters.length;
}

IntersectionIterator.prototype.next = function() {
  while (true) {
    var curValue = this._iter.next();
    if (curValue !== this._lastValue) {
      this._lastValue = curValue;
      this._lastCount = 0;
    }
    this._lastCount++;
    if (this._lastCount === this._fullCount) {
      return curValue;
    }
  }
};

IntersectionIterator.prototype.peek = function() {
  return this._iter.peek();
};

function Heap(xs, cmp) {
  this._xs = xs || [];
  this._cmp = cmp || function(a, b) {
    return a - b;
  };
  this._size = this._xs.length;
  for (var i = Math.floor(this._size / 2) - 1; i >= 0; i--) {
    this._sift(i);
  }
}

Heap.prototype._swap = function(i, j) {
  var tmp = this._xs[i];
  this._xs[i] = this._xs[j];
  this._xs[j] = tmp;
};

Heap.prototype._left = function(i) {
  return 2 * i + 1;
};

Heap.prototype._right = function(i) {
  return 2 * i + 2;
};

Heap.prototype._parent = function(i) {
  return Math.floor((i - 1) / 2);
};

Heap.prototype._leaf = function(i) {
  return i >= Math.ceil((this._size - 1) / 2);
};

Heap.prototype._sift = function(i) {
  while (!this._leaf(i)) {
    var L = this._left(i), R = this._right(i), m = L;
    if (R < this._size && this._cmp(this._xs[R], this._xs[L]) < 0) {
      m = R;
    }
    if (this._cmp(this._xs[i], this._xs[m]) <= 0) {
      break;
    }
    this._swap(i, m);
    i = m;
  }
};

Heap.prototype.pop = function() {
  this._swap(0, this._size - 1);
  if (--this._size > 0) {
    this._sift(0);
  }
  return this._xs[this._size];
};

Heap.prototype.push = function(x) {
  var i = this._size++;
  this._xs[i] = x;
  while (i > 0) {
    var P = this._parent(i);
    if (this._cmp(this._xs[P], this._xs[i]) < 0) {
      break;
    }
    this._swap(i, P);
    i = P;
  }
};

Heap.prototype.empty = function() {
  return this._size == 0;
};

Heap.prototype.check = function() {
  for (var i = 0; !this._leaf(i); i++) {
    var L = this._left(i), R = this._right(i);
    if (this._cmp(this._xs[i], this._xs[L]) >= 0) {
      return false;
    }
    if (R < this._size && this._cmp(this._xs[i], this._xs[R]) >= 0) {
      return false;
    }
  }
  return true;
};

function Region(ps) {
  this._ps = ps;
  this._n = this._ps.length;
}

Region.prototype.contains = function(p) {
  var j = this._n - 1, c = false;
  for (var i = 0; i < this._n; i++) {
    if (this._ps[i][1] > p[1] ^ this._ps[j][1] > p[1] && p[0] < (this._ps[j][0] - this._ps[i][0]) * (p[1] - this._ps[i][1]) / (this._ps[j][1] - this._ps[i][1]) + this._ps[i][0]) {
      c = !c;
    }
    j = i;
  }
  return c;
};

Type.fromValue = function(value) {
  var type = typeOf(value);
  switch (type) {
   case "object":
    return value.type();

   case "number":
    return NumberType;

   case "string":
    return StringType;

   default:
    return null;
  }
};

Type.equal = function(t1, t2) {
  if (t1 === null || t1 === undefined || t2 === null || t2 === undefined) {
    return t1 === t2;
  }
  return t1.toString() === t2.toString();
};

var PrimitiveType = new Class({
  initialize: function(nodeType) {
    this._nodeType = nodeType;
  },
  node: function() {
    return this._nodeType;
  },
  toString: function() {
    return this._nodeType;
  },
  match: function(type) {
    return type === this ? type : null;
  },
  resolve: function(boundTypes) {
    return this;
  }
});

var NumberType = new PrimitiveType("number");

var StringType = new PrimitiveType("string");

var LocationType = new PrimitiveType("location");

var ViewType = new PrimitiveType("view");

var TimeType = {
  node: function() {
    return "time";
  },
  toString: function() {
    return "time";
  },
  match: function(type) {
    return NumberType.match(type) || StringType.match(type);
  },
  resolve: function(boundTypes) {
    return this;
  }
};

var TimeDeltaType = {
  node: function() {
    return "timedelta";
  },
  toString: function() {
    return "timedelta";
  },
  match: function(type) {
    return NumberType.match(type) || StringType.match(type);
  },
  resolve: function(boundTypes) {
    return this;
  }
};

function ChannelType(dataType) {
  return {
    dataType: dataType,
    node: function() {
      return "channel";
    },
    toString: function() {
      return "channel(" + dataType.toString() + ")";
    },
    match: function(type) {
      var match = dataType.match(type.dataType);
      return match === null ? null : ChannelType(match);
    },
    resolve: function(boundTypes) {
      return this;
    }
  };
}

function FunctionType(params, returnType) {
  var _meta = function(paramCallback, returnCallback) {
    var paramNames = Object.keys(params), mappedParams = {};
    for (var i = 0; i < paramNames.length; i++) {
      var name = paramNames[i], mappedType = paramCallback(name);
      if (mappedType === null) {
        return null;
      }
      mappedParams[name] = mappedType;
    }
    var mappedReturnType = returnCallback();
    if (mappedReturnType === null) {
      return null;
    }
    return FunctionType(mappedParams, mappedReturnType);
  };
  return {
    params: params,
    returnType: returnType,
    node: function() {
      return "function";
    },
    toString: function() {
      var paramString = Object.keys(params).sort().map(function(name) {
        return name + ": " + params[name].toString();
      }).join(", ");
      return "function({" + paramString + "}, " + returnType.toString() + ")";
    },
    match: function(type) {
      return _meta(function(name) {
        return params[name].match(type.params[name]);
      }, function() {
        return returnType.match(type.returnType);
      });
    },
    resolve: function(boundTypes) {
      return _meta(function(name) {
        return params[name].resolve(boundTypes);
      }, function() {
        return returnType.resolve(boundTypes);
      });
    }
  };
}

function OrType() {
  var _subTypes = Array.slice(arguments);
  return {
    toString: function() {
      var subTypeString = _subTypes.map(function(type) {
        return type.toString();
      }).sort().join(", ");
      return "or(" + subTypeString + ")";
    },
    match: function(type) {
      for (var i = 0; i < _subTypes.length; i++) {
        var matchType = _subTypes[i].match(type);
        if (matchType !== null) {
          return matchType;
        }
      }
      return null;
    }
  };
}

function MaybeType(subType) {
  return {
    toString: function() {
      return "maybe(" + subType.toString() + ")";
    },
    match: function(type) {
      if (type === undefined) {
        return undefined;
      }
      return subType.match(type);
    }
  };
}

function ListType(subType) {
  return {
    variadic: true,
    toString: function() {
      return "list(" + subType.toString() + ")";
    },
    match: function(type) {
      if (!type instanceof Array || type.length === 0) {
        return null;
      }
      var matchedTypes = [];
      for (var i = 0; i < type.length; i++) {
        var matchType = subType.match(type[i]);
        if (matchType === null) {
          return null;
        }
        matchedTypes.push(matchType);
      }
      return matchedTypes;
    }
  };
}

function RefType(name) {
  return {
    toString: function() {
      return "ref(" + name + ")";
    },
    resolve: function(boundTypes) {
      return boundTypes.hasOwnProperty(name) ? boundTypes[name] : null;
    }
  };
}

function MaxType() {
  var _subTypes = Array.slice(arguments);
  return {
    toString: function() {
      var subTypeString = _subTypes.map(function(type) {
        return type.toString();
      }).sort().join(", ");
      return "max(" + subTypeString + ")";
    },
    resolve: function(boundTypes) {
      var dataType = null, hasChannel = false;
      for (var i = 0; i < _subTypes.length; i++) {
        var subType = _subTypes[i].resolve(boundTypes);
        if (subType instanceof Array) {
          subType = MaxType.apply(this, subType).resolve(boundTypes);
        }
        var subDataType = subType.dataType || subType;
        if (dataType === null) {
          dataType = subDataType;
        } else {
          if (subDataType !== dataType) {
            return null;
          }
        }
        if (subType.dataType !== undefined) {
          hasChannel = true;
        }
      }
      return hasChannel ? ChannelType(dataType) : dataType;
    }
  };
}

function MaybeChannelType(dataType) {
  return OrType(dataType, ChannelType(dataType));
}

var AnyDataType = OrType(NumberType, StringType, LocationType);

var SExp = {
  _parseImpl: function(s, i) {
    function helper() {
      while (true) {
        if (i >= s.length) throw new Error("parse failed");
        if (s[i] !== " ") break;
        i++;
      }
      var sexp;
      if (s[i] === "(") {
        sexp = [];
        i++;
        while (true) {
          if (i >= s.length) throw new Error("parse failed");
          if (s[i] === ")") break;
          var result = helper();
          sexp.push(result.sexp);
        }
        i++;
      } else {
        var old_i = i;
        if (s[i] === '"') {
          var escaped = false;
          while (++i < s.length) {
            if (s[i] === "\\") {
              escaped = true;
            } else {
              if (s[i] === '"' && !escaped) {
                ++i;
                break;
              }
              escaped = false;
            }
          }
        } else {
          while (i < s.length && s[i] !== " " && s[i] !== ")") i++;
        }
        sexp = s.substring(old_i, i);
        while (i < s.length && s[i] === " ") i++;
      }
      return {
        sexp: sexp,
        pos: i
      };
    }
    return helper();
  },
  parse: function(s) {
    s = s.trim();
    var result = this._parseImpl(s, 0);
    if (result.pos !== s.length) throw new Error("parse failed");
    return result.sexp;
  },
  unparse: function(sexp) {
    if (this.isAtom(sexp)) {
      return sexp;
    }
    var s = [];
    for (var i = 0; i < sexp.length; i++) {
      s.push(this.unparse(sexp[i]));
    }
    return "(" + s.join(" ") + ")";
  },
  parseMany: function(s) {
    s = s.trim();
    var pos = 0, sexps = [];
    while (pos < s.length) {
      var result = this._parseImpl(s, pos);
      pos = result.pos;
      while (s[pos] === " ") pos++;
      sexps.push(result.sexp);
    }
    if (pos !== s.length) throw new Error("parse failed");
    return sexps;
  },
  isList: function(sexp) {
    return sexp instanceof Array;
  },
  isAtom: function(sexp) {
    return !this.isList(sexp);
  },
  equal: function(sexp1, sexp2) {
    return this.unparse(sexp1) === this.unparse(sexp2);
  },
  depth: function(sexp) {
    if (this.isAtom(sexp)) {
      return 0;
    }
    return 1 + d3.max(sexp.map(this.depth.bind(this)));
  }
};

Object.isEmpty = function(obj) {
  for (var i in obj) {
    return false;
  }
  return true;
};

Event.prototype.stop = function() {
  this.preventDefault();
  this.stopPropagation();
};

Event.prototype.isFileDrag = function() {
  return this.dataTransfer !== undefined && this.dataTransfer.items.length > 0 && this.dataTransfer.items[0].kind === "file";
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

function $d3(selection) {
  return $(selection[0][0]);
}

var AutoNice = {
  _niceSteps: [ 1e3, 6e4, 36e5, 864e5, 6048e5, 2592e6, 31536e6, Infinity ],
  _niceMethods: [ null, d3.time.second, d3.time.minute, d3.time.hour, d3.time.day, d3.time.week, d3.time.month, d3.time.year ],
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
    var domain = scale.domain(), dt = Math.abs(domain[1] - domain[0]), i = d3.bisect(this._niceLimits, dt), m = this._niceMethods[i];
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
        return U * Math.sqrt(-2 * Math.log(S) / S);
      }
    }
  },
  combination: function(n, k) {
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
    return keys.sort(function(a, b) {
      return a - b;
    });
  }
};

var Interval = {
  intersect: function(a, b) {
    if (a[1] < b[0] || a[0] > b[1]) {
      return null;
    }
    var ps = [ a[0], a[1], b[0], b[1] ];
    ps.sort();
    return [ ps[1], ps[2] ];
  },
  nice: function(a) {
    return d3.scale.linear().domain(a).nice().domain();
  }
};

var Time = {
  get: function(x) {
    if (typeOf(x) === "string") {
      return +new Date(x);
    }
    return x;
  }
};

var TimeDelta = {
  _regex: /^(-?\d+(\.\d+)?([eE][-+]?\d+)?)?\s*(\w+)$/,
  _unit: function(s) {
    switch (s) {
     case "ms":
     case "msec":
     case "msecs":
     case "millisecond":
     case "milliseconds":
      return 1;

     case "s":
     case "sec":
     case "secs":
     case "second":
     case "seconds":
      return 1e3;

     case "m":
     case "min":
     case "mins":
     case "minute":
     case "minutes":
      return 1e3 * 60;

     case "h":
     case "hr":
     case "hrs":
     case "hour":
     case "hours":
      return 1e3 * 60 * 60;

     case "d":
     case "ds":
     case "day":
     case "days":
      return 1e3 * 60 * 60 * 24;

     case "w":
     case "wk":
     case "wks":
     case "week":
     case "weeks":
      return 1e3 * 60 * 60 * 24 * 7;

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
    if (typeOf(x) === "string") {
      return this.parse(x);
    }
    return x;
  }
};

var Stats = {
  linregress: function(data) {
    var n = 0, mx = 0, my = 0, ssxx = 0, ssyy = 0, ssxy = 0;
    data.each(function(d) {
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
    var b = ssxy / ssxx, a = my - b * mx, R = b * ssxy / ssyy;
    var L = d3.scale.linear().domain([ 0, 1 ]).range([ a, a + b ]);
    return {
      L: L,
      R: R
    };
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
    var fn = this["_" + reduce].bind(this);
    if (fn === undefined) {
      throw new Error("unrecognized reduce operation: " + args.reduce);
    }
    return fn;
  }
};

var DataImportError = new Class({
  Extends: Error,
  initialize: function(msg) {
    this._msg = msg;
  },
  toString: function() {
    return "DataImportError: " + this._msg;
  }
});

var RowLoader = {
  load: function(data) {
    if (data.length === 0) {
      throw new DataImportError("empty data string");
    }
    var rows = d3.csv.parse(data);
    if (rows.length === 0) {
      throw new DataImportError("empty dataset");
    }
    return rows;
  }
};

var ChannelExtractor = {
  _getTimestamps: function(ts) {
    var nowMs = +new Date();
    var isJS = ts.every(function(t) {
      var tf = parseFloat(t);
      return !isNaN(tf) && nowMs / 2 <= tf && tf <= nowMs * 2;
    });
    if (isJS) {
      return ts.map(function(t) {
        return parseFloat(t);
      });
    }
    var nowS = nowMs / 1e3;
    var isUNIX = ts.every(function(t) {
      var tf = parseFloat(t);
      return !isNaN(tf) && nowS / 2 <= tf && tf <= nowS * 2;
    });
    if (isUNIX) {
      return ts.map(function(t) {
        return parseFloat(t) * 1e3;
      });
    }
    var hasTime = ts.every(function(t) {
      return t.indexOf(":") !== -1;
    });
    var tds = ts.map(function(t) {
      var d = new Date(t);
      if (!hasTime && d.getHours() !== 0) {
        var tzOffset = d.getTimezoneOffset() * 60 * 1e3;
        return +d + tzOffset;
      }
      return +d;
    });
    var isDateParseable = tds.every(function(t) {
      return !isNaN(t);
    });
    if (isDateParseable) {
      return tds;
    }
    throw new DataImportError("could not get timestamps!");
  },
  _getFloatValue: function(x) {
    x = x.replace(/,/g, "");
    x = x.replace(/[$€£]/, "");
    if (isNaN(x)) {
      return NaN;
    }
    return parseFloat(x);
  },
  _getValue: function(x) {
    var xFloat = this._getFloatValue(x);
    if (!isNaN(xFloat)) {
      return xFloat;
    }
    return x;
  },
  _extractColumn: function(xcol, rows) {
    var data = [], lastT = null;
    for (var i = 0; i < rows.length; i++) {
      var x = rows[i][xcol];
      if (x === undefined || x.length === 0) {
        continue;
      }
      var t = rows[i]["__t"];
      if (t <= lastT) {
        t = lastT + 1;
      }
      data.push({
        t: t,
        x: this._getValue(x)
      });
      lastT = t;
    }
    return data;
  },
  extract: function(tcols, xcols, rows) {
    if (tcols.length === 0 || xcols.length === 0) {
      throw new DataImportError("missing timestamp or value columns");
    }
    var ts = rows.map(function(row) {
      return tcols.map(function(tcol) {
        return row[tcol];
      }).join(" ");
    });
    ts = this._getTimestamps(ts);
    rows.each(function(row, i) {
      row["__t"] = ts[i];
    });
    rows.sort(function(a, b) {
      return a["__t"] - b["__t"];
    });
    var channels = {};
    xcols.each(function(xcol) {
      channels[xcol] = this._extractColumn(xcol, rows);
    }.bind(this));
    return channels;
  }
};

var ImportDialog = new Class({
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  INITIAL_CHUNK_READ: 4 * 1024,
  initialize: function(root, status) {
    this._root = root;
    this._status = status;
    this._file = null;
    this._currentStep = null;
    this._lines = null;
    this._picked = null;
    this._columns = null;
    this._timeColumns = null;
    this._valueColumns = null;
    this._fullFileReader = null;
    this._backButton = this._root.getElement("#back");
    this._backButton.addEvent("click", this._back.bind(this));
    this._nextButton = this._root.getElement("#next");
    this._nextButton.addEvent("click", this._next.bind(this));
    this._cancelButton = this._root.getElement("#cancel");
    this._cancelButton.addEvent("click", this._cancel.bind(this));
  },
  _step: function(i) {
    this._currentStep = i;
    this._root.getElements(".step").addClass("hidden");
    switch (this._currentStep) {
     case 1:
      this._root.getElement("#step1").removeClass("hidden");
      this._backButton.addClass("disabled");
      this._nextButton.set("value", "next").removeClass("disabled");
      break;

     case 2:
      this._root.getElement("#step2").removeClass("hidden");
      this._backButton.removeClass("disabled");
      this._nextButton.set("value", "next").addClass("disabled");
      break;

     case 3:
      this._root.getElement("#step3").removeClass("hidden");
      this._backButton.removeClass("disabled");
      this._nextButton.set("value", "import").addClass("disabled");
      break;

     case 4:
      this._root.getElement("#step3").removeClass("hidden");
      this._backButton.addClass("disabled");
      this._nextButton.addClass("disabled");
      break;

     default:    }
  },
  _step0: function(file) {
    this._step(0);
    this._file = file;
    if (this._file.size > this.MAX_FILE_SIZE) {
      this._error("file too large!");
    }
    var reader = new FileReader();
    reader.onloadstart = function(evt) {
      if (!evt.lengthComputable) {
        this._error("could not compute file length!");
        return;
      }
    }.bind(this);
    reader.onloadend = function(evt) {
      if (evt.target.readyState !== FileReader.DONE) {
        this._error("failed to load file!");
        return;
      }
      if (this._currentStep !== 0) {
        return;
      }
      this._step1(evt.target.result);
    }.bind(this);
    var blob = this._file.slice(0, this.INITIAL_CHUNK_READ);
    reader.readAsText(blob);
  },
  _pickLines: function(lineData) {
    var rows = d3.csv.parseRows(lineData);
    var maxL = d3.max(rows, function(row) {
      return row.length;
    }), Ls = [];
    for (var i = 0; i <= maxL; i++) {
      Ls.push([]);
    }
    rows.each(function(row, i) {
      Ls[row.length].push(i);
    });
    var maxi = 0;
    for (var i = 1; i <= maxL; i++) {
      if (Ls[i].length > Ls[maxi].length) {
        maxi = i;
      }
    }
    return {
      selected: Ls[maxi][0],
      limit: Ls[maxi][0] + 10
    };
  },
  _step1: function(partialFileData) {
    this._step(1);
    var last = partialFileData.lastIndexOf("\n"), lineData = partialFileData.substring(0, last), picked = this._pickLines(lineData), lines = lineData.split("\n"), stepRoot = this._root.getElement("#step1"), table = stepRoot.getElement(".table");
    this._lines = lines;
    this._picked = picked;
    var buildLine = function(i, selected) {
      var line = this._lines[i], lineNumber = i + 1;
      var rowElem = new Element("div.data-row");
      var cell = new Element("div.data-cell").setStyle("width", "99%").toggleClass("odd", lineNumber % 2 === 1).toggleClass("selected", i === selected).addEvent("click", function(evt) {
        table.getElements(".data-cell").removeClass("selected");
        cell.addClass("selected");
        this._picked = {
          selected: i,
          limit: i + 10
        };
      }.bind(this));
      var text = new Element("div", {
        text: line
      });
      cell.adopt(text);
      rowElem.adopt(cell);
      return rowElem;
    }.bind(this);
    table.empty();
    for (var i = 0; i < this._picked.limit; i++) {
      table.adopt(buildLine(i, this._picked.selected));
    }
    this._root.addClass("active");
  },
  _step2: function() {
    this._step(2);
    var lines = this._lines.slice(this._picked.selected, this._picked.limit), rows = lines.map(function(line) {
      return d3.csv.parseRows(line)[0];
    }), stepRoot = this._root.getElement("#step2"), table = stepRoot.getElement(".table");
    this._columns = rows[0];
    this._timeColumns = new Array(this._columns.length);
    table.setStyle("width", (100 + 2 * 2) * this._columns.length);
    var buildRow = function(row) {
      var rowElem = new Element("div.data-row");
      row.each(function(col, i) {
        var cell = new Element("div.data-cell").set("text", col).setStyle("width", 100).addClass("col_" + i).toggleClass("odd", i % 2 === 1);
        cell.addEvent("click", function(evt) {
          table.getElements(".col_" + i).toggleClass("selected");
          if (this._timeColumns[i] === undefined) {
            this._timeColumns[i] = true;
            this._nextButton.removeClass("disabled");
          } else {
            this._timeColumns[i] = undefined;
            var tcols = this._getColumns(this._timeColumns);
            if (tcols.length === 0) {
              this._nextButton.addClass("disabled");
            }
          }
          console.log(JSON.stringify(this._timeColumns));
        }.bind(this));
        rowElem.adopt(cell);
      }.bind(this));
      return rowElem;
    }.bind(this);
    table.empty();
    for (var i = 0; i < rows.length; i++) {
      table.adopt(buildRow(rows[i]));
    }
  },
  _step3: function() {
    this._step(3);
    var lines = this._lines.slice(this._picked.selected, this._picked.limit), rows = lines.map(function(line) {
      return d3.csv.parseRows(line)[0];
    }), stepRoot = this._root.getElement("#step3"), table = stepRoot.getElement(".table");
    this._valueColumns = new Array(this._columns.length);
    table.setStyle("width", (100 + 2 * 2) * this._columns.length);
    var buildRow = function(row) {
      var rowElem = new Element("div.data-row");
      row.each(function(col, i) {
        var cell = new Element("div.data-cell").setStyle("width", 100).addClass("col_" + i).toggleClass("odd", i % 2 === 1);
        if (this._timeColumns[i] === true) {
          cell.addClass("unselectable");
        } else {
          cell.addEvent("click", function(evt) {
            table.getElements(".col_" + i).toggleClass("selected");
            if (this._valueColumns[i] === undefined) {
              this._valueColumns[i] = true;
              this._nextButton.removeClass("disabled");
            } else {
              this._valueColumns[i] = undefined;
              var xcols = this._getColumns(this._valueColumns);
              if (xcols.length === 0) {
                this._nextButton.addClass("disabled");
              }
            }
            console.log(JSON.stringify(this._timeColumns));
          }.bind(this));
        }
        var text = new Element("div", {
          text: col
        });
        cell.adopt(text);
        rowElem.adopt(cell);
      }.bind(this));
      return rowElem;
    }.bind(this);
    table.empty();
    for (var i = 0; i < rows.length; i++) {
      table.adopt(buildRow(rows[i]));
    }
  },
  _getColumns: function(selection) {
    return this._columns.filter(function(x, i) {
      return selection[i];
    });
  },
  _importData: function(data) {
    var tcols = this._getColumns(this._timeColumns), xcols = this._getColumns(this._valueColumns), rows = RowLoader.load(data), channels = ChannelExtractor.extract(tcols, xcols, rows);
    Object.each(channels, function(channelData, suffix) {
      var fileName = this._file.name, prefix = fileName.substring(0, fileName.lastIndexOf(".")), lowerSuffix = suffix.toLowerCase().replace(" ", "-"), name = prefix + "-" + lowerSuffix;
      Fist.importData(name, channelData, fileName);
    }.bind(this));
  },
  _step4: function() {
    this._step(4);
    var progress = this._root.getElement("#progress");
    this._fullFileReader = new FileReader();
    this._fullFileReader.onloadstart = function(evt) {
      progress.set("value", 0).set("max", evt.total);
    };
    this._fullFileReader.onprogress = function(evt) {
      progress.set("value", evt.loaded);
    };
    this._fullFileReader.onloadend = function(evt) {
      if (evt.target.readyState !== FileReader.DONE) {
        this._error("failed to load file!");
      }
      try {
        this._importData(evt.target.result);
      } catch (e) {
        if (!(e instanceof DataImportError)) {
          throw e;
        }
        this._error(e.toString());
        return;
      }
      this._finish();
    }.bind(this);
    this._fullFileReader.readAsText(this._file);
  },
  _back: function() {
    switch (this._currentStep) {
     case 2:
     case 3:
      this._step(this._currentStep - 1);
      break;

     default:
      var msg = "invalid step for _back(): " + this._currentStep;
      this._error(msg);
    }
  },
  _next: function(args) {
    switch (this._currentStep) {
     case 1:
      this._step2();
      break;

     case 2:
      var tcols = this._getColumns(this._timeColumns);
      if (tcols.length === 0) {
        return;
      }
      this._step3();
      break;

     case 3:
      var xcols = this._getColumns(this._timeColumns);
      if (xcols.length === 0) {
        return;
      }
      this._step4();
      break;

     default:
      var msg = "invalid step for _next(): " + this._currentStep;
      this._error(msg);
    }
  },
  _reset: function() {
    this._file = null;
    this._currentStep = null;
    this._lines = null;
    if (this._fullFileReader !== null) {
      this._fullFileReader.abort();
    }
    this._picked = null;
    this._columns = null;
    this._timeColumns = null;
    this._valueColumns = null;
    this._fullFileReader = null;
  },
  _error: function(msg) {
    this._reset();
    this._status.notOK("import failed! " + msg);
    this._root.removeClass("active");
  },
  _cancel: function() {
    this._reset();
    this._status.notOK("import cancelled.");
    this._root.removeClass("active");
  },
  _finish: function() {
    this._reset();
    this._status.OK("import successful.");
    this._root.removeClass("active");
  },
  show: function(file) {
    this._step0(file);
  }
});

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

var DataChannel = new Class({
  initialize: function(data, source) {
    this._data = Array.clone(data);
    this._data.sort(function(a, b) {
      return a.t - b.t;
    });
    this._index = {};
    for (var i = 0; i < this._data.length; i++) {
      this._index[this._data[i].t] = this._data[i].x;
    }
    this._source = source || "Fist command line";
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
    return "imported from " + this._source;
  }
});

var Fist = {
  VERSION: "0.3.1",
  _symbolTable: {},
  evaluateAtom: function(atom) {
    atom = atom.toString();
    if (!atom) {
      throw new Error("empty atom not allowed");
    }
    var symbolValue = this._symbolTable[atom];
    if (symbolValue !== undefined) {
      return symbolValue;
    }
    var floatValue = parseFloat(atom);
    if (!isNaN(floatValue)) {
      return floatValue;
    }
    if (atom === "true") {
      return true;
    }
    if (atom === "false") {
      return false;
    }
    if (/"(.*)"/.test(atom)) {
      return atom.replace(/"(.*)"/, "$1").replace(/\\"/g, '"');
    }
    throw new Error("unrecognized atom: " + atom);
  },
  isFunction: function(code) {
    return code.args !== undefined;
  },
  isAtom: function(code) {
    return code.args === undefined;
  },
  evaluate: function(code) {
    console.log(JSON.stringify(code));
    var op = this.evaluateAtom(code.op);
    if (this.isAtom(code)) {
      return op;
    }
    if (!(op instanceof FistFunction)) {
      throw new Error("expected operation, got " + typeOf(op));
    }
    var args = {
      __code: {}
    };
    Object.each(code.args, function(arg, name) {
      args.__code[name] = arg;
      if (arg === undefined) {
        args[name] = undefined;
      } else if (arg instanceof Array) {
        args[name] = args.__code[name].map(this.evaluate.bind(this));
      } else {
        args[name] = this.evaluate(args.__code[name]);
      }
    }.bind(this));
    return op.call(this, args);
  },
  registerSymbol: function(name, value, moduleName) {
    this._symbolTable[name] = value;
    if (FistUI.inited) {
      FistUI.onSymbolImport(name, value, moduleName);
    }
  },
  importData: function(name, data, source) {
    this.registerSymbol(name, new DataChannel(data, source));
  },
  importModule: function(namespace, module) {
    if (FistUI.inited) {
      FistUI.onModuleImport(module.__fullName);
    }
    if (module.__exports !== undefined) {
      console.log("found __exports declaration");
      for (var i = 0; i < module.__exports.length; i++) {
        var def = module.__exports[i];
        var defType = typeOf(def);
        if (defType === "string") {
          this.registerSymbol(def, module[def], module.__fullName);
        } else if (defType === "array") {
          if (def.length !== 2) {
            throw new Error("expected internal/external name pair");
          }
          this.registerSymbol(def[1], module[def[0]], module.__fullName);
        } else {
          throw new Error("invalid __exports declaration");
        }
      }
    } else {
      console.log("no __exports declaration, importing all");
      for (var def in module) {
        if (def.indexOf("_") === 0) {
          continue;
        }
        this.registerSymbol(def, module[def], module.__fullName);
      }
    }
  },
  _applyTypes: function(opType, argTypes) {
    var paramNames = Object.keys(opType.params), boundTypes = {};
    for (var i = 0; i < paramNames.length; i++) {
      var name = paramNames[i], type = opType.params[name], matchType = type.match(argTypes[name]);
      if (matchType === null) {
        return null;
      }
      boundTypes[name] = matchType;
    }
    return opType.returnType.resolve(boundTypes);
  },
  evaluateType: function(code) {
    try {
      var opType = Type.fromValue(this.evaluateAtom(code.op));
    } catch (e) {
      return null;
    }
    if (this.isAtom(code)) {
      return opType;
    }
    var argTypes = Object.map(code.args, function(arg, name) {
      console.log("arg: ", arg, name);
      if (arg instanceof Array) {
        return arg.map(this.evaluateType.bind(this));
      }
      return this.evaluateType(arg);
    }.bind(this));
    return this._applyTypes(opType, argTypes);
  },
  blockType: function(name) {
    try {
      var type = Type.fromValue(this.evaluateAtom(name));
      return type && type.node();
    } catch (e) {
      return null;
    }
  }
};

var _unaryOp = function(a, op) {
  if (Type.fromValue(a) === NumberType) {
    return op(a);
  }
  return {
    at: function(t) {
      return op(a.at(t));
    },
    iter: function() {
      return a.iter();
    },
    type: function() {
      return ChannelType(NumberType);
    }
  };
};

var _filterOp = function(a, p) {
  return {
    at: function(t) {
      return p(t) ? a.at(t) : 0;
    },
    iter: function() {
      return new FilterIterator(a.iter(), p);
    },
    type: function() {
      return ChannelType(NumberType);
    }
  };
};

var _binaryOp = function(a, b, op) {
  if (Type.fromValue(a) === NumberType) {
    if (Type.fromValue(b) === NumberType) {
      return op(a, b);
    }
    return {
      at: function(t) {
        return op(a, b.at(t));
      },
      iter: function() {
        return b.iter();
      },
      type: function() {
        return ChannelType(NumberType);
      }
    };
  }
  if (Type.fromValue(b) === NumberType) {
    return {
      at: function(t) {
        return op(a.at(t), b);
      },
      iter: function() {
        return a.iter();
      },
      type: function() {
        return ChannelType(NumberType);
      }
    };
  }
  return {
    at: function(t) {
      return op(a.at(t), b.at(t));
    },
    iter: function() {
      return new UnionIterator([ a.iter(), b.iter() ]);
    },
    type: function() {
      return ChannelType(NumberType);
    }
  };
};

var OpsArith = {
  __exports: [ [ "add", "+" ], [ "subtract", "-" ], [ "multiply", "*" ], [ "divideFloat", "/" ], [ "divideInt", "//" ], [ "mod", "%" ], [ "bucket", "//*" ] ],
  __fullName: "Arithmetic Operations",
  add: new FistFunction(function(args) {
    var channels = [], numberSum = 0;
    for (var i = 0; i < args.values.length; i++) {
      var arg = args.values[i];
      if (Type.fromValue(arg) === NumberType) {
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
        return new UnionIterator(channels.map(function(c) {
          return c.iter();
        }));
      },
      type: function() {
        return ChannelType(NumberType);
      }
    };
  }).type(FunctionType({
    values: ListType(MaybeChannelType(NumberType))
  }, MaxType(RefType("values")))).describe("Takes the sum of its values."),
  multiply: new FistFunction(function(args) {
    var channels = [], numberProd = 1;
    for (var i = 0; i < args.values.length; i++) {
      var arg = args.values[i];
      if (Type.fromValue(arg) === NumberType) {
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
        return new UnionIterator(channels.map(function(c) {
          return c.iter();
        }));
      }
    };
  }).type(FunctionType({
    values: ListType(MaybeChannelType(NumberType))
  }, MaxType(RefType("values")))).describe("Takes the product of its values."),
  subtract: new FistFunction(function(args) {
    if (args.b === undefined) {
      return _unaryOp(args.a, function(a) {
        return -a;
      });
    }
    return _binaryOp(args.a, args.b, function(a, b) {
      return a - b;
    });
  }).type(FunctionType({
    a: MaybeChannelType(NumberType),
    b: MaybeType(MaybeChannelType(NumberType))
  }, MaxType(RefType("a"), RefType("b")))).describe("If only a is provided, negates a. " + "If (a, b) are both provided, produces the difference a - b."),
  divideFloat: new FistFunction(function(args) {
    return _binaryOp(args.a, args.b, function(a, b) {
      return a / b;
    });
  }).type(FunctionType({
    a: MaybeChannelType(NumberType),
    b: MaybeChannelType(NumberType)
  }, MaxType(RefType("a"), RefType("b")))).describe("Produces the quotient a / b including any fractional part."),
  divideInt: new FistFunction(function(args) {
    return _binaryOp(args.a, args.b, function(a, b) {
      return Math.floor(a / b);
    });
  }).type(FunctionType({
    a: MaybeChannelType(NumberType),
    b: MaybeChannelType(NumberType)
  }, MaxType(RefType("a"), RefType("b")))).describe("Produces the quotient a / b rounded down to the nearest integer."),
  mod: new FistFunction(function(args) {
    return _binaryOp(args.a, args.b, function(a, b) {
      return a % b;
    });
  }).type(FunctionType({
    a: MaybeChannelType(NumberType),
    b: NumberType
  }, RefType("a"))).describe("Produces the modulus a % b, or the remainder left over from " + "the quotient a / b. For instance, (% 8 5) is 3."),
  bucket: new FistFunction(function(args) {
    return _binaryOp(args.a, args.b, function(a, b) {
      return Math.floor(a / b) * b;
    });
  }).type(FunctionType({
    a: MaybeChannelType(NumberType),
    b: NumberType
  }, RefType("a"))).describe("Produces the highest multiple of b less " + "than a. For instance, (//* 19 5) is 15. This can be " + "used to place the data in a into equal-sized buckets.")
};

var OpsMath = {
  __fullName: "Math Operations",
  sqrt: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.sqrt(x);
    });
  }).type(FunctionType({
    x: MaybeChannelType(NumberType)
  }, RefType("x"))).describe("Takes the square root of x."),
  pow: new FistFunction(function(args) {
    return _binaryOp(args.x, args.a, function(x, a) {
      return Math.pow(x, a);
    });
  }).type(FunctionType({
    x: MaybeChannelType(NumberType),
    a: NumberType
  }, RefType("x"))).describe("With two parameters (x, a), produces x^a " + "(x to the power of a)."),
  exp: new FistFunction(function(args) {
    if (args.a === undefined) {
      return _unaryOp(args.x, function(x) {
        return Math.exp(x);
      });
    }
    return _binaryOp(args.x, args.a, function(x, a) {
      return Math.pow(a, x);
    });
  }).type(FunctionType({
    a: MaybeType(NumberType),
    x: MaybeChannelType(NumberType)
  }, RefType("x"))).describe("If only x is provided, produces e^x (e to the power of x, " + "where e is roughly 2.718). If both (x, a) are provided, " + "produces a^x (a to the power of x)."),
  log: new FistFunction(function(args) {
    if (args.b === undefined) {
      return _unaryOp(args.x, function(x) {
        return Math.log(x);
      });
    }
    return _binaryOp(args.x, args.b, function(x, b) {
      return Math.log(x) / Math.log(b);
    });
  }).type(FunctionType({
    x: MaybeChannelType(NumberType),
    b: MaybeType(NumberType)
  }, RefType("x"))).describe("If only x is provided, produces ln x (the logarithm of x base e, " + "where e is roughly 2.718). If both (x, b) are provided, " + "produces x log b (the logarithm of x base b)."),
  abs: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.abs(x);
    });
  }).type(FunctionType({
    x: MaybeChannelType(NumberType)
  }, RefType("x"))).describe("Produces the absolute value of x."),
  floor: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.floor(x);
    });
  }).type(FunctionType({
    x: MaybeChannelType(NumberType)
  }, RefType("x"))).describe("Rounds x down to the nearest integer."),
  round: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.round(x);
    });
  }).type(FunctionType({
    x: MaybeChannelType(NumberType)
  }, RefType("x"))).describe("Rounds x up or down to the nearest integer."),
  ceil: new FistFunction(function(args) {
    return _unaryOp(args.x, function(x) {
      return Math.ceil(x);
    });
  }).type(FunctionType({
    x: MaybeChannelType(NumberType)
  }, RefType("x"))).describe("Rounds x up to the nearest integer.")
};

var ConstsMath = {
  __fullName: "Math Constants",
  e: Math.E,
  pi: Math.PI
};

var OpsString = {
  __fullName: "String Operations",
  substring: new FistFunction(function(args) {
    return _unaryOp(args.c, function(s) {
      var n = s.length, start = args.start, end = args.end || n;
      if (start < 0) {
        start += n;
      }
      if (end < 0) {
        end += n;
      }
      return s.substring(start, end);
    });
  }).type(FunctionType({
    c: ChannelType(StringType),
    start: NumberType,
    end: MaybeType(NumberType)
  }, ChannelType(StringType))).describe("Produces a channel whose values are fixed-position substrings of " + "the values of c."),
  length: new FistFunction(function(args) {
    return _unaryOp(args.c, function(s) {
      return s.length;
    });
  }).type(FunctionType({
    c: ChannelType(StringType)
  }, ChannelType(NumberType))).describe("Produces a channel whose values are the lengths, or number of " + "characters, of the values of c.")
};

var OpsLocation = {
  __exports: [ [ "distanceFrom", "distance-from" ] ],
  __fullName: "Location Operations",
  distanceFrom: new FistFunction(function(args) {
    var _plat = args.p.lat.toRad(), _plng = args.p.lng.toRad(), _R = 6371009;
    return {
      at: function(t) {
        var cp = args.c.at(t), lat = cp.lat.toRad(), lng = cp.lng.toRad(), dLat = lat - _plat, dLng = lng - _plng;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(_plat) * Math.cos(lat);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return _R * c;
      },
      iter: function() {
        return args.c.iter();
      }
    };
  }).type(FunctionType({
    c: ChannelType(LocationType),
    p: LocationType
  }, ChannelType(NumberType))).describe("Produces a channel whose values are the distances of each data " + "point (lat, lng) from (pointLat, pointLng).")
};

var OpsTime = {
  __exports: [ [ "timeShift", "time-shift" ], [ "timeBucket", "time-bucket" ], [ "timeIdentity", "time-identity" ], [ "hourOfDay", "hour-of-day" ], [ "dayOfWeek", "day-of-week" ], [ "monthOfYear", "month-of-year" ] ],
  __fullName: "Time Operations",
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
  }).type(FunctionType({
    c: ChannelType(AnyDataType),
    dt: TimeDeltaType
  }, RefType("c"))).describe("Time-shifts c by dt milliseconds. " + "For instance, (time-shift c 3600000) shifts c forward one hour, " + 'whereas (time-shift c "-1 minute") shifts c back one minute.'),
  timeBucket: new FistFunction(function(args) {
    var _iter = args.c.iter(), _dt = TimeDelta.get(args.dt), _data = [], _reduce = Reduce.get(args.reduce), _n = 0;
    while (true) {
      try {
        var t = _iter.next(), x = args.c.at(t);
        t = Math.floor(t / _dt) * _dt;
        if (_n === 0 || t > _data[_n - 1].t) {
          _data.push({
            t: t,
            xs: []
          });
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
      return {
        t: bucket.t,
        x: _reduce(bucket.xs)
      };
    });
    return new DataChannel(_data);
  }).type(FunctionType({
    c: ChannelType(NumberType),
    reduce: StringType,
    dt: TimeDeltaType
  }, ChannelType(NumberType))).describe("Groups the data from c into time buckets of width dt, then " + "combines the data in each bucket according to reduce. " + 'reduce can be one of "count", "sum", or "average", which ' + "specifies the combining operation."),
  timeIdentity: new FistFunction(function(args) {
    return {
      at: function(t) {
        return t;
      },
      iter: function() {
        return args.c.iter();
      }
    };
  }).type(FunctionType({
    c: ChannelType(AnyDataType)
  }, ChannelType(NumberType))).describe("Produces a channel whose values are the timestamps of c."),
  hourOfDay: new FistFunction(function(args) {
    return {
      at: function(t) {
        return new Date(t).getHours();
      },
      iter: function() {
        return args.c.iter();
      }
    };
  }).type(FunctionType({
    c: ChannelType(AnyDataType)
  }, ChannelType(NumberType))).describe("Produces a channel whose values are the hours of day (0-23) " + "corresponding to the timestamps of c."),
  dayOfWeek: new FistFunction(function(args) {
    return {
      at: function(t) {
        return new Date(t).getDay();
      },
      iter: function() {
        return args.c.iter();
      }
    };
  }).type(FunctionType({
    c: ChannelType(AnyDataType)
  }, ChannelType(NumberType))).describe("Produces a channel whose values are the days of week (0-6) " + "corresponding to the timestamps of c."),
  monthOfYear: new FistFunction(function(args) {
    return {
      at: function(t) {
        return new Date(t).getMonth() + 1;
      },
      iter: function() {
        return args.c.iter();
      }
    };
  }).type(FunctionType({
    c: ChannelType(AnyDataType)
  }, ChannelType(NumberType))).describe("Produces a channel whose values are the months of year (1-12) " + "corresponding to the timestamps of c.")
};

var OpsSmooth = {
  __exports: [ [ "rollingAverage", "rolling-average" ], [ "slidingWindow", "sliding-window" ], [ "medianFilter", "median-filter" ], [ "rateOfChange", "rate-of-change" ], [ "cumulativeSum", "cumulative-sum" ] ],
  __fullName: "Smoothing Operations",
  rollingAverage: new FistFunction(function(args) {
    var _iter = args.c.iter(), _halfLife = TimeDelta.get(args.halfLife), _data = [];
    while (true) {
      try {
        var t = _iter.next(), x = args.c.at(t), n = _data.length;
        if (n > 0) {
          var dt = t - _data[n - 1].t, beta = Math.pow(.5, dt / _halfLife), mu = _data[n - 1].x;
          x = beta * mu + (1 - beta) * x;
        }
        _data.push({
          t: t,
          x: x
        });
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    return new DataChannel(_data);
  }).type(FunctionType({
    c: ChannelType(NumberType),
    halfLife: TimeDeltaType
  }, ChannelType(NumberType))).describe("Applies a rolling average to c " + "that decays by 50% over halfLife milliseconds."),
  slidingWindow: new FistFunction(function(args) {
    var _iter = args.c.iter(), _data = [], _buf = new Array(args.windowSize), _i = -1, _n = 0, _sum = 0;
    while (true) {
      try {
        var t = _iter.next(), x = args.c.at(t);
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
        _data.push({
          t: t,
          x: _sum / _n
        });
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    return new DataChannel(_data);
  }).type(FunctionType({
    c: ChannelType(NumberType),
    windowSize: NumberType
  }, ChannelType(NumberType))).describe("Applies a sliding window " + "average to c that uses the last windowSize data points."),
  medianFilter: new FistFunction(function(args) {
    var _iter = args.c.iter(), _data = [], _size = args.filterSize * 2 + 1, _buf = new Array(_size), _i = -1, _j = args.filterSize, _n = 0;
    while (true) {
      try {
        var t = _iter.next(), x = args.c.at(t);
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
        _buf[_i] = {
          t: t,
          x: x
        };
        if (_n <= args.filterSize) {
          continue;
        }
        var jt = _buf[_j].t, filter = _buf.slice(0, _n);
        filter.sort(function(a, b) {
          return a.x - b.x;
        });
        if (_n % 2 === 0) {
          var a = filter[_n / 2 - 1].x, b = filter[_n / 2].x;
          _data.push({
            t: jt,
            x: (a + b) / 2
          });
        } else {
          var a = filter[(_n - 1) / 2].x;
          _data.push({
            t: jt,
            x: a
          });
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
      var jt = _buf[_j].t, filter = [], k = _i;
      while (filter.length < _n) {
        k++;
        if (k === _size) {
          k = 0;
        }
        filter.push(_buf[k]);
      }
      filter.sort(function(a, b) {
        return a.x - b.x;
      });
      if (_n % 2 === 0) {
        var a = filter[_n / 2 - 1].x, b = filter[_n / 2].x;
        _data.push({
          t: jt,
          x: (a + b) / 2
        });
      } else {
        var a = filter[(_n - 1) / 2].x;
        _data.push({
          t: jt,
          x: a
        });
      }
    }
    return new DataChannel(_data);
  }).type(FunctionType({
    c: ChannelType(NumberType),
    filterSize: NumberType
  }, ChannelType(NumberType))).describe("Applies a median filter to c that uses the last filterSize " + "data points. This can be used to reduce noise in data."),
  rateOfChange: new FistFunction(function(args) {
    var _iter = args.c.iter(), _rateUnit = TimeDelta.get(args.rateUnit), _last = null, _data = [];
    while (true) {
      try {
        var t = _iter.next(), x = args.c.at(t);
        if (_last === null) {
          _last = {
            t: t - _rateUnit,
            x: x
          };
        }
        var dt = (t - _last.t) / _rateUnit, dx = x - _last.x;
        _data.push({
          t: t,
          x: dx / dt
        });
        _last = {
          t: t,
          x: x
        };
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    return new DataChannel(_data);
  }).type(FunctionType({
    c: ChannelType(NumberType),
    rateUnit: TimeDeltaType
  }, ChannelType(NumberType))).describe("Calculates the rate of change of c per rateUnit milliseconds. " + 'For instance, (rate-of-change c "1 hour") is change per hour.'),
  cumulativeSum: new FistFunction(function(args) {
    var _iter = args.c.iter(), _sum = 0, _data = [];
    while (true) {
      try {
        var t = _iter.next(), x = args.c.at(t);
        _sum += x;
        _data.push({
          t: t,
          x: _sum
        });
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    return new DataChannel(_data);
  }).type(FunctionType({
    c: ChannelType(NumberType)
  }, ChannelType(NumberType))).describe("Calculates the cumulative sum of c, or total of all data points " + "in c up to each point in time.")
};

var OpsJoin = {
  __fullName: "Join Operations",
  join: new FistFunction(function(args) {
    return {
      at: function(t) {
        return args.c.at(t);
      },
      iter: function() {
        var iters = args.joins.map(function(j) {
          return j.iter();
        });
        iters.unshift(args.c.iter());
        return new IntersectionIterator(iters);
      }
    };
  }).type(FunctionType({
    c: ChannelType(AnyDataType),
    joins: ListType(ChannelType(AnyDataType))
  }, RefType("c"))).describe("Produces a channel with values from c, filtered to only those " + "timestamps present in both c and each of the joins channels.")
};

var OpsFilterValue = {
  __exports: [ [ "lt", "value-less-than" ], [ "lteq", "value-at-most" ], [ "eq", "value-is" ], [ "neq", "value-is-not" ], [ "gteq", "value-at-least" ], [ "gt", "value-more-than" ], [ "valueBetween", "value-between" ] ],
  __fullName: "Value Filters",
  lt: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) < args.x;
    });
  }).type(FunctionType({
    c: ChannelType(NumberType),
    x: NumberType
  }, ChannelType(NumberType))).describe("Filters c to contain only values less than x."),
  lteq: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) <= args.x;
    });
  }).type(FunctionType({
    c: ChannelType(NumberType),
    x: NumberType
  }, ChannelType(NumberType))).describe("Filters c to contain only values less than or equal to x."),
  eq: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) === args.x;
    });
  }).type(FunctionType({
    c: ChannelType(AnyDataType),
    x: AnyDataType
  }, RefType("c"))).describe("Filters c to contain only values equal to x."),
  neq: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) !== args.x;
    });
  }).type(FunctionType({
    c: ChannelType(AnyDataType),
    x: AnyDataType
  }, RefType("c"))).describe("Filters c to contain only values not equal to x."),
  gteq: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) >= args.x;
    });
  }).type(FunctionType({
    c: ChannelType(NumberType),
    x: NumberType
  }, ChannelType(NumberType))).describe("Filters c to contain only values greater than or equal to x."),
  gt: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      return args.c.at(t) > args.x;
    });
  }).type(FunctionType({
    c: ChannelType(NumberType),
    x: NumberType
  }, ChannelType(NumberType))).describe("Filters c to contain only values greater than x."),
  valueBetween: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      var x = args.c.at(t);
      return x >= args.x1 && x < args.x2;
    });
  }).type(FunctionType({
    c: ChannelType(NumberType),
    x1: NumberType,
    x2: NumberType
  }, ChannelType(NumberType))).describe("Filters c to contain only values between x1 (inclusive) and " + "x2 (exclusive).")
};

var OpsFilterTime = {
  __exports: [ [ "since", "time-since" ], [ "until", "time-until" ], [ "between", "time-between" ] ],
  __fullName: "Time Filters",
  since: new FistFunction(function(args) {
    var _since = Time.get(args.since);
    return _filterOp(args.c, function(t) {
      return t >= _since;
    });
  }).type(FunctionType({
    c: ChannelType(AnyDataType),
    since: TimeType
  }, RefType("c"))).describe("Filters c to contain only data points from on or after since."),
  until: new FistFunction(function(args) {
    var _until = Time.get(args.until);
    return _filterOp(args.c, function(t) {
      return t < _until;
    });
  }).type(FunctionType({
    c: ChannelType(AnyDataType),
    until: TimeType
  }, RefType("c"))).describe("Filters c to contain only data points from before until."),
  between: new FistFunction(function(args) {
    var _since = Time.get(args.since), _until = Time.get(args.until);
    return _filterOp(args.c, function(t) {
      return t >= _since && t < _until;
    });
  }).type(FunctionType({
    c: ChannelType(AnyDataType),
    since: TimeType,
    until: TimeType
  }, RefType("c"))).describe("Filters c to contain only data points from between since " + "(inclusive) and until (exclusive).")
};

var OpsFilterString = {
  __exports: [ [ "startsWith", "starts-with" ], [ "endsWith", "ends-with" ] ],
  __fullName: "String Filters",
  startsWith: new FistFunction(function(args) {
    return _filterOp(args.c, function(t) {
      var s = args.c.at(t);
      return s.indexOf(args.prefix) === 0;
    });
  }).type(FunctionType({
    c: ChannelType(StringType),
    prefix: StringType
  }, ChannelType(StringType))).describe("Filters c to contain only values that start with prefix."),
  endsWith: new FistFunction(function(args) {
    var _suffixLen = args.suffix.length;
    return _filterOp(args.c, function(t) {
      var s = args.c.at(t), i = s.lastIndexOf(args.suffix);
      return i !== -1 && i === s.length - _suffixLen;
    });
  }).type(FunctionType({
    c: ChannelType(StringType),
    suffix: StringType
  }, ChannelType(StringType))).describe("Filters c to contain only values that end with suffix.")
};

var OpsFilterLocation = {};

var OpsFilterRegion = {};

var GensData = {
  __fullName: "Data Generators",
  constant: new FistFunction(function(args) {
    return function(t) {
      return args.x;
    };
  }).type(FunctionType({
    x: NumberType
  }, FunctionType({
    t: NumberType
  }, NumberType))).describe("Produces a data generator that, when evaluated at a timestamp, " + "returns x."),
  choice: new FistFunction(function(args) {
    return function(t) {
      return Random.choice(args.values);
    };
  }).type(FunctionType({
    values: ListType(AnyDataType)
  }, FunctionType({
    t: NumberType
  }, MaxType(RefType("values"))))).describe("Produces a data generator that, when evaluated at a timestamp, " + "returns a value selected at random from values."),
  uniform: new FistFunction(function(args) {
    return function(t) {
      return Random.uniform(args.min, args.max);
    };
  }).type(FunctionType({
    min: NumberType,
    max: NumberType
  }, FunctionType({
    t: NumberType
  }, NumberType))).describe("Produces a data generator that, when evaluated at a timestamp, " + "returns a random value between min (inclusive) and max (exclusive)."),
  gaussian: new FistFunction(function(args) {
    return function(t) {
      return args.mu + args.sigma * Random.gaussian();
    };
  }).type(FunctionType({
    mu: NumberType,
    sigma: NumberType
  }, FunctionType({
    t: NumberType
  }, NumberType))).describe("Produces a data generator that, when evaluated at a timestamp, " + "returns a normally distributed value with mean mu and " + "standard deviation sigma.")
};

var GensChannel = {
  __exports: [ [ "genRegular", "gen-regular" ], [ "genUniform", "gen-uniform" ], [ "genPoisson", "gen-poisson" ], [ "genFromChannel", "gen-from-channel" ] ],
  __fullName: "Channel Generators",
  genRegular: new FistFunction(function(args) {
    var _dt = (args.until - args.since) / args.n, _t = args.since, _data = [];
    for (var i = 0; i < args.n; i++) {
      _data.push({
        t: _t,
        x: args.gen(_t)
      });
      _t += _dt;
    }
    return new DataChannel(_data);
  }).type(FunctionType({
    gen: FunctionType({
      t: NumberType
    }, NumberType),
    since: NumberType,
    until: NumberType,
    n: NumberType
  }, ChannelType(NumberType))).describe("Produces a channel by evaluating gen at n evenly spaced timestamps " + "between since (inclusive) and until (exclusive)."),
  genUniform: new FistFunction(function(args) {
    var _dts = Random.combination(args.until - args.since, args.n), _data = [];
    for (var i = 0; i < args.n; i++) {
      var _t = args.since + _dts[i];
      _data.push({
        t: _t,
        x: args.gen(_t)
      });
    }
    return new DataChannel(_data);
  }).type(FunctionType({
    gen: FunctionType({
      t: NumberType
    }, NumberType),
    since: NumberType,
    until: NumberType,
    n: NumberType
  }, ChannelType(NumberType))).describe("Produces a channel by evaluating gen at n timestamps selected " + "randomly from between since (inclusive) and until (exclusive)."),
  genPoisson: new FistFunction(function(args) {
    var _t = args.since, _data = [];
    while (_t < args.until) {
      _data.push({
        t: _t,
        x: args.gen(_t)
      });
      var _x = Math.max(1e-12, Math.random()), _dt = Math.max(1, Math.round(args.rate * -Math.log(_x)));
      _t += _dt;
    }
    return new DataChannel(_data);
  }).type(FunctionType({
    gen: FunctionType({
      t: NumberType
    }, NumberType),
    since: NumberType,
    until: NumberType,
    rate: TimeDeltaType
  }, ChannelType(NumberType))).describe("Produces a channel by evaluating gen roughly once every rate " + "milliseconds between since (inclusive) and until (exclusive). " + "The exact timestamps are computed using a Poisson distribution, " + "which models events happening randomly over time (e.g. customers " + "arriving at a store, emails sent to your inbox)."),
  genFromChannel: new FistFunction(function(args) {
    return {
      at: function(t) {
        return args.gen(t);
      },
      iter: function() {
        return args.c.iter();
      }
    };
  }).type(FunctionType({
    gen: FunctionType({
      t: NumberType
    }, NumberType),
    c: ChannelType(NumberType)
  }, ChannelType(NumberType))).describe("Produces a channel by evaluating gen at every timestamp present in c.")
};

var View = {
  __exports: [ [ "viewLine", "view-line" ], [ "viewCrossfilter", "view-crossfilter" ], [ "viewHistogram", "view-histogram" ], [ "viewPlot", "view-plot" ] ],
  __fullName: "Views",
  viewLine: new FistFunction(function(args) {
    FistUI.onViewInvoked("line", args);
  }).type(FunctionType({
    channels: ListType(ChannelType(NumberType))
  }, ViewType)).describe("Displays its channels as line charts."),
  viewCrossfilter: new FistFunction(function(args) {
    FistUI.onViewInvoked("crossfilter", args);
  }).type(FunctionType({
    channels: ListType(ChannelType(OrType(NumberType, StringType)))
  }, ViewType)).describe("Displays its channels as a series of distribution bar charts. " + "Each chart can be filtered, which updates all other charts to " + "show the filtered distribution across dimensions. Numeric data " + "allows for range filtering, whereas categorical data is filtered " + "by exact match against one or more categories."),
  viewHistogram: new FistFunction(function(args) {
    FistUI.onViewInvoked("histogram", args);
  }).type(FunctionType({
    channel: ChannelType(NumberType),
    groupBy: MaybeType(ChannelType(NumberType)),
    bucket: MaybeType(NumberType),
    reduce: MaybeType(StringType)
  }, ViewType)).describe("Displays its channel as a histogram. If groupBy is " + "provided, the values of channel are grouped by the " + "values of groupBy at the same timestamps. " + "If bucket is provided, it is used as the width of the " + "histogram buckets. If provided, reduce can be one of " + '"count", "sum", or "average", which specifies how values ' + "in each bucket are to be combined."),
  viewPlot: new FistFunction(function(args) {
    FistUI.onViewInvoked("plot", args);
  }).type(FunctionType({
    x: ChannelType(NumberType),
    y: ChannelType(NumberType),
    area: MaybeType(ChannelType(NumberType)),
    color: MaybeType(ChannelType(OrType(NumberType, StringType)))
  }, ViewType)).describe("Uses the x and y channels to make an x-y plot. If x and y are " + "highly correlated, also displays the line of best fit. If area is " + "provided, it is used to determine the area of the (x, y) points. " + "If color is provided, it is used to determine the color of the " + "(x, y) points. Categorical data for color will use one color for " + "each unique value, whereas numeric data will use a color gradient " + "over the value range.")
};

var LibFist = {
  modules: [ View, OpsArith, OpsMath, ConstsMath, OpsString, OpsLocation, OpsTime, OpsSmooth, OpsJoin, OpsFilterValue, OpsFilterTime, OpsFilterString, GensData, GensChannel ],
  "import": function() {
    this.modules.each(function(module) {
      Fist.importModule(null, module);
    });
  }
};

var SVGUtils = {
  translate: function(pos) {
    return "translate(" + pos.x + ", " + pos.y + ")";
  },
  translateToHide: function() {
    return "translate(-1000, -1000)";
  }
};

var HitArea = new Class({
  initialize: function(graph, node, id) {
    var blockGroup = node._g;
    this.node = node;
    this.id = id;
    this.pos = this._getPosition();
    this._hit = blockGroup.append("svg:rect").attr("class", "hit").attr("x", this.pos.x).attr("y", this.pos.y).attr("width", HitArea.WIDTH).attr("height", HitArea.HEIGHT);
  },
  getEdgePos: function() {
    return {
      x: this.node.dims.x + this.pos.x + HitArea.WIDTH / 2,
      y: this.node.dims.y + this.pos.y + HitArea.HEIGHT / 2
    };
  },
  cleanup: function() {
    this._hit.remove();
  }
});

HitArea.WIDTH = 12;

HitArea.HEIGHT = 5;

HitArea.PADDING = 4;

var InputHitArea = new Class({
  Extends: HitArea,
  initialize: function(graph, node, id, param, type) {
    this.parent(graph, node, id);
    this.param = param;
    this.variadic = !!type.variadic;
    var nameColorHSL = d3.hsl(node.inputColors(param)), typeColorHSL = nameColorHSL.brighter(.7), rowColorHSL = nameColorHSL.brighter(1.4);
    typeColorHSL.s *= .7;
    rowColorHSL.s *= 1.1;
    this._hit.attr("id", [ "input", this.node.id, this.id ].join("_")).style("stroke", typeColorHSL.toString()).style("fill", rowColorHSL.toString()).on("mouseover", function() {
      this._hit.style("stroke", nameColorHSL.toString()).style("fill", typeColorHSL.toString());
    }.bind(this)).on("mouseout", function() {
      this._hit.style("stroke", typeColorHSL.toString()).style("fill", rowColorHSL.toString());
    }.bind(this)).call(InputHitArea._edgeCreateBehavior(graph, this));
    this._tips = new Tips($d3(this._hit), {
      className: "fistdocs",
      title: function(element) {
        return param;
      },
      text: function(element) {
        return type.toString();
      }
    });
  },
  _getPosition: function() {
    return {
      x: this.id * (HitArea.WIDTH + HitArea.PADDING),
      y: -HitArea.HEIGHT
    };
  },
  isFull: function() {
    return this.node.edgeIn(this.id) !== undefined;
  },
  update: function() {
    this.pos = this._getPosition();
    this._hit.attr("id", [ "input", this.node.id, this.id ].join("_")).attr("x", this.pos.x).attr("y", this.pos.y);
  }
});

InputHitArea._edgeCreateBehavior = function(graph, input) {
  return d3.behavior.drag().on("dragstart", function() {
    d3.event.sourceEvent.stopPropagation();
    var inputPos = input.getEdgePos();
    graph._tempEdgeGroup.attr("transform", SVGUtils.translate(inputPos));
    graph._tempEdgeEnd.x = 0;
    graph._tempEdgeEnd.y = 0;
    graph._tempEdge.attr("x1", graph._tempEdgeEnd.x).attr("y1", graph._tempEdgeEnd.y).attr("x2", 0).attr("y2", 0);
  }).on("dragend", function(d) {
    d3.event.sourceEvent.stopPropagation();
    graph._tempEdgeGroup.attr("transform", SVGUtils.translateToHide());
    var target = d3.event.sourceEvent.target, output = OutputHitArea.fromElement(graph, target);
    if (output === undefined) {
      console.log("skipping, invalid elem target");
      return;
    }
    graph.addEdge(output, input);
  }).on("drag", function(d) {
    graph._tempEdgeEnd.x += d3.event.dx;
    graph._tempEdgeEnd.y += d3.event.dy;
    graph._tempEdge.attr("x1", graph._tempEdgeEnd.x).attr("y1", graph._tempEdgeEnd.y);
  });
};

InputHitArea.fromElement = function(graph, elem) {
  var hitParts = elem.id.split("_");
  if (hitParts.length !== 3) {
    return undefined;
  }
  var input = hitParts[0], nodeID = hitParts[1], id = hitParts[2];
  if (input !== "input") {
    return undefined;
  }
  var node = graph._nodes[nodeID];
  if (node === undefined) {
    return undefined;
  }
  return node.inputs[id];
};

var OutputHitArea = new Class({
  Extends: HitArea,
  initialize: function(graph, node, id) {
    this.parent(graph, node, id);
    this._hit.attr("id", [ "output", this.node.id, this.id ].join("_")).on("mouseover", function() {
      this._hit.attr("class", "hit hover");
    }.bind(this)).on("mouseout", function() {
      this._hit.attr("class", "hit");
    }.bind(this)).call(OutputHitArea._edgeCreateBehavior(graph, this));
  },
  _getPosition: function() {
    return {
      x: this.id * (HitArea.WIDTH + HitArea.PADDING),
      y: this.node.dims.h
    };
  }
});

OutputHitArea._edgeCreateBehavior = function(graph, output) {
  return d3.behavior.drag().on("dragstart", function() {
    d3.event.sourceEvent.stopPropagation();
    var outputPos = output.getEdgePos();
    graph._tempEdgeGroup.attr("transform", SVGUtils.translate(outputPos));
    graph._tempEdgeEnd.x = 0;
    graph._tempEdgeEnd.y = 0;
    graph._tempEdge.attr("x1", 0).attr("y1", 0).attr("x2", graph._tempEdgeEnd.x).attr("y2", graph._tempEdgeEnd.y);
  }).on("dragend", function(d) {
    d3.event.sourceEvent.stopPropagation();
    graph._tempEdgeGroup.attr("transform", SVGUtils.translateToHide());
    var target = d3.event.sourceEvent.target, input = InputHitArea.fromElement(graph, target);
    if (input === undefined || input.type !== HitArea.INPUT) {
      console.log("skipping, invalid elem target");
      return;
    }
    graph.addEdge(output, input);
  }).on("drag", function(d) {
    graph._tempEdgeEnd.x += d3.event.dx;
    graph._tempEdgeEnd.y += d3.event.dy;
    graph._tempEdge.attr("x2", graph._tempEdgeEnd.x).attr("y2", graph._tempEdgeEnd.y);
  });
};

OutputHitArea.fromElement = function(graph, elem) {
  var hitParts = elem.id.split("_");
  if (hitParts.length !== 3) {
    return undefined;
  }
  var output = hitParts[0], nodeID = hitParts[1], id = hitParts[2];
  if (output !== "output") {
    return undefined;
  }
  var node = graph._nodes[nodeID];
  if (node === undefined) {
    return undefined;
  }
  return node.outputs[id];
};

var Node = new Class({
  initialize: function(graph, nodeGroup, name, pos, id) {
    this.name = name;
    this.type = Fist.blockType(name);
    this.dims = graph.nodeDimensions(name, pos);
    this.id = id;
    this._edgesOut = {};
    this._edgesIn = {};
    this._dragging = false;
    this._g = nodeGroup.append("svg:g").attr("class", "block").attr("transform", SVGUtils.translate(this.dims)).on("dblclick", function() {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      var name = window.prompt("edit node name:", this.name);
      if (!name || name === this.name) {
        return;
      }
      graph.replaceNode(this, name, this.dims);
    }.bind(this)).call(Node._dragBehavior(graph, this));
    this._rect = this._g.append("svg:rect").attr("class", "block " + this.type).attr("x", 0).attr("y", 0).attr("width", this.dims.w).attr("height", this.dims.h);
    this._text = this._g.append("svg:text").attr("class", "block " + this.type).attr("x", this.dims.w / 2).attr("y", this.dims.h / 2).attr("dy", ".35em").attr("text-anchor", "middle").text(this.name);
    this.inputs = [];
    this.inputColors = d3.scale.category10();
    this._inputCount = {};
    this._fullType = Fist.evaluateType({
      op: name
    });
    if (this.type === "function") {
      Object.each(this._fullType.params, function(type, param) {
        this.inputs.push(new InputHitArea(graph, this, this.inputs.length, param, type));
        this._inputCount[param] = 1;
      }.bind(this));
    }
    this.outputs = [];
    if (this.type === "function") {
      if (!Type.equal(this._fullType.returnType, ViewType)) {
        this.outputs.push(new OutputHitArea(graph, this, 0));
      }
    } else {
      this.outputs.push(new OutputHitArea(graph, this, 0));
    }
  },
  addVariadicInput: function(graph, param) {
    var last = this.inputs.length - 1;
    for (;last >= 0 && this.inputs[last].param !== param; i--) {}
    if (last < 0) {
      throw new Error("cannot add param " + param + " to node");
    }
    var paramType = this._fullType.params[param], input = new InputHitArea(graph, this, last + 1, param, paramType);
    this.inputs.splice(last + 1, 0, input);
    this._inputCount[param]++;
    for (var i = this.inputs.length - 1; i > last + 1; i--) {
      this.inputs[i].id = i;
      this.inputs[i].update();
      if (this._edgesIn[i - 1] !== undefined) {
        this._edgesIn[i] = this._edgesIn[i - 1];
        this._edgesIn[i].update();
      }
    }
  },
  move: function(dx, dy) {
    this.dims.x += dx;
    this.dims.y += dy;
    this._g.attr("transform", SVGUtils.translate(this.dims));
    this.allEdges().each(function(edge) {
      edge.update();
    });
    return this;
  },
  addEdge: function(edge) {
    if (edge.input.node === this) {
      this._edgesIn[edge.input.id] = edge;
    } else if (edge.output.node === this) {
      if (this._edgesOut[edge.output.id] === undefined) {
        this._edgesOut[edge.output.id] = [];
      }
      this._edgesOut[edge.output.id].push(edge);
    }
    return this;
  },
  deleteEdge: function(edge) {
    if (edge.input.node === this) {
      delete this._edgesIn[edge.input.id];
      if (!edge.input.variadic || this._inputCount[edge.input.param] === 1) {
        return;
      }
      var inputs = this.inputs.splice(edge.input.id, 1);
      inputs[0].cleanup();
      this._inputCount[edge.input.param]--;
      for (var i = edge.input.id; i < this.inputs.length; i++) {
        this.inputs[i].id = i;
        this.inputs[i].update();
        if (this._edgesIn[i + 1] !== undefined) {
          this._edgesIn[i] = this._edgesIn[i + 1];
          this._edgesIn[i].update();
          delete this._edgesIn[i + 1];
        }
      }
      console.log(Object.keys(this._edgesIn), Object.keys(this.inputs));
    } else if (edge.output.node === this) {
      this._edgesOut[edge.output.id].erase(edge);
    }
    return this;
  },
  cleanup: function() {
    this._g.remove();
  },
  edgeIn: function(inputID) {
    return this._edgesIn[inputID];
  },
  edgesOut: function(outputID) {
    return this._edgesOut[outputID];
  },
  allEdgesIn: function() {
    return Object.values(this._edgesIn);
  },
  allEdgesOut: function() {
    return Object.values(this._edgesOut).flatten();
  },
  allEdges: function() {
    return this.allEdgesIn().append(this.allEdgesOut());
  }
});

Node.PADDING = 2;

Node._dragBehavior = function(graph, node) {
  return d3.behavior.drag().origin(Object).on("dragstart", function() {
    node._dragging = true;
  }).on("dragend", function() {
    if (!graph.isInViewer(d3.event.sourceEvent.target)) {
      graph.deleteNode(node);
    } else {
      this._dragging = false;
    }
  }).on("drag", function() {
    node.move(d3.event.dx, d3.event.dy);
  });
};

Node._depthSearch = function(fromNode, toNode, visited) {
  visited[fromNode.id] = true;
  if (fromNode === toNode) {
    return true;
  }
  var edges = fromNode.allEdgesOut();
  for (var i = 0; i < edges.length; i++) {
    var nextNode = edges[i].input.node;
    if (visited[nextNode.id]) {
      continue;
    }
    if (Node._depthSearch(nextNode, toNode, visited)) {
      return true;
    }
  }
  return false;
};

Node.existsPath = function(fromNode, toNode) {
  var visited = {};
  return Node._depthSearch(fromNode, toNode, visited);
};

var Edge = new Class({
  initialize: function(graph, edgeGroup, output, input) {
    this.output = output;
    this.input = input;
    this._line = edgeGroup.append("svg:line").attr("class", "edge").attr("marker-end", "url(#edge_end)").call(Edge._dragBehavior(graph, this));
    this.update();
  },
  update: function() {
    var outputPos = this.output.getEdgePos(), inputPos = this.input.getEdgePos();
    this._line.attr("x1", outputPos.x).attr("y1", outputPos.y).attr("x2", inputPos.x).attr("y2", inputPos.y);
  },
  cleanup: function() {
    this._line.remove();
  }
});

Edge._dragBehavior = function(graph, edge) {
  var drag = function() {
    var origin = graph.getOrigin(), x = d3.event.sourceEvent.pageX - origin.x, y = d3.event.sourceEvent.pageY - origin.y;
    edge._line.attr("class", "edge temp").attr("x2", x).attr("y2", y);
  };
  return d3.behavior.drag().on("dragstart", drag).on("drag", drag).on("dragend", function() {
    var target = d3.event.sourceEvent.target, input = InputHitArea.fromElement(graph, target), output = edge.output;
    graph.deleteEdge(edge);
    if (input !== undefined && input.type === HitArea.INPUT) {
      graph.addEdge(output, input);
    }
  });
};

var ViewGraph = new Class({
  initialize: function(svg) {
    this._svg = svg;
    this._nextNodeID = 0;
    this._nodes = {};
    this._edgeGroup = this._svg.append("svg:g");
    this._tempEdgeGroup = svg.append("svg:g").attr("transform", SVGUtils.translateToHide());
    this._tempEdgeEnd = {};
    this._tempEdge = this._tempEdgeGroup.append("svg:line").attr("class", "edge temp").attr("marker-end", "url(#edge_end)");
    this._tempTextGroup = svg.append("svg:g").attr("transform", SVGUtils.translateToHide());
    this._tempText = this._tempTextGroup.append("svg:text").attr("class", "block");
    this._nodeGroup = this._svg.append("svg:g");
    var defs = this._svg.append("defs");
    var edgeEndMarker = defs.append("svg:marker").attr("id", "edge_end").attr("viewBox", "0 0 10 10").attr("refX", 10).attr("refY", 5).attr("markerUnits", "strokeWidth").attr("markerWidth", 4).attr("markerHeight", 3).attr("fill", "#555").attr("orient", "auto").append("svg:path").attr("d", "M 0 0 L 10 5 L 0 10 z");
  },
  _addNodeImpl: function(name, pos) {
    var id = this._nextNodeID++;
    this._nodes[id] = new Node(this, this._nodeGroup, name, pos, id);
    return this._nodes[id];
  },
  addNode: function(name, pos) {
    var node = this._addNodeImpl(name, pos);
    FistUI.runViewGraph();
    return node;
  },
  _addEdgeImpl: function(output, input) {
    if (Node.existsPath(input.node, output.node)) {
      console.log("skipping, will create cycle!");
      return null;
    }
    if (input.isFull()) {
      console.log("skipping, input is already being used!");
      return null;
    }
    var edge = new Edge(this, this._edgeGroup, output, input);
    output.node.addEdge(edge);
    input.node.addEdge(edge);
    if (input.variadic) {
      input.node.addVariadicInput(this, input.param);
    }
    return edge;
  },
  addEdge: function(output, input) {
    var edge = this._addEdgeImpl(output, input);
    FistUI.runViewGraph();
    return edge;
  },
  _deleteNodeImpl: function(node) {
    node.allEdges().each(function(edge) {
      this._deleteEdgeImpl(edge);
    }.bind(this));
    node.cleanup();
    delete this._nodes[node.id];
  },
  deleteNode: function(node) {
    this._deleteNodeImpl(node);
    FistUI.runViewGraph();
  },
  _deleteEdgeImpl: function(edge) {
    edge.cleanup();
    edge.input.node.deleteEdge(edge);
    edge.output.node.deleteEdge(edge);
  },
  deleteEdge: function(edge) {
    this._deleteEdgeImpl(edge);
    FistUI.runViewGraph();
  },
  _replaceNodeImpl: function(node, name, pos) {
    var newNode = this._addNodeImpl(name, pos);
    node.allEdgesIn().each(function(edge) {
      this._deleteEdgeImpl(edge);
      if (edge.input.id < newNode.inputs.length) {
        this._addEdgeImpl(edge.output, newNode.inputs[edge.input.id]);
      }
    }.bind(this));
    node.allEdgesOut().each(function(edge) {
      this._deleteEdgeImpl(edge);
      if (edge.output.id < newNode.outputs.length) {
        this._addEdgeImpl(newNode.outputs[edge.output.id], edge.input);
      }
    }.bind(this));
    this._deleteNodeImpl(node);
  },
  replaceNode: function(node, name, pos) {
    this._replaceNodeImpl(node, name, pos);
    FistUI.runViewGraph();
  },
  _emptyImpl: function() {
    Object.values(this._nodes).each(function(node) {
      this._deleteNodeImpl(node);
    }.bind(this));
  },
  empty: function() {
    this._emptyImpl();
    FistUI.runViewGraph();
  },
  _toCodeDepth: function(node) {
    var ret = {
      pos: {
        x: node.dims.x,
        y: node.dims.y
      },
      op: node.name
    };
    var edges = node.allEdgesIn();
    if (edges.length === 0) {
      return ret;
    }
    var args = {};
    edges.each(function(edge) {
      var code = this._toCodeDepth(edge.output.node);
      if (edge.input.variadic) {
        if (!args.hasOwnProperty(edge.input.param)) {
          args[edge.input.param] = [];
        }
        args[edge.input.param].push(code);
      } else {
        args[edge.input.param] = code;
      }
    }.bind(this));
    ret.args = args;
    return ret;
  },
  toCodes: function() {
    var T = Object.values(this._nodes).filter(function(node) {
      return node.allEdgesOut().length === 0;
    });
    return T.map(this._toCodeDepth.bind(this));
  },
  _fromCodeDepth: function(code, toNode, toParam) {
    var node = this._addNodeImpl(code.op, code.pos);
    if (toNode !== undefined && toParam !== undefined) {
      var output = node.outputs[0];
      var input = undefined;
      toNode.inputs.each(function(toInput) {
        if (toInput.param === toParam) {
          input = toInput;
        }
      });
      if (output !== undefined && input !== undefined) {
        this._addEdgeImpl(output, input);
      }
    }
    if (Fist.isAtom(code)) {
      return;
    }
    Object.each(code.args, function(arg, name) {
      this._fromCodeDepth(arg, node, name);
    }.bind(this));
  },
  fromCodes: function(codes) {
    this._emptyImpl();
    codes.each(this._fromCodeDepth.bind(this));
    FistUI.runViewGraph();
  },
  isInViewer: function(elem) {
    var svgRoot = $d3(this._svg);
    while (elem !== null) {
      if (elem.match(svgRoot)) {
        return true;
      }
      elem = elem.getParent();
    }
    return false;
  },
  nodeDimensions: function(name, pos) {
    this._tempText.text(name);
    var size = $d3(this._tempText).getSize();
    size.x = Math.max(50, size.x);
    var w = size.x + 2 * Node.PADDING, h = size.y + 2 * Node.PADDING;
    return {
      x: Math.floor(pos.x - w / 2) + .5,
      y: Math.floor(pos.y - h / 2) + .5,
      w: w,
      h: h
    };
  },
  getOrigin: function() {
    return $d3(this._svg).getPosition();
  }
});

var Status = new Class({
  initialize: function(statusWrapper) {
    this._statusWrapper = statusWrapper;
    this._messageBox = this._statusWrapper.getElement("#message");
  },
  _msg: function(cls, msg) {
    this._statusWrapper.set("class", cls);
    this._messageBox.set("text", msg);
  },
  OK: function(msg) {
    this._msg("ok", msg);
  },
  working: function(msg) {
    this._msg("working", msg);
  },
  notOK: function(err) {
    this._msg("not-ok", err.toString());
  }
});

var Resizer = new Class({
  initialize: function(ui, elem) {
    this._elem = d3.select(elem);
    this._elem.data([ {
      pos: 240
    } ]).call(Resizer._dragBehavior(ui, this));
  },
  getPosition: function() {
    return this._elem.datum().pos;
  }
});

Resizer._dragBehavior = function(ui, resizer) {
  return d3.behavior.drag().on("dragstart", function() {
    resizer._elem.classed("active", true);
  }).on("drag", function(d) {
    d.pos -= d3.event.dy;
    d.pos = Math.max(240, Math.min(d.pos, 480));
    var mid = d.pos - 4;
    resizer._elem.style("bottom", function(d) {
      return mid + "px";
    });
  }).on("dragend", function() {
    resizer._elem.classed("active", false);
    ui.dynamicResize();
  });
};

var FistUI = {
  _viewTable: {},
  _fistCode: "",
  inited: false,
  _setSaveHref: function(code) {
    var encodedCode = btoa(code);
    console.log(encodedCode);
    this._saveButton.set("href", "data:application/octet-stream;base64," + encodedCode);
  },
  _loadFromFile: function(file) {
    if (file.size > 1024 * 1024) {
      this._status.notOK("file too large!");
      return;
    }
    var reader = new FileReader();
    reader.onloadend = function(evt) {
      if (evt.target.readyState !== FileReader.DONE) {
        this._status.notOK("failed to load file!");
        return;
      }
      try {
        var code = JSON.parse(evt.target.result);
        this._status.OK("loaded fist code from " + file.name);
      } catch (err) {
        if (!(err instanceof SyntaxError)) {
          throw err;
        }
        this._status.notOK("invalid fist code!");
      }
    }.bind(this);
    reader.readAsText(file);
  },
  runViewGraph: function(options) {
    options = options || {};
    var rebuild = options.rebuild || true;
    if (rebuild) {
      this._fistCode = this._viewGraph.toCodes();
      this._setSaveHref(JSON.stringify(this._fistCode));
      console.log(JSON.stringify(this._fistCode));
    }
    if (this._fistCode.length === 0) {
      this._status.OK("view graph is empty.");
      return;
    }
    try {
      this._status.working("type-checking view graph...");
      var code = this._fistCode[0], fistType = Fist.evaluateType(code);
      if (fistType === null) {
        this._status.notOK("view graph is invalid!");
        return;
      }
      if (!Type.equal(fistType, ViewType)) {
        this._status.OK("view graph describes a " + fistType.node() + ", not a view.");
        return;
      }
      this._status.working("rendering view...");
      Fist.evaluate(code);
      this._status.OK("rendered view graph successfully.");
    } catch (e) {
      console.log(e);
      this._status.notOK(e);
    }
  },
  init: function() {
    this._root = $("container");
    this._dropOverlay = this._root.getElement("#drop_overlay");
    this._root.addEventListener("dragenter", function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._dropOverlay.addClass("droptarget");
    }.bind(this), false);
    this._dropOverlay.addEventListener("dragover", function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      evt.dataTransfer.dropEffect = "copy";
      this._dropOverlay.addClass("droptarget");
    }.bind(this), false);
    this._dropOverlay.addEventListener("dragleave", function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._dropOverlay.removeClass("droptarget");
    }.bind(this), false);
    this._dropOverlay.addEventListener("drop", function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._dropOverlay.removeClass("droptarget");
      this._importDialog.show(evt.dataTransfer.files[0]);
    }.bind(this), false);
    this._dragBlock = null;
    this._status = new Status(this._root.getElement("#status_wrapper"));
    this._importDialog = new ImportDialog($("modal"), this._status);
    this._palette = this._root.getElement("#palette");
    this._viewer = this._root.getElement("#viewer");
    this._table = this._root.getElement("#table");
    this._header = this._root.getElement("#header");
    this._content = this._root.getElement("#content");
    this._footer = this._root.getElement("#footer");
    this._svgExecuteWrapper = this._root.getElement("#svg_execute_wrapper");
    this._viewExecuteSVG = d3.select(this._svgExecuteWrapper).append("svg:svg").attr("id", "view_execute");
    this._resizer = new Resizer(this, this._root.getElement("#resizer"));
    this._svgGraphWrapper = this._root.getElement("#svg_graph_wrapper");
    this._viewGraphSVG = d3.select(this._svgGraphWrapper).append("svg:svg").attr("id", "view_graph").on("dblclick", function(d) {
      var name = window.prompt("enter node name:");
      if (name === null || name.length === 0) {
        return;
      }
      var svgPosition = this._svgGraphWrapper.getPosition(), svgScroll = this._svgGraphWrapper.getScroll(), x = d3.event.pageX - svgPosition.x + svgScroll.x, y = d3.event.pageY - svgPosition.y + svgScroll.y;
      this._viewGraph.addNode(name, {
        x: x,
        y: y
      });
    }.bind(this));
    this._svgGraphWrapper.addEventListener("dragenter", function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      this.addClass("droptarget");
    }, false);
    this._svgGraphWrapper.addEventListener("dragover", function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      evt.dataTransfer.dropEffect = "move";
      this.addClass("droptarget");
      return false;
    }, false);
    this._svgGraphWrapper.addEventListener("dragleave", function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      this.removeClass("droptarget");
    }, false);
    this._svgGraphWrapper.addEventListener("drop", function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      var json = JSON.parse(evt.dataTransfer.getData("application/json"));
      var svgPosition = this._svgGraphWrapper.getPosition(), svgScroll = this._svgGraphWrapper.getScroll(), x = evt.pageX - svgPosition.x + svgScroll.x, y = evt.pageY - svgPosition.y + svgScroll.y;
      this._viewGraph.addNode(json.name, {
        x: x,
        y: y
      });
    }.bind(this), false);
    this._viewGraph = new ViewGraph(this._viewGraphSVG);
    this._clearButton = this._root.getElement("#svg_graph_clear");
    this._clearButton.addEventListener("click", function(evt) {
      this._viewGraph.empty();
    }.bind(this));
    this._saveButton = this._root.getElement("#svg_graph_save");
    this._loadButton = this._root.getElement("#svg_graph_load");
    this._loadButton.addEventListener("click", function(evt) {
      var evt = document.createEvent("Event");
      evt.initEvent("click", true, true);
      this._loadInput.dispatchEvent(evt);
    }.bind(this));
    this._loadInput = this._root.getElement("#svg_graph_load_input");
    this._loadInput.addEventListener("change", function(evt) {
      if (evt.target.files.length === 0) {
        this._status.notOK("load cancelled.");
        return;
      }
      this._loadFromFile(evt.target.files[0]);
    }.bind(this));
    this.inited = true;
  },
  onSymbolImport: function(name, value, moduleName) {
    console.log("importing symbol " + name + " in module " + moduleName);
    var type = Fist.blockType(name);
    this._palette.getElements("div.block[name=" + name + "]").destroy();
    var block = new Element("div.block." + type, {
      text: name,
      name: name,
      draggable: true
    });
    block.tips = new Tips(block, {
      className: "fistdocs",
      title: "text",
      text: function(element) {
        if (type === "function" || type === "channel") {
          if (value.describe === undefined) {
            return type;
          }
          return value.describe();
        } else {
          return type;
        }
      }
    });
    block.addEventListener("dragstart", function(evt) {
      block.addClass("dragtarget");
      block.tips.fireEvent("hide");
      evt.dataTransfer.effectAllowed = "move";
      evt.dataTransfer.setData("application/json", JSON.stringify({
        name: name,
        type: type
      }));
      this._dragBlock = block;
    }.bind(this), false);
    block.addEventListener("dragend", function(evt) {
      this._dragBlock = null;
      block.removeClass("dragtarget");
      this._svgGraphWrapper.removeClass("droptarget");
    }.bind(this), false);
    if (moduleName === undefined) {
      block.inject(this._palette, "top");
      this._palette.scrollTo(0, 0);
    } else {
      var moduleGroup = this._palette.getElement("div.module-group[name=" + moduleName + "]");
      moduleGroup.getElement("div.module-contents").adopt(block);
    }
  },
  onModuleImport: function(moduleName) {
    console.log("importing module " + moduleName);
    var moduleGroup = new Element("div.module-group", {
      name: moduleName
    }), moduleContents = new Element("div.module-contents.hidden"), moduleHeader = new Element("div.module-name", {
      text: moduleName + " ▸"
    });
    if (moduleName === "Views") {
      moduleHeader.set("text", moduleName + " ▾");
      moduleContents.removeClass("hidden");
    }
    moduleHeader.addEvent("click", function(evt) {
      if (moduleContents.hasClass("hidden")) {
        this.set("text", moduleName + " ▾");
        moduleContents.removeClass("hidden");
      } else {
        this.set("text", moduleName + " ▸");
        moduleContents.addClass("hidden");
      }
    });
    moduleGroup.adopt(moduleHeader, moduleContents).inject(this._palette);
  },
  onViewInvoked: function(name, args) {
    console.log("rendering view " + name);
    $d3(this._viewExecuteSVG).empty();
    var view = this._viewTable[name];
    if (view === undefined) {
      throw new Error("unrecognized view: " + name);
    }
    view.render(this._viewExecuteSVG, args);
  },
  importView: function(name, view) {
    console.log("importing view " + name);
    this._viewTable[name] = view;
  },
  dynamicResize: function() {
    var docSize = document.getSize(), headerHeight = this._header.getHeight(), footerHeight = this._resizer.getPosition(), totalHeight = headerHeight + footerHeight;
    console.log(docSize);
    this._table.set("width", docSize.x);
    this._header.setStyle("width", docSize.x);
    this._content.setStyle("width", docSize.x).setStyle("height", docSize.y - totalHeight);
    this._svgExecuteWrapper.setStyle("width", docSize.x - 10).setStyle("height", docSize.y - (totalHeight + 8));
    this._viewExecuteSVG.attr("width", docSize.x - 10).attr("height", docSize.y - (totalHeight + 8));
    this._footer.setStyle("width", docSize.x).setStyle("height", footerHeight);
    this._palette.setStyle("height", footerHeight - 8);
    this._svgGraphWrapper.setStyle("height", footerHeight - 8);
    try {
      this.runViewGraph({
        rebuild: false
      });
    } catch (e) {
      console.log(e);
    }
  },
  loaded: function(version, loadStart) {
    var loadTime = +new Date() - loadStart, msg = "datafist version " + version + ": loaded in " + loadTime + " ms";
    this._status.OK(msg);
  }
};

function _numTicks(px) {
  return Math.max(3, Math.min(7, Math.floor(px / 100)));
}

function _caption(code) {
  var caption = code.op;
  if (Fist.isAtom(code)) {
    return caption;
  }
  var argParts = [];
  Object.each(code.args, function(arg, name) {
    var argCaption;
    if (arg instanceof Array) {
      argCaption = "[" + arg.map(function(subArg) {
        return _caption(subArg);
      }).join(", ") + "]";
    } else {
      argCaption = _caption(arg);
    }
    argParts.push(name + ": " + argCaption);
  });
  caption += "(" + argParts.join(", ") + ")";
  return caption;
}

function _getBucketing(code) {
  if (Fist.isAtom(code)) {
    return undefined;
  }
  switch (code.op) {
   case "//*":
    return Fist.evaluateAtom(code.args.b);

   case "hour-of-day":
   case "day-of-week":
   case "month-of-year":
    return 1;

   default:
    var bucket = undefined;
    Object.each(code.args, function(arg) {
      bucket = _getBucketing(arg);
      if (bucket !== undefined) {
        return false;
      }
    });
    return bucket;
  }
}

function _format(x) {
  var e = d3.format(".8e")(x).replace(/0+e/, "e").replace(".e", "e"), g = d3.format(".8g")(x);
  if (g.indexOf(".") !== -1) {
    g = g.replace(/0+$/, "").replace(/\.$/, "");
  }
  if (e.length < g.length) {
    g = e;
  }
  g = g.replace("−", "-");
  return g;
}

function _stripFilters(code, filterName) {
  var cur = code;
  while (Fist.isFunction(cur) && cur.op === filterName) {
    cur = cur.args.c;
  }
  return cur;
}

function _getFiltering(code, filterName) {
  if (code.op !== filterName) {
    return undefined;
  }
  switch (filterName) {
   case "value-between":
    return {
      min: parseFloat(code.args.x1),
      max: parseFloat(code.args.x2)
    };

   case "time-between":
    return {
      min: parseFloat(code.args.since),
      max: parseFloat(code.args.until)
    };

   default:
    return undefined;
  }
}

function _getBound(data, key) {
  return {
    min: d3.min(data, function(d) {
      return d[key];
    }),
    max: d3.max(data, function(d) {
      return d[key];
    })
  };
}

function _fixBound(bound) {
  if (!isFinite(bound.min) || !isFinite(bound.max)) {
    bound.min = 0;
    bound.max = 0;
  }
  if (bound.min === bound.max) {
    bound.min--;
    bound.max++;
  }
}

var ViewUtils = {
  getProjection: function(data, scale, key) {
    var proj = {};
    data.each(function(d) {
      var p = Math.floor(scale(d[key]));
      if (proj[p] === undefined) {
        proj[p] = 0;
      }
      proj[p]++;
    });
    return proj;
  },
  drawVerticalProjectionTicks: function(proj, axis) {
    var max = d3.max(Object.values(proj)), scale = d3.scale.log().domain([ 1, max ]).range([ .2, 1 ]);
    var group = axis.append("svg:g").attr("class", "projection");
    Object.each(proj, function(k, p) {
      group.append("svg:line").attr("x1", 2).attr("y1", p).attr("x2", 8).attr("y2", p).style("opacity", scale(k));
    });
  },
  drawHorizontalProjectionTicks: function(proj, axis) {
    var max = d3.max(Object.values(proj)), scale = d3.scale.log().domain([ 1, max ]).range([ .2, 1 ]);
    var group = axis.append("svg:g").attr("class", "projection");
    Object.each(proj, function(k, p) {
      group.append("svg:line").attr("x1", p).attr("y1", -2).attr("x2", p).attr("y2", -8).style("opacity", scale(k));
    });
  }
};

var LineView = {
  _bisect: d3.bisector(function(d) {
    return d.t;
  }).right,
  _getPointAt: function(cd, t) {
    t = +t;
    if (t < cd[0].t) {
      return cd[0];
    }
    if (t >= cd[cd.length - 1].t) {
      return cd[cd.length - 1];
    }
    var j = this._bisect(cd, t);
    var w = (t - cd[j - 1].t) / (cd[j].t - cd[j - 1].t), x = (1 - w) * cd[j - 1].x + w * cd[j].x;
    return {
      t: t,
      x: x
    };
  },
  render: function(view, args) {
    var w = view.attr("width"), h = view.attr("height"), axisH = 20, axisW = 60, channels = args.channels, codes = args.__code.channels;
    var n = channels.length, cds = [], tbound = {
      min: Infinity,
      max: -Infinity
    }, xbounds = [];
    for (var i = 0; i < n; i++) {
      cds.push([]);
      var filtering = _getFiltering(codes[i], "time-between");
      if (filtering !== undefined) {
        tbound.min = Math.min(filtering.min, tbound.min);
        tbound.max = Math.max(filtering.max, tbound.max);
      }
      var xbound = {
        min: Infinity,
        max: -Infinity
      };
      var it = channels[i].iter();
      while (true) {
        try {
          var t = it.next(), x = channels[i].at(t);
          cds[i].push({
            t: t,
            x: x
          });
          tbound.min = Math.min(t, tbound.min);
          tbound.max = Math.max(t, tbound.max);
          xbound.min = Math.min(x, xbound.min);
          xbound.max = Math.max(x, xbound.max);
        } catch (e) {
          if (!(e instanceof StopIteration)) {
            throw e;
          }
          break;
        }
      }
      _fixBound(xbound);
      xbounds.push(xbound);
    }
    _fixBound(tbound);
    var channelH = (h - axisH) / n, channelW = w - axisW;
    var ct = d3.time.scale().domain([ tbound.min, tbound.max ]).range([ 0, channelW ]);
    AutoNice.time(ct);
    cds = cds.map(function(cd) {
      var lastT = -Infinity, filtered = [];
      for (var i = 0; i < cd.length; i++) {
        var curT = ct(cd[i].t);
        if (curT - lastT >= 1) {
          lastT = curT;
          filtered.push(cd[i]);
        }
      }
      return filtered;
    });
    var cxs = cds.map(function(cd, i) {
      return d3.scale.linear().domain([ xbounds[i].min, xbounds[i].max ]).nice().range([ channelH - axisH / 2, axisH / 2 ]);
    });
    var cc = d3.scale.category10();
    var axisT = d3.svg.axis().scale(ct).ticks(_numTicks(channelW)).tickSize(0);
    view.append("svg:g").attr("class", "axis").attr("transform", "translate(" + axisW + ", " + channelH * n + ")").call(axisT);
    for (var i = 0; i < n; i++) {
      var scaleX = cxs[i];
      var axisX = d3.svg.axis().scale(scaleX).orient("left").ticks(_numTicks(channelH)).tickSize(0);
      var axisGroupX = view.append("svg:g").attr("class", "channel axis").attr("transform", "translate(" + axisW + ", " + channelH * i + ")").call(axisX);
      axisGroupX.append("svg:line").attr("class", "range").attr("x1", 0).attr("y1", scaleX(xbounds[i].min)).attr("x2", 0).attr("y2", scaleX(xbounds[i].max));
      var projX = ViewUtils.getProjection(cds[i], cxs[i], "x");
      ViewUtils.drawVerticalProjectionTicks(projX, axisGroupX);
    }
    this._tGuide = view.append("svg:line").attr("class", "channel guide").attr("y1", 0).attr("y2", channelH * i);
    this._xGuides = [];
    for (var i = 0; i < n; i++) {
      var line = d3.svg.line().x(function(d) {
        return ct(d.t);
      }).y(function(d) {
        return cxs[i](d.x);
      });
      var g = view.append("svg:g").attr("transform", "translate(" + axisW + ", " + channelH * i + ")");
      g.append("svg:path").attr("d", line(cds[i])).attr("class", "channel").attr("stroke", cc(i));
      if (i > 0) {
        g.append("svg:line").attr("class", "channel-separator").attr("x1", 0).attr("y1", 0).attr("x2", channelW).attr("y2", 0);
      }
      g.append("svg:text").attr("class", "channel caption").attr("x", 8).attr("y", 8).attr("dy", ".71em").attr("text-anchor", "start").text(_caption(codes[i]));
      this._xGuides.push(g.append("svg:line").attr("class", "channel guide").attr("x1", 0).attr("x2", channelW).style("stroke", cc(i)));
    }
    this._interactGroup = view.append("svg:g").attr("transform", "translate(" + axisW + ", 0)");
    this._interactHitArea = this._interactGroup.append("svg:rect").attr("class", "channel hit-area").attr("x", 0).attr("y", 0).attr("width", channelW).attr("height", channelH * n).on("mousemove", function() {
      var mousePos = $d3(this._interactGroup).getPosition(), tpx = d3.event.pageX - mousePos.x, t = ct.invert(tpx);
      this._tGuide.attr("x1", tpx + axisW).attr("x2", tpx + axisW);
      cds.each(function(cd, i) {
        var d = this._getPointAt(cd, t), y = cxs[i](d.x);
        this._xGuides[i].attr("y1", y).attr("y2", y);
      }.bind(this));
    }.bind(this)).on("mouseout", function() {
      this._tGuide.classed("hidden", true);
      this._xGuides.each(function(xGuide) {
        xGuide.classed("hidden", true);
      });
    }.bind(this)).on("mouseover", function() {
      this._tGuide.classed("hidden", false);
      this._xGuides.each(function(xGuide) {
        xGuide.classed("hidden", false);
      });
    }.bind(this));
  }
};

var CrossfilterView = {
  _BUCKETS: 20,
  _PADDING: 10,
  _colorScale: d3.scale.category10(),
  _determineGrid: function(w, h, n) {
    var ratio = w / h, cols = 0, rows = 0;
    do {
      cols++;
      rows = Math.floor(cols / ratio);
    } while (cols * rows < n);
    rows = Math.ceil(n / cols);
    var size = Math.ceil(w / cols);
    var offset = {
      x: 0,
      y: Math.floor((h - size * rows) / 2)
    };
    if (rows === 1) {
      offset.x = Math.floor((w - size * n) / 2);
    }
    return {
      cols: cols,
      rows: rows,
      size: size,
      offset: offset
    };
  },
  _makeCategoricalBarChart: function(view, filter, data, grid, code, charts) {
    var i = charts.length, _dim = filter.dimension(function(d) {
      return d[i];
    }), _group = _dim.group(), _order = _group.top(Infinity), _cats = _order.map(function(d) {
      return d.key;
    });
    var _col = i % grid.cols, _row = (i - _col) / grid.cols, _gx = _col * grid.size + grid.offset.x + this._PADDING, _gy = _row * grid.size + grid.offset.y + this._PADDING, _size = grid.size - 2 * this._PADDING;
    var _scaleC = d3.scale.ordinal().domain(_cats).rangeBands([ 0, _cats.length ]);
    var _scaleX = d3.scale.linear().domain([ 0, _cats.length ]).range([ 0, _size ]);
    var _scaleY = d3.scale.linear().domain([ 0, _order[0].value ]).range([ _size, 0 ]);
    var _g = view.append("svg:g").attr("transform", "translate(" + _gx + ", " + _gy + ")");
    var _selected = null;
    var _paths = _g.selectAll(".crossfilter.bar").data(_group.all(), function(d) {
      return d.key;
    }).enter().append("path").attr("class", "crossfilter bar category").style("fill", this._colorScale(i)).on("click", function(d) {
      if (d.key === _selected) {
        d3.select(this).attr("class", "crossfilter bar category");
        _selected = null;
        _dim.filterAll();
      } else {
        _g.selectAll(".crossfilter.bar").attr("class", "crossfilter bar category");
        d3.select(this).attr("class", "crossfilter bar category selected");
        _selected = d.key;
        _dim.filterExact(_selected);
      }
      charts.each(function(chart) {
        chart.draw();
      });
    });
    var _scaleAxis = d3.scale.ordinal().domain(_cats).rangeBands([ 0, _size ]);
    var _axis = d3.svg.axis().scale(_scaleAxis).tickSize(0);
    _g.append("svg:g").attr("class", "crossfilter category axis").attr("transform", "translate(0, " + _size + ")").call(_axis).selectAll("text").each(function(d) {
      var parent = this.getParent(), transform = parent.get("transform");
      parent.set("transform", transform + "rotate(-90)");
      d3.select(this).attr("x", 10).attr("y", -4).attr("text-anchor", "start");
    });
    _g.append("svg:text").attr("class", "crossfilter caption").attr("x", 8).attr("y", 8).attr("dy", ".71em").attr("text-anchor", "start").text(_caption(code));
    function draw() {
      _g.selectAll(".crossfilter.bar").data(_group.all(), function(d) {
        return d.key;
      }).attr("d", function(d) {
        var ci = _scaleC(d.key);
        var path = [ "M", Math.floor(_scaleX(ci)) + .5, ",", _size, "V", Math.floor(_scaleY(d.value)) + .5, "H", Math.floor(_scaleX(ci + 1)) - .5, "V", _size ];
        return path.join("");
      });
    }
    charts.push({
      draw: draw
    });
  },
  _makeNumericBarChart: function(view, filter, data, grid, code, charts) {
    var i = charts.length;
    var _bound = {
      min: d3.min(data, function(d) {
        return d[i];
      }),
      max: d3.max(data, function(d) {
        return d[i];
      })
    };
    var _dim = filter.dimension(function(d) {
      return d[i];
    });
    var _group = _dim.group(function(x) {
      var bw = (_bound.max - _bound.min) / this._BUCKETS, b = Math.floor((x - _bound.min) / bw);
      return Math.min(b, this._BUCKETS - 1);
    }.bind(this));
    var _col = i % grid.cols, _row = (i - _col) / grid.cols, _gx = _col * grid.size + grid.offset.x + this._PADDING, _gy = _row * grid.size + grid.offset.y + this._PADDING, _size = grid.size - 2 * this._PADDING;
    var _scaleX = d3.scale.linear().domain([ 0, this._BUCKETS ]).range([ 0, _size ]);
    var _scaleY = d3.scale.linear().domain([ 0, _group.top(1)[0].value ]).range([ _size, 0 ]);
    var _g = view.append("svg:g").attr("transform", "translate(" + _gx + ", " + _gy + ")");
    var _path = _g.append("path").attr("class", "crossfilter bar").style("fill", this._colorScale(i));
    var _scaleBrush = d3.scale.linear().domain([ _bound.min, _bound.max ]).range([ 0, _size ]);
    var _brush = d3.svg.brush().x(_scaleBrush).on("brush", function() {
      if (_brush.empty()) {
        _dim.filterAll();
      } else {
        _dim.filterRange(_brush.extent());
      }
      charts.each(function(chart) {
        chart.draw();
      });
    });
    var _axis = d3.svg.axis().scale(_scaleBrush).ticks(_numTicks(_size)).tickSize(0);
    _g.append("svg:g").attr("class", "axis").attr("transform", "translate(0, " + _size + ")").call(_axis);
    _g.append("g").attr("class", "brush").call(_brush).selectAll("rect").attr("y", 0).attr("height", _size);
    _g.append("svg:text").attr("class", "crossfilter caption").attr("x", 8).attr("y", 8).attr("dy", ".71em").attr("text-anchor", "start").text(_caption(code));
    function _barPath() {
      var path = [];
      _group.all().each(function(d) {
        path.push("M", Math.floor(_scaleX(d.key)) + .5, ",", _size, "V", Math.floor(_scaleY(d.value)) + .5, "H", Math.floor(_scaleX(d.key + 1)) - .5, "V", _size);
      });
      return path.join("");
    }
    function draw() {
      _path.attr("d", _barPath());
    }
    charts.push({
      draw: draw
    });
  },
  render: function(view, args) {
    var w = view.attr("width"), h = view.attr("height"), n = args.channels.length;
    if (n > 32) {
      throw new Error("crossfilter only supports up to 32 dimensions!");
    }
    var it = new IntersectionIterator(args.channels.map(function(c) {
      return c.iter();
    }));
    var data = [];
    while (true) {
      try {
        var t = it.next();
        var xs = args.channels.map(function(c) {
          return c.at(t);
        });
        data.push(xs);
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    var filter = crossfilter(data), grid = this._determineGrid(w, h, n), charts = [];
    for (var i = 0; i < n; i++) {
      var code = args.__code.channels[i];
      if (typeOf(data[0][i]) === "string") {
        this._makeCategoricalBarChart(view, filter, data, grid, code, charts);
      } else {
        this._makeNumericBarChart(view, filter, data, grid, code, charts);
      }
      charts[i].draw();
    }
  }
};

var HistogramView = {
  _getData: function(c, groupBy, bucketing) {
    var it = c.iter(), data = [];
    if (groupBy !== undefined) {
      it = new IntersectionIterator([ it, groupBy.iter() ]);
    }
    while (true) {
      try {
        var t = it.next(), x = c.at(t), g = x;
        if (groupBy !== undefined) {
          g = groupBy.at(t);
        }
        if (bucketing !== undefined) {
          g = Math.floor(g / bucketing) * bucketing;
        }
        data.push({
          g: g,
          x: x
        });
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    data.sort(function(d1, d2) {
      return d1.g - d2.g;
    });
    return data;
  },
  _getHist: function(data, reduce) {
    var hist = [], n = 0;
    data.each(function(d) {
      if (n === 0 || d.g > hist[n - 1].g) {
        hist.push({
          g: d.g,
          xs: []
        });
        n++;
      }
      hist[n - 1].xs.push(d.x);
    });
    return hist.map(function(d) {
      return {
        x: d.g,
        freq: reduce(d.xs)
      };
    });
  },
  render: function(view, args) {
    var w = view.attr("width"), h = view.attr("height"), axisH = 20, axisW = 60;
    var bucketing = args.bucket;
    if (bucketing === undefined) {
      if (args.groupBy === undefined) {
        bucketing = _getBucketing(args.__code.channel);
      } else {
        bucketing = _getBucketing(args.__code.groupBy);
      }
    }
    var reduce = args.reduce;
    if (reduce === undefined) {
      if (args.groupBy === undefined) {
        reduce = "count";
      } else {
        reduce = "sum";
      }
    }
    reduce = Reduce.get(reduce);
    var data = this._getData(args.channel, args.groupBy, bucketing), hist = this._getHist(data, reduce), xs = hist.map(function(p) {
      return p.x;
    }), xmin = d3.min(xs) || 0, xmax = d3.max(xs) || 0, freqs = hist.map(function(p) {
      return p.freq;
    }), applyBuckets = args.bucket !== undefined;
    if (xmin === xmax) {
      xmin--;
      xmax++;
    }
    var histH = h - 2 * axisH, histW = w - 2 * axisW;
    if (bucketing !== undefined) {
      var buckets = Math.round((xmax - xmin) / bucketing), bucketW = histW / (buckets + 1);
      if (bucketW < 3) {
        bucketing = undefined;
      } else {
        xmax += bucketing;
      }
    }
    var scaleX = d3.scale.linear().domain([ xmin, xmax ]).range([ 0, histW ]);
    var scaleFreq = d3.scale.linear().domain([ 0, d3.max(freqs) || 1 ]).range([ histH, 0 ]);
    var cc = d3.scale.category10();
    var axisX = d3.svg.axis().scale(scaleX).ticks(_numTicks(histW)).tickSize(0);
    view.append("svg:g").attr("class", "axis").attr("transform", "translate(" + axisW + ", " + (histH + axisH) + ")").call(axisX);
    var axisFreq = d3.svg.axis().scale(scaleFreq).orient("left").ticks(_numTicks(histH)).tickSize(0);
    view.append("svg:g").attr("class", "axis").attr("transform", "translate(" + axisW + ", " + axisH + ")").call(axisFreq);
    var g = view.append("svg:g").attr("transform", "translate(" + axisW + ", " + axisH + ")");
    if (bucketing === undefined) {
      var opacity = Math.max(.2, 1 / Math.log(Math.max(2, data.length)));
      g.selectAll("line").data(hist).enter().append("svg:line").attr("x1", function(d) {
        return scaleX(d.x);
      }).attr("y1", function(d) {
        return scaleFreq(d.freq);
      }).attr("x2", function(d) {
        return scaleX(d.x);
      }).attr("y2", histH).attr("opacity", opacity).attr("stroke", cc(0)).attr("stroke-width", 2);
    } else {
      g.selectAll("rect").data(hist).enter().append("svg:rect").attr("x", function(d) {
        return scaleX(d.x) + 1;
      }).attr("y", function(d) {
        return scaleFreq(d.freq);
      }).attr("width", bucketW - 2).attr("height", function(d) {
        return histH - scaleFreq(d.freq);
      }).attr("fill", cc(0));
    }
    g.append("svg:text").attr("class", "histogram caption").attr("x", histW - 8).attr("y", 8).attr("text-anchor", "end").text(_caption(args.__code.channel));
  }
};

var PlotView = {
  _drawRegressionLine: function(data, g, scaleX, scaleY, xbound) {
    if (data.length <= 5) {
      return;
    }
    var regress = Stats.linregress(data);
    if (regress.R <= .1) {
      return;
    }
    g.append("svg:line").attr("id", "foo").attr("class", "plot regression").attr("x1", scaleX(xbound.min)).attr("y1", scaleY(regress.L(xbound.min))).attr("x2", scaleX(xbound.max)).attr("y2", scaleY(regress.L(xbound.max))).attr("opacity", Math.abs(regress.R));
  },
  render: function(view, args) {
    var w = view.attr("width"), h = view.attr("height"), axisH = 20, axisW = 60;
    var data = [], iters = [ args.x.iter(), args.y.iter() ], hasArea = args.area !== undefined, hasColor = args.color !== undefined, colorIsCategorical = null, categories = {}, lastCategory = 0;
    if (hasArea) {
      iters.push(args.area.iter());
    }
    if (hasColor) {
      iters.push(args.color.iter());
    }
    var it = new IntersectionIterator(iters);
    while (true) {
      try {
        var t = it.next(), d = {};
        d.x = args.x.at(t);
        d.y = args.y.at(t);
        if (hasArea) {
          d.A = args.area.at(t);
          if (typeOf(d.A) === "string") {
            delete d.A;
            args.color = args.area;
            args.__code.color = args.__code.area;
            args.area = undefined;
            args.__code.area = undefined;
            hasColor = true;
            hasArea = false;
          }
        }
        if (hasColor) {
          d.c = args.color.at(t);
          if (colorIsCategorical === null) {
            colorIsCategorical = typeOf(d.c) === "string";
          }
          if (colorIsCategorical && categories[d.c] === undefined) {
            categories[d.c] = lastCategory++;
          }
        }
        data.push(d);
      } catch (e) {
        if (!(e instanceof StopIteration)) {
          throw e;
        }
        break;
      }
    }
    var xfiltering = _getFiltering(args.__code.x, "value-between"), yfiltering = _getFiltering(args.__code.y, "value-between"), bounds = {};
    bounds.x = xfiltering || _getBound(data, "x");
    _fixBound(bounds.x);
    bounds.y = yfiltering || _getBound(data, "y");
    _fixBound(bounds.y);
    if (hasArea) {
      bounds.A = _getBound(data, "A");
      _fixBound(bounds.A);
    }
    if (hasColor && !colorIsCategorical) {
      bounds.c = _getBound(data, "c");
      _fixBound(bounds.c);
    }
    var plotH = h - 2 * axisH, plotW = w - 2 * axisW, scales = {};
    scales.x = d3.scale.linear().domain([ bounds.x.min, bounds.x.max ]).nice().range([ 0, plotW ]);
    scales.y = d3.scale.linear().domain([ bounds.y.min, bounds.y.max ]).nice().range([ plotH, 0 ]);
    if (hasArea) {
      scales.r = d3.scale.sqrt().domain([ bounds.A.min, bounds.A.max ]).range([ 2, 20 ]);
    }
    scales.c = d3.scale.category10();
    if (hasColor && !colorIsCategorical) {
      scales.c = d3.scale.linear().domain([ bounds.c.min, (bounds.c.min + bounds.c.max) / 2, bounds.c.max ]).range([ "rgb(239,138,98)", "rgb(247,247,247)", "rgb(103,169,207)" ]);
    }
    var axisX = d3.svg.axis().scale(scales.x).ticks(_numTicks(plotW)).tickSize(0);
    var axisGroupX = view.append("svg:g").attr("class", "axis").attr("transform", "translate(" + axisW + ", " + (plotH + axisH) + ")").call(axisX);
    axisGroupX.append("svg:line").attr("class", "range").attr("x1", scales.x(bounds.x.min)).attr("y1", 0).attr("x2", scales.x(bounds.x.max)).attr("y2", 0);
    var axisY = d3.svg.axis().scale(scales.y).orient("left").ticks(_numTicks(plotH)).tickSize(0);
    var axisGroupY = view.append("svg:g").attr("class", "axis").attr("transform", "translate(" + axisW + ", " + axisH + ")").call(axisY);
    axisGroupY.append("svg:line").attr("class", "range").attr("x1", 0).attr("y1", scales.y(bounds.y.min)).attr("x2", 0).attr("y2", scales.y(bounds.y.max));
    var projX = ViewUtils.getProjection(data, scales.x, "x");
    ViewUtils.drawHorizontalProjectionTicks(projX, axisGroupX);
    var projY = ViewUtils.getProjection(data, scales.y, "y");
    ViewUtils.drawVerticalProjectionTicks(projY, axisGroupY);
    var g = view.append("svg:g").attr("transform", "translate(" + axisW + ", " + axisH + ")");
    data.each(function(d) {
      var circle = g.append("svg:circle").attr("cx", scales.x(d.x)).attr("cy", scales.y(d.y));
      var r = 3;
      if (hasArea) {
        r = scales.r(d.A);
      }
      circle.attr("r", r);
      var colorIndex = 0;
      if (hasColor) {
        if (colorIsCategorical) {
          colorIndex = categories[d.c];
        } else {
          colorIndex = d.c;
        }
      }
      var color = d3.rgb(scales.c(colorIndex));
      circle.attr("fill", color.brighter(.5)).attr("stroke", color.darker(.5));
    });
    g.append("svg:text").attr("class", "plot caption").attr("x", plotW - 8).attr("y", plotH - 8).attr("text-anchor", "end").text(_caption(args.__code.x));
    g.append("svg:text").attr("class", "plot caption").attr("x", 8).attr("y", 8).attr("dy", ".71em").text(_caption(args.__code.y));
    this._drawRegressionLine(data, g, scales.x, scales.y, bounds.x);
  }
};

var LibFistUI = {
  "import": function() {
    FistUI.importView("line", LineView);
    FistUI.importView("crossfilter", CrossfilterView);
    FistUI.importView("histogram", HistogramView);
    FistUI.importView("plot", PlotView);
  }
};