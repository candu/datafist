var ChannelView = {
  render: function(channels, viewer) {
    // TODO: verify that there's at least one channel

    // create view, compensating for border thickness
    var w = viewer.getWidth() - 2,
        h = viewer.getHeight() - 2;
    var view = d3.select(viewer)
      .append('svg:svg')
      .attr('width', w)
      .attr('height', h);

    // extract data from channels
    var n = channels.length;
    var cds = [];
    for (var i = 0; i < n; i++) {
      cds.push([]);
      var it = channels[i].iter();
      while (true) {
        try {
          var t = it.next(),
              x = channels[i].at(t);
          cds[i].push({t: t, x: x});
        } catch (e) {
          if (!(e instanceof StopIteration)) {
            throw e;
          }
          break;
        }
      }
    }
    console.log(cds);

    // get bounds
    var ctMin = d3.min(cds.map(function(cd) {
      return d3.min(cd, function(a) {
        return a.t;
      });
    }));
    var ctMax = d3.max(cds.map(function(cd) {
      return d3.max(cd, function(a) {
        return a.t;
      });
    }));

    // create w/h scales for all channels
    var ct = d3.scale.linear()
      .domain([ctMin, ctMax])
      .range([0, w]);
    var cxs = cds.map(function(cd, i) {
      var cxMin = d3.min(cd, function(a) {
        return a.x;
      });
      var cxMax = d3.max(cd, function(a) {
        return a.x;
      });
      return d3.scale.linear()
        .domain([cxMin, cxMax])
        .nice()
        .range([h * i / n, h * (i + 1) / n]);
    });
  }
  // TODO: update height automatically on window resize?
};

var LibFistUI = {
  import: function(fistUI) {
    fistUI.importView('channel', ChannelView);
  }
};
