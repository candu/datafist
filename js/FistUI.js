'use strict';

var SVGUtils = {
  translate: function(pos) {
    return 'translate(' + pos.x + ', ' + pos.y + ')';
  },
  translateToHide: function() {
    return 'translate(-1000, -1000)';
  }
};

var HitArea = new Class({
  initialize: function(graph, node, id) {
    var blockGroup = node._g;   // TODO: add method on Node
    this.node = node;
    this.id = id;

    this.pos = this._getPosition();
    this._hit = blockGroup.append('svg:rect')
      .attr('class', 'hit')
      .attr('x', this.pos.x)
      .attr('y', this.pos.y)
      .attr('width', HitArea.WIDTH)
      .attr('height', HitArea.HEIGHT);
  },
  getEdgePos: function() {
    return {
      x: this.node.dims.x + this.pos.x + HitArea.WIDTH / 2,
      y: this.node.dims.y + this.pos.y + HitArea.HEIGHT / 2
    };
  },
  cleanup: function() {
    this._hit.remove();
  }
});
HitArea.WIDTH = 12;
HitArea.HEIGHT = 5;
HitArea.PADDING = 4;

var InputHitArea = new Class({
  Extends: HitArea,
  initialize: function(graph, node, id, param, variadic) {
    this.parent(graph, node, id);
    this.param = param;
    this.variadic = variadic;

    var nameColorHSL = d3.hsl(node.inputColors(param)),
        typeColorHSL = nameColorHSL.brighter(0.7),
        rowColorHSL = nameColorHSL.brighter(1.4);
    typeColorHSL.s *= 0.7;
    rowColorHSL.s *= 1.1;
    this._hit
      .attr('id', ['input', this.node.id, this.id].join('_'))
      .style('stroke', typeColorHSL.toString())
      .style('fill', rowColorHSL.toString())
      .on('mouseover', function() {
        this._hit
          .style('stroke', nameColorHSL.toString())
          .style('fill', typeColorHSL.toString())
      }.bind(this))
      .on('mouseout', function() {
        this._hit
          .style('stroke', typeColorHSL.toString())
          .style('fill', rowColorHSL.toString())
      }.bind(this))
      .call(InputHitArea._edgeCreateBehavior(graph, this));
  },
  _getPosition: function() {
    return {
      x: this.id * (HitArea.WIDTH + HitArea.PADDING),
      y: -HitArea.HEIGHT
    }
  },
  isFull: function() {
    return this.node.edgeIn(this.id) !== undefined;
  },
  update: function() {
    this.pos = this._getPosition();
    this._hit
      .attr('id', ['input', this.node.id, this.id].join('_'))
      .attr('x', this.pos.x)
      .attr('y', this.pos.y);
  }
});
InputHitArea._edgeCreateBehavior = function(graph, input) {
  return d3.behavior.drag()
    .on('dragstart', function() {
      d3.event.sourceEvent.stopPropagation();
      var inputPos = input.getEdgePos();
      graph._tempEdgeGroup
        .attr('transform', SVGUtils.translate(inputPos));
      graph._tempEdgeEnd.x = 0;
      graph._tempEdgeEnd.y = 0;
      graph._tempEdge
        .attr('x1', graph._tempEdgeEnd.x)
        .attr('y1', graph._tempEdgeEnd.y)
        .attr('x2', 0)
        .attr('y2', 0);
    })
    .on('dragend', function(d) {
      d3.event.sourceEvent.stopPropagation();
      graph._tempEdgeGroup
        .attr('transform', SVGUtils.translateToHide());
      var target = d3.event.sourceEvent.target,
          output = OutputHitArea.fromElement(graph, target);
      if (output === undefined) {
        console.log('skipping, invalid elem target');
        return;
      }
      graph.addEdge(output, input);
    })
    .on('drag', function(d) {
      graph._tempEdgeEnd.x += d3.event.dx;
      graph._tempEdgeEnd.y += d3.event.dy;
      graph._tempEdge
        .attr('x1', graph._tempEdgeEnd.x)
        .attr('y1', graph._tempEdgeEnd.y);
    });
};
InputHitArea.fromElement = function(graph, elem) {
  var hitParts = elem.id.split('_');
  if (hitParts.length !== 3) {
    return undefined;
  }
  var input = hitParts[0],
      nodeID = hitParts[1],
      id = hitParts[2];
  if (input !== 'input') {
    return undefined;
  }
  var node = graph._nodes[nodeID];
  if (node === undefined) {
    return undefined;
  }
  return node.inputs[id];
};

