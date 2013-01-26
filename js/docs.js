'use strict';

var Docs = {
  _colorScale: d3.scale.category10(),
  init: function() {
    // HACK: monkey patch FistUI to route its signals to Docs
    FistUI.inited = true;
    FistUI.onSymbolImport = function(name, value, moduleName) {
      this.onSymbolImport(name, value, moduleName);
    }.bind(this);
    FistUI.onModuleImport = function(moduleName) {
      this.onModuleImport(moduleName);
    }.bind(this);

    this._root = $('docs');
    this._index = this._root.getElement('#index');
    this._content = this._root.getElement('#content');
  },
  _getParams: function(value) {
    var extract = function(type) {
      if (SExp.isAtom(type)) {
        switch (type) {
          case 'channel?':
            return extract(['|', 'number', 'channel']);
          case 'time':
          case 'timedelta':
            return extract(['|', 'number', 'string']);
          case 'number':
          case 'string':
          case 'channel':
          case 'view':
            return type;
          default:
            throw new Error('unrecognized atomic type: ' + type);
        }
      }
      switch (type[0]) {
        case 'name':
          var subType = type[1],
              name = Fist.evaluateAtom(type[2]);
          return {name: name, type: extract(subType)};
        case '->':
          var thenType = [];
          for (var j = 1; j < type.length; j++) {
            thenType.push(extract(type[j]));
          }
          return thenType;
        case '|':
          var orType = [];
          for (var j = 1; j < type.length; j++) {
            orType.push(extract(type[j]));
          }
          if (orType.length <= 2) {
            return orType.join(' or ');
          }
          orType[orType.length - 1] = 'or ' + orType[orType.length - 1];
          return orType.join(', ');
        case '?':
          return '(optional) ' + extract(type[1]);
        case '+':
          return extract(type[1]) + ', ...';
        case 'fn':
          return 'function: ' + extract(type[1]) + ' -> ' + extract(type[2]);
        default:
          throw new Error('unrecognized param type operator: ' + type[0]);
      }
    }.bind(this);
    var fnType = SExp.parse(value.type()),
        params = extract(fnType[1]);
    if (!(params instanceof Array)) {
      params = [params];
    }
    return params;
  },
  _renderParams: function(params) {
    var paramsDiv = new Element('div.params');
    params.each(function(param, i) {
      var nameColorHSL = d3.hsl(this._colorScale(i));
      var paramsRow = new Element('div.param-row');
      var nameDiv = new Element('div.param-name', {
        text: param.name
      });
      nameDiv.setStyle('color', nameColorHSL.toString());
      var typeDiv = new Element('div.param-type', {
        text: param.type
      });
      var typeColorHSL = nameColorHSL.brighter(0.7),
          rowColorHSL = nameColorHSL.brighter(1.4);
      typeColorHSL.s *= 0.7;
      rowColorHSL.s *= 1.1;
      typeDiv.setStyle('color', typeColorHSL.toString());
      paramsRow.setStyle('background-color', rowColorHSL.toString());
      paramsRow.adopt(nameDiv, typeDiv);
      paramsDiv.adopt(paramsRow);
    }.bind(this));
    return paramsDiv;
  },
  _renderDesc: function(params, value) {
    var text = value.describe(),
        pindex = {},
        sep = '___';
    params.each(function(param, i) {
      var expression = '\\b' + param.name + '\\b',
          regex = RegExp(expression, 'g');
      text = text.replace(regex, sep + param.name + sep);
      pindex[param.name] = i;
    }.bind(this));
    var tokens = text.split(sep);
    var desc = new Element('p.desc');
    tokens.each(function(tok) {
      var span = new Element('span', {
        text: tok
      });
      var i = pindex[tok];
      if (i !== undefined) {
        var refColorHSL = d3.hsl(this._colorScale(i));
        span.addClass('param-ref').setStyle('color', refColorHSL);
      }
      desc.adopt(span);
    }.bind(this));
    return desc;
  },
  _href: function(name) {
    return name.replace(' ', '_').replace('-', '_').toLowerCase();
  },
  onSymbolImport: function(name, value, moduleName) {
    var header = new Element('h3.symbol', {
      text: name,
      id: this._href(name)
    });
    var params = this._getParams(value),
        paramsDiv = this._renderParams(params),
        descDiv = this._renderDesc(params, value);
    this._content.adopt(header, paramsDiv, descDiv);
  },
  onModuleImport: function(moduleName) {
    var link = new Element('a', {
      text: moduleName,
      href: '#' + this._href(moduleName)
    });
    var listItem = new Element('li');
    listItem.adopt(link);
    this._index.adopt(listItem);

    var header = new Element('h2.module', {
      text: moduleName,
      id: this._href(moduleName)
    });
    this._content.adopt(header);
  }
};

$(window).addEvent('domready', function() {
  Docs.init();
  LibFist.import();
});
