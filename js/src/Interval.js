var Interval = {
  intersect: function(a, b) {
    if (a[1] < b[0] || a[0] > b[1]) {
      return null;
    }
    var ps = [a[0], a[1], b[0], b[1]];
    ps.sort();
    return [ps[1], ps[2]];
  },
  nice: function(a) {
    return d3.scale.linear().domain(a).nice().domain();
  }
};
