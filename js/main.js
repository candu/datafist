function setupDemo(fist) {
  var a = fist.execute('((gen-regular 0 86400000 96) (constant 1))'),
      b = fist.execute('((gen-regular 0 86400000 96) (constant 2))');
  fist.registerSymbol('c1', OpsArith.plus([
    a,
    fist.execute('((gen-regular 0 86400000 96) (gaussian 0 0.1))')
  ]));
  fist.registerSymbol('c2', OpsArith.plus([
    b,
    fist.execute('((gen-regular 0 86400000 96) (gaussian 0 0.2))')
  ]));
}

function dynamicResize() {
  var contentSize = $('content').getSize();
  $('palette').setStyle('height', contentSize.y - 10);
  $('svg_wrapper').setStyle('height', contentSize.y - 10);
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
}).addEvent('resize', function() {
  window.clearTimeout(resizeTimer);
  resizeTimer = (function() {
    dynamicResize();
  }).delay(50);
});
