var Fist = {
  _symbolTable: {},
  makeDataChannel: function(data) {
    data.sort(function(a, b) { return a.t - b.t; });
    index = {};
    for (var i = 0; i < data.length; i++) {
      index[data[i].t] = data[i].x;
    }
    return {
      at: function(t) {
        if (!index.hasOwnProperty(t)) {
          // TODO: deal with non-numeric values
          return 0;
        }
        return index[t];
      },
      iter: function() {
        return Iterator(data);
      }
    };
  },
  evaluateAtom: function(atom) {
    if (!atom) {
      throw new Error('empty atom not allowed');
    }
    var symbolValue = this._symbolTable[atom];
    if (symbolValue !== undefined) {
      return symbolValue;
    }
    var floatValue = parseFloat(atom);
    if (!isNaN(floatValue)) {
      return floatValue;
    }
    if (atom === 'true') {
      return true;
    }
    if (atom === 'false') {
      return false;
    }
    if (/"(.*)"/.test(atom)) {
      return atom.replace(/"(.*)"/, '$1').replace(/\\"/g, '"');
    }
    throw new Error('unrecognized atom: ' + atom);
  },
  evaluate: function(sexp) {
    if (SExp.isAtom(sexp)) {
      return this.evaluateAtom(sexp);
    }
    if (sexp.length === 0) {
      throw new Error('expected operation');
    }
    var op = this.evaluate(sexp[0]);
    if (!(op instanceof Function)) {
      throw new Error('expected operation, got ' + typeof(op));
    }
    return op.apply(this, [sexp.slice(1).map(this.evaluate.bind(this))]);
  },
  execute: function(command) {
    return this.evaluate(SExp.parse(command));
  },
  registerSymbol: function(name, value) {
    console.log('importing symbol ' + name);
    this._symbolTable[name] = value;
  },
  importData: function(name, data) {
    this.registerSymbol(name, this.makeDataChannel(data));
  },
  importModule: function(namespace, module) {
    // TODO: implement namespacing...
    if (module.__exports !== undefined) {
      console.log('found __exports declaration');
      for (var i = 0; i < module.__exports.length; i++) {
        var def = module.__exports[i];
        if (def instanceof String) {
          this.registerSymbol(def, module[def]);
        } else if (def instanceof Array) {
          if (def.length !== 2)
            throw new Error('expected internal/external name pair');
          this.registerSymbol(def[1], module[def[0]]);
        } else {
          throw new Error('invalid __exports declaration');
        }
      }
    } else {
      console.log('no __exports declaration, importing all');
      for (var def in module) {
        if (def.indexOf('_') === 0) {
          continue;
        }
        this.registerSymbol(def, module[def]);
      }
    }
  }
};
