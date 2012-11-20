var ViewNode = new Class({
  initialize: function(svg, node) {
    this._rect = svg.append('svg:rect')
      .data([node])
      .attr('class', 'block')
      .attr('x', function(d) { return d.x; })
      .attr('y', function(d) { return d.y; })
      .attr('width', function(d) { return d.w; })
      .attr('height', function(d) { return d.h; });
    this._text = svg.append('svg:text')
      .data([node])
      .attr('class', 'block')
      .attr('x', function(d) { return d.x + d.w / 2; })
      .attr('y', function(d) { return d.y + d.h / 2; })
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(function(d) { return d.name; });
  },
  update: function() {
    this._rect
      .attr('x', function(d) { return d.x; })
      .attr('y', function(d) { return d.y; });
    this._text
      .attr('x', function(d) { return d.x + d.w / 2; })
      .attr('y', function(d) { return d.y + d.h / 2; });
  },
  cleanup: function() {
    this._rect.remove();
    this._text.remove();
  }
});

var ViewEdge = new Class({
  initialize: function(g, i, j) {
    this._g = g;
    this._i = i;
    this._j = j;
    this._line = this._g._svg.append('svg:line')
      .attr('class', 'edge');
    // TODO: add arrowhead
    update();
  },
  update: function() {
    var node1 = this._g._nodes[this._i];
    var node2 = this._g._nodes[this._j];
    this._line
      .attr('x1', node1.x)
      .attr('y1', node1.y)
      .attr('x2', node2.x)
      .attr('y2', node2.y);
  },
  cleanup: function() {
    this._line.remove();
  }
});

var ViewGraph = new Class({
  initialize: function(svg) {
    this._svg = svg;
    this._nextNodeId = 0;
    this._nodes = {};
    this._edgesOut = {};
    this._edgesIn = {};
  },
  addNode: function(name, x, y, w, h) {
    var i = this._nextNodeId++;
    this._nodes[i] = {name: name, x: x, y: y, w: w, h: h};
    this._edgesOut[i] = {};
    this._edgesIn[i] = {};
    new ViewNode(this._svg, this._nodes[i]);
    return i;
  },
  deleteNode: function(i) {
    for (var j in this._edgesOut) {
      this.deleteEdge(j);
    }
    delete this._nodes[i];
  },
  addEdge: function(i, j) {
    // add directed edge from i to j
    this._edgesOut[i][j] = true;
    this._edgesIn[j][i] = true;
  },
  deleteEdge: function(i, j) {
    // remove directed edge from j to i
    delete this._edgesOut[i][j];
    delete this._edgesIn[j][i];
  },
  toJSON: function() {
    var nodes = {};
    for (var i in this._nodes) {
      nodes[i] = {
        name: this._nodes[i]._name,
        x: this._nodes[i].x,
        y: this._nodes[i]._y
      }
    }
    return JSON.stringify({
      nodes: nodes,
      edges: this._edgesOut
    });
  },
  /**
   * Produce a representation of this ViewGraph in the fist language.
   */
  toFist: function() {
    var spatialSort = function(indices) {
      indices.sort(function(i, j) {
        var dx = this._nodes[i]._x - this._nodes[j]._x;
        if (dx !== 0) {
          return dx;
        }
        return this._nodes[i]._y - this._nodes[j]._y;
      }.bind(this));
    }.bind(this);
    var depthWalk = function(i) {
      var S = Object.keys(this._edgesIn[i]);
      if (S.length === 0) {
        return this._nodes[i]._name;
      }
      spatialSort(S);
      var sexp = S.map(depthWalk);
      sexp.unshift(this._nodes[i]._name);
      return '(' + sexp.join(' ') + ')';
    }.bind(this);
    var T = [];
    for (var i in this._edgesOut) {
      if (Object.isEmpty(this._edgesOut[i])) {
        T.push(i);
      }
    }
    spatialSort(T);
    return T.map(function(i) {
      return depthWalk(i);
    });
  }
});
ViewGraph.fromJSON = function(json) {
  // TODO: implement this
  throw new Error('not implemented yet');
};

var FistUI = new Class({
  initialize: function(fist, root) {
    this._viewTable = {};
    this._fist = fist;
    this._root = root;

    this._dragBlock = null;

    // set up palette
    this._palette = this._root.getElement('#palette');

    // set up viewer
    this._viewer = this._root.getElement('#viewer');
    this._svgWrapper = this._root.getElement('#svg_wrapper');
    var w = this._svgWrapper.getWidth() - 2,
        h = this._svgWrapper.getHeight() - 2;
    this._svg = d3.select(this._svgWrapper)
      .append('svg:svg')
      .attr('width', w)
      .attr('height', h);
    this._viewGraph = new ViewGraph(this._svg);
    this._svgWrapper.addEventListener('dragenter', function(evt) {
      this.addClass('droptarget');
    }, false);
    this._svgWrapper.addEventListener('dragover', function(evt) {
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'move';
      return false;
    }, false);
    this._svgWrapper.addEventListener('dragleave', function(evt) {
      this.removeClass('droptarget');
    }, false);
    this._svgWrapper.addEventListener('drop', function(evt) {
      evt.stopPropagation();
      var name = evt.dataTransfer.getData('text/plain');
      var svgPosition = this._svgWrapper.getPosition(),
          blockSize = this._dragBlock.getSize(),
          blockX = Math.floor(evt.pageX - svgPosition.x - blockSize.x / 2) + 0.5,
          blockY = Math.floor(evt.pageY - svgPosition.y - blockSize.y / 2) + 0.5,
          blockW = blockSize.x,
          blockH = blockSize.y;
      this._viewGraph.addNode(name, blockX, blockY, blockW, blockH);
      this._repl.set('text', this._viewGraph.toFist().join(' '));
    }.bind(this), false);
    this._viewToggle = this._root.getElement('#view_toggle');
    this._viewToggle.addEvent('click', function(evt) {
      this._viewToggle.toggleClass('on');
      if (this._viewToggle.hasClass('on')) {
        // TODO: render view!
      } else {
        // TODO: render patchboard!
      }
    }.bind(this));

    // set up interpreter
    this._repl = this._root.getElement('#repl');
    // TODO: something here

    // register event listeners for Fist events
    fist.listen('symbolimport', function(name) {
      this.onSymbolImport(name);
    }.bind(this));
    fist.listen('viewinvoked', function(name, channels) {
      this.onViewInvoked(name, channels);
    }.bind(this));
  },
  _createBlock: function(name) {
    try {
      var value = this._fist.execute(name);
      return new Element('div.block.' + typeOf(value), {
        text: name,
      });
    } catch (e) {
      return null;
    }
  },
  onSymbolImport: function(name) {
    var block = this._createBlock(name);
    block.set('draggable', true);
    block.addEventListener('dragstart', function(evt) {
      block.addClass('dragtarget');
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('text/plain', block.get('text'));
      this._dragBlock = block;
    }.bind(this), false);
    block.addEventListener('dragend', function(evt) {
      this._dragBlock = null;
      block.removeClass('dragtarget');
      this._svgWrapper.removeClass('droptarget');
    }.bind(this), false);
    block.inject(this._palette);
  },
  onViewInvoked: function(name, channels) {
    console.log('rendering view ' + name);
    var view = this._viewTable[name];
    if (view === undefined) {
      throw new Error('unrecognized view: ' + name);
    }
    view.render(channels, this._viewer);
  },
  importView: function(name, view) {
    console.log('importing view ' + name);
    this._viewTable[name] = view;
  }
});
