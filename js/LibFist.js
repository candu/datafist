var OpsArith = {
  __exports: [
    ['plus', '+']
  ],
  plus: function(args) {
    var hasChannel = false,
        numberSum = 0;
    for (var i = 0; i < args.length; i++) {
      var arg = args[i];
      if (typeof(arg) === 'number') {
        numberSum += arg;
      } else if (arg instanceof Channel) {
        hasChannel = true;
      } else {
        throw new Error(
          'plus: expected [(Number|Channel)*], got ' + typeof(arg));
      }
    }
    if (!hasChannel) {
      return numberSum;
    }
    // TODO: handle channel case
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
