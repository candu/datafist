var SExp = {
  parse: function(s) {
    s = s.trim();
    var i = 0;
    function helper() {
      while (true) {
        if (i >= s.length) return null;
        if (s[i] !== ' ') break;
        i++;
      }
      var sexp;
      if (s[i] === '(') {
        sexp = [];
        i++;
        while (true) {
          if (i >= s.length) return null;
          if (s[i] === ')') break;
          var subexp = helper();
          if (subexp === null) return null;
          sexp.push(subexp);
        }
        i++;
      } else {
        var old_i = i;
        while (i < s.length && s[i] !== ' ' && s[i] !== ')') i++;
        sexp = s.substring(old_i, i);
        while (i < s.length && s[i] === ' ') i++;
      }
      return sexp;
    }
    var sexp = helper();
    if (i !== s.length) return null;
    return sexp;
  },
  isAtom: function(sexp) {
    return sexp.length === undefined;
  },
  isList: function(sexp) {
    return sexp.length !== undefined;
  },
};
