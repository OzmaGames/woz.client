define(['durandal/app', 'api/datacontext', 'api/draggable'], function (app, ctx) {

   var instructionDoms = [], topPadding = 15;

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
        .appendTo('#app');
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

   var animationQueue = [];
   var RADIUS = 85;

   function showTiles() {
      for (var i = 0; i < animationQueue.length; i++) {
         var $el = animationQueue[i].$el;
         var tile = animationQueue[i].tile;
         $el.css({
            left: tile.x * 100 + '%',
            top: tile.y * 100 + '%'
         });

         tile.ruleOffset = { x: 0, y: 0 };

         UpdateTileInstruction(tile, true);
      }
      animationQueue = [];
   }

   function UpdateTileInstruction(tile, animate) {
      var angle = tile.angle;

      tile.ruleOffset.x = Math.sin(angle * (Math.PI / 180)) * RADIUS + 10;
      tile.ruleOffset.y = Math.cos(angle * (Math.PI / 180)) * RADIUS + 5;

      var diff = {
         rotate: (angle > 90 || angle < -90) ? angle + 180 : angle,
         marginLeft: tile.ruleOffset.x,
         marginTop: RADIUS - tile.ruleOffset.y
      };

      if (animate)
         tile.$inst.stop().transition(diff, 1000);
      else
         tile.$inst.stop().css(diff);

   }

   return {
      tiles: ctx.tiles,
      gameOver: ctx.gameOver,
      collection: ctx.collection,
      carryingWords: ko.computed(function () {
         words = ctx.activeWords();
         word = ctx.activeWord();
         return words || word;
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

      },

      toggleTile: function (tile) {
         var active = this.active();
         if (!active) {
            var h = $('#tiles').height();
            tile.$el.css({ 'font-size': h });
            if (tile.$inst.hasClass('fixed')) {
               attachInstruction(tile.$inst, 0);
            }
            app.scrollUp();
         } else {
            tile.$el.css({ 'font-size': '' });
            setTimeout(scroll, 500);
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
         instructionDoms.push(tile);

         if (animationQueue.length == 0) setTimeout(showTiles, 100);
         animationQueue.push({ $el: $el, tile: tile });
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