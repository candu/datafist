'use strict';

var FistFunction = new Class({
  initialize: function(fn) {
    this._fn = fn;
    this._signature = [];
    this._description = null;
  },
  call: function(context, args, sexps) {
    return this._fn.call(context, args, sexps);
  },
  signature: function(argsType, returnType) {
    if (argsType === undefined) {
      return this._signature;
    }
    if (returnType === undefined) {
      returnType = 'void';
    }
    this._signature.push([argsType, returnType]);
    return this;
  },
  describe: function(description) {
    if (description === undefined) {
      return this._description;
    }
    this._description = description;
    return this;
  }
});

var DataChannel = new Class({
  initialize: function(data, source) {
    this._data = Array.clone(data);
    this._data.sort(function(a, b) { return a.t - b.t; });
    this._index = {};
    for (var i = 0; i < this._data.length; i++) {
      this._index[this._data[i].t] = this._data[i].x;
    }
    this._source = source;
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
  },
  describe: function() {
    return 'imported from ' + this._source;
  }
});

var Fist = new Class({
  initialize: function() {
    // TODO: builtins
    this._symbolTable = {};
    this._dummyElem = new Element('div');
  },
  _symbolImported: function(name, value, moduleName) {
    this._dummyElem.fireEvent('symbolimport', [name, value, moduleName]);
  },
  _moduleImported: function(moduleName) {
    this._dummyElem.fireEvent('moduleimport', [moduleName]);
  },
  _viewInvoked: function(name, channels, sexps) {
    this._dummyElem.fireEvent('viewinvoked', [name, channels, sexps]);
  },
  listen: function(type, callback) {
    switch (type) {
      case 'symbolimport':
      case 'moduleimport':
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
    if (typeOf(op) !== 'function' &&
        !(op instanceof FistFunction)) {
      throw new Error('expected operation, got ' + typeof(op));
    }
    var args = [];
    for (var i = 1; i < sexp.length; i++) {
      args.push(this.evaluate(sexp[i]));
    }
    return op.call(this, args, sexp.slice(1));
  },
  execute: function(command) {
    var sexps = SExp.parseMany(command);
    if (sexps.length === 0) {
      return null;
    }
    return this.evaluate(sexps[0]);
  },
  registerSymbol: function(name, value, moduleName) {
    console.log('importing symbol ' + name + ' in module ' + moduleName);
    this._symbolTable[name] = value;
    this._symbolImported(name, value, moduleName);
  },
  importData: function(name, data, source) {
    this.registerSymbol(name, new DataChannel(data, source));
  },
  importModule: function(namespace, module) {
    // TODO: implement namespacing...
    console.log('importing module ' + module.__fullName);
    this._moduleImported(module.__fullName);
    if (module.__exports !== undefined) {
      console.log('found __exports declaration');
      for (var i = 0; i < module.__exports.length; i++) {
        var def = module.__exports[i];
        var defType = typeOf(def);
        if (defType === 'string') {
          this.registerSymbol(def, module[def], module.__fullName);
        } else if (defType === 'array') {
          if (def.length !== 2) {
            throw new Error('expected internal/external name pair');
          }
          this.registerSymbol(def[1], module[def[0]], module.__fullName);
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
        this.registerSymbol(def, module[def], module.__fullName);
      }
    }
  },
  getType: function(command) {
    try {
      // TODO: better typing
      var value = this.execute(command),
          type = typeOf(value);
      if (type === 'object') {
        if (value instanceof FistFunction) {
          return 'function';
        }
        if (value.at !== undefined && value.iter !== undefined) {
          return 'channel';
        }
        if (value.render !== undefined) {
          return 'view';
        }
        return 'object';
      }
      if (type === 'array') {
        return 'data';
      }
      return type;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
});
