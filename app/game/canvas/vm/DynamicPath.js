define(['api/datacontext', './Box', './Path', './confirm-box', 'paper'], function (ctx, Box, Path, ConfirmBox) {

   var activeWord = ctx.activeWord;
   var activeWords = ctx.activeWords;
   var transparent = new paper.Color(0, 0);

   var activePath = null;
   activeWord.subscribe(function (word) {
      if (word == null && activePath != null) {
         activePath.drop();
      }
   });

   var confirmBox;

   function DynamicPath(pathModel) {
      var base = this;

      this.pathModel = pathModel;
      this.activeWord = null;
      this.activeWords = null;

      this.events = {
         mouseenter: function (e) {
            if (activeWord() != null) {
               var arr = base.pathModel.guiBoxes, word = activeWord();
               for (var i = 0; i < arr.length; i++) {
                  arr[i].enter(word);
               }
               activePath = base;
               base.activeWord = word;
            } else if (activeWords() != null) {
               var words = activeWords();
               if (words.length >= 3 && words.length <= 6) {
                  var arr = base.pathModel.guiBoxes;
                  for (var i = 0; i < arr.length; i++) {
                     arr[i].enter({});
                  }
                  activePath = base;
                  base.activeWords = words;
               }
            } else {
               var pm = base.pathModel;
               if (pm && pm.onEnter) pm.onEnter(base.midPath);
            }
         },
         mouseleave: function (e) {
            if (activePath == base) {
               var arr = base.pathModel.guiBoxes;
               for (var i = 0; i < arr.length; i++) {
                  arr[i].leave();
               }
               activePath = null;
               base.activeWord = null;
               base.activeWords = null;
            } else {
               var pm = base.pathModel;
               if (pm && pm.onLeave) pm.onLeave();
            }
         }
      };

      this.events.mousedown = function (e) {
         if (base.activeWord != null) {
            base.pathModel.addWord(base.activeWord);
            base.events.mouseleave(e);
         } else if (base.activeWords != null) {
            var words = base.activeWords;
            for (var i = 0; i < words.length; i++) {
               base.pathModel.addWord(words[i]);
            }
            base.pathModel.phrase._complete(true);
            base.pathModel.phrase.words.valueHasMutated();
            base.events.mouseleave(e);
         }
      }

      this.drop = function () { base.events.mousedown(); }

      this.draw = this.show;
   }

   DynamicPath.prototype = new Path();
   DynamicPath.prototype.constructor = DynamicPath;

   DynamicPath.prototype.show = function () {
      console.log('%cDynamic Path', 'background: orange; color: white', this.pathModel.id + ' is being drawn');

      var pm = this.pathModel, nWords = 6;
      
      var confirmBtn = pm.phrase.words().length >= 3 && (!pm.phrase.complete.immediate() && pm.phrase.words().length < 6);
      
      if (confirmBtn) {
         if (!this.confirmBox) {
            this.confirmBox = new Box(-1, null);
            this.confirmBox.button(pm);
            this.confirmBox.show();            
         }
         pm.guiBoxes.push(this.confirmBox);
         nWords++;
      } else {
         if (this.confirmBox) {            
            this.confirmBox.remove();
            delete this.confirmBox;            
         }
      }

      if (pm.phrase.complete.immediate() === true) {
         nWords = pm.phrase.words().length;
         this._hideCircles();
      } else {
         this._showCircles();
      }

      this._cleanCycle();

      var desiredLength = Path.getDesiredLength(pm.guiBoxes, nWords),
        path = Path.getBestArc(pm.startTile.center, pm.endTile.center, desiredLength, pm.cw, nWords);
      this.cPoint = Path.cPoint;
      this.midPath = path.getPointAt(path.length / 2);

      var delta = path.length - desiredLength,
          visibleLength = path.length - 2 * (Path.options.tileMargin + Path.options.tileRadius),
          startPoint = Path.options.tileRadius + Path.options.tileMargin,
          offset = startPoint;

      var hover = new paper.Path();
      hover.add(pm.startTile.center);

      for (var i = 0; i < nWords; i++) {
         var box = pm.guiBoxes[i],
           half = box.width() / 2 + Path.options.rectMargin + delta / (2 * nWords);

         offset += half;
         var point = path.getPointAt(offset),
            normal = path.getNormalAt(offset).normalize(Path.options.hoverMargin / 1.5);

         hover.add(point.subtract(normal));
         hover.insert(0, point.add(normal));

         offset += half;

         box.cPoint = point;
         box.angle = normal.angle + 90;
         box.scale = delta >= 0 ? 1 : path.length / desiredLength;
         box.show();
      }

      hover.on(this.events);
      hover.fillColor = new paper.Color(0, 0);
      hover.add(pm.endTile.center);
      hover.closePath();
      this._trash.push(hover);

      if (confirmBtn) {
         pm.guiBoxes.pop();
      }

      if (!Path.options.debug) {
         path.remove();
      } else {
         hover.strokeColor = 'lightgreen';
         this._trash.push(path);
      }

      paper.view.draw();
   };

   DynamicPath.prototype._hideCircles = function () {
      for (var i = 0; i < this.pathModel.guiBoxes.length; i++) {
         if (this.pathModel.guiBoxes[i].isCircle)
            this.pathModel.guiBoxes[i].hideIfEmpty();
      }
   }
   DynamicPath.prototype._showCircles = function () {
      for (var i = 0; i < this.pathModel.guiBoxes.length; i++) {
         if (this.pathModel.guiBoxes[i].isCircle)
            this.pathModel.guiBoxes[i].showIfEmpty();
      }
   }

   return DynamicPath;
});