var OutputHitArea = new Class({
  Extends: HitArea,
  initialize: function(graph, node, id) {
    this.parent(graph, node, id);
    this._hit
      .attr('id', ['output', this.node.id, this.id].join('_'))
      .on('mouseover', function() {
        this._hit.attr('class', 'hit hover');
      }.bind(this))
      .on('mouseout', function() {
        this._hit.attr('class', 'hit');
      }.bind(this))
      .call(OutputHitArea._edgeCreateBehavior(graph, this));
  },
  _getPosition: function() {
    return {
      x: this.id * (HitArea.WIDTH + HitArea.PADDING),
      y: this.node.dims.h
    }
  }
});
OutputHitArea._edgeCreateBehavior = function(graph, output) {
  return d3.behavior.drag()
    .on('dragstart', function() {
      d3.event.sourceEvent.stopPropagation();
      var outputPos = output.getEdgePos();
      graph._tempEdgeGroup
        .attr('transform', SVGUtils.translate(outputPos));
      graph._tempEdgeEnd.x = 0;
      graph._tempEdgeEnd.y = 0;
      graph._tempEdge
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', graph._tempEdgeEnd.x)
        .attr('y2', graph._tempEdgeEnd.y);
    })
    .on('dragend', function(d) {
      d3.event.sourceEvent.stopPropagation();
      graph._tempEdgeGroup
        .attr('transform', SVGUtils.translateToHide());
      var target = d3.event.sourceEvent.target,
          input = InputHitArea.fromElement(graph, target);
      if (input === undefined || input.type !== HitArea.INPUT) {
        console.log('skipping, invalid elem target');
        return;
      }
      graph.addEdge(output, input);
    })
    .on('drag', function(d) {
      graph._tempEdgeEnd.x += d3.event.dx;
      graph._tempEdgeEnd.y += d3.event.dy;
      graph._tempEdge
        .attr('x2', graph._tempEdgeEnd.x)
        .attr('y2', graph._tempEdgeEnd.y);
    });
};
OutputHitArea.fromElement = function(graph, elem) {
  var hitParts = elem.id.split('_');
  if (hitParts.length !== 3) {
    return undefined;
  }
  var output = hitParts[0],
      nodeID = hitParts[1],
      id = hitParts[2];
  if (output !== 'output') {
    return undefined;
  }
  var node = graph._nodes[nodeID];
  if (node === undefined) {
    return undefined;
  }
  return node.outputs[id];
};


