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
  _renderParams: function(params) {
    var paramsDiv = new Element('div.params'),
        i = 0;
    Object.each(params, function(type, name) {
      var nameColorHSL = d3.hsl(this._colorScale(i++));
      var paramsRow = new Element('div.param-row');
      var nameDiv = new Element('div.param-name', {
        text: name
      });
      nameDiv.setStyle('color', nameColorHSL.toString());
      var typeDiv = new Element('div.param-type', {
        text: type.toString()
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
        sep = '___',
        i = 0;
    Object.each(params, function(type, name) {
      var expression = '\\b' + name + '\\b',
          regex = RegExp(expression, 'g');
      text = text.replace(regex, sep + name + sep);
      pindex[name] = i++;
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
    if (!(value instanceof FistFunction)) {
      return;
    }
    var header = new Element('h3.symbol', {
      text: name,
      id: this._href(name)
    });
    var params = Type.fromValue(value).params,
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
