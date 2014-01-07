define(['durandal/app', 'durandal/system', 'api/datacontext', 'dialogs/_constants', './tutorial'], function (app, system, ctx, DIALOGS, tutorial) {

   ctx.canSwap = ko.observable(false);

   ctx.loading.subscribe(function (loading) {
      if (loading === true) {
         app.loading(false);
      } else if (loading === false) {
         app.palette.show();
      }
   });

   $(document).keydown(function (e) {
      if (location.hash.match(/game/gi)) {
         if (e.keyCode == 84) {
            //t
            tutorial.show();
         } else if (e.keyCode == 83) {
            //s
            showScroll();
         } else if (e.keyCode == 85) {
            //u  
            if (ctx.player.scored)
               showStars(ctx.player, ctx.lastPath);
            else {
               var p = ko.utils.arrayFirst(ctx.paths(), function (p) { return p.phrase.complete() });
               if (p) showStars(ctx.player, p);
            }
         }
      }
   });

   function showStars(player, path) {
      var playerEl, boxes;
      $('.player').each(function (i, el) {
         if (ko.dataFor(el) == player) {
            playerEl = $(el);
            return;
         }
      });

      boxes = ko.utils.arrayMap(path.guiBoxes, function (box) { return box._guiElem; });

      var x = playerEl.offset().left + 20, y = playerEl.offset().top,
         num = (ctx.player.scored || ctx.player.score());

      for (var i = 0; i < num; i++) {
         var star = $('<div/>', { 'class': 'star' });
         var scale = ((Math.random() * 5) + 3) / 10;
         var box = $(boxes[i % boxes.length]);
         var offset = box.offset();

         star.css({
            scale: scale,
            x: offset.left * (1 / scale),
            y: offset.top * (1 / scale),
            backgroundColor: '#' + Math.floor(Math.random() * 16777215).toString(16)
         });
         
         setTimeout(function (o) {
            $('#app').append(o[0]);

            setTimeout(function (o) {
               var mul = Math.random() * 1.3 + .4;

               o[0].css({
                  x: x * (mul / o[1]),
                  y: y * (mul / o[1]),
                  scale: o[1] / mul,
                  opacity: 0
               });
               var el = o[0][0];
               el.addEventListener($.support.transitionEnd, function () {
                  if (el.parentNode || el.parentElement) {
                     el.removeEventListener($.support.transitionEnd);
                     if (el.remove) {
                        el.remove();
                     } else {
                        if (el.parentElement) el.parentElement.removeChild(el);
                        else el.parentNode.removeChild(el);
                        console.log('second attempt');
                     }
                  }
               });
            }, 0, o);            
         }, Math.random() * 700, [star, scale]);
      }
   }

   function showScroll() {
      //if(app.el.scroll)      
      document.getElementById('app').classList.add('noScroll');
      setTimeout(function () {
         if (app.el.clientHeight / app.el.scrollHeight > .7) return;
         
         app.scrollDown(100, true);
         setTimeout(app.scrollUp, 800, true);
         setTimeout(function () {
            document.getElementById('app').classList.remove('noScroll');
         }, 1400);
      }, 800);
   }

   app.on("game:updated").then(function () {
      ctx.canSwap(ctx.player.active());

      if (ctx.player.scored)
         showStars(ctx.player, ctx.lastPath);
   });

   app.on("game:started").then(function () {
      ctx.canSwap(ctx.player.active() && !ctx.actionDone);
      if (!ctx.gameOver()) {
         showScroll();
      }
   });

   var cancel = function () {
      app.dialog.close("confirm");
      app.dialog.close("slipper");
      ctx.canSwap(true);
      ctx.mode('');

      var selectedWords = ctx.selectedWords();
      for (var i = 0; i < selectedWords.length; i++) {
         selectedWords[i].isSelected(false);
      }

      paper.tool.remove();
   }

   var isMenuActive = ko.computed(function () {
      return !ctx.gameOver();
   });

   var isPlayerActive = ko.computed(function () {
      return ctx.player.active();
   });

   var game = {
      loadingStatus: ctx.loadingStatus,
      loading: ctx.loading,
      player: ctx.player,

      allowSwap: ko.computed(function () {
         return isMenuActive() && isPlayerActive() && ctx.canSwap() && (ctx.mode() === '' || ctx.mode() === 'swapWords');
      }),
      allowResign: ko.computed(function () {
         return isMenuActive();
      }),
      allowCircle: ko.computed(function () {
         return isMenuActive() && isPlayerActive() && (ctx.mode() === '' || ctx.mode() == 'circleWords');
      }),

      mode: ctx.mode,

      swapWords: function () {
         if (ctx.mode() == 'swapWords') {
            cancel();
         }
         else if (game.allowSwap()) {
            app.dialog.show("slipper", DIALOGS.SWAP_WORDS);
            ctx.mode('swapWords');
            app.scrollDown();
            var created = false, base = game;
            base._wordsSub = ctx.selectedWords.subscribe(function (selectedWords) {
               if (selectedWords.length > 0 && !created) {
                  created = true;
                  app.dialog.show("confirm").then(function (res) {
                     base._wordsSub.dispose();

                     if (res == "cancel") {
                        cancel();
                     } else if (res == "done") {
                        app.dialog.close("slipper");
                        ctx.loadingStatus("Swapping words");
                        app.loading(true);

                        var data = {
                           username: ctx.player.username,
                           gameID: ctx.gameID,
                           words: ko.utils.arrayMap(ctx.selectedWords(), function (w) { return w.id })
                        };
                        app.trigger("server:game:swap-words", data, function (res) {
                           if (!res.success) {
                              cancel();
                           } else {
                              ctx.canSwap(false);
                           }
                           ctx.mode('');
                           app.loading(false);
                        });
                     }
                  });
               } else if (selectedWords.length <= 0 && created) {
                  created = false;
                  app.dialog.close("confirm");
               }
            });
         }
         else {
            //app.dialog.show("alert", { content: "You can only swap words once in each turn", delay: 3000 });
         }
      },

      resign: function () {
         if (ctx.gameOver()) {
            return;
         }

         var content = ctx.playerCount == 1 ? "Would you like to delete this game?" : "Are you sure you want to resign?";
         app.dialog.show("confirm", {
            content: content,
            modal: true,
            doneText: 'YES', cancelText: 'NO'
         }).then(function (res) {
            if (res != "cancel") {
               app.trigger("server:game:resign", {
                  username: ctx.player.username,
                  gameID: ctx.gameID,
               });
            }
         });
      },

      circleWords: function () {
         if (!game.allowCircle()) return;

         var module = {
            load: function () {
               app.dialog.show("slipper", DIALOGS.CIRCLE_WORDS);
               app.scrollDown();
               //$(window).resize();

               system.acquire("game/canvas/circleWords").then(function (m) {
                  m.load().then(function (words) {
                     app.scrollUp();
                     ctx.activeWords(words);
                     module.unload();
                  });
               });
               ctx.activeWords(null);
            },

            unload: function () {
               app.dialog.close("slipper");
               ctx.mode('');
               paper.tool.remove();
            }
         };

         if (ctx.mode() == 'circleWords') {
            module.unload();
         } else {
            ctx.mode('circleWords');
            module.load();
         }
      }
   };

   return system.extend(game, {
      noTransite: true,
      activate: function (id) {
         app.loading(true);

         app.trigger("game:dispose");
         app.palette.dispose();
         app.dialog.closeAll();

         app.palette.hide({ duration: 0 });
         app.palette.add("quit", "command", "right")
            .click(game.resign)
            .css({
               disabled: ko.computed(function () { return !game.allowResign() })
            });

         app.palette.add("swapWords", "action", "left")
            .click(game.swapWords)
            .css({
               cancel: ko.computed(function () { return game.mode() === 'swapWords' }),
               disabled: ko.computed(function () { return !game.allowSwap() })
            });

         app.palette.add("circleWords", "action", "left")
            .click(game.circleWords)
            .css({
               cancel: ko.computed(function () { return game.mode() === 'circleWords' }),
               disabled: ko.computed(function () { return !game.allowCircle() })
            });

         ctx.load(id);
      },

      binding: function () {
         return { cacheViews: false };
      },

      compositionComplete: function (view) {

      },

      detached: function () {
         ctx.unload();

         app.dialog.closeAll();

         var paths = ctx.paths();
         for (var i = 0; i < paths.length; i++) {
            paths[i].dispose();
         }
         ctx.paths.removeAll();
         ctx.tiles.removeAll();
         ctx.words.removeAll();

         app.palette.dispose();
      }
   });

});