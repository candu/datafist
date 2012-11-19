var FistUI = new Class({
  initialize: function(fist, root) {
    this._root = root;
    this._palette = this._root.getElement('#palette');
    this._viewer = this._root.getElement('#svg_wrapper');
    this._repl = this._root.getElement('#repl');
    console.log(this);
    fist.listen('symbolimport', function(name, value) {
      this.onSymbolImport(name, value);
    }.bind(this));
  },
  onSymbolImport: function(name, value) {
    var block = new Element('div.block.' + typeOf(value), {
      text: name
    });
    block.inject(this._palette);
  }
});
