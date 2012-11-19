var OpsArith = {
  __exports: [
    ['plus', '+']
  ],
  plus: function(args) {
    var channels = [],
        numberSum = 0;
    argCheck('plus', args, '(* (| number object))');
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      var argType = Object.toType(arg);
      if (argType === 'number') {
        numberSum += arg;
      } else if (argType === 'object') {
        channels.push(arg);
      } else {
        throw new Error(
          'plus: expected [(Number|Channel)*], but arg ' + i + ' is ' +
          typeof(arg));
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
      iter: function(t) {
        var iters = channels.map(function(c) { return c.iter(); });
      }
    };
  },
};
var OpsMath = {};
var OpsString = {};
var OpsChannel = {};

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

var ViewBubbles = {};
var ViewChannel = {};
var ViewCrossfilter = {};
var ViewHistogram = {};
var ViewLinearRegression = {};
var ViewMap = {};
var ViewTrendalyzer = {};

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

    fist.importModule(null, ViewBubbles);
    fist.importModule(null, ViewChannel);
    fist.importModule(null, ViewCrossfilter);
    fist.importModule(null, ViewHistogram);
    fist.importModule(null, ViewLinearRegression);
    fist.importModule(null, ViewMap);
    fist.importModule(null, ViewTrendalyzer);

    fist.importModule(null, Display);
  }
};
