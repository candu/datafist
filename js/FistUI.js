var ViewGraphState = new Class({
  initialize: function() {
    this._dummyElem = new Element('div');

    this._nextNodeID = 0;
    this._nodes = {};
    this._edgesOut = {};
    this._edgesIn = {};
    this._fist = '';
  },
  // TODO: abstract away into Listenable
  _fire: function(type, args) {
    this._dummyElem.fireEvent(type, args);
  },
  listen: function(type, callback) {
    this._dummyElem.addEvent(type, callback);
  },
  addNode: function(name, type, x, y, w, h) {
    var i = this._nextNodeID++;
    this._nodes[i] = {
      name: name,
      type: type,
      x: x,
      y: y,
      w: w,
      h: h,
      index: i
    };
    this._edgesOut[i] = {};
    this._edgesIn[i] = {};
    this._fire('nodeadded', [this._nodes[i]]);
    this._updateFist();
    return i;
  },
  deleteNode: function(i) {
    var outEdges = Object.keys(this._edgesOut[i]);
    var inEdges = Object.keys(this._edgesIn[i]);
    outEdges.each(function(j) {
      delete this._edgesIn[j][i];
    }.bind(this));
    delete this._edgesIn[i];
    inEdges.each(function(j) {
      delete this._edgesOut[j][i];
    }.bind(this));
    delete this._edgesOut[i];
    delete this._nodes[i];
    this._fire('nodedeleted', [i]);
    this._updateFist();
    // this helps clean up gestural filters
    if (outEdges.length === 1 && inEdges.length === 1) {
      this.addEdge(inEdges[0], outEdges[0]);
    }
  },
  empty: function() {
    var depthDeleteNodes = function(i) {
      var S = Object.keys(this._edgesIn[i]);
      this.deleteNode(i);
      S.each(depthDeleteNodes);
    }.bind(this);
    for (var i in this._edgesOut) {
      if (Object.isEmpty(this._edgesOut[i])) {
        depthDeleteNodes(i);
      }
    }
  },
  addEdge: function(i, j) {
    console.log('adding (' + i + ', ' + j + ')...');
    // enforce DAG property: i -> j will complete a cycle iff there exists a
    // path j -> ... -> i
    var S = {};
    var depthSearch = function(k) {
      S[k] = true;
      if (k === i) {
        return true;
      }
      return Object.keys(this._edgesOut[k]).map(function(n) {
        return parseInt(n);
      }).filter(function(n) {
        return S[n] === undefined;
      }).some(depthSearch);
    }.bind(this);
    if (depthSearch(j)) {
      console.log('skipping, will create cycle!');
      return;
    }
    if (this._edgesOut[i][j] !== undefined) {
      console.log('skipping, already there!');
      return;
    }
    this._edgesOut[i][j] = true;
    this._edgesIn[j][i] = true;
    this._fire('edgeadded', [this._nodes[i], this._nodes[j]]);
    this._updateFist();
  },
  deleteEdge: function(i, j) {
    // remove i -> j
    delete this._edgesOut[i][j];
    delete this._edgesIn[j][i];
    this._fire('edgedeleted', [i, j]);
    this._updateFist();
  },
  toFist: function() {
    return this._fist;
  },
  _updateFist: function() {
    var fist = this._toFist().join(' ');
    if (fist !== this._fist) {
      this._fist = fist;
      this._fire('fistmodified');
    }
  },
  /**
   * Produce a representation of this ViewGraphState in the fist language.
   */
  _toFist: function() {
    var spatialSort = function(indices) {
      indices.sort(function(i, j) {
        var dx = this._nodes[i].x - this._nodes[j].x;
        if (dx !== 0) {
          return dx;
        }
        return this._nodes[i].y - this._nodes[j].y;
      }.bind(this));
    }.bind(this);
    var depthWalk = function(i) {
      var S = Object.keys(this._edgesIn[i]);
      if (S.length === 0) {
        return this._nodes[i].name;
      }
      spatialSort(S);
      var sexp = S.map(depthWalk);
      sexp.unshift(this._nodes[i].name);
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
ViewGraphState.fromJSON = function(json) {
  // TODO: implement this
  throw new Error('not implemented yet');
};

var ViewNode = new Class({
  initialize: function(graph, nodeGroup, node) {
    this._node = node;
    this._dragging = false;
    this._controlling = false;
    this._controlPointSize = 8;

    this._g = nodeGroup.append('svg:g')
      .data([this._node])
      .attr('class', 'block')
      .attr('transform', function(d) {
        return 'translate(' + d.x + ', ' + d.y + ')';
      })
      .on('mouseover', function(d) {
        if (!this._dragging) {
          this._controls.attr('class', '');
        }
      }.bind(this))
      .on('mouseout', function(d) {
        if (!this._dragging && !this._controlling) {
          this._controls.attr('class', 'hidden');
        }
      }.bind(this))
      .call(graph.nodeDragBehavior());

    this._rect = this._g.append('svg:rect')
      .attr('class', 'block ' + this._node.type)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this._node.w)
      .attr('height', this._node.h);
    this._text = this._g.append('svg:text')
      .attr('class', 'block ' + this._node.type)
      .attr('x', this._node.w / 2)
      .attr('y', this._node.h / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(this._node.name);

    this._controls = this._g.append('svg:g')
      .attr('class', 'hidden');
    this._controls.selectAll('rect')
      .data([null,null,null,null])
      .enter().append('svg:rect')
        .attr('class', 'control-point')
        .attr('width', this._controlPointSize)
        .attr('height', this._controlPointSize)
        .call(graph.edgeCreateBehavior());
    this._updateControlPoints();
  },
  updatePosition: function() {
    this._g.attr('transform', function(d) {
      return 'translate(' + d.x + ', ' + d.y + ')';
    });
  },
  _updateControlPoints: function() {
    var wMid = Math.floor(this._node.w / 2),
        hMid = Math.floor(this._node.h / 2);
    var controlPoints = [
      {x: wMid, y: 0, index: this._node.index},             // top
      {x: this._node.w, y: hMid, index: this._node.index},  // right
      {x: wMid, y: this._node.h, index: this._node.index},  // bottom
      {x: 0, y: hMid, index: this._node.index}              // left
    ];
    this._controls.selectAll('rect')
      .data(controlPoints)
      .attr('x', function(d) {
        return d.x - this._controlPointSize / 2;
      }.bind(this))
      .attr('y', function(d) {
        return d.y - this._controlPointSize / 2;
      }.bind(this));
  },
  updateText: function() {
    this.updatePosition();
    this._rect
      .attr('class', function(d) { return 'block ' + d.type; })
      .attr('width', function(d) { return d.w; })
      .attr('height', function(d) { return d.h; });
    this._text
      .attr('class', function(d) { return 'block ' + d.type; })
      .attr('x', function(d) { return d.w / 2; })
      .attr('y', function(d) { return d.h / 2; })
      .text(function(d) { return d.name; });
    this._updateControlPoints();
  },
  cleanup: function() {
    this._g.remove();
  }
});

var ViewEdge = new Class({
  _snapToClosestSides: function(selection, d) {
    var cFrom = {x: d.from.x + d.from.w / 2, y: d.from.y + d.from.h / 2},
        cTo = {x: d.to.x + d.to.w / 2, y: d.to.y + d.to.h / 2},
        dx = cFrom.x - cTo.x,
        dy = cFrom.y - cTo.y;
    selection
      .attr('x1', cFrom.x)
      .attr('y1', cFrom.y);
    if (dy > dx) {
      if (dy > -dx) {
        // -> bottom
        var f = (dx + dy) / (2 * dy);
        selection
          .attr('x2', d.to.x + f * d.to.w)
          .attr('y2', d.to.y + d.to.h);
      } else {
        // -> left
        var f = (dx - dy) / (2 * dx);
        selection
          .attr('x2', d.to.x)
          .attr('y2', d.to.y + f * d.to.h);
      }
    } else {
      if (dy > -dx) {
        // -> right
        var f = (dy + dx) / (2 * dx);
        selection
          .attr('x2', d.to.x + d.to.w)
          .attr('y2', d.to.y + f * d.to.h);
      } else {
        // -> top
        var f = (dy - dx) / (2 * dy);
        selection
          .attr('x2', d.to.x + f * d.to.w)
          .attr('y2', d.to.y);
      }
    }
  },
  initialize: function(graph, edgeGroup, node1, node2) {
    this._data = {from: node1, to: node2};
    this._line = edgeGroup.append('svg:line')
      .data([this._data])
      .attr('class', 'edge')
      .attr('marker-end', 'url(#edge_end)')
      .call(this._snapToClosestSides, this._data)
      .call(graph.edgeDragBehavior());
  },
  updatePosition: function() {
    this._line
      .call(this._snapToClosestSides, this._data);
  },
  cleanup: function() {
    this._line.remove();
  }
});


var ViewGraph = new Class({
  initialize: function(svg, state, fist) {
    this._svg = svg;
    this._edgeGroup = svg.append('svg:g');
    this._tempEdgeGroup = svg.append('svg:g')
      .attr('transform', 'translate(-1000, -1000)');
    this._tempTextGroup = svg.append('svg:g')
      .attr('transform', 'translate(-1000, -1000)');
    this._nodeGroup = svg.append('svg:g');
    this._state = state;
    this._nodes = {};
    this._edgesOut = {};
    this._edgesIn = {};
    this._fist = fist;

    // see http://www.w3.org/TR/SVG/painting.html#Markers for inspiration
    var defs = this._svg.append('defs');
    var edgeEndMarker = defs.append('svg:marker')
      .attr('id', 'edge_end')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 10)
      .attr('refY', 5)
      .attr('markerUnits', 'strokeWidth')
      .attr('markerWidth', 4)
      .attr('markerHeight', 3)
      .attr('fill', '#555')
      .attr('orient', 'auto')
      .append('svg:path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z');

    this._nodeDragBehavior = d3.behavior.drag()
      .origin(Object)
      .on('dragstart', function(d) {
        var viewNode = this._nodes[d.index];
        viewNode._dragging = true;
        viewNode._controls.attr('class', 'hidden');
      }.bind(this))
      .on('dragend', function(d) {
        if (!this._isInViewer(d3.event.sourceEvent.target)) {
          this._state.deleteNode(d.index);
        } else {
          var viewNode = this._nodes[d.index];
          viewNode._controls.attr('class', '');
          viewNode._dragging = false;
        }
      }.bind(this))
      .on('drag', function(d) {
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        this._onNodeMoved(d);
      }.bind(this));

    this._tempEdgeEnd = {};
    this._tempEdge = this._tempEdgeGroup.append('svg:line')
      .attr('class', 'edge temp')
      .attr('marker-end', 'url(#edge_end)')
      .attr('x1', 0)
      .attr('y1', 0);
    this._edgeCreateBehavior = d3.behavior.drag()
      .on('dragstart', function(d) {
        d3.event.sourceEvent.stopPropagation();
        this._nodes[d.index]._controlling = true;
        // TODO: fix this horrible positioning hack
        var node = this._state._nodes[d.index];
        this._tempEdgeGroup
          .attr('transform', 'translate(' + (node.x + d.x) + ', ' + (node.y + d.y) + ')');
        this._tempEdgeEnd.x = 0;
        this._tempEdgeEnd.y = 0;
        this._tempEdge
          .attr('x2', this._tempEdgeEnd.x)
          .attr('y2', this._tempEdgeEnd.y);
      }.bind(this))
      .on('dragend', function(d) {
        d3.event.sourceEvent.stopPropagation();
        this._tempEdgeGroup
          .attr('transform', 'translate(-1000, -1000)');
        var targetNode = this._parentNode(d3.event.sourceEvent.target);
        if (targetNode === null) {
          this._nodes[d.index]._controls.attr('class', 'hidden');
        } else if (d.index !== targetNode.index) {
          this._state.addEdge(d.index, targetNode.index);
          this._nodes[d.index]._controls.attr('class', 'hidden');
        }
        this._nodes[d.index]._controlling = false;
      }.bind(this))
      .on('drag', function(d) {
        this._tempEdgeEnd.x += d3.event.dx;
        this._tempEdgeEnd.y += d3.event.dy;
        this._tempEdge
          .attr('x2', this._tempEdgeEnd.x)
          .attr('y2', this._tempEdgeEnd.y);
      }.bind(this));

    this._edgeDragBehavior = d3.behavior.drag()
      .on('dragstart', function(d) {
        var edge = this._edgesOut[d.from.index][d.to.index],
            svgPos = $d3(this._svg).getPosition(),
            x = d3.event.sourceEvent.pageX - svgPos.x,
            y = d3.event.sourceEvent.pageY - svgPos.y;
        edge._line
          .attr('class', 'edge temp')
          .attr('x2', x)
          .attr('y2', y);
      }.bind(this))
      .on('dragend', function(d) {
        var targetNode = this._parentNode(d3.event.sourceEvent.target);
        this._state.deleteEdge(d.from.index, d.to.index);
        if (targetNode !== null && d.from.index !== targetNode.index) {
          this._state.addEdge(d.from.index, targetNode.index);
        }
      }.bind(this))
      .on('drag', function(d) {
        var edge = this._edgesOut[d.from.index][d.to.index],
            svgPos = $d3(this._svg).getPosition(),
            x = d3.event.sourceEvent.pageX - svgPos.x,
            y = d3.event.sourceEvent.pageY - svgPos.y;
        edge._line
          .attr('class', 'edge temp')
          .attr('x2', x)
          .attr('y2', y);
      }.bind(this));

    this._state.listen('nodeadded', function(node) {
      this._nodes[node.index] = new ViewNode(this, this._nodeGroup, node);
      this._edgesOut[node.index] = {};
      this._edgesIn[node.index] = {};
    }.bind(this));
    this._state.listen('nodedeleted', function(i) {
      this._deleteNode(i);
    }.bind(this));
    this._state.listen('edgeadded', function(node1, node2) {
      var edge = new ViewEdge(this, this._edgeGroup, node1, node2);
      this._edgesOut[node1.index][node2.index] = edge;
      this._edgesIn[node2.index][node1.index] = edge;
    }.bind(this));
    this._state.listen('edgedeleted', function(i, j) {
      this._deleteEdge(i, j);
    }.bind(this));

    this._tempText = this._tempTextGroup.append('svg:text')
      .attr('class', 'block');
    this._contextMenu = new ContextMenu({
      menu: 'contextmenu',
      targets: '#svg_graph_wrapper',
      onShow: function(menuEvt) {
        this._contextMenu.menu.removeClass('hidden');
        this._contextMenu.menu.setStyle('z-index', 2000);
        var targetNode = this._parentNode(menuEvt.target);
        this._contextMenu.clearItems();
        if (targetNode === null) {
          this._contextMenu.addItem('add', 'add...');
        } else {
          this._contextMenu.addItem('edit', 'edit...');
        }
      }.bind(this),
      onHide: function() {
        this._contextMenu.menu.addClass('hidden');
        this._contextMenu.menu.setStyle('z-index', -2000);
      }.bind(this),
      onClick: function(menuEvt, menuItemEvt) {
        var padding = 2;
        switch (menuItemEvt.target.id) {
          case 'add':
            var name = window.prompt('enter node name:');
            if (name === null || name.length === 0) {
              return;
            }
            var svgPosition = $d3(this._svg).getPosition(),
                x = menuEvt.page.x - svgPosition.x,
                y = menuEvt.page.y - svgPosition.y;
            this.addNode(name, x, y);
            break;
          case 'edit':
            var targetNode = this._parentNode(menuEvt.target);
            var name = window.prompt('edit node name:', targetNode.name);
            if (name === null ||
                name.length === 0 ||
                name === targetNode.name) {
              return;
            }
            var type = this._fist.getType(name),
                svgPosition = $d3(this._svg).getPosition(),
                textX = menuEvt.page.x - svgPosition.x,
                textY = menuEvt.page.y - svgPosition.y,
                blockDimensions = this._getBlockDimensions(textX, textY, name, padding);
            targetNode.name = name;
            targetNode.type = type;
            Object.merge(targetNode, blockDimensions);
            this._onNodeTextChanged(targetNode);
            break;
        }
      }.bind(this)
    });
  },
  nodeDragBehavior: function() {
    return this._nodeDragBehavior;
  },
  edgeCreateBehavior: function() {
    return this._edgeCreateBehavior;
  },
  edgeDragBehavior: function() {
    return this._edgeDragBehavior;
  },
  addNode: function(name, x, y) {
    var type = this._fist.getType(name),
        padding = 2,
        blockDimensions = this._getBlockDimensions(x, y, name, padding);
    this._state.addNode(
      name,
      type,
      blockDimensions.x,
      blockDimensions.y,
      blockDimensions.w,
      blockDimensions.h
    );
  },
  _parentNode: function(elem) {
    while (elem !== null) {
      if (elem.match('g.block')) {
        return elem.__data__;
      }
      elem = elem.getParent();
    }
    return null;
  },
  _isInViewer: function(elem) {
    var svgRoot = $d3(this._svg);
    while (elem !== null) {
      if (elem.match(svgRoot)) {
        return true;
      }
      elem = elem.getParent();
    }
    return false;
  },
  _updateNodeEdges: function(d) {
    for (var i in this._edgesOut[d.index]) {
      this._edgesOut[d.index][i].updatePosition();
    }
    for (var i in this._edgesIn[d.index]) {
      this._edgesIn[d.index][i].updatePosition();
    }
  },
  _onNodeMoved: function(d) {
    this._nodes[d.index].updatePosition();
    this._updateNodeEdges(d);
    this._state._updateFist();
  },
  _onNodeTextChanged: function(d) {
    this._nodes[d.index].updateText();
    this._updateNodeEdges(d);
    this._state._updateFist();
  },
  _deleteNode: function(i) {
    var outEdges = Object.keys(this._edgesOut[i]);
    var inEdges = Object.keys(this._edgesIn[i]);
    outEdges.each(function(j) {
      this._edgesIn[j][i].cleanup();
      delete this._edgesIn[j][i];
    }.bind(this));
    delete this._edgesIn[i];
    inEdges.each(function(j) {
      this._edgesOut[j][i].cleanup();
      delete this._edgesOut[j][i];
    }.bind(this));
    delete this._edgesOut[i];
    this._nodes[i].cleanup();
    delete this._nodes[i];
  },
  _deleteEdge: function(i, j) {
    this._edgesOut[i][j].cleanup();
    delete this._edgesOut[i][j];
    delete this._edgesIn[j][i];
  },
  _getTextSize: function(name) {
    this._tempText.text(name);
    var textSize = $d3(this._tempText).getSize();
    textSize.x = Math.max(50, textSize.x);
    return textSize;
  },
  _getBlockDimensions: function(x, y, name, padding) {
    var textSize = this._getTextSize(name);
    return {
      x: Math.floor(x - (textSize.x / 2 + padding)) + 0.5,
      y: Math.floor(y - (textSize.y / 2 + padding)) + 0.5,
      w: textSize.x + 2 * padding,
      h: textSize.y + 2 * padding
    };
  },
  _replaceSExp: function(sexp) {
    this._state.empty();

    var levels = [];
    var buildGrid = function(exp, level, p) {
      if (level === levels.length) {
        levels.push([]);
      }
      if (SExp.isAtom(exp)) {
        levels[level].push({name: exp, p: p});
      } else {
        levels[level].push({name: SExp.unparse(exp[0]), p: p});
        for (var i = 1; i < exp.length; i++) {
          buildGrid(exp[i], level + 1, levels[level].length - 1);
        }
      }
    };
    buildGrid(sexp, 0, null);

    var gridPadding = 10,
        padding = 2,
        x = gridPadding,
        levelX = [];
    for (var level = levels.length - 1; level >= 0; level--) {
      levelX.unshift(x);
      var maxNodeWidth = 0;
      for (var pos = 0; pos < levels[level].length; pos++) {
        var node = levels[level][pos];
        node.size = this._getTextSize(node.name);
        node.type = this._fist.getType(node.name);
        maxNodeWidth = Math.max(maxNodeWidth, node.size.x);
      }
      x += maxNodeWidth + 2 * (padding + gridPadding);
    }
    for (var level = 0; level < levels.length; level++) {
      for (var pos = 0; pos < levels[level].length; pos++) {
        var node = levels[level][pos];
        node.index = this._state.addNode(
          node.name,
          node.type,
          levelX[level] + 0.5,
          pos * 40 + 10 + 0.5,
          node.size.x + 2 * padding,
          node.size.y + 2 * padding
        );
        if (node.p !== null) {
          var parentNode = levels[level - 1][node.p];
          this._state.addEdge(node.index, parentNode.index);
        }
      }
    }
  }
});

var FistUI = new Class({
  initialize: function(fist, root) {
    this._viewTable = {};
    this._viewGraphState = new ViewGraphState();
    this._viewGraphState.listen('fistmodified', function() {
      this._repl.set('text', this._viewGraphState.toFist());
      console.log(this._repl.get('text'));
      try {
        this._statusWrapper.set('class', 'working');
        this._messageBox.set('text', 'running view graph...');
        this._fist.execute(this._repl.get('text'));
        this._statusWrapper.set('class', 'ok');
        this._messageBox.set('text', 'ran view graph successfully.');
      } catch (e) {
        console.log(e);
        this._statusWrapper.set('class', 'not-ok');
        this._messageBox.set('text', e.toString());
      }
    }.bind(this));

    this._fist = fist;
    this._root = root;

    this._dragBlock = null;

    // set up status area
    this._statusWrapper = this._root.getElement('#status_wrapper');
    this._messageBox = this._root.getElement('#message');
    this._importBox = this._root.getElement('#import');
    this._filenameBox = this._root.getElement('#filename');
    this._progressBar = this._root.getElement('#progress');

    // set up palette
    this._palette = this._root.getElement('#palette');
    this._palette.addEventListener('dragenter', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this.addClass('droptarget');
    }, false);
    this._palette.addEventListener('dragover', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      evt.dataTransfer.dropEffect = 'copy';
      this.addClass('droptarget');
      return false;
    }, false);
    this._palette.addEventListener('dragleave', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this.removeClass('droptarget');
    }, false);
    this._palette.addEventListener('drop', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._palette.removeClass('droptarget');
      try {
        FileImporter(evt.dataTransfer.files[0])
          .start(function(file, total) {
            this._statusWrapper.set('class', 'working');
            this._messageBox.set('text', 'importing data...');
            this._filenameBox.set('text', file.name);
            this._progressBar.set('value', 0);
            this._progressBar.set('max', total);
            this._importBox.removeClass('hidden');
          }.bind(this))
          .progress(function(file, loaded) {
            this._progressBar.set('value', loaded);
          }.bind(this))
          .load(function(file, data) {
            var trapDataImportError = function(e) {
              console.log(e);
              if (!(e instanceof DataImportError)) {
                throw e;
              }
              this._statusWrapper.set('class', 'not-ok');
              this._messageBox.set('text', e.toString());
            }.bind(this);
            try {
              this._messageBox.set('text', 'loading rows...');
              var rows = RowLoader.load(data);
              this._messageBox.set('text', 'identifying channels...');
              var columns = Object.keys(rows[0]);
              columns.sort();
              this._showImportDialog(file, columns, function(tcols, xcols, prefix) {
                try {
                  this._messageBox.set('text', 'extracting channels...');
                  var channels = ChannelExtractor.extract(tcols, xcols, rows);
                  this._messageBox.set('text', 'importing channels...');
                  Object.each(channels, function(data, suffix) {
                    var name = prefix + '-' + suffix;
                    name = name.toLowerCase().replace(/\s+/g, '-');
                    this._fist.importData(name, data, file.name);
                  }.bind(this));
                  this._statusWrapper.set('class', 'ok');
                  this._messageBox.set('text', 'import successful.');
                } catch (e) {
                  trapDataImportError(e);
                }
              }.bind(this));
            } catch (e) {
              trapDataImportError(e);
            }
          }.bind(this))
          .import();
      } catch (e) {
        console.log(e);
        if (!(e instanceof DataImportError)) {
          throw e;
        }
        this._statusWrapper.set('class', 'not-ok');
        this._messageBox.set('text', e.toString());
      }
    }.bind(this), false);

    // set up viewer
    this._viewer = this._root.getElement('#viewer');
    this._content = this._root.getElement('#content');
    this._svgExecuteWrapper = this._root.getElement('#svg_execute_wrapper');
    this._viewExecuteSVG = d3.select(this._svgExecuteWrapper)
      .append('svg:svg')
      .attr('id', 'view_execute')
      .attr('width', this._svgExecuteWrapper.getWidth() - 2)
      .attr('height', this._svgExecuteWrapper.getHeight() - 2);
    $d3(this._viewExecuteSVG).addEvent('sexpreplaced', function(sexp) {
      this._viewGraph._replaceSExp(sexp);
    }.bind(this));

    // set up interpreter
    this._svgGraphWrapper = this._root.getElement('#svg_graph_wrapper');
    this._viewGraphSVG = d3.select(this._svgGraphWrapper)
      .append('svg:svg')
      .attr('id', 'view_graph')
      .attr('width', this._svgGraphWrapper.getWidth() - 2)
      .attr('height', this._svgGraphWrapper.getHeight() - 2);
    this._svgGraphWrapper.addEventListener('dragenter', function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      this.addClass('droptarget');
    }, false);
    this._svgGraphWrapper.addEventListener('dragover', function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      evt.dataTransfer.dropEffect = 'move';
      this.addClass('droptarget');
      return false;
    }, false);
    this._svgGraphWrapper.addEventListener('dragleave', function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      this.removeClass('droptarget');
    }, false);
    this._svgGraphWrapper.addEventListener('drop', function(evt) {
      evt.stop();
      if (evt.isFileDrag()) {
        return;
      }
      var json = JSON.parse(evt.dataTransfer.getData('application/json'));
      var svgPosition = this._svgGraphWrapper.getPosition(),
          x = evt.pageX - svgPosition.x,
          y = evt.pageY - svgPosition.y;
      this._viewGraph.addNode(json.name, x, y);
    }.bind(this), false);

    this._repl = this._root.getElement('#repl');
    this._viewGraph = new ViewGraph(
      this._viewGraphSVG,
      this._viewGraphState,
      this._fist
    );

    // register event listeners for Fist events
    fist.listen('symbolimport', function(name) {
      this.onSymbolImport(name);
    }.bind(this));
    fist.listen('viewinvoked', function(name, channels, sexps) {
      this.onViewInvoked(name, channels, sexps);
    }.bind(this));
  },
  onSymbolImport: function(name) {
    var type = this._fist.getType(name);
    var block = Element('div.block.' + type, {
      text: name,
      draggable: true,
    });
    block.tips = new Tips(block, {
      className: 'fistdocs',
      title: 'text',
      text: function(element) {
        if (type === 'function' || type === 'channel') {
          var value = this._fist.execute(element.get('text'));
          return value.describe();
        } else {
          return type;
        }
      }.bind(this)
    });
    block.addEventListener('dragstart', function(evt) {
      block.addClass('dragtarget');
      block.tips.fireEvent('hide');
      evt.dataTransfer.effectAllowed = 'move';
      evt.dataTransfer.setData('application/json', JSON.stringify({
        name: name,
        type: type,
      }));
      this._dragBlock = block;
    }.bind(this), false);
    block.addEventListener('dragend', function(evt) {
      this._dragBlock = null;
      block.removeClass('dragtarget');
      this._svgGraphWrapper.removeClass('droptarget');
    }.bind(this), false);
    block.inject(this._palette);
  },
  onViewInvoked: function(name, channels, sexps) {
    console.log('rendering view ' + name);
    $d3(this._viewExecuteSVG).empty();
    var view = this._viewTable[name];
    if (view === undefined) {
      throw new Error('unrecognized view: ' + name);
    }
    view.render(channels, this._viewExecuteSVG, sexps);
  },
  importView: function(name, view) {
    console.log('importing view ' + name);
    this._viewTable[name] = view;
  },
  dynamicResize: function() {
    var contentSize = this._content.getSize();
    this._svgExecuteWrapper.setStyle('height', contentSize.y - 10);
    this._viewExecuteSVG
      .attr('height', this._svgExecuteWrapper.getHeight() - 2);
    try {
      this._fist.execute(this._repl.get('text'));
    } catch (e) {
      console.log(e);
    }
  },
  loaded: function(loadStart) {
    var loadTime = +(new Date()) - loadStart;
    this._statusWrapper.set('class', 'ok');
    this._messageBox.set('text', 'fist v0.1: loaded in ' + loadTime + ' ms');
  },
  _showImportDialog: function(file, cols, callback) {
    // TODO: mustache templating here? move to separate ModalDialog handler?
    var modalDialog = $('modal');
    modalDialog.getElement('div.modal-subtitle').set('text', 'from ' + file.name);
    function makeCheckbox(col, name) {
      return new Element('div.checkbox').adopt(
        new Element('span.checkbox', {
          text: col
        }),
        new Element('input', {
          type: 'checkbox',
          text: col,
          name: name
        })
      );
    }
    $('tcols').empty();
    cols.each(function(col) {
      $('tcols').adopt(makeCheckbox(col, 'tcols'));
    });
    $('xcols').empty();
    cols.each(function(col) {
      $('xcols').adopt(makeCheckbox(col, 'xcols'));
    });
    $('modal_ok').removeEvents('click').addEvent('click', function(evt) {
      modalDialog.removeClass('active');
      var tcols = $$('#tcols input[type=checkbox]').filter(function(c) {
        return c.checked;
      }).map(function(c) {
        return c.get('text');
      });
      var xcols = $$('#xcols input[type=checkbox]').filter(function(c) {
        return c.checked;
      }).map(function(c) {
        return c.get('text');
      });
      var prefix = $('prefix').value;
      callback(tcols, xcols, prefix);
    });
    modalDialog.addClass('active');
  }
});
