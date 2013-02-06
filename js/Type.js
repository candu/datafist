// Type utility class

var Type = {
  fromValue: function(value) {
    var type = typeOf(value);
    switch (type) {
      case 'object':
        return value.type();
      case 'number':
        return NumberType;
      case 'string':
        return StringType;
      default:
        throw new Error('value of unrecognized type: ' + type);
    }
  },
  equal: function(t1, t2) {
    if (t1 === null || t1 === undefined ||
        t2 === null || t2 === undefined) {
      return t1 === t2;
    }
    console.log(t1.toString(), t2.toString());
    return t1.toString() === t2.toString();
  }
};

// primitive types
// TODO: default values?

var PrimitiveType = new Class({
  initialize: function(nodeType) {
    this._nodeType = nodeType;
  },
  /**
   * Called by Fist.nodeType() to determine the CSS class for nodes
   * with values of this type.
   */
  node: function() {
    return this._nodeType;
  },
  /**
   * Called to retrieve a human-readable representation of this type.
   */
  toString: function() {
    return this._nodeType;
  },
  /**
   * Called when attempting to match actual param types to declared
   * param signatures in FistFunction. These matches are then bound
   * to the param names.
   */
  match: function(type) {
    return type === this ? type : null;
  },
  /**
   * Called when attempting to resolve return types using the bound
   * matched types.
   */
  resolve: function(boundTypes) {
    return this;
  }
});

var NumberType = new PrimitiveType('number');
var StringType = new PrimitiveType('string');
var LocationType = new PrimitiveType('location');
var ViewType = new PrimitiveType('view');

// derived types

// TODO: full proper time/timedelta typing
var TimeType = {
  node: function() {
    return 'time';
  },
  toString: function() {
    return 'time';
  },
  match: function(type) {
    return NumberType.match(type) || StringType.match(type);
  },
  resolve: function(boundTypes) {
    return this;
  }
};

var TimeDeltaType = {
  node: function() {
    return 'timedelta';
  },
  toString: function() {
    return 'timedelta';
  },
  match: function(type) {
    return NumberType.match(type) || StringType.match(type);
  },
  resolve: function(boundTypes) {
    return this;
  }
};

function ChannelType(dataType) {
  return {
    dataType: dataType,
    node: function() {
      return 'channel';
    },
    toString: function() {
      return 'channel(' + dataType.toString() + ')';
    },
    match: function(type) {
      var match = dataType.match(type.dataType);
      return match === null ? null : ChannelType(match);
    },
    resolve: function(boundTypes) {
      return this;
    }
  };
}

function FunctionType(params, returnType) {
  var _meta = function(paramCallback, returnCallback) {
    var paramNames = Object.keys(params),
        mappedParams = {};
    for (var i = 0; i < paramNames.length; i++) {
      var name = paramNames[i],
          mappedType = paramCallback(name);
      if (mappedType === null) {
        return null;
      }
      mappedParams[name] = mappedType;
    }
    var mappedReturnType = returnCallback();
    if (mappedReturnType === null) {
      return null;
    }
    return FunctionType(mappedParams, mappedReturnType);
  };
  return {
    params: params,
    returnType: returnType,
    node: function() {
      return 'function';
    },
    toString: function() {
      var paramString = Object.keys(params).sort().map(function(name) {
        return name + ': ' + params[name].toString();
      }).join(', ');
      return 'function({' + paramString + '}, ' + returnType.toString() + ')';
    },
    match: function(type) {
      return _meta(function(name) {
        return params[name].match(type.params[name]);
      }, function() {
        return returnType.match(type.returnType);
      });
    },
    resolve: function(boundTypes) {
      return _meta(function(name) {
        return params[name].resolve(boundTypes);
      }, function() {
        return returnType.resolve(boundTypes);
      });
    }
  };
}

// type combinators

function OrType(/* subType, ..., */) {
  var _subTypes = Array.slice(arguments);
  // NOTE: return types must use the RefType type variable mechanism to
  // achieve polymorphism! resolve() is not provided here.
  return {
    toString: function() {
      var subTypeString = _subTypes.map(function(type) {
        return type.toString();
      }).sort().join(', ')
      return 'or(' + subTypeString + ')';
    },
    match: function(type) {
      for (var i = 0; i < _subTypes.length; i++) {
        var matchType = _subTypes[i].match(type);
        if (matchType !== null) {
          return matchType;
        }
      }
      return null;
    }
  };
}

function MaybeType(subType) {
  return {
    toString: function() {
      return 'maybe(' + subType.toString() + ')';
    },
    match: function(type) {
      if (type === undefined) {
        return undefined;
      }
      return subType.match(type);
    }
  };
}

function ListType(subType) {
  return {
    toString: function() {
      return 'list(' + subType.toString() + ')';
    },
    match: function(type) {
      if (!type instanceof Array || type.length === 0) {
        return null;
      }
      var matchedTypes = [];
      for (var i = 0; i < type.length; i++) {
        var matchType = subType.match(type[i]);
        if (matchType === null) {
          return null;
        }
        matchedTypes.push(matchType);
      }
      return matchedTypes;
    }
  };
}

// return type references

function RefType(name) {
  // NOTE: parameter types cannot back-reference other parameter names!
  // match() is not provided here.
  return {
    toString: function() {
      return 'ref(' + name + ')';
    },
    resolve: function(boundTypes) {
      return boundTypes.hasOwnProperty(name) ? boundTypes[name] : null;
    }
  };
}

function MaxType(/* subType, ... */) {
  var _subTypes = Array.slice(arguments);
  return {
    toString: function() {
      var subTypeString = _subTypes.map(function(type) {
        return type.toString();
      }).sort().join(', ')
      return 'max(' + subTypeString + ')';
    },
    resolve: function(boundTypes) {
      var dataType = null,
          hasChannel = false;
      for (var i = 0; i < _subTypes.length; i++) {
        var subType = _subTypes[i].resolve(boundTypes);
        if (subType instanceof Array) {
          subType = MaxType.apply(this, subType).resolve(boundTypes);
        }
        var subDataType = subType.dataType || subType;
        if (dataType === null) {
          dataType = subDataType;
        } else {
          if (subDataType !== dataType) {
            return null;
          }
        }
        if (subType.dataType !== undefined) {
          hasChannel = true;
        }
      }
      return hasChannel ? ChannelType(dataType) : dataType;
    }
  }
}

// type shortcuts

function MaybeChannelType(dataType) {
  return OrType(dataType, ChannelType(dataType));
}
