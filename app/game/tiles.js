define(['durandal/app', 'api/datacontext', 'api/draggable'], function (app, ctx) {

   var instructionDoms = [], topPadding = 15;
   var RADIUS = 90;
   var containerSize = { w: 0, h: 0 };

   function attachInstruction($el, top) {
      var elTop = $el.data('topOffset');
      if (elTop - top > -topPadding) {
         $el.css({ position: '', left: $el.data('left'), top: $el.data('top'), marginLeft: $el.data('marginLeft'), marginTop: $el.data('marginTop') })
         .appendTo($el.data('parent')).removeClass("fixed")
              .data('topOffset', undefined);
      }
   }

   function floatInstruction($el, top) {
      var elTop = $el.offset().top;
      if (elTop < 0) {
         $el.data({
            parent: $el.parent(),
            topOffset: top + elTop - topPadding,
            top: $el.css('top'),
            left: $el.css('left'),
            marginLeft: $el.css('marginLeft'),
            marginTop: $el.css('marginTop')
         }).css({ position: "fixed", left: $el.offset().left, top: topPadding, marginLeft: 0, marginTop: 0 })
        .addClass("fixed")
        .appendTo('body');
      }
   }

   function scroll() {
      var top = $('#app').scrollTop();

      for (var i = 0; i < instructionDoms.length; i++) {
         if (instructionDoms[i].$el.hasClass("active")) continue;
         var $el = instructionDoms[i].$inst;

         if ($el.css('opacity') == '0') continue;
         if ($el.hasClass('fixed')) {
            attachInstruction($el, top);
         } else {
            floatInstruction($el, top);
         }
      }
   }

   function resize() {
      updateContainerSize();
      
      var tiles = ctx.tiles();
      for (var i = 0; i < tiles.length; i++) {
         if (!tiles[i].active()) reposTile(tiles[i]);
      }
   }
   function updateContainerSize() {
      containerSize.w = $('#tiles').innerWidth();
      containerSize.h = $('#tiles').innerHeight();
   }

   function reposTile(tile, centered) {
      if (centered) {
         tile.$el.css({
            x: 0,
            y: 0
         });
      } else {
         tile.$el.css({
            x: tile.x * containerSize.w - containerSize.w / 2,
            y: tile.y * containerSize.h - containerSize.h / 2
         });
      }
   }

   function UpdateTileInstruction(tile) {
      var angle = tile.angle;

      tile.ruleOffset.x = Math.sin(angle * (Math.PI / 180)) * RADIUS + 10;
      tile.ruleOffset.y = Math.cos(angle * (Math.PI / 180)) * RADIUS + 20;

      var diff = {
         rotate: (angle > 90 || angle < -90) ? angle + 180 : angle,
         x: tile.ruleOffset.x,
         y: RADIUS - tile.ruleOffset.y
      };

      tile.$inst.css(diff);
   }

   var resizeHelperID = null;
   var resizeDelay = 100;

   $(window).resize(function () {
      clearTimeout(resizeHelperID);
      resizeHelperID = setTimeout(resize, resizeDelay);
   });

   return {
      tiles: ctx.tiles,
      gameOver: ctx.gameOver,
      collection: ctx.collection,
      carryingWords: ko.computed(function () {
         return ctx.activeWords() || ctx.activeWord();
      }),

      disabled: ko.computed(function () {
         var mode = ctx.mode();
         return mode == 'swapWords' || mode == 'circleWords';
      }),

      activate: function () {
         $('#app').bind("scroll", scroll);
      },

      binding: function () {
         return { cacheViews: false };
      },

      compositionComplete: function (view, parent) {         
         resize();
      },

      toggleTile: function (tile) {
         var active = this.active();
         if (!active) {
            tile.$el.css({ 'font-size': containerSize.h });
            //tile.$el.find('.mask').css({ scale: 3 });
            if (tile.$inst.hasClass('fixed')) {
               attachInstruction(tile.$inst, 0);
            }
            reposTile(tile, true);            
            app.scrollUp();
         } else {
            tile.$el.css({ 'font-size': '' });
            //tile.$el.find('.mask').css({ scale: 1 });
            setTimeout(scroll, 500);
            reposTile(tile);            
         }
         tile.active(!active);
      },

      help: function (tile, e) {
         var offset = tile.$inst.offset(),
           left = offset.left,
           top = offset.top + 200 - $('#app').scrollTop();

         if (tile.$inst.hasClass("fixed")) {
            top -= 120;
         }
         top = 150;

         app.dialog.show("window", {
            heading: tile.instruction,
            content: tile.description,
            left: left, top: top
         });
      },

      afterRender: function (el, tile) {
         var $el = $(el).filter('.tile:first');

         tile.$el = $el;
         tile.$inst = $el.find('.instruction');
         tile.ruleOffset = { x: 0, y: 0 };
         
         reposTile(tile);
         UpdateTileInstruction(tile);
         instructionDoms.push(tile);
      },

      detached: function () {
         $('#app').unbind("scroll", scroll);
         for (var i = 0; i < instructionDoms.length; i++) {
            var $el = instructionDoms[i].$inst;
            if ($el.hasClass("fixed")) {
               ko.removeNode($el[0]);
            }
         }
         animationQueue.splice(0, animationQueue.length);
         instructionDoms.splice(0, instructionDoms.length);
      }
   };
});