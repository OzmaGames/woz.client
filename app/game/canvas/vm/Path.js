define(['durandal/app', 'api/datacontext', 'game/canvas/vm/Box', 'paper'], function (app, ctx, Box) {

   var activeWord = ctx.activeWord;
   var activeWords = ctx.activeWords;
   var transparent = new paper.Color(0, 0);

   var activeBox = null;
   activeWord.subscribe(function (word) {
      if (word == null && activeBox != null) {
         activeBox.drop();
      }
   });

   function Path(pathModel) {
      this._displayItems = [];
      this._trash = [];
      this.pathModel = pathModel;
   }

   Path.activePath = null;
   Path.prototype.isActive = false;
   Path.prototype.leavingHandler = 0;

   Path.prototype.enter = function () {
      var hasData = activeWords() != null,
        pm = this.pathModel;

      if (hasData) {
         var words = activeWords();
         if (words.length != pm.nWords) return;

         for (var i = 0; i < pm.guiBoxes.length; i++) {
            pm.guiBoxes[i].enter(words[i]);
         }
      } else {
         if (pm && pm.onEnter) {

            if (!this.isActive) {
               if (Path.activePath && Path.activePath != this) Path.activePath.isActive = false;
               this.isActive = true;
               Path.activePath = this;
               pm.onEnter(this.midPath);
               //console.log("in", pm.id);
            }

            if (this.leavingHandler) {
               clearTimeout(this.leavingHandler);
               this.leavingHandler = 0;
               //console.log("canceled", pm.id, this.isActive);
            }

         }
      }
   }

   Path.prototype.leave = function () {
      var pm = this.pathModel;
      if (activeWords() != null) {
         var words = activeWords();
         if (words.length != pm.nWords) return;

         for (var i = 0; i < pm.guiBoxes.length; i++) {
            pm.guiBoxes[i].leave();
         }
      } else {
         if (pm && pm.onLeave) {
            if (this.leavingHandler) clearTimeout(this.leavingHandler);
            this.leavingHandler = setTimeout(function (base) {
               if (base.isActive) {
                  base.isActive = false;
                  pm.onLeave();
                  //console.log("out", pm.id);
                  if (Path.activePath == base) Path.activePath = null;
               }
            }, 1, this);
         }
      }
   }

   Path.prototype._canPut = true;

   Path.prototype.put = function () {
      if (this._canPut && activeWords() != null) {
         this._canPut = false;
         setTimeout(function (base) { base._canPut = true; }, 500, this);
         var words = activeWords(), pm = this.pathModel;
         if (words.length != pm.nWords) {
            if (words.length > pm.nWords)
               app.dialog.show("alert", { content: "too many words" });
            else
               app.dialog.show("alert", { content: "need more words" });
            return;
         }
         activeWords(null);

         for (var i = 0; i < pm.guiBoxes.length; i++) {
            pm.addWord(words[i], i);
         }
      }
   }

   Path.prototype.events = {
      boxHoverEvents: {
         mouseenter: function (e) {
            activeBox = this.data.enter(activeWord());
            this.data.pathModel.canvas.enter(e);
         },
         mouseleave: function (e) {
            this.data.leave();
            if (this.data.pathModel.canvas) {
               this.data.pathModel.canvas.leave();
            }
         },
         mousedown: function (e) {
            this.data.pathModel.canvas.put();
         }
      }
   }

   Path.prototype.dispose = function () {
      this.remove();
      this._removeAll(this.pathModel.guiBoxes);
      delete this.pathModel.guiBoxes;
   }

   Path.prototype.setup = function () {
      console.log('%cPath Setup', 'background: orange; color: white', this.pathModel.id);
      var pm = this.pathModel, nWords = pm.nWords;

      if (pm.nWords == 0) {
         nWords = 6;
      }

      if (pm.guiBoxes && pm.guiBoxes.length == nWords) {
         for (var i = 0; i < nWords; i++) {
            var box = pm.guiBoxes[i]
            box.updateModel(pm);
         }
      } else if (pm.guiBoxes) {
         if (pm.guiBoxes.length > nWords) {
            //remove
            pm.guiBoxes[nWords].remove();
            pm.removeWordAt(nWords);
            pm.guiBoxes.splice(nWords, 1);
         } else {
            //Add
            var box = new Box(nWords - 1, pm);
            pm.guiBoxes.push(box);
            this._displayItems.push(box);
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

      if (pm.guiBoxes == null) return;
      this._cleanCycle();

      var desiredLength = Path.getDesiredLength(pm.guiBoxes);

      path = Path.getBestArc(pm.startTile.center, pm.endTile.center, desiredLength, pm.cw, nWords);

      this.midPath = path.getPointAt(path.length / 2);

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
           pushupValue = 0,
           normalVector = path.getNormalAt(offset).normalize((pm.cw ? 1 : -1) * pushupValue),
           hoverArea = this.createHoverArea(path, offset, box.width() + 2 * Path.options.rectMargin + delta / nWords);
         hoverArea.data = box;
         offset += half;

         box.cPoint = point.add(normalVector);
         box.angle = tangent.angle;
         box.scale = delta >= 0 ? 1 : path.length / desiredLength;
         box.show();

         if (Path.options.debug) {
            hoverArea.strokeColor = 'lightgreen';
         }
      }

      if (!Path.options.debug) {
         path.remove();
      } else {
         this._trash.push(path);
         for (var i = 0; i < Path._trash.length; i++) {
            this._trash.push(Path._trash[i]);
         }
         Path._trash = [];
      }

      paper.view.draw();
   }

   Path.prototype.createHoverArea = function (path, offset, width) {
      var prevOffset = offset - width / 2,
          prevPoint = path.getPointAt(prevOffset),
          prevNoramal = path.getNormalAt(prevOffset).normalize(Path.options.hoverMargin);

      var nextOffset = offset + width / 2,
          nextPoint = path.getPointAt(nextOffset),
          nextNoramal = path.getNormalAt(nextOffset).normalize(Path.options.hoverMargin);

      var hover = new paper.Path(
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
         arr[i].remove();
      }
   }

   Path.prototype.remove = function () {
      this._removeAll(this._trash);
      this._removeAll(this._displayItems);
      this._displayItems = [];
      this._trash = [];
   }

   Path._trash = [];
   Path.getBestArc = function (from, to, desiredLength, clockwise, nWords, accuracy) {
      var len = to.subtract(from).length,
        minArc = Path.options.minArc * (nWords / 2),
        maxArc = Path.options.maxArc * (nWords / 3),
        line = new paper.Path.Line(from, to),
        cPoint = line.getPointAt(line.length / 2),
        vector = line.getNormalAt(line.length / 2);
      line.remove();

      if (len > 550) {
         maxArc *= 550 / len;
         minArc = Path.options.minArc * (nWords / 4);
      }
      if (maxArc > 150) maxArc = 150;
      maxArc = nWords * 30;
      minArc = maxArc - 40;

      line = new paper.Path.Line(
        cPoint.subtract(vector.normalize(-minArc * (clockwise ? 1 : -1))),
        cPoint.subtract(vector.normalize(-maxArc * (clockwise ? 1 : -1))));

      var S = 0, E = line.length, bestDelta = 10000, M = line.length / 2, bestArc;
      accuracy = accuracy || 10;
      for (var i = 0; i < accuracy; i++, M /= 2.0) {
         var through = line.getPointAt((S + E) / 2);
         var arc = new paper.Path.Arc(from, through, to);

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
         var circle = new paper.Path.Circle(cPoint, 5);
         circle.fillColor = 'orange';
         line.strokeColor = 'orange';
         line.strokeWidth = 2;
         bestArc.strokeColor = 'grey';
         Path._trash.push(circle);
         Path._trash.push(line);
      }
      else {
         line.remove();
      }

      return bestArc;
   }

   Path.getDesiredLength = function (arr, limit) {
      var len = (Path.options.tileMargin + Path.options.tileRadius) * 2;
      for (var i = 0; i < (limit || arr.length) ; i++) {
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
      tileMargin: 10,
      hoverMargin: 48,
      rectMargin: 0,
      minArc: 33,
      maxArc: 99,
      debug: 0,
      container: null
   };

   Path.Box = Box;
   Path.Box.pathOptions = Path.options;

   return Path;
});