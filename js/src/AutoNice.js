/**
 * Auto-nicing for d3.time.scale(); this decides which of the default
 * time nicing intervals are best for the given domain.
 *
 * Since d3.time.scale().nice() doesn't pass on the current domain to its
 * nicing function, this has to be called as follows:
 *
 * var scale = d3.time.scale().domain(tmin, tmax);
 * AutoNice.time(scale);
 * scale.range(0, plotW);
 */
var AutoNice = {
  _niceSteps: [
    1e3,
    6e4,
    36e5,
    864e5,
    6048e5,
    2592e6,
    31536e6,
    Infinity
  ],
  _niceMethods: [
    null,
    d3.time.second,
    d3.time.minute,
    d3.time.hour,
    d3.time.day,
    d3.time.week,
    d3.time.month,
    d3.time.year
  ],
  _niceLimits: null,
  _getNiceLimits: function() {
    if (this._niceLimits === null) {
      this._niceLimits = [];
      for (var i = 0; i < this._niceSteps.length - 1; i++) {
        var limit = Math.sqrt(this._niceSteps[i] * this._niceSteps[i + 1]);
        this._niceLimits.push(limit);
      }
    }
    return this._niceLimits;
  },
  time: function(scale) {
    var niceLimits = this._getNiceLimits();
    var domain = scale.domain(),
        dt = Math.abs(domain[1] - domain[0]),
        i = d3.bisect(this._niceLimits, dt),
        m = this._niceMethods[i];
    if (m !== null) {
      scale.nice(m);
    }
  }
};
