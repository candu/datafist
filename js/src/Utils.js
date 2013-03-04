Object.isEmpty = function(obj) {
  for (var i in obj) {
    return false;
  }
  return true;
}

Event.prototype.stop = function() {
  this.preventDefault();
  this.stopPropagation();
};

Event.prototype.isFileDrag = function() {
  return (
    this.dataTransfer !== undefined &&
    this.dataTransfer.items.length > 0 &&
    this.dataTransfer.items[0].kind === 'file'
  );
};

Error.prototype.trap = function(type) {
  if (!(this instanceof type)) {
    throw this;
  }
};

String.prototype.hash = function() {
  var hash = 0;
  for (var i = 0; i < this.length; i++) {
    var c = this.charCodeAt(i);
    hash = (hash << 5) - hash + this.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
};

Number.prototype.toRad = function() {
  return this * Math.PI / 180;
};

Number.prototype.toDeg = function() {
  return this * 180 / Math.PI;
};

/**
 * Converts the result of a call to d3.select() into a mootools $() object.
 * (d3 plays nicely with mootools, jQuery, etc. objects already.)
 */
function $d3(selection) {
  return $(selection[0][0]);
}
