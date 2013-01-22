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
    return new Element('p', {
      text: value.type()
    });
  },
  _desc: function(value) {
    return new Element('p', {
      text: value.describe()
    });
  },
  _onSymbolImport: function(name, value, moduleName) {
    console.log(name);
    console.log(value.describe());
    var header = new Element('h3', {
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
    console.log(moduleName);
    var link = new Element('a', {
      text: moduleName,
      href: '#' + this._href(moduleName)
    });
    var listItem = new Element('li');
    listItem.adopt(link);
    this._index.adopt(listItem);

    var header = new Element('h2', {
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
