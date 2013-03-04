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
  this._ps = ps;
  this._n = this._ps.length;
};
/**
 * See http://en.wikipedia.org/wiki/Even-odd_rule.
 *
 * The inner loop performs an intersection test between the line
 * segment (i, j) and the ray extending from p in the direction of the
 * positive x-axis. The first condition checks that p is vertically
 * between i and j. The second condition is the intersection check; to
 * understand it, think about similar triangles :)
 */
Region.prototype.contains = function(p) {
  var j = this._n - 1,
      c = false;
  for (var i = 0; i < this._n; i++) {
    if (((this._ps[i][1] > p[1]) ^ (this._ps[j][1] > p[1])) &&
        (p[0] < (this._ps[j][0] - this._ps[i][0]) * (p[1] - this._ps[i][1]) / (this._ps[j][1] - this._ps[i][1]) + this._ps[i][0])) {
      c = !c;
    }
    j = i;
  }
  return c;
};
