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
  fistUI.loaded(loadStart);
}).addEvent('resize', function() {
  window.clearTimeout(resizeTimer);
  resizeTimer = (function() {
    fistUI.dynamicResize();
  }).delay(50);
});
