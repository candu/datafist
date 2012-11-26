var SExp = {
  _parseImpl: function(s, i) {
    function helper() {
      while (true) {
        if (i >= s.length) throw new Error("parse failed");
        if (s[i] !== ' ') break;
        i++;
      }
      var sexp;
      if (s[i] === '(') {
        sexp = [];
        i++;
        while (true) {
          if (i >= s.length) throw new Error("parse failed");
          if (s[i] === ')') break;
          var result = helper();
          sexp.push(result.sexp);
        }
        i++;
      } else {
        var old_i = i;
        while (i < s.length && s[i] !== ' ' && s[i] !== ')') i++;
        sexp = s.substring(old_i, i);
        while (i < s.length && s[i] === ' ') i++;
      }
      return {sexp: sexp, pos: i};
    }
    return helper();
  },
  parse: function(s) {
    s = s.trim();
    var result = this._parseImpl(s, 0);
    if (result.pos !== s.length) throw new Error("parse failed");
    return result.sexp;
  },
  /**
   * Parse several s-expressions from a single string.
   */
  parseMany: function(s) {
    s = s.trim();
    var pos = 0,
        sexps = [];
    while (pos < s.length) {
      var result = this._parseImpl(s, pos);
      pos = result.pos;
      while (s[pos] === ' ') pos++;
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
  }
};
