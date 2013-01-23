'use strict';

var resizeTimer = null,
    loadStart = +(new Date()),
    VERSION = '0.2';
$(window).addEvent('domready', function() {
  FistUI.init();
  FistUI.dynamicResize();
  LibFist.import();
  LibFistUI.import();
  FistUI.loaded(VERSION, loadStart);
}).addEvent('resize', function() {
  window.clearTimeout(resizeTimer);
  resizeTimer = (function() {
    FistUI.dynamicResize();
  }).delay(50);
});
