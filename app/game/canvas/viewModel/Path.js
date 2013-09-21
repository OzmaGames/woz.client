define(['durandal/app', 'api/datacontext', 'game/canvas/viewModel/Box', 'paper'], function (app, ctx, Box) {

  var scope = paper;
  var activeWord = ctx.activeWord;
  var activeWords = ctx.activeWords;
  var transparent = new scope.Color(0, 0);

  var activeBox = null;
  activeWord.subscribe(function (word) {
    if (word == null && activeBox != null) {
      activeBox.drop();
    }
  });  

  function Path(paperScope, pathModel) {
    scope = paperScope;

    this._displayItems = [];
    this._trash = [];
    this.pathModel = pathModel;
  }

  Path.prototype.enter = function () {
    if (activeWords() != null) {
      var words = activeWords(), pm = this.pathModel;
      if (words.length != pm.nWords) return;

      for (var i = 0; i < pm.guiBoxes.length; i++) {
        pm.guiBoxes[i].enter(words[i]);
      }
    }
  }

  Path.prototype.leave = function () {
    if (activeWords() != null) {
      var words = activeWords(), pm = this.pathModel;
      if (words.length != pm.nWords) return;

      for (var i = 0; i < pm.guiBoxes.length; i++) {
        pm.guiBoxes[i].leave();
      }
    }
  }

  Path.prototype.put = function () {
    if (activeWords() != null) {
      var words = activeWords(), pm = this.pathModel;
      if (words.length != pm.nWords) {
        if (words.length > pm.nWords)
          app.trigger("alert:show", "too many words");
        else
          app.trigger("alert:show", "need more words");
        return;
      }

      for (var i = 0; i < pm.guiBoxes.length; i++) {
        pm.addWord(words[i], i);
      }
    }
  }

  Path.prototype.events = {
    boxHoverEvents: {
      mouseenter: function (e) {
        activeBox = this.data.enter(activeWord());
        this.data.pathModel.canvas.enter();
      },
      mouseleave: function (e) {
        this.data.leave();
        this.data.pathModel.canvas.leave();
      },
      mousedown: function (e) {
        this.data.pathModel.canvas.put();
      }
    }
  }

  Path.prototype.setup = function () {
    console.log('%cPath Setup', 'background: orange; color: white', this.pathModel.id);

    var pm = this.pathModel, nWords = pm.nWords;

    if (pm.guiBoxes && pm.guiBoxes.length == nWords) {
      for (var i = 0; i < nWords; i++) {
        var box = pm.guiBoxes[i]
        box.updateModel(pm);
      }
    } else {
      pm.guiBoxes = [];
      for (var i = 0; i < nWords; i++) {
        var box = new Box(i, pm);
        pm.guiBoxes.push(box);
        this._displayItems.push(box);
      }
    }
  }

  Path.prototype.show = function () {
    console.log('%cPath', 'background: orange; color: white', this.pathModel.id + ' is being drawn');

    var pm = this.pathModel, nWords = pm.nWords;

    this._cleanCycle();

    var desiredLength = Path.getDesiredLength(pm.guiBoxes);
    path = Path.getBestArc(pm.startTile.center, pm.endTile.center, desiredLength, pm.cw);
    this.cPoint = Path.cPoint;

    var delta = path.length - desiredLength,
        visibleLength = path.length - 2 * (Path.options.tileMargin + Path.options.tileRadius),
        startPoint = Path.options.tileRadius + Path.options.tileMargin,
        offset = startPoint;

    for (var i = 0; i < nWords; i++) {
      var box = pm.guiBoxes[i], 
        half = box.width() / 2 + Path.options.rectMargin + delta / (2 * nWords);

      offset += half;
      var point = path.getPointAt(offset),
        tangent = path.getTangentAt(offset),
        hoverArea = this.createHoverArea(path, offset, box.width() + 2 * Path.options.rectMargin + delta / nWords);
      hoverArea.data = box;
      offset += half;

      box.cPoint = point;
      box.angle = tangent.angle;
      box.show();

      if (Path.options.debug) {
        hoverArea.strokeColor = 'lightgreen';
      }
    }

    if (!Path.options.debug) {
      path.remove();
    } else {
      this._trash.push(path);
    }

    scope.view.draw();
  }

  Path.prototype.createHoverArea = function (path, offset, width) {
    var prevOffset = offset - width / 2,
        prevPoint = path.getPointAt(prevOffset),
        prevNoramal = path.getNormalAt(prevOffset).normalize(Path.options.hoverMargin);

    var nextOffset = offset + width / 2,
        nextPoint = path.getPointAt(nextOffset),
        nextNoramal = path.getNormalAt(nextOffset).normalize(Path.options.hoverMargin);

    var hover = new scope.Path(
        prevPoint.add(prevNoramal), prevPoint.subtract(prevNoramal),
        nextPoint.subtract(nextNoramal), nextPoint.add(nextNoramal));

    hover.closePath();
    hover.fillColor = transparent;
    hover.on(this.events.boxHoverEvents);

    this._trash.push(hover);

    return hover;
  }

  Path.prototype._cleanCycle = function () {
    this._removeAll(this._trash);
    this._trash = [];

    if (Path.options.debug) Path._clear();
  }

  Path.prototype._removeAll = function (arr) {
    if (arr == null) return;
    for (var i = 0; i < arr.length; i++) {
      try { arr[i].remove(); } catch (ex) { }
    }
  }

  Path.prototype.remove = function () {
    this._removeAll(this._trash);
    this._removeAll(this._displayItems);
  }
  
  Path.scope = paper;
  Path._trash = [];
  Path.getBestArc = function (from, to, desiredLength, clockwise, accuracy) {
    var scope = Path.scope;
    var line = new scope.Path.Line(from, to),
        cPoint = line.getPointAt(line.length / 2),
        vector = line.getNormalAt(line.length / 2).normalize(-500 * (clockwise ? 1 : -1));
    line.remove();

    Path.cPoint = cPoint;

    line = new scope.Path.Line(cPoint.add(vector.normalize(-Path.options.minArc)), cPoint.subtract(vector));

    var S = 0, E = line.length, bestDelta = 10000, M = line.length / 2, bestArc;
    accuracy = accuracy || 10;
    for (var i = 0; i < accuracy; i++, M /= 2.0) {
      var through = line.getPointAt((S + E) / 2);
      var arc = new scope.Path.Arc(from, through, to);

      if (Math.abs(arc.length - desiredLength) < bestDelta) {
        if (bestArc) bestArc.remove();
        bestDelta = Math.abs(arc.length - desiredLength);
        bestArc = arc;
      } else {
        arc.remove();
      }

      if (arc.length > desiredLength) E -= M; else S += M;
    }

    if (Path.options.debug) {
      var circle = new scope.Path.Circle(cPoint, 5);
      circle.fillColor = 'orange';
      line.strokeColor = 'orange';
      line.dashArray = [10, 12];
      bestArc.strokeColor = 'grey';

      Path._trash.push(line);
      Path._trash.push(circle);
    }
    else {
      line.remove();
    }

    return bestArc;
  }

  Path.getDesiredLength = function (arr) {
    var len = (Path.options.tileMargin + Path.options.tileRadius) * 2;
    for (var i = 0; i < arr.length; i++) {
      len += arr[i].width() + Path.options.rectMargin * 2;
    }
    return len;
  }

  Path._clear = function () {
    for (var i = 0; i < Path._trash.length; i++) {
      var item = Path._trash[i];
      item.remove();
    }
    Path._trash = [];
  }
  
  Path.options = {
    tileRadius: 80,
    tileMargin: 5,
    hoverMargin: 60,
    rectMargin: 10,
    minArc: 50,
    debug: 0,
    container: null
  };

  Path.Box = Box;
  Path.Box.pathOptions = Path.options;

  return Path;
});