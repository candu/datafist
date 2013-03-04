var Stats = {
  linregress: function(data) {
    var n = 0,
        mx = 0,     // mean of xs
        my = 0,     // mean of ys
        ssxx = 0,   // sums-of-squares coefficients
        ssyy = 0,
        ssxy = 0;
    data.each(function (d) {
      n++;
      mx += (d.x - mx) / n;
      my += (d.y - my) / n;
      ssxx += d.x * d.x;
      ssyy += d.y * d.y;
      ssxy += d.x * d.y;
    });
    ssxx -= n * mx * mx;
    ssyy -= n * my * my;
    ssxy -= n * mx * my;
    var b = ssxy / ssxx,
        a = my - b * mx,
        R = b * ssxy / ssyy;
    var L = d3.scale.linear()
      .domain([0, 1])
      .range([a, a + b]);
    return {L: L, R: R};
  }
};
