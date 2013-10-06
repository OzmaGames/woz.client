﻿define(['durandal/app', 'api/datacontext', 'const/DIALOGS'], function (app, ctx, DIALOGS) {

  var swapTicket = ko.observable(0);

  ctx.loading.subscribe(function (loading) {
    if (loading === true) {
      app.loading(false);
    } else if (loading === false) {
      swapTicket(ctx.player.tickets.swap);
    }
  });

  ctx.player.active.subscribe(function (active) {
    if (active === true) {
      if (ctx.player.score == undefined || ctx.player.score() == 0) {
        app.woz.dialog.show("slipper", DIALOGS.YOUR_TURN_FIRST_ROUND);
      } else {
        app.woz.dialog.show("slipper", DIALOGS.YOUR_TURN);
      }

    } else {
      app.woz.dialog.show("slipper", DIALOGS.THEIR_TURN);
    }
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
    app.woz.dialog.close("confirm");
    app.woz.dialog.close("slipper");
    ctx.mode('');

    var selectedWords = ctx.selectedWords();
    for (var i = 0; i < selectedWords.length; i++) {
      selectedWords[i].isSelected(false);
    }

    ctx.player.tickets.swap++;
  }

  return {
    loadingStatus: ctx.loadingStatus,
    loading: ctx.loading,
    player: ctx.player,
    allowSwap: ko.computed(function () { return ctx.player.active() && swapTicket() > 0 }),

    activate: function () {
      app.loading(true);

      app.woz.dialog.show("loading");
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

    swap: function () {

      if (!ctx.player.active()) return;
      if (ctx.mode() == 'swap') {
        $('#swap-words').removeClass('cancel');
        cancel();
      }
      else if (ctx.player.tickets.swap-- > 0) {
        app.woz.dialog.show("slipper", DIALOGS.SWAP_WORDS);
        ctx.mode('swap');
        $("body").animate({ scrollTop: 1000 }, "slow");
        $('#swap-words').addClass('cancel');
        var created = false;
        var wordSub = ctx.selectedWords.subscribe(function (selectedWords) {
          if (selectedWords.length > 0 && !created) {
            created = true;
            app.woz.dialog.show("confirm").then(function (res) {
              $('#swap-words').removeClass('cancel');
              if (res == "cancel") {
                cancel();
              } else {
                var data = {
                  username: ctx.player.username,
                  gameID: ctx.gameID,
                  words: ko.utils.arrayMap(ctx.selectedWords(), function (w) { return w.id })
                };

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
            app.woz.dialog.close("confirm");
          }
        });
        subs.push(wordSub);
      }
      else {
        app.woz.dialog.show("alert", { content: "You can only swap words once in each turn", delay: 3000 });
      }

      swapTicket(ctx.player.tickets.swap);
    },


    resign: function () {
      app.trigger("server:game:resign", {
        username: ctx.player.username,
        gameID: ctx.gameID,
      });
    },

    detached: function () {

    }
  };
});