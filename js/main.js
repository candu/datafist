function setupDemo(fist) {
  var a = fist.execute('((gen-regular 0 86400000 96) (constant 1))'),
      b = fist.execute('((gen-regular 0 86400000 96) (constant 2))');
  fist.registerSymbol('c1', OpsArith.add([
    a,
    fist.execute('((gen-regular 0 86400000 96) (gaussian 0 0.1))')
  ]));
  fist.registerSymbol('c2', OpsArith.add([
    b,
    fist.execute('((gen-regular 0 86400000 96) (gaussian 0 0.2))')
  ]));
}

function dynamicResize() {
  var contentSize = $('content').getSize();
  $('svg_execute_wrapper').setStyle('height', contentSize.y - 10);
}

var resizeTimer;
var fist;
$(window).addEvent('domready', function() {
  dynamicResize();
  fist = new Fist();
  var UI = new FistUI(fist, $('container'));
  LibFist.import(fist);
  LibFistUI.import(UI);
  setupDemo(fist);
  var context = new ContextMenu({
    menu: 'contextmenu',
    targets: '#svg_graph_wrapper',
    onShow: function() {
      this.menu.removeClass('hidden');
      this.menu.setStyle('z-index', 2000);
    },
    onHide: function() {
      this.menu.addClass('hidden');
      this.menu.setStyle('z-index', -2000);
    },
    onClick: function(menuEvt, item, menuItemEvt) {
      console.log(arguments);
    }
  });
}).addEvent('resize', function() {
  // TODO: re-enable this once viewExecuteSVG can be dynamically resized
  /*
  window.clearTimeout(resizeTimer);
  resizeTimer = (function() {
    dynamicResize();
  }).delay(50);
  */
});
