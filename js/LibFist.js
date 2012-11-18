var OpsArith = {
  __exports: [
    ['plus', '+']
  ],
  plus: function(args) {
    var channels = [],
        numberSum = 0;
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      var argType = Object.toType(arg);
      if (argType == 'number') {
        numberSum += arg;
      } else if (argType == 'object') {
        channels.push(arg);
      } else {
        throw new Error(
          'plus: expected [(Number|Channel)*], got ' + typeof(arg));
      }
    }
    if (channels.length === 0) {
      return numberSum;
    }
    return {
      at: function(t) {
        var total = 0;
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

var GensData = {};
var GensChannel = {};

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
