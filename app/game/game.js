define(['api/datacontext', 'durandal/app', 'jquery'], function (ctx, app, $) {

  ctx.loading.subscribe(function (loading) {
    if (loading === true) {
      app.loading(false);
    }
  });

  return {
    activate: function () {
      app.loading(true);

      ctx.load(1);
    },

    binding: function () {
      return { cacheViews: false };
    },

    compositionComplete: function (view) {
      $('#menu').appendTo('body');
    },

    detached: function () {

    }
  };
});