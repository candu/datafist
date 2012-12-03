var DataChannel = new Class({
  initialize: function(data) {
    this._data = Array.clone(data);
    this._data.sort(function(a, b) { return a.t - b.t; });
    this._index = {};
    for (var i = 0; i < this._data.length; i++) {
      this._index[this._data[i].t] = this._data[i].x;
    }
  },
  at: function(t) {
    if (!this._index.hasOwnProperty(t)) {
      // TODO: deal with non-numeric values
      return 0;
    }
    return this._index[t];
  },
  iter: function() {
    return Iterator(this._data.map(function(a) {
      return a.t;
    }));
  }
});

var Fist = new Class({
  initialize: function() {
    // TODO: builtins
    this._symbolTable = {};
    this._dummyElem = new Element('div');
  },
  _symbolImported: function(name, value) {
    this._dummyElem.fireEvent('symbolimport', [name, value]);
  },
  _viewInvoked: function(name, channels, sexps) {
    this._dummyElem.fireEvent('viewinvoked', [name, channels, sexps]);
  },
  listen: function(type, callback) {
    switch (type) {
      case 'symbolimport':
      case 'viewinvoked':
        this._dummyElem.addEvent(type, callback);
        break;
      default:
        throw new Error('unrecognized event type: ' + type);
    }
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
    switch (sexp[0]) {
      case 'define':
        if (sexp.length !== 3) {
          throw new Error('expected (define <name> <value>)');
        }
        var name = sexp[1],
            value = this.evaluate(sexp[2]);
        this.registerSymbol(name, value);
        return null;
    }
    var op = this.evaluate(sexp[0]);
    if (typeOf(op) !== 'function') {
      throw new Error('expected operation, got ' + typeof(op));
    }
    var args = [];
    for (var i = 1; i < sexp.length; i++) {
      args.push(this.evaluate(sexp[i]));
    }
    return op.call(this, args, sexp.slice(1));
  },
  execute: function(command) {
    return this.evaluate(SExp.parse(command));
  },
  registerSymbol: function(name, value) {
    console.log('importing symbol ' + name);
    this._symbolTable[name] = value;
    this._symbolImported(name);
  },
  importData: function(name, data) {
    this.registerSymbol(name, new DataChannel(data));
  },
  importModule: function(namespace, module) {
    // TODO: implement namespacing...
    if (module.__exports !== undefined) {
      console.log('found __exports declaration');
      for (var i = 0; i < module.__exports.length; i++) {
        var def = module.__exports[i];
        var defType = typeOf(def);
        if (defType === 'string') {
          this.registerSymbol(def, module[def]);
        } else if (defType === 'array') {
          if (def.length !== 2) {
            throw new Error('expected internal/external name pair');
          }
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
  },
  getType: function(command) {
    try {
      // TODO: better typing
      return typeOf(this.execute(command));
    } catch (e) {
      console.log(e);
      return null;
    }
  }
});
