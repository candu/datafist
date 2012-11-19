// see http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
Object.toType = (function toType(global) {
  return function(obj) {
    if (obj === global) {
      return "global";
    }
    return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
  }
})(this);

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
  }
};
