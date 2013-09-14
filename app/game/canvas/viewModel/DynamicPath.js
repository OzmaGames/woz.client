define(['api/datacontext', 'game/canvas/viewModel/Box', 'game/canvas/viewModel/Path', 'paper'], function (ctx, Box, Path) {

  var scope = paper;
  var activeWord = ctx.activeWord;
  var activeWords = ctx.activeWords;
  var transparent = new scope.Color(0, 0);

  function DynamicPath(pathModel) {
    //this.options = $.extend(true, {}, Path.options, opt);
    this.pathModel = pathModel;

    this.draw = this.show;
  }

  DynamicPath.prototype = new Path();
  DynamicPath.prototype.constructor = DynamicPath;

  //var Events = {
  //  mouseEnter: function (rect, e) {
  //    rect.data.enter({ obsWord: activeWord, obsWords: activeWords });
  //  },
  //  mouseLeave: function (rect, e) {
  //    rect.data.leave({ obsWord: activeWord, obsWords: activeWords });
  //  },
  //  //doesn't detect mouse-up
  //  mouseMove: function (rect, e) {
  //    if (e.event.which === 0 && activeWords() == null) {
  //      rect.data.drop();
  //    }
  //  },

  //  mouseDown: function (rect, e) {
  //    rect.data.put({ obsWords: activeWords });
  //    activeWords(null);
  //  }
  //}

  DynamicPath.prototype.show = function () {
    console.log('%cDynamic Path', 'background: orange; color: white', this.pathModel.id + ' is being drawn');

    var pm = this.pathModel, nWords = pm.nWords = 4;

    var desiredLength = Path.getDesiredLength(nWords);
    path = Path.shortestArc(pm.startTile.center, pm.endTile.center, desiredLength, pm.cw !== false);
    path.strokeColor = 'grey';

    this._displayItems.push(path);

    pm.guiBoxes = [];
    var delta = path.length - desiredLength,
        visibleLength = path.length - 2 * (Path.options.tileMargin + Path.options.tileRadius);

    nWords = 8;
    gap = Path.options.tileMargin + Path.options.tileRadius + 20;
    var hover = new scope.Path();

    for (var j = 0; j < nWords; j++) {
      var offset = gap + (j / nWords) * visibleLength;
      offset += delta / (nWords * 2);    //centering boxes if the length of arc is bigger

      var point = path.getPointAt(offset);

      var circle = new scope.Path.Circle(point, 5);
      circle.fillColor = Box.options.rect.style.strokeColor;

      var nextOffset = (offset + (gap + ((j + 1) / nWords) * visibleLength) + delta / (nWords * 2)) / 2,
          nextPoint = path.getPointAt(nextOffset),
          nextNoramal = path.getNormalAt(nextOffset).normalize(-Path.options.hoverMargin / 2);

      var prevOffset = (offset + (gap + ((j - 1) / nWords) * visibleLength) + delta / (nWords * 2)) / 2,
          prevPoint = path.getPointAt(prevOffset),
          prevNoramal = path.getNormalAt(prevOffset).normalize(-Path.options.hoverMargin / 2);

      hover.add(prevPoint.add(prevNoramal));
      hover.add(nextPoint.add(nextNoramal));

      hover.insert(0, prevPoint.subtract(prevNoramal));
      hover.insert(0, nextPoint.subtract(nextNoramal));

      hover.fillColor = new scope.Color(0, 0);

      this._displayItems.push(hover);
      this._displayItems.push(circle);

      if (Path.options.debug) hover.strokeColor = 'lightgreen'
    }
    //hover.on({
    //  mouseenter: function (e) { Events.mouseEnter(this.data, e); },
    //  mouseleave: function (e) { Events.mouseLeave(this.data, e); },
    //  mousemove: function (e) { Events.mouseMove(this.data, e); },
    //  mousedown: function (e) { Events.mouseDown(this.data, e); }
    //});
    hover.closePath();

    this._displayItems.push(hover);
    //this._displayItems.push(box);

    //pm.guiBoxes.push(box);

    if (Path.options.debug) hover.strokeColor = 'lightgreen';
    if (!Path.options.debug) path.remove();

    paper.view.draw();
  };
  
  DynamicPath.getDesiredLength = function (n) {
    return n * (Box.options.rect.size.x + Path.options.rectMargin) * 2 + (Path.options.tileMargin + Path.options.tileRadius) * 2;
  };

  DynamicPath.options = {
    tileRadius: 80,
    tileMargin: 5,
    hoverMargin: 120,
    rectMargin: 10,
    minArc: 20,
    debug: 0,
    container: null
  };

  return DynamicPath;

});