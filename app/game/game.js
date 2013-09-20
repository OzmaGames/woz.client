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

      ctx.load(1);
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

    }
  };
});