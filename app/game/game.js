define(['durandal/app', 'durandal/system', 'api/datacontext', 'dialogs/_constants'], function (app, system, ctx, DIALOGS) {

  ctx.canSwap = ko.observable(false);

  ctx.loading.subscribe(function (loading) {
    if (loading === true) {
      app.loading(false);
    }
  });

  app.on("game:updated").then(function () {
    ctx.canSwap(ctx.player.active());
  });

  app.on("game:started").then(function () {
     ctx.canSwap(ctx.player.active());
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
      else if (this.allowSwap()) {
        app.dialog.show("slipper", DIALOGS.SWAP_WORDS);
        ctx.mode('swapWords');
        app.scrollDown();
        var created = false, base = this;
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
                ctx.loading(true);

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
                  ctx.loading(false);
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

      app.dialog.show("confirm", {
        content: "Are you sure you want to resign?", modal: true,
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
      if (!this.allowCircle()) return;

      var module = {
        load: function () {
          app.dialog.show("slipper", DIALOGS.CIRCLE_WORDS);
          app.scrollDown();

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
    activate: function () {
      app.loading(true);

      ctx.load(ctx.playerCount);
    },

    binding: function () {
      return { cacheViews: false };
    },

    compositionComplete: function (view) {
      $('#menu').appendTo('body');
      var h = $(window).innerHeight();

      $('.palette:not(.fixed)').each(function (i, el) {
        var $el = $(el);
        $el.css('top', (h - $el.outerHeight() - 100) / 2);
      });
    },

    detached: function () {
      ctx.unload();

      app.dialog.close("all");

      var paths = ctx.paths();
      for (var i = 0; i < paths.length; i++) {
        paths[i].dispose();
      }
      ctx.paths.removeAll();
      ctx.tiles.removeAll();
      ctx.words.removeAll();
      
      $('#menu').remove();    
    }
  });

});