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

var resizeTimer = null,
    fist = null;
    fistUI = null;
    loadStart = +(new Date());
$(window).addEvent('domready', function() {
  fist = new Fist();
  fistUI = new FistUI(fist, $('container'));
  fistUI.dynamicResize();
  LibFist.import(fist);
  LibFistUI.import(fistUI);
  setupDemo(fist);
  fistUI.loaded(loadStart);
}).addEvent('resize', function() {
  window.clearTimeout(resizeTimer);
  resizeTimer = (function() {
    fistUI.dynamicResize();
  }).delay(50);
});
