var Fist = {
  _symbolTable: {},
  evaluateAtom: function(atom) {
    atom = atom.toString();
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
      try {
        return Type.fromValue(this.evaluateAtom(code));
      } catch (e) {
        return null;
      }
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
  blockType: function(name) {
    var type = Type.fromValue(this.evaluateAtom(name));
    return type && type.node();
  }
};
