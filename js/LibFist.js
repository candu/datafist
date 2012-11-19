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
          console.log(total);
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
    argCheck('gen-regular', args, '(+ function number number number)');
    var _gen = args[0];
    var _since = args[1];
    var _until = args[2];
    var _n = args[3];
    var _dt = (_until - _since) / _n;
    var _data = [];
    var _t = _since;
    for (var i = 0; i < _n; i++) {
      _data.push({t: _t, x: _gen(_t)});
      _t += _dt;
    }
    return Fist.makeDataChannel(_data);
  },
  genUniform: function(args) {
    argCheck('gen-uniform', args, '(+ function number number number)');
    var _gen = args[0];
    var _since = args[1];
    var _until = args[2];
    var _n = args[3];
    var _data = [];
    for (var i = 0; i < _n; i++) {
      var _t = Random.uniform(_since, _until);
      _data.push({t: _t, x: _gen(_t)});
    }
    return Fist.makeDataChannel(_data);
  },
  genPoisson: function(args) {
    argCheck('gen-poisson', args, '(+ function number number number)');
    var _gen = args[0];
    var _since = args[1];
    var _until = args[2];
    var _rate = args[3];    // average wait, in seconds
    var _data = [];
    var _t = _since;
    for (var i = 0; i < _n; i++) {
      _data.push({t: _t, x: _gen(_t)});
      var _x = Math.max(1e-12, Math.random());
      var _dt = 1000 * _rate * -Math.log(_x);
      _t += _dt;
    }
    return Fist.makeDataChannel(_data);
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
