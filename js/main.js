function dynamicResize() {
  var contentSize = $('content').getSize();
  $('palette').setStyle('height', contentSize.y - 10);
  $('svg_wrapper').setStyle('height', contentSize.y - 10);
}

var resizeTimer;
$(window).addEvent('domready', function() {
  dynamicResize();
  LibFist.import(Fist);
}).addEvent('resize', function() {
  window.clearTimeout(resizeTimer);
  resizeTimer = (function() {
    dynamicResize();
  }).delay(50);
});
