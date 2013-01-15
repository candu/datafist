'use strict';

var FistFunction = new Class({
  initialize: function(fn) {
    this._fn = fn;
    this._type = null;
    this._description = null;
  },
  call: function(context, args, sexps) {
    return this._fn.call(context, args, sexps);
  },
  type: function(type) {
    if (type === undefined) {
      return this._type;
    }
    this._type = type;
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
  _bindArgs: function(paramsType, sexps) {
    console.log('_bindArgs', SExp.unparse(paramsType), SExp.unparse(sexps));
    var boundValues = {},
        i = 0;
    var match = function(type) {
      if (SExp.isAtom(type)) {
        if (i >= sexps.length) {
          return null;
        }
        return sexps[i++];
      }
      switch (type[0]) {
        case 'name':
          var value = match(type[1]),
              name = this.evaluateAtom(type[2]);
          boundValues[name] = value;
          return value;
        case '->':
          var thenValue = [];
          for (var j = 1; j < type.length; j++) {
            var value = match(type[j]);
            if (value === null) {
              return null;
            }
            thenValue.push(value);
          }
          return thenValue;
        case '|':
          for (var j = 1; j < type.length; j++) {
            var old_i = i,
                value = match(type[j]);
            if (value !== null) {
              return value;
            }
            i = old_i;
          }
          return null;
        case '?':
          var old_i = i,
              value = match(type[1]);
          if (value === null) {
            i = old_i;
            return undefined;
          }
          return value;
        case '+':
          var value = [];
          while (true) {
            var old_i = i,
                subValue = match(type[1]);
            if (subValue === null) {
              i = old_i;
              break;
            }
            value.push(subValue);
          }
          if (value.length === 0) {
            return null;
          }
          return value;
        case 'fn':
          return sexps[i++];
        default:
          throw new Error('unrecognized param type operator: ' + type[0]);
      }
    }.bind(this);
    match(paramsType);
    var args = {__sexps: {}};
    Object.each(boundValues, function(value, name) {
      if (value === undefined) {
        args[name] = undefined;
      } else if (value instanceof Array) {
        args[name] = value.map(function(sexp) {
          return this.evaluate(sexp);
        }.bind(this));
      } else {
        args[name] = this.evaluate(value);
      }
      args.__sexps[name] = value;
    }.bind(this));
    return args;
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
    if (!(op instanceof FistFunction)) {
      throw new Error('expected operation, got ' + typeOf(op));
    }
    var opType = SExp.parse(op.type()),
        paramsType = opType[1],
        args = this._bindArgs(paramsType, sexp.slice(1));
    return op.call(this, args);
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
  _maxType: function(types) {
    var maxType = 'number';
    types.each(function(type) {
      if (type instanceof Array) {
        type = this._maxType(type);
      }
      switch (type) {
        case 'number':
          break;
        case 'channel':
          maxType = 'channel';
          break;
        default:
          throw new Error('invalid type argument to max: ' + type);
      }
    }.bind(this));
    return maxType;
  },
  _resolveTypeRefs: function(returnType, boundTypes) {
    if (SExp.isAtom(returnType)) {
      return returnType;
    }
    switch (returnType[0]) {
      case 'max':
        var subTypes = [];
        for (var i = 1; i < returnType.length; i++) {
          subTypes.push(this._resolveTypeRefs(returnType[i], boundTypes));
        }
        return this._maxType(subTypes);
      case 'ref':
        var refName = this.evaluateAtom(returnType[1]),
            refType = boundTypes[refName];
        if (refName === undefined) {
          throw new Error('no type bound for name: ' + refName);
        }
        return refType;
      case 'fn':
        return returnType;
      default:
        throw new Error('unrecognized return type operator: ' + returnType[0]);
    }
  },
  _applyTypes: function(opType, argTypes) {
    var paramsType = opType[1],
        returnType = opType[2],
        boundTypes = {},
        i = 0;
    var match = function(type) {
      if (SExp.isAtom(type)) {
        if (i >= argTypes.length) {
          return null;
        }
        switch (type) {
          case 'channel?':
            return match(['|', 'number', 'channel']);
          case 'time':
          case 'timedelta':
            return match(['|', 'number', 'string']);
          case 'number':
          case 'string':
          case 'channel':
          case 'view':
            if (argTypes[i] === type) {
              i++;
              return type;
            }
            return null;
          default:
            throw new Error('unrecognized atomic type: ' + type);
        }
      }
      switch (type[0]) {
        case 'name':
          var subType = match(type[1]),
              name = this.evaluateAtom(type[2]);
          boundTypes[name] = subType;
          return subType;
        case '->':
          var thenType = [];
          for (var j = 1; j < type.length; j++) {
            var subType = match(type[j]);
            if (subType === null) {
              return null;
            }
            thenType.push(subType);
          }
          return thenType;
        case '|':
          for (var j = 1; j < type.length; j++) {
            var old_i = i,
                subType = match(type[j]);
            if (subType !== null) {
              return subType;
            }
            i = old_i;
          }
          return null;
        case '?':
          var old_i = i,
              subType = match(type[1]);
          if (subType === null) {
            i = old_i;
            return undefined;
          }
          return subType;
        case '+':
          var variadicType = [];
          while (true) {
            var old_i = i,
                subType = match(type[1]);
            if (subType === null) {
              i = old_i;
              break;
            }
            variadicType.push(subType);
          }
          if (variadicType.length === 0) {
            return null;
          }
          return variadicType;
        case 'fn':
          if (SExp.equal(argTypes[i], type)) {
            i++;
            return type;
          }
          return null;
        default:
          throw new Error('unrecognized param type operator: ' + type[0]);
      }
    }.bind(this);
    var matchedType = match(paramsType);
    if (matchedType === null || i !== argTypes.length) {
      return null;
    }
    return this._resolveTypeRefs(returnType, boundTypes);
  },
  evaluateType: function(sexp) {
    if (SExp.isAtom(sexp)) {
      var value = this.evaluateAtom(sexp),
          type = typeOf(value);
      switch (type) {
        case 'object':
          if (value instanceof FistFunction) {
            return value.type();
          }
          if (value.at !== undefined && value.iter !== undefined) {
            return 'channel';
          }
          throw new Error('object of unrecognized type');
        case 'number':
        case 'string':
          return type;
        default:
          throw new Error('value of unrecognized type: ' + type);
      }
    }
    if (sexp.length === 0) {
      throw new Error('expected operation');
    }
    // TODO: handle define
    var opType = SExp.parse(this.evaluateType(sexp[0]));
    if (!SExp.isList(opType) || opType.length !== 3 || opType[0] !== 'fn') {
      throw new Error('expected valid fn type, got ' + opType);
    }
    var argTypes = [];
    for (var i = 1; i < sexp.length; i++) {
      argTypes.push(this.evaluateType(sexp[i]));
    }
    return this._applyTypes(opType, argTypes);
  },
  executeType: function(command) {
    var sexps = SExp.parseMany(command);
    if (sexps.length === 0) {
      return null;
    }
    try {
      return this.evaluateType(sexps[0]);
    } catch (e) {
      console.log(e);
      return null;
    }
  }
});
