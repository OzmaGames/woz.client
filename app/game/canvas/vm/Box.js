define(['durandal/app', 'api/datacontext', 'paper'], function (app, ctx) {

   var scope = paper;
   var transparent = new scope.Color(0, 0);
   var default_cPoint = new scope.Point(-100, -100);

   function Box(index, pathModel, cPoint, angle) {
      var base = this;

      base.index = index;
      base.active = false;
      base.cPoint = cPoint || default_cPoint;
      base.angle = angle || 0;
      base.prevAngle = 0;
      base.scale = 1;
      base.prevScale = 1;

      base.isCircle = false;
      base.isButton = false;

      base._guiRect = null;
      base._guiElem = null;

      base.pathModel = base.wordModel = base.hasData = null;

      this.updateModel(pathModel);
   }

   Box.prototype.button = function (pm) {
      this.hasData = true;
      this.isButton = true;
      this.isCircle = false;
      this.pathModel = pm;
   }

   Box.prototype.hideIfEmpty = function () {
      if (!this.hasData && this._guiRect) {
         this._guiRect.hide();
      }
   }

   Box.prototype.showIfEmpty = function () {
      if (!this.hasData && this._guiRect) {
         this._guiRect.show();
      }
   }

   Box.prototype.updateModel = function (pathModel) {
      if (pathModel === undefined || pathModel == null) return;

      this.pathModel = pathModel;
      this.wordModel = pathModel.getWordAt(this.index);
      this.hasData = this.wordModel != null;
      this.isCircle = pathModel.nWords == 0;


      if (this.hasData) {
         if (!this.pathModel.canvas.cPoint) {
            return;
         }

         var box = this.wordModel.lastBox;
         if (box && box != this) {
            box.pathModel.removeWordAt(box.index, { keepUnplayed: true });
         }
         this.wordModel.lastBox = this;

         this.show();
      }
   }

   Box.prototype.show = function () {
      if (this.hasData) {
         this.active = false;
         if (this._guiRect != null) { this._guiRect.remove(); this._guiRect = null; }
         if (this.isButton) {
            if (this._guiElem == null) this.createBtn(); else this.updateBtn();
         } else {
            this.prevAngle = 0;
            if (this._guiElem == null) this.createElem(); else this.updateElem();
         }
      } else {
         if (this._guiElem != null) { this._guiElem.remove(); this._guiElem = null; }
         if (this._guiRect == null) this.createRect(); else this.updateRect();
      }
   };

   Box.prototype.width = function () {
      if (this.hasData) {
         if (!this._guiElem) {
            return 62;
         }
         return this._guiElem.outerWidth();
      }
      if (this.isCircle) return Box.options.circle.radius;

      return 62;
   };

   Box.prototype.enter = function (word) {
      if (!this.hasData && word != null) {
         this.wordModel = word;

         this.active = true;
         clearInterval(this._hoverHandler);
         this._hoverHandler = setTimeout(function (base) {
            if (base._guiRect) base._guiRect.addClass("hover");
            //if (!base.isCircle) base._guiRect.children(".box").text(word.lemma);
         }, 1, this);

         return this;
      }
      return null;
   };

   Box.prototype.leave = function () {
      if (!this.hasData && this.active) {
         this.active = false;
         clearInterval(this._hoverHandler);
         this._hoverHandler = setTimeout(function (base) {
            base._guiRect.removeClass("hover");
            if (!base.isCircle) base._guiRect.children(".box").text("");
         }, 1, this);
      }
   };

   Box.prototype.drop = function () {
      if (this.active && !this.hasData && this.wordModel != null) {
         if (!this.pathModel.addWord(this.wordModel, this.index)) {
            app.dialog.show('alert', { content: "It's not your turn!" });
         }
      }
   };

   Box.prototype.put = function (data) {
      /// <param name='data' value='{obsWords: ko.observableArray(), obsWord: ko.observable()}'/>
      if (!this.hasData && data.obsWords() != null) {
         var nWord = this.pathModel.nWords;
         var activeWords = data.obsWords();
         if (activeWords.length == nWord) {
            for (var i = 0; i < activeWords.length; i++) {
               this.pathModel.addWord(activeWords[i], i + 1);
            }
         }
      }
   };

   Box.prototype.updateBtn = function () {
      var values = {
         x: this.cPoint.x - Box.pathOptions.container.left - this._guiElem.outerWidth() / 2,
         y: this.cPoint.y - Box.pathOptions.container.top - this._guiElem.outerHeight() / 2
      },
        btn = this._guiElem.find('.button');

      this.scale *= .5;

      var el = this._guiElem;
      el.css(values);
      btn.transition({
         scale: this.scale,
         rotate: this.angle
      }, 500, 'ease').promise().then(function () { el.addClass("ready"); });
   }

   Box.prototype.createBtn = function () {
      var div = $('<div/>', { 'class': 'confirm-box' }), base = this;
      var cw = this.pathModel.cw ? ' cw' : '';

      div.append(
        $('<div/>', { 'class': 'button', title: 'Done!' }).append(
          $('<div/>', { 'class': 'tooltip' + cw, text: 'Click me when you are done!' }).delay(4000).fadeOut(1000)));

      div.css({
         x: this.pathModel.canvas.cPoint.x - Box.pathOptions.container.left,
         y: this.pathModel.canvas.cPoint.y - Box.pathOptions.container.top
      });
      div.appendTo('#tiles');

      div.find('.button').one("click", this, function (e) {
         Box.options.animate = true;
         base.pathModel.phrase._complete(true);
         base.pathModel.phrase.words.valueHasMutated();
         Box.options.animate = false;
      }).transition({
         rotateY: '360deg'
      }, 500, 'ease');

      this.width = function () { return div.outerWidth() / 2; }

      if (this._guiElem != null) this._guiElem.remove();
      this._guiElem = div;

      this.updateBtn();
   }

   Box.prototype.updateElem = function () {
      if (this.pathModel.phrase.complete()) {
         this._guiElem.find('.magnet').addClass("placed");
         this._guiElem.off('click');
      }

      //this._guiElem.find('.magnet').text(this.wordModel.lemma);

      var values = {
         x: this.cPoint.x - Box.pathOptions.container.left - this._guiElem.outerWidth() / 2,
         y: this.cPoint.y - Box.pathOptions.container.top - this._guiElem.outerHeight() / 2,
         rotate: this.angle + 'deg'
      };

      values.scale = this.scale * .8;
      this._guiElem.stop();
      this._guiElem.transition(values, 500, 'ease');
   }

   Box.prototype.createElem = function () {
      var div = $('<div/>', { 'class': 'magnet-placeholder elem' }), magnet;

      if (this.pathModel.phrase.complete() || !this.wordModel.$el) {
         magnet = $('<div/>', { 'class': 'magnet', text: this.wordModel.lemma });
         if (this.wordModel.isRelated) magnet.addClass("related");
         //div.one("click", this, function (e) {
         //   if (e.data.pathModel.phrase.complete()) return;
         //   e.data.pathModel.removeWordAt(e.data.index);
         //});
      } else {
         //dragged from words
         magnet = this.wordModel.$el.clone();
         magnet.css({
            left: 0,
            top: 0
         });

         var word = this.wordModel, pm = this.pathModel, index = this.index, base = this;

         div.data("immovable", function () { return pm.phrase.complete() });
         div.draggable({
            usePercentage: false,
            centerBased: false,
            withinEl: $('#app'),
            dragStart: function (e, within) {
               if (pm.phrase.complete()) return;
               ctx.activeWord(word);

               word.tX = div.css("x");
               word.tY = div.css("y");

               div.css({
                  rotate: 0, scale: 1,
                  x: 0, y: 0,
                  left: word.tX,
                  top: word.tY,
               });
               
               var lefty = $('#tiles').offset().left, topy = $('#tiles').offset().top;
               within.l -= lefty;
               within.r -= lefty;
               within.t -= topy;
               within.b -= topy;
            },

            dropped: function (e, data) {
               if (pm.phrase.complete()) return;
               ctx.activeWord(null);


               if (!data.hasMoved) {
                  delete word.lastBox;
                  pm.removeWordAt(index);
               } else {
                  var workspace = $('#workspace').offset();

                  data.top -= data.within.t + data.scrollTopChange;
                  data.left -= data.within.l;
                  console.log(data.top, data.left, workspace.top, data.within);

                  if (workspace.top < data.top + 20) {                     
                     var workspaceWidth = $('#workspace').innerWidth(),
                        workspaceHeight = $('#workspace').innerHeight();
                     
                     word.originalY = ((data.top - workspace.top) / workspaceHeight).toFixed(4) * 1;
                     word.originalX = ((data.left - workspace.left) / workspaceWidth).toFixed(4) * 1;

                     if (word.originalX < 0) word.originalX = 0;
                     if (word.originalY < 0) word.originalY = 0;

                     app.trigger("server:game:move-word", {
                        username: ctx.username,
                        gameID: ctx.gameID,
                        word: {
                           id: word.id,
                           x: word.originalX,
                           y: word.originalY
                        }
                     });
                     
                     delete word.lastBox;
                     pm.removeWordAt(index);
                  } else {
                     div.css({
                        rotate: base.angle, scale: .8,
                        left: 0, top: 0,
                        x: word.tX,
                        y: word.tY,
                     });
                  }
                  //word.x = (data.hasMoved ? data.left / 100 : word.x).toFixed(4) * 1;
                  //word.y = (data.hasMoved ? data.top / 100 : word.y).toFixed(4) * 1;
               }
            }
         });
      }

      div.css({
         x: this.pathModel.canvas.cPoint.x - Box.pathOptions.container.left,
         y: this.pathModel.canvas.cPoint.y - Box.pathOptions.container.top,         
         scale: .8
      });
      div.appendTo('#tiles');
      magnet.appendTo(div);

      if (this._guiElem != null) this._guiElem.remove();
      this._guiElem = div;

      this.updateElem();
   };

   Box.prototype.updateRect = function () {
      this._guiRect.css({
         x: this.cPoint.x - Box.pathOptions.container.left - this._guiRect.outerWidth() / 2,
         y: this.cPoint.y - Box.pathOptions.container.top - this._guiRect.outerHeight() / 2,
         rotate: this.angle,
         scale: this.scale
      });
   };

   Box.prototype.createRect = function () {
      var div = $('<div/>', { 'class': 'magnet-placeholder' }),
        cls = this.isCircle ? "circle" : "box";

      div.append($('<div/>', { 'class': cls }));

      div.css({
         x: this.pathModel.canvas.cPoint.x - Box.pathOptions.container.left,
         y: this.pathModel.canvas.cPoint.y - Box.pathOptions.container.top,
         zIndex: 0
      });
      div.appendTo('#tiles');

      this._guiRect = div;

      this.updateRect();
   };

   Box.prototype._clear = function () {
      if (this._guiRect) this._guiRect.remove();
      if (this._guiElem) this._guiElem.remove();

      this._guiElem = null;
      this._guiRect = null;
   };

   Box.prototype.remove = function () {
      this._clear();
   };

   Box.options = {
      animate: false,   //should be off for resizing and placing words
      rect: {
         style: {
            strokeColor: '#CBB28F',
            strokeWidth: 1,
            fillColor: transparent,
            shadowColor: transparent
         },
         activeStyle: {
            strokeWidth: 2,
            shadowColor: '#CBB28F',
            shadowBlur: 5,
            shadowOffset: new scope.Point(0, 0)
         },
         size: new scope.Point(30, 15)
      },
      circle: {
         radius: 8,
         margin: 16,
         width: 23,
         style: {
            fillColor: '#CBB28F',
            shadowBlur: 0,
            strokeWidth: 0
         },
         activeStyle: {
            strokeWidth: 2,
            strokeColor: '#CBB28F',
            shadowBlur: 20,
            shadowColor: '#CBB28F',
            shadowOffset: new scope.Point(0, 0)
         }
      },
      textStyle: {
         fillColor: 'grey',
         justification: 'center',
         fontSize: 14,
         font: 'CopseRegular'
      }
   };

   return Box;

});