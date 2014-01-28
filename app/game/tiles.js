define(['durandal/app', 'api/datacontext', 'api/draggable'], function (app, ctx) {

   var instructionDoms = [], topPadding = 15;
   var RADIUS = 75;
   var containerSize = { w: 0, h: 0, ww: 0, hh: 0 };

   var dynamicCloud = false;

   app.on("game:rule:toggle").then(function () {      
      if (dynamicCloud) {
         for (var i = 0; i < instructionDoms.length; i++) {
            attachInstruction(instructionDoms[i], 0);
         }
      }
      dynamicCloud = !dynamicCloud;
   });

   function attachInstruction(tile, top) {
      if (!dynamicCloud) return;

      var $el = tile.$inst, elTop = tile.topOffset;
      if (elTop - top > 0) {
         $el.appendTo(tile.$parent)
            .removeClass("fixed").css({ left: 0, top: 0 });
         delete tile.isFixed;
      }
   }

   function floatInstruction(tile, scrollTop) {
      if (!dynamicCloud) return;

      var $el = tile.$inst, $cloud = $el.find('.rule');
      elTop = $cloud.offset().top;

      if (elTop <= 0) {
         var top = 0, left = $cloud.offset().left;
         
         tile.topOffset = scrollTop + elTop;
         tile.$parent = $el.parent();
         tile.isFixed = true;

         $el.offset({
            left: left,
            top: top
         }).addClass("fixed").appendTo('body');

         $el.offset({ left: left, top: top });
      }
   }   

   function scroll() {
      if (!dynamicCloud) return;

      var top = document.getElementById('app').scrollTop;      

      for (var i = 0; i < instructionDoms.length; i++) {
         if (instructionDoms[i].active()) continue;         

         var $el = instructionDoms[i].$inst;

         if (instructionDoms[i].isFixed) {
            attachInstruction(instructionDoms[i], top);
         } else {
            floatInstruction(instructionDoms[i], top);
         }
      }
   }

   function resize() {        
      updateContainerSize();

      var tiles = ctx.tiles();
      for (var i = 0; i < tiles.length; i++) {
         if (!tiles[i].active()) {
            reposTile(tiles[i]);
            scaleTile(tiles[i], false);
         }
      }
   }
   function updateContainerSize() {
      containerSize.w = $('#tiles').innerWidth();
      containerSize.h = $('#tiles').innerHeight();
      containerSize.ww = $('#tiles-max').innerWidth();
      containerSize.hh = $('#tiles-max').innerHeight();

      if (app.el.clientWidth < 900) {
         containerSize.hh += 100;
      }
   }

   function scaleTile(tile, animateScale) {      
      if (containerSize.h == 0) return;

      if (!animateScale) {
         tile.$mask.addClass('noTransition');
      }

      tile.origin = tile.origin || { scale: 1, h: tile.$mask.outerHeight() };

      if (!tile.active()) {
         tile.origin.scale = tile.origin.h / containerSize.hh;

         tile.$mask.css({
            scale: tile.origin.scale,            
            fontSize: 1 / tile.origin.scale + 'em'
         });
      } else {
         tile.origin.scale = tile.origin.h / containerSize.hh;

         tile.$mask.css({
            fontSize: 1 / tile.origin.scale + 'em'
         });
      }

      if (!animateScale) {
         setTimeout(function () { tile.$mask.removeClass('noTransition'); }, 1);
      }
   }

   function reposTile(tile, centered) {
      
      if (containerSize.h == 0) return;

      if (centered) {
         tile.$el.css({ transform: '' });
      } else {         
         tile.$el.css({
            x: tile.x * containerSize.w - containerSize.w / 2,
            y: tile.y * containerSize.h - containerSize.h / 2
         });
      }
   }

   function UpdateTileInstruction(tile) {
      var angle = tile.angle;

      tile.$inst.css({ rotate: angle });
      if (angle > 90 || angle < -90) {
         tile.$inst.find('.rule').css({ rotate: 180 });
      }

      return;

      tile.ruleOffset.x = Math.sin(angle * (Math.PI / 180)) * RADIUS;
      tile.ruleOffset.y = Math.cos(angle * (Math.PI / 180)) * RADIUS;

      var diff = {
         rotate: (angle > 90 || angle < -90) ? angle + 180 : angle,
         x: tile.ruleOffset.x,
         y: tile.ruleOffset.y - RADIUS
      };

      tile.$inst.css(diff);
   }
   
   app.on("app:resized").then(resize)
   
   function dispose() {
      $('#app').unbind("scroll", scroll);
      for (var i = 0; i < instructionDoms.length; i++) {
         var $el = instructionDoms[i].$inst;
         if (instructionDoms[i].isFixed) {            
            ko.removeNode($el[0]);
         }
      }
      instructionDoms.splice(0, instructionDoms.length);
   }

   app.on("game:dispose").then(dispose);

   var forceVisible = ko.observable(true);
   app.on("game:started").then(function () {
      if (ctx.gameOver() && ctx.resumedGame) {
         forceVisible(false);
      }
   });

   app.on("game:tiles:visible", function (visible) {
      forceVisible(visible);
   });

   return {
      loading: ctx.loading,
      tiles: ctx.tiles,
      gameOver: ctx.gameOver,
      forceVisible: forceVisible,
      collection: ctx.collection,
      carryingWords: ko.computed(function () {
         return ctx.activeWords() || ctx.activeWord();
      }),

      disabled: ko.computed(function () {
         var mode = ctx.mode();
         return mode == 'swapWords' || mode == 'circleWords';
      }),

      activate: function () {
         $('#app, body').bind("scroll", scroll);
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
            //tile.$el.animate({ 'font-size': containerSize.h });            
            if (tile.isFixed) {
               attachInstruction(tile, 0);
            }
            reposTile(tile, true);
            tile.$mask.css({ scale: 1 });

            app.scrollUp();
         } else {
            //tile.$el.animate({ 'font-size': '' });
            setTimeout(scroll, 500);
            reposTile(tile, false);
            tile.$mask.css({ scale: tile.origin.scale });
         }

         tile.active(!active);
      },

      help: function (tile, e) {
         if (tile.active()) {
            e.stopPropagation = false;
            return true;
         }
         var offset = tile.$inst.offset(),
           left = offset.left,
           top = offset.top + 200 - $('#app').scrollTop();

         if (tile.isFixed) {
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
         tile.$inst = $el.find('.cloud');
         tile.$mask = $el.find('.mask');
         tile.ruleOffset = { x: 0, y: 0 };

         $el.hide();
         scaleTile(tile, false);
         $el.show();

         setTimeout(function () {
            UpdateTileInstruction(tile);
            reposTile(tile);
            instructionDoms.push(tile);
         }, 1)         
      },

      detached: dispose
   };

   
});