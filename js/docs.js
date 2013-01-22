'use strict';

var Docs = new Class({
  initialize: function(fist, root) {
    this._fist = fist;
    this._fist.listen('symbolimport', function(name, value, moduleName) {
      this._onSymbolImport(name, value, moduleName);
    }.bind(this));
    this._fist.listen('moduleimport', function(moduleName) {
      this._onModuleImport(moduleName);
    }.bind(this));

    this._root = root;
    this._index = this._root.getElement('#index');
    this._content = this._root.getElement('#content');
  },
  _params: function(value) {
    var params = [];
    var extract = function(type) {
      console.log(type);
      if (SExp.isAtom(type)) {
        return;
      }
      switch (type[0]) {
        case 'name':
          var subType = type[1],
              name = this._fist.evaluateAtom(type[2]);
          params.push([name, subType]);
          break;
        case '->':
          for (var j = 1; j < type.length; j++) {
            extract(type[j]);
          }
          break;
        default:
          return;
      }
    }.bind(this);
    var fnType = SExp.parse(value.type());
    extract(fnType[1]);
    console.log(params);
    var paramsDiv = new Element('div.params');
    params.each(function(param) {
      var paramsRow = new Element('div.param-row');
      var nameDiv = new Element('div.param-name', {
        text: param[0]
      });
      var typeDiv = new Element('div.param-type', {
        text: SExp.unparse(param[1])
      });
      paramsRow.adopt(nameDiv, typeDiv);
      paramsDiv.adopt(paramsRow);
    });
    return paramsDiv;
  },
  _desc: function(value) {
    return new Element('p.desc', {
      text: value.describe()
    });
  },
  _onSymbolImport: function(name, value, moduleName) {
    var header = new Element('h3.symbol', {
      text: name,
      id: this._href(name)
    });
    var params = this._params(value);
    var description = this._desc(value);
    this._content.adopt(header, params, description);
  },
  _href: function(name) {
    return name.replace(' ', '_').replace('-', '_').toLowerCase();
  },
  _onModuleImport: function(moduleName) {
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
});

var fist = null,
    docs = null;
$(window).addEvent('domready', function() {
  fist = new Fist();
  docs = new Docs(fist, $('docs'));
  LibFist.import(fist);
});
