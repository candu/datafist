var FistUI = new Class({
  initialize: function(fist, root) {
    this._viewTable = {};
    this._state = '';
    this._root = root;

    // set up palette
    this._palette = this._root.getElement('#palette');

    // set up viewer
    this._viewer = this._root.getElement('#viewer');
    this._svgWrapper = this._root.getElement('#svg_wrapper');
    this._svgWrapper.addEventListener('dragenter', function(evt) {
      this.addClass('droptarget');
    }, false);
    this._svgWrapper.addEventListener('dragover', function(evt) {
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'move';
      return false;
    }, false);
    this._svgWrapper.addEventListener('dragleave', function(evt) {
      this.removeClass('droptarget');
    }, false);
    this._svgWrapper.addEventListener('drop', function(evt) {
      evt.stopPropagation();
      console.log(evt.dataTransfer.getData('text/html'));
    }.bind(this), false);
    this._viewToggle = this._root.getElement('#view_toggle');
    this._viewToggle.addEvent('click', function(evt) {
      this._viewToggle.toggleClass('on');
      if (this._viewToggle.hasClass('on')) {
        // TODO: render view!
      } else {
        // TODO: render patchboard!
      }
    }.bind(this));

    // set up interpreter
    this._repl = this._root.getElement('#repl');
    // TODO: something here

    // register event listeners for Fist events
    fist.listen('symbolimport', function(name, value) {
      this.onSymbolImport(name, value);
    }.bind(this));
    fist.listen('viewinvoked', function(name, channels) {
      this.onViewInvoked(name, channels);
    }.bind(this));
  },
  onSymbolImport: function(name, value) {
    var block = new Element('div.block.' + typeOf(value), {
      text: name,
      draggable: true
    });
    block.addEventListener('dragstart', function(evt) {
      $(this).addClass('dragtarget');
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('text/html', this.innerHTML);
    }, false);
    block.addEventListener('dragend', function(evt) {
      block.removeClass('dragtarget');
      this._svgWrapper.removeClass('droptarget');
    }.bind(this), false);
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
