var FistUI = new Class({
  initialize: function(fist, root) {
    this._viewTable = {};
    this._root = root;
    this._palette = this._root.getElement('#palette');
    this._viewer = this._root.getElement('#svg_wrapper');
    this._repl = this._root.getElement('#repl');
    console.log(this);
    fist.listen('symbolimport', function(name, value) {
      this.onSymbolImport(name, value);
    }.bind(this));
    fist.listen('viewinvoked', function(name, channels) {
      this.onViewInvoked(name, channels);
    }.bind(this));
  },
  onSymbolImport: function(name, value) {
    var block = new Element('div.block.' + typeOf(value), {
      text: name
    });
    block.inject(this._palette);
  },
  onViewInvoked: function(name, channels) {
    console.log('rendering view ' + name);
    var view = this._viewTable[name];
    if (view === undefined) {
      throw new Error('unrecognized view: ' + name);
    }
    view.render(channels, this._viewer);
  },
  importView: function(name, view) {
    console.log('importing view ' + name);
    this._viewTable[name] = view;
  }
});
