define(['durandal/app','api/datacontext', 'game/canvas/viewModel/Box', 'paper'], function (app,ctx, Box) {

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
    this._hoverItems = [];
    this._hasSetuped = false;
    this.pathModel = pathModel;

    this.draw = this.show;
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

  Path.prototype.show = function () {

    console.log('%cPath', 'background: orange; color: white', this.pathModel.id + ' is being drawn');

    var pm = this.pathModel, nWords = pm.nWords;

    if (this._hasSetuped) {
      for (var i = 0; i < this._hoverItems.length; i++) {
        this._hoverItems[i].remove();
      }
    } else {
      pm.guiBoxes = [];
      for (var i = 0; i < nWords; i++) {
        var box = new Box(scope, i);
        pm.guiBoxes.push(box);
        this._displayItems.push(box);
      }
    }

    for (var i = 0; i < nWords; i++) {
      var box = pm.guiBoxes[i];

      box.cPoint = new scope.Point(-100, -100);
      box.angle = 0;
      box.setPath(pm);
    }

    var desiredLength = Path.getDesiredLength(nWords, pm.guiBoxes);
    path = Path.shortestArc(pm.startTile.center, pm.endTile.center, desiredLength, pm.cw);
    path.strokeColor = 'grey';
    this._displayItems.push(path);

    var delta = path.length - desiredLength,
        visibleLength = path.length - 2 * (Path.options.tileMargin + Path.options.tileRadius),
        startPoint = Path.options.tileRadius + Path.options.tileMargin,
        offset = startPoint;

    for (var i = 0; i < nWords; i++) {
      var box = pm.guiBoxes[i];
      offset += box.width() / 2 + Path.options.rectMargin + delta / (2 * nWords);

      var point = path.getPointAt(offset),
        tangent = path.getTangentAt(offset);

      box.cPoint = point;
      box.angle = tangent.angle;
      box.setPath(pm);

      var hover = this.createHoverArea(path, offset, box.width() + 2 * Path.options.rectMargin + delta / nWords);
      hover.data = box;

      if (Path.options.debug) {
        hover.strokeColor = 'lightgreen';
      }
      if (!Path.options.debug) path.remove();

      offset += box.width() / 2 + Path.options.rectMargin + delta / (2 * nWords);
    }

    if (!Path.options.debug) path.remove();

    this._hasSetuped = true;
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

    this._displayItems.push(hover);
    this._hoverItems.push(hover);

    return hover;
  }

  Path.prototype.clear = function () {
    this.clear.remove(this._displayItems);
    this.clear.remove(this._hoverItems);
    this.clear.remove(this.pathModel.guiBoxes);

    this.pathModel.guiBoxes = [];
    this._displayItems = [];
    this._hoverItems = [];
    this._hasSetuped = false;    
  }

  Path.prototype.clear.remove = function (arr) {
    if (arr == null) return;
    for (var i = 0; i < arr.length; i++) {
      try{
        arr[i].remove();
      }
      catch(ex){}
    }
  }

  Path.prototype.redraw = function () {
    this.clear();
    this.show();
  }

  Path.scope = paper;
  Path.displayItems = [];
  Path.shortestArc = function (from, to, desiredLength, clockwise, accuracy) {
    var scope = Path.scope;
    var line = new scope.Path.Line(from, to),
        cPoint = line.getPointAt(line.length / 2),
        vector = line.getNormalAt(line.length / 2).normalize(-500 * (clockwise ? 1 : -1));
    line.remove();

    line = new scope.Path.Line(cPoint.add(vector.normalize(-Path.options.minArc)), cPoint.subtract(vector));
    if (Path.options.debug) {
      line.strokeColor = 'orange';
      line.dashArray = [10, 12];
      var circle = new scope.Path.Circle(cPoint, 5);
      circle.fillColor = 'orange';

      Path.displayItems.push(circle);
    }

    var S = 0, E = line.length, bestDelta = 10000, M = line.length/2, bestArc;
    accuracy = accuracy || 10;
    for (var i = 0; i < accuracy; i++, M /= 2.0) {
      var through = line.getPointAt((S + E) / 2);
      var arc = new scope.Path.Arc(from, through, to);

      //if (desiredLength == 490) console.log(i, M, (S + E) / 2);

      if (Math.abs(arc.length - desiredLength) < bestDelta) {
        if (bestArc) bestArc.remove();
        bestDelta = Math.abs(arc.length - desiredLength);
        bestArc = arc;
      } else {
        arc.remove();
      }

      if (arc.length > desiredLength) E -= M; else S += M;
    }

    if (!Path.options.debug) line.remove();
    else
      Path.displayItems.push(line);

    return bestArc;
  }

  Path.clear = function () {
    for (var i = 0; i < Path.displayItems.length; i++) {
      var item = Path.displayItems[i];
      item.remove();
    }
    Path.displayItems = [];
  }

  Path.getDesiredLength = function (n, arr) {
    if (arr === undefined || arr.length === 0) {
      return n * (Box.options.rect.size.x + Path.options.rectMargin) * 2 + (Path.options.tileMargin + Path.options.tileRadius) * 2;
    }
    var len = (Path.options.tileMargin + Path.options.tileRadius) * 2;
    for (var i = 0; i < n; i++) {
      len += arr[i].width() + Path.options.rectMargin * 2;
    }
    return len;
  }

  Path.options = {    
    tileRadius: 80,
    tileMargin: 5,
    hoverMargin: 60,
    rectMargin: 10,
    minArc: 80,
    debug: 0,
    container: null
  };

  Path.Box = Box;
  Path.Box.pathOptions = Path.options;

  return Path;

});