var Node = new Class({
  initialize: function(graph, nodeGroup, name, pos, id) {
    this.name = name;
    this.type = Fist.blockType(name);
    this.dims = graph.nodeDimensions(name, pos);
    this.id = id;

    this._edgesOut = {};
    this._edgesIn = {};

    this._dragging = false;

    this._g = nodeGroup.append('svg:g')
      .attr('class', 'block')
      .attr('transform', SVGUtils.translate(this.dims))
      .on('dblclick', function() {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        var name = window.prompt('edit node name:', this.name);
        if (!name || name === this.name) {
          return;
        }
        graph.replaceNode(this, name, this.dims);
      }.bind(this))
      .call(Node._dragBehavior(graph, this));

    this._rect = this._g.append('svg:rect')
      .attr('class', 'block ' + this.type)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.dims.w)
      .attr('height', this.dims.h);
    this._text = this._g.append('svg:text')
      .attr('class', 'block ' + this.type)
      .attr('x', this.dims.w / 2)
      .attr('y', this.dims.h / 2)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(this.name);

    this.inputs = [];
    this.inputColors = d3.scale.category10();
    this._inputCount = {};
    if (this.type === 'function') {
      Object.each(Fist.evaluateType(name).params, function(type, param) {
        this.inputs.push(new InputHitArea(graph, this, this.inputs.length, param, !!type.variadic));
        this._inputCount[param] = 1;
      }.bind(this));
    }
    this.outputs = [];
    if (this.type === 'function') {
      var type = Fist.evaluateType(this.name);
      if (!Type.equal(type.returnType, ViewType)) {
        this.outputs.push(new OutputHitArea(graph, this, 0));
      }
    } else {
      this.outputs.push(new OutputHitArea(graph, this, 0));
    }
  },
  addVariadicInput: function(graph, param) {
    var last = this.inputs.length - 1;
    for (; last >= 0 && this.inputs[last].param !== param; i--) {}
    if (last < 0) {
      throw new Error('cannot add param ' + param + ' to node');
    }
    var input = new InputHitArea(graph, this, last + 1, param, true);
    this.inputs.splice(last + 1, 0, input);
    this._inputCount[param]++;
    for (var i = this.inputs.length - 1; i > last + 1; i--) {
      this.inputs[i].id = i;
      this.inputs[i].update();
      if (this._edgesIn[i - 1] !== undefined) {
        this._edgesIn[i] = this._edgesIn[i - 1];
        this._edgesIn[i].update();
      }
    }
  },
  move: function(dx, dy) {
    this.dims.x += dx;
    this.dims.y += dy;
    this._g
      .attr('transform', SVGUtils.translate(this.dims));
    this.allEdges().each(function(edge) {
      edge.update();
    });
    return this;
  },
  addEdge: function(edge) {
    if (edge.input.node === this) {
      this._edgesIn[edge.input.id] = edge;
    } else if (edge.output.node === this) {
      if (this._edgesOut[edge.output.id] === undefined) {
        this._edgesOut[edge.output.id] = [];
      }
      this._edgesOut[edge.output.id].push(edge);
    }
    return this;
  },
  deleteEdge: function(edge) {
    if (edge.input.node === this) {
      delete this._edgesIn[edge.input.id];
      if (!edge.input.variadic || this._inputCount[edge.input.param] === 1) {
        return;
      }
      var inputs = this.inputs.splice(edge.input.id, 1);
      inputs[0].cleanup();
      this._inputCount[edge.input.param]--;
      for (var i = edge.input.id; i < this.inputs.length; i++) {
        this.inputs[i].id = i;
        this.inputs[i].update();
        if (this._edgesIn[i + 1] !== undefined) {
          this._edgesIn[i] = this._edgesIn[i + 1];
          this._edgesIn[i].update();
          delete this._edgesIn[i + 1];
        }
      }
      console.log(Object.keys(this._edgesIn), Object.keys(this.inputs));
    } else if (edge.output.node === this) {
      this._edgesOut[edge.output.id].erase(edge);
    }
    return this;
  },
  cleanup: function() {
    this._g.remove();
  },
  edgeIn: function(inputID) {
    return this._edgesIn[inputID];
  },
  edgesOut: function(outputID) {
    return this._edgesOut[outputID];
  },
  allEdgesIn: function() {
    return Object.values(this._edgesIn);
  },
  allEdgesOut: function() {
    return Object.values(this._edgesOut).flatten();
  },
  allEdges: function() {
    return this.allEdgesIn().append(this.allEdgesOut());
  }
});
Node.PADDING = 2;
Node._dragBehavior = function(graph, node) {
  return d3.behavior.drag()
    .origin(Object)
    .on('dragstart', function() {
      node._dragging = true;
    })
    .on('dragend', function() {
      if (!graph.isInViewer(d3.event.sourceEvent.target)) {
        graph.deleteNode(node);
      } else {
        this._dragging = false;
      }
    })
    .on('drag', function() {
      node.move(d3.event.dx, d3.event.dy);
    });
};
Node._depthSearch = function(fromNode, toNode, visited) {
  visited[fromNode.id] = true;
  if (fromNode === toNode) {
    return true;
  }
  var edges = fromNode.allEdgesOut();
  for (var i = 0; i < edges.length; i++) {
    var nextNode = edges[i].input.node;
    if (visited[nextNode.id]) {
      continue;
    }
    if (Node._depthSearch(nextNode, toNode, visited)) {
      return true;
    }
  }
  return false;
};
Node.existsPath = function(fromNode, toNode) {
  var visited = {};
  return Node._depthSearch(fromNode, toNode, visited);
};

var Edge = new Class({
  initialize: function(graph, edgeGroup, output, input) {
    this.output = output;
    this.input = input;

    this._line = edgeGroup.append('svg:line')
      .attr('class', 'edge')
      .attr('marker-end', 'url(#edge_end)')
      .call(Edge._dragBehavior(graph, this));
    this.update();
  },
  update: function() {
    var outputPos = this.output.getEdgePos(),
        inputPos = this.input.getEdgePos();
    this._line
      .attr('x1', outputPos.x)
      .attr('y1', outputPos.y)
      .attr('x2', inputPos.x)
      .attr('y2', inputPos.y);
  },
  cleanup: function() {
    this._line.remove();
  }
});
Edge._dragBehavior = function(graph, edge) {
  var drag = function() {
    var origin = graph.getOrigin(),
        x = d3.event.sourceEvent.pageX - origin.x,
        y = d3.event.sourceEvent.pageY - origin.y;
    edge._line
      .attr('class', 'edge temp')
      .attr('x2', x)
      .attr('y2', y);
  };
  return d3.behavior.drag()
    .on('dragstart', drag)
    .on('drag', drag)
    .on('dragend', function() {
      var target = d3.event.sourceEvent.target,
          input = InputHitArea.fromElement(graph, target),
          output = edge.output;
      graph.deleteEdge(edge);
      if (input !== undefined && input.type === HitArea.INPUT) {
        graph.addEdge(output, input);
      }
    });
};

var ViewGraph = new Class({
  initialize: function(svg) {
    this._svg = svg;
    this._nextNodeID = 0;
    this._nodes = {};

    this._edgeGroup = this._svg.append('svg:g');

    this._tempEdgeGroup = svg.append('svg:g')
      .attr('transform', SVGUtils.translateToHide());
    this._tempEdgeEnd = {};
    this._tempEdge = this._tempEdgeGroup.append('svg:line')
      .attr('class', 'edge temp')
      .attr('marker-end', 'url(#edge_end)');

    this._tempTextGroup = svg.append('svg:g')
      .attr('transform', SVGUtils.translateToHide());
    this._tempText = this._tempTextGroup.append('svg:text')
      .attr('class', 'block');

    this._nodeGroup = this._svg.append('svg:g');

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
  },
  // NOTE: the _*Impl() versions exist to allow for issuing
  // a bunch of graph operations without constantly calling
  // FistUI.runViewGraph() :)
  _addNodeImpl: function(name, pos) {
    var id = this._nextNodeID++;
    this._nodes[id] = new Node(this, this._nodeGroup, name, pos, id);
    return this._nodes[id];
  },
  addNode: function(name, pos) {
    var node = this._addNodeImpl(name, pos);
    FistUI.runViewGraph();
    return node;
  },
  _addEdgeImpl: function(output, input) {
    if (Node.existsPath(input.node, output.node)) {
      console.log('skipping, will create cycle!');
      return null;
    }
    if (input.isFull()) {
      console.log('skipping, input is already being used!');
      return null;
    }
    var edge = new Edge(this, this._edgeGroup, output, input);
    output.node.addEdge(edge);
    input.node.addEdge(edge);
    if (input.variadic) {
      input.node.addVariadicInput(this, input.param);
    }
    return edge;
  },
  addEdge: function(output, input) {
    var edge = this._addEdgeImpl(output, input);
    FistUI.runViewGraph();
    return edge;
  },
  _deleteNodeImpl: function(node) {
    node.allEdges().each(function(edge) {
      this._deleteEdgeImpl(edge);
    }.bind(this));
    node.cleanup();
    delete this._nodes[node.id];
    // TODO: connect in/out neighbors to help with filter cleanup?
  },
  deleteNode: function(node) {
    this._deleteNodeImpl(node);
    FistUI.runViewGraph();
  },
  _deleteEdgeImpl: function(edge) {
    edge.cleanup();
    edge.input.node.deleteEdge(edge);
    edge.output.node.deleteEdge(edge);
  },
  deleteEdge: function(edge) {
    this._deleteEdgeImpl(edge);
    FistUI.runViewGraph();
  },
  _replaceNodeImpl: function(node, name, pos) {
    var newNode = this._addNodeImpl(name, pos);
    node.allEdgesIn().each(function(edge) {
      this._deleteEdgeImpl(edge);
      if (edge.input.id < newNode.inputs.length) {
        this._addEdgeImpl(edge.output, newNode.inputs[edge.input.id]);
      }
    }.bind(this));
    node.allEdgesOut().each(function(edge) {
      this._deleteEdgeImpl(edge);
      if (edge.output.id < newNode.outputs.length) {
        this._addEdgeImpl(newNode.outputs[edge.output.id], edge.input);
      }
    }.bind(this));
    this._deleteNodeImpl(node);
  },
  replaceNode: function(node, name, pos) {
    this._replaceNodeImpl(node, name, pos);
    FistUI.runViewGraph();
  },
  _emptyImpl: function() {
    Object.values(this._nodes).each(function(node) {
      this._deleteNodeImpl(node);
    }.bind(this));
  },
  empty: function() {
    FistUI.runViewGraph();
  },
  _depthCode: function(node) {
    var edges = node.allEdgesIn();
    if (edges.length === 0) {
      return node.name;
    }
    var args = {};
    edges.each(function(edge) {
      var code = this._depthCode(edge.output.node);
      if (edge.input.variadic) {
        if (!args.hasOwnProperty(edge.input.param)) {
          args[edge.input.param] = [];
        }
        args[edge.input.param].push(code);
      } else {
        args[edge.input.param] = code;
      }
    }.bind(this));
    return {op: node.name, args: args};
  },
  toCodes: function() {
    var T = Object.values(this._nodes).filter(function(node) {
      return node.allEdgesOut().length === 0;
    });
    return T.map(this._depthCode.bind(this));
  },
  isInViewer: function(elem) {
    var svgRoot = $d3(this._svg);
    while (elem !== null) {
      if (elem.match(svgRoot)) {
        return true;
      }
      elem = elem.getParent();
    }
    return false;
  },
  nodeDimensions: function(name, pos) {
    this._tempText.text(name);
    var size = $d3(this._tempText).getSize();
    size.x = Math.max(50, size.x);
    var w = size.x + 2 * Node.PADDING,
        h = size.y + 2 * Node.PADDING;
    return {
      x: Math.floor(pos.x - w / 2) + 0.5,
      y: Math.floor(pos.y - h / 2) + 0.5,
      w: w,
      h: h
    };
  },
  getOrigin: function() {
    return $d3(this._svg).getPosition();
  }
});

var Status = new Class({
  initialize: function(statusWrapper) {
    this._statusWrapper = statusWrapper;
    this._messageBox = this._statusWrapper.getElement('#message');
  },
  _msg: function(cls, msg) {
    this._statusWrapper.set('class', cls);
    this._messageBox.set('text', msg);
  },
  OK: function(msg) {
    this._msg('ok', msg);
  },
  working: function(msg) {
    this._msg('working', msg);
  },
  notOK: function(err) {
    this._msg('not-ok', err.toString());
  }
});

var FistUI = {
  _viewTable: {},
  _fistCode: '',
  inited: false,
  runViewGraph: function(options) {
    options = options || {};
    var rebuild = options.rebuild || true;
    if (rebuild) {
      this._fistCode = this._viewGraph.toCodes();
    }
    console.log(JSON.stringify(this._fistCode));
    if (this._fistCode.length === 0) {
      this._status.OK('view graph is empty.');
      return;
    }
    try {
      this._status.working('type-checking view graph...');
      var code = this._fistCode[0],
          fistType = Fist.evaluateType(code);
      if (fistType === null) {
        // TODO: identify *what* is invalid about it
        this._status.notOK('view graph is invalid!');
        return;
      }
      if (!Type.equal(fistType, ViewType)) {
        this._status.OK('view graph describes a ' + fistType.node() + ', not a view.');
        return;
      }
      this._status.working('rendering view...');
      Fist.evaluate(code);
      this._status.OK('rendered view graph successfully.');
    } catch (e) {
      console.log(e);
      this._status.notOK(e);
    }
  },
  init: function() {
    // set up root
    this._root = $('container');
    this._dropOverlay = this._root.getElement('#drop_overlay');
    this._root.addEventListener('dragenter', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._dropOverlay.addClass('droptarget');
    }.bind(this), false);
    this._dropOverlay.addEventListener('dragover', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      evt.dataTransfer.dropEffect = 'copy';
      this._dropOverlay.addClass('droptarget');
    }.bind(this), false);
    this._dropOverlay.addEventListener('dragleave', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._dropOverlay.removeClass('droptarget');
    }.bind(this), false);
    this._dropOverlay.addEventListener('drop', function(evt) {
      evt.stop();
      if (!evt.isFileDrag()) {
        return;
      }
      this._dropOverlay.removeClass('droptarget');
      this._importDialog.show(evt.dataTransfer.files[0]);
    }.bind(this), false);

    this._dragBlock = null;

    // set up status area
    this._status = new Status(this._root.getElement('#status_wrapper'));

    // set up import dialog
    this._importDialog = new ImportDialog($('modal'), this._status);

    // set up palette
    this._palette = this._root.getElement('#palette');

    // set up viewer
    this._viewer = this._root.getElement('#viewer');
    this._content = this._root.getElement('#content');
    this._svgExecuteWrapper = this._root.getElement('#svg_execute_wrapper');
    this._viewExecuteSVG = d3.select(this._svgExecuteWrapper)
      .append('svg:svg')
      .attr('id', 'view_execute')
      .attr('width', this._svgExecuteWrapper.getWidth() - 2)
      .attr('height', this._svgExecuteWrapper.getHeight() - 2);

    // set up interpreter
    this._svgGraphWrapper = this._root.getElement('#svg_graph_wrapper');
    this._viewGraphSVG = d3.select(this._svgGraphWrapper)
      .append('svg:svg')
      .attr('id', 'view_graph')
      .attr('width', this._svgGraphWrapper.getWidth() - 2)
      .attr('height', this._svgGraphWrapper.getHeight() - 2)
      .on('dblclick', function(d) {
        var name = window.prompt('enter node name:');
        if (name === null || name.length === 0) {
          return;
        }
        var svgPosition = $d3(this._viewGraph._svg).getPosition(),
            x = d3.event.pageX - svgPosition.x,
            y = d3.event.pageY - svgPosition.y;
        this._viewGraph.addNode(name, {x: x, y: y});
      }.bind(this));
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
      this._viewGraph.addNode(json.name, {x: x, y: y});
    }.bind(this), false);

    this._repl = this._root.getElement('#repl');
    this._viewGraph = new ViewGraph(this._viewGraphSVG);

    this.inited = true;
  },
  onSymbolImport: function(name, value, moduleName) {
    console.log('importing symbol ' + name + ' in module ' + moduleName);
    var type = Fist.blockType(name);
    this._palette.getElements('div.block[name=' + name + ']').destroy();
    var block = new Element('div.block.' + type, {
      text: name,
      name: name,
      draggable: true,
    });
    block.tips = new Tips(block, {
      className: 'fistdocs',
      title: 'text',
      text: function(element) {
        if (type === 'function' || type === 'channel') {
          if (value.describe === undefined) {
            return type;
          }
          return value.describe();
        } else {
          return type;
        }
      }
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
    if (moduleName === undefined) {
      block.inject(this._palette, 'top');
      this._palette.scrollTo(0, 0);
    } else {
      var moduleGroup = this._palette.getElement(
        'div.module-group[name=' + moduleName + ']'
      );
      moduleGroup.getElement('div.module-contents').adopt(block);
    }
  },
  onModuleImport: function(moduleName) {
    console.log('importing module ' + moduleName);
    var moduleGroup = new Element('div.module-group', {
          name: moduleName
        }),
        moduleContents = new Element('div.module-contents.hidden'),
        moduleHeader = new Element('div.module-name', {
          text: moduleName + ' \u25b8'
        });
    // HACK: keep Views open
    if (moduleName === 'Views') {
      moduleHeader.set('text', moduleName + ' \u25be');
      moduleContents.removeClass('hidden');
    }
    moduleHeader.addEvent('click', function(evt) {
      if (moduleContents.hasClass('hidden')) {
        this.set('text', moduleName + ' \u25be');
        moduleContents.removeClass('hidden');
      } else {
        this.set('text', moduleName + ' \u25b8');
        moduleContents.addClass('hidden');
      }
    });
    moduleGroup.adopt(moduleHeader, moduleContents).inject(this._palette);
  },
  onViewInvoked: function(name, args) {
    console.log('rendering view ' + name);
    $d3(this._viewExecuteSVG).empty();
    var view = this._viewTable[name];
    if (view === undefined) {
      throw new Error('unrecognized view: ' + name);
    }
    view.render(this._viewExecuteSVG, args);
  },
  importView: function(name, view) {
    console.log('importing view ' + name);
    this._viewTable[name] = view;
  },
  dynamicResize: function() {
    var contentSize = this._content.getSize();
    this._svgExecuteWrapper
      .setStyle('width', contentSize.x - 8)
      .setStyle('height', contentSize.y - 8);
    this._viewExecuteSVG
      .attr('width', this._svgExecuteWrapper.getWidth() - 2)
      .attr('height', this._svgExecuteWrapper.getHeight() - 2)
    try {
      this.runViewGraph({rebuild: false});
    } catch (e) {
      console.log(e);
    }
  },
  loaded: function(version, loadStart) {
    var loadTime = +(new Date()) - loadStart,
        msg = 'datafist version ' + version + ': loaded in ' + loadTime + ' ms';
    this._status.OK(msg);
  }
};
