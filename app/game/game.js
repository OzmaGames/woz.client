define(['durandal/app', 'durandal/system', 'api/datacontext', 'const/DIALOGS'], function (app, system, ctx, DIALOGS) {

  var swapTicket = ko.observable(0);

  ctx.loading.subscribe(function (loading) {
    if (loading === true) {
      app.loading(false);
    } else if (loading === false) {
      swapTicket(ctx.player.tickets.swap);
    }
  });

  app.on("game:updated").then(function () {
    swapTicket(1);
  });

  var subs = [];

  var clearSubs = function () {
    for (var i = 0; i < subs.length; i++) {
      if (subs[i]) subs[i].dispose();
    }
    subs = [];
  };

  var cancel = function () {
    clearSubs();
    app.dialog.close("confirm");
    app.dialog.close("slipper");
    swapTicket(1);
    ctx.mode('');

    var selectedWords = ctx.selectedWords();
    for (var i = 0; i < selectedWords.length; i++) {
      selectedWords[i].isSelected(false);
    }

    ctx.player.tickets.swap++;
    paper.tool.remove();
  }

  var hasSwapTicket = ko.computed(function () {
    return swapTicket() > 0;
  });

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
      return isMenuActive() && isPlayerActive() && hasSwapTicket() && (ctx.mode() === '' || ctx.mode() === 'swap');
    }),
    allowResign: ko.computed(function () {
      return isMenuActive();
    }),
    allowCircle: ko.computed(function () {
      return isMenuActive() && isPlayerActive() && (ctx.mode() === '' || ctx.mode() == 'circle-words');
    }),

    mode: ctx.mode,

    swap: function () {
      if (!ctx.player.active() || (ctx.mode() !== '' && ctx.mode() !== 'swap')) return;
      if (ctx.mode() == 'swap') {
        $('#swap-words').removeClass('cancel');
        cancel();
      }
      else if (ctx.player.tickets.swap-- > 0) {
        app.dialog.show("slipper", DIALOGS.SWAP_WORDS);
        ctx.mode('swap');
        $("body").animate({ scrollTop: 1000 }, "slow");
        $('#swap-words').addClass('cancel');
        var created = false;
        var wordSub = ctx.selectedWords.subscribe(function (selectedWords) {
          if (selectedWords.length > 0 && !created) {
            created = true;
            app.dialog.show("confirm").then(function (res) {
              $('#swap-words').removeClass('cancel');
              if (res == "cancel") {
                $('#swap-words').removeClass('cancel');
                ctx.player.tickets.swap = 1;
                cancel();
              } else {
                var data = {
                  username: ctx.player.username,
                  gameID: ctx.gameID,
                  words: ko.utils.arrayMap(ctx.selectedWords(), function (w) { return w.id })
                };

                app.dialog.close("slipper");
                ctx.loadingStatus("Swapping words");
                ctx.loading(true);
                app.trigger("slipper:close");
                app.trigger("server:game:swap-words", data, function (res) {
                  if (!res.success) {
                    ctx.player.tickets.swap++;
                    swapTicket(ctx.player.tickets.swap);
                  } else {
                    ctx.mode('');
                    ctx.loading(false);
                  }
                });
              }
              wordSub.dispose();
            });
          } else if (selectedWords.length <= 0 && created) {
            created = false;
            app.dialog.close("confirm");
          }
        });
        subs.push(wordSub);
      }
      else {
        app.dialog.show("alert", { content: "You can only swap words once in each turn", delay: 3000 });
      }

      swapTicket(ctx.player.tickets.swap);
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

    circle: function () {
      if (!this.allowCircle()) return;

      var module = {
        load: function () {
          app.dialog.show("slipper", DIALOGS.CIRCLE_WORDS);
          app.scrollDown();
          
          system.acquire("game/canvas/circle-words").then(function (m) {
            this.circleWords = m;
            this.circleWords.load().then(function (words) {
              app.scrollUp();
              ctx.activeWords(words);
              module.unload();
            });
          });
          ctx.activeWords(null);
        },

        unload: function () {
          app.dialog.close("slipper");
          if (this.circleWords) {
            this.circleWords.unload();
            delete this.circleWords;
          }
          ctx.mode('');
        }
      };
      if (ctx.mode() == 'circle-words') {
        paper.tool.remove();
        module.unload();
      } else {
        ctx.mode('circle-words');
        module.load();
      }
    }
  };

  return system.extend(game, {
    activate: function () {
      app.loading(true);

      app.dialog.show("loading");
      ctx.load(ctx.playerCount);
    },

    binding: function () {
      return { cacheViews: false };
    },

    compositionComplete: function (view) {
      $('#menu').appendTo('body');
      var h = $(window).innerHeight();

      $('#palette-right, #palette-left').each(function (i, el) {
        var $el = $(el);
        $el.css('top', (h - $el.outerHeight()) / 2);
      });

      if ($.support.touch)
        $('#workspace').touchPunch();
    },

    detached: function () {      
      $('#menu').remove();
      app.dialog.close("slipper");
      app.dialog.close("slipper-fixed");
      app.dialog.close("window");
      app.dialog.close("notice");
      app.dialog.close("menu");
    }
  });
 
});