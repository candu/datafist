var ViewNode = new Class({
  initialize: function(svg, node) {
    this._g = svg.append('svg:g')
      .data([node])
      .attr('transform', function(d) {
        return 'translate(' + d.x + ', ' + d.y + ')';
      })
      .on('click', function(evt) {
        console.log(evt);
      }, false);
    this._g.append('svg:rect')
      .attr('class', 'block')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', node.w)
      .attr('height', node.h);
    this._text = this._g.append('svg:text')
      .attr('class', 'block')
      .attr('x', node.w / 2)
      .attr('y', node.h / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(node.name);
  },
  update: function() {
    this._g.attr('transform', function(d) {
      return 'translate(' + d.x + ', ' + d.y + ')';
    });
  },
  cleanup: function() {
    this._g.remove();
  }
});

var ViewEdge = new Class({
  initialize: function(svg, node1, node2) {
    this._line = svg.append('svg:line')
      .data([{from: node1, to: node2}])
      .attr('class', 'edge')
      .attr('x1', function(d) { return d.from.x; })
      .attr('y1', function(d) { return d.from.y; })
      .attr('x2', function(d) { return d.to.x; })
      .attr('y2', function(d) { return d.to.y; });
    // TODO: add arrowhead
    update();
  },
  update: function() {
    this._line
      .attr('x1', function(d) { return d.from.x; })
      .attr('y1', function(d) { return d.from.y; })
      .attr('x2', function(d) { return d.to.x; })
      .attr('y2', function(d) { return d.to.y; });
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
    new ViewEdge(this._svg, this._nodes[i], this._nodes[j]);
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
