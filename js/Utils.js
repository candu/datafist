Object.isEmpty = function(obj) {
  for (var i in obj) {
    return false;
  }
  return true;
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
