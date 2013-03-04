'use strict';

/**
 * A Region is the area inside a closed (possibly non-simple!) curve.
 * In datafist, Regions are used to define two-dimensional filters based
 * on region membership.
 *
 * Internally, the "curve" is represented as a finite sequence of points
 * (x_i, y_i). Since the curve is closed, (x_n, y_n) connects back to
 * (x_1, y_1).
 */
function Region(ps) {
  var _ps = Array.clone(ps),
      _n = _ps.length;
  return {
    /**
     * See http://en.wikipedia.org/wiki/Even-odd_rule.
     *
     * The inner loop performs an intersection test between the line
     * segment (i, j) and the ray extending from p in the direction of the
     * positive x-axis. The first condition checks that p is vertically
     * between i and j. The second condition is the intersection check; to
     * understand it, think about similar triangles :)
     */
    contains: function(p) {
      var j = _n - 1,
          c = false;
      for (var i = 0; i < _n; i++) {
        if (((_ps[i][1] > p[1]) ^ (_ps[j][1] > p[1])) &&
            (p[0] < (_ps[j][0] - _ps[i][0]) * (p[1] - _ps[i][1]) / (_ps[j][1] - _ps[i][1]) + _ps[i][0])) {
          c = !c;
        }
        j = i;
      }
      return c;
    }
  };
}
