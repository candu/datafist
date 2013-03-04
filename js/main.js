'use strict';

var resizeTimer = null,
    loadStart = +(new Date());
$(window).addEvent('domready', function() {
  FistUI.init();
  FistUI.dynamicResize();
  LibFist.import();
  LibFistUI.import();
  FistUI.loaded(Fist.VERSION, loadStart);
}).addEvent('resize', function() {
  window.clearTimeout(resizeTimer);
  resizeTimer = (function() {
    FistUI.dynamicResize();
  }).delay(50);
});
