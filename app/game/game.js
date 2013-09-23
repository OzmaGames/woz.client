define(['api/datacontext', 'durandal/app', 'jquery'], function (ctx, app, $) {

  ctx.loading.subscribe(function (loading) {
    if (loading === true) {
      app.loading(false);
    }
  });

  return {
    loadingStatus: ctx.loadingStatus,
    loading: ctx.loading,

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

      $('#palette-right, #palette-left').each(function (i, el) {
        var $el = $(el);
        $el.css('top', (h - $el.outerHeight()) / 2);
      });

      if ($.support.touch)
        $('#workspace').touchPunch();
    },

    swap:function(){
      if (ctx.player.active()) {
        var data = {
          username: ctx.player.username,
          gameID: ctx.gameID,
          words: ko.utils.arrayMap(ctx.words().slice(1, 5), function (w) { return w.id })
        };
        
        app.trigger("server:game:swap-words", data);
      }
    },

    detached: function () {

    }
  };
});