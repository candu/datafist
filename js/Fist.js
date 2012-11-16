var Env = new Class({
  initialize: function() {

  }
});

var REPLHandler = new Class({
  initialize: function(elem) {
    this._elem = elem;
  },
  start: function() {
    this._elem.focus();
  }
});
