'use strict';

var FistFunction = new Class({
  initialize: function(fn) {
    this._fn = fn;
    this._type = null;
    this._description = null;
  },
  call: function(context, args) {
    return this._fn.call(context, args);
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
    this._source = source || 'Fist command line';
    // TODO: maybe identify type when channel is created?
    var dataType = NumberType;
    if (this._data.length > 0) {
      dataType = Type.fromValue(this._data[0].x);
    }
    this._type = ChannelType(dataType);
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
  type: function() {
    return this._type;
  },
  describe: function() {
    return 'imported from ' + this._source;
  }
});

var Fist = {
  _symbolTable: {},
  evaluateAtom: function(atom) {
    return this._symbolTable[atom] || atom;
  },
  isFunction: function(code) {
    return code instanceof Object;
  },
  isAtom: function(code) {
    return !this.isFunction(code);
  },
  evaluate: function(code) {
    console.log(JSON.stringify(code));
    if (this.isAtom(code)) {
      return this.evaluateAtom(code);
    }
    var op = this.evaluate(code.op);
    if (!(op instanceof FistFunction)) {
      throw new Error('expected operation, got ' + typeOf(op));
    }
    var args = {__code: {}};
    Object.each(code.args, function(arg, name) {
      args.__code[name] = arg;
      if (arg === undefined) {
        args[name] = undefined;
      } else if (arg instanceof Array) {
        args[name] = args.__code[name].map(this.evaluate.bind(this));
      } else {
        args[name] = this.evaluate(args.__code[name]);
      }
    }.bind(this));
    return op.call(this, args);
  },
  execute: function(command) {
    var code = JSON.parse(command);
    if (code.length === 0) {
      return null;
    }
    return this.evaluate(code[0]);
  },
  registerSymbol: function(name, value, moduleName) {
    this._symbolTable[name] = value;
    if (FistUI.inited) {
      FistUI.onSymbolImport(name, value, moduleName);
    }
  },
  importData: function(name, data, source) {
    this.registerSymbol(name, new DataChannel(data, source));
  },
  importModule: function(namespace, module) {
    // TODO: implement namespacing...
    if (FistUI.inited) {
      FistUI.onModuleImport(module.__fullName);
    }
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
  _applyTypes: function(opType, argTypes) {
    var paramNames = Object.keys(opType.params),
        boundTypes = {};
    for (var i = 0; i < paramNames.length; i++) {
      var name = paramNames[i],
          type = opType.params[name],
          matchType = type.match(argTypes[name]);
      if (matchType === null) {
        return null;
      }
      boundTypes[name] = matchType;
    }
    return opType.returnType.resolve(boundTypes);
  },
  evaluateType: function(code) {
    if (this.isAtom(code)) {
      return Type.fromValue(this.evaluateAtom(code));
    }
    var opType = this.evaluateType(code.op),
        argTypes = Object.map(code.args, function(arg, name) {
          console.log('arg: ', arg, name);
          if (arg instanceof Array) {
            return arg.map(this.evaluateType.bind(this));
          }
          return this.evaluateType(arg);
        }.bind(this));
    return this._applyTypes(opType, argTypes);
  },
  executeType: function(command) {
    var code = JSON.parse(command);
    if (code.length === 0) {
      return null;
    }
    try {
      return this.evaluateType(code[0]);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  blockType: function(command) {
    var type = this.executeType(command);
    if (type === null) {
      return null;
    }
    return type.node();
  }
};
