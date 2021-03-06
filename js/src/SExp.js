var SExp = {
  _parseImpl: function(s, i) {
    function helper() {
      while (true) {
        if (i >= s.length) throw new Error('parse failed');
        if (s[i] !== ' ') break;
        i++;
      }
      var sexp;
      if (s[i] === '(') {
        sexp = [];
        i++;
        while (true) {
          if (i >= s.length) throw new Error('parse failed');
          if (s[i] === ')') break;
          var result = helper();
          sexp.push(result.sexp);
        }
        i++;
      } else {
        var old_i = i;
        if (s[i] === '"') {
          var escaped = false;
          while (++i < s.length) {
            if (s[i] === '\\') {
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
          while (i < s.length && s[i] !== ' ' && s[i] !== ')') i++;
        }
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
    if (result.pos !== s.length) throw new Error('parse failed');
    return result.sexp;
  },
  /**
   * Convert an S-expression back into a string.
   */
  unparse: function(sexp) {
    if (this.isAtom(sexp)) {
      return sexp;
    }
    var s = [];
    for (var i = 0; i < sexp.length; i++) {
      s.push(this.unparse(sexp[i]));
    }
    return '(' + s.join(' ') + ')';
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
    if (pos !== s.length) throw new Error('parse failed');
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
