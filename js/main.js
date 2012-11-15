function dynamicResize() {
  var contentSize = $('content').getSize();
  $('palette').setStyle('height', contentSize.y - 18);
  $('svg_wrapper').setStyle('height', contentSize.y - 18);
}

var resizeTimer;
$(window).addEvent('domready', function() {
  dynamicResize();
}).addEvent('resize', function() {
  window.clearTimeout(resizeTimer);
  resizeTimer = (function() {
    dynamicResize();
  }).delay(50);
});
