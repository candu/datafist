/*
  Class:      ContextMenu
  Author:     David Walsh (edited by Evan Savage)
  Website:    http://davidwalsh.name
  Version:    1.0
  Date:       1/20/2009
*/

var ContextMenu = new Class({

  //implements
  Implements: [Options,Events],

  //options
  options: {
    menu: 'contextmenu',
    stopEvent: true,
    targets: 'body',
    onShow: Function.from(),
    onHide: Function.from(),
    onClick: Function.from(),
  },

  //initialization
  initialize: function(options) {
    //set options
    this.setOptions(options);

    //option diffs menu
    this.menu = $(this.options.menu);
    this.targets = $$(this.options.targets);

    //hide and begin the listener
    this.hide().startListener();

    //hide the menu
    this.menu.setStyles({ 'position':'absolute','top':'-900000px', 'display':'block' });
  },

  //get things started
  startListener: function() {
    /* all elemnts */
    this.targets.addEvent('contextmenu', function(e) {
      e.stop();
      this._triggerEvent = e;
      //position the menu
      this.menu.setStyles({
        top: e.page.y,
        left: e.page.x,
        position: 'absolute',
        'z-index': '2000'
      });
      //show the menu
      this.show();
    }.bind(this));

    /* menu items */
    this.menu.getElements('a').addEvent('click', function(e) {
      this.fireEvent('click', [this._triggerEvent, e]);
    }.bind(this));

    //hide on body click
    $(document.body).addEvent('click', function() {
      this.hide();
    }.bind(this));
  },

  //show menu
  show: function() {
    this.fireEvent('show', [this._triggerEvent]);
    this._shown = true;
    return this;
  },

  //hide the menu
  hide: function() {
    if (this._shown)
    {
      this.fireEvent('hide');
      this._shown = false;
    }
    return this;
  }
});
