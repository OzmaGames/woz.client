define(['plugins/router', 'durandal/app', 'api/datacontext'], function (router, app, ctx) {

  var model = ko.observable('account/login');

  var viewChanger = app.on('account:view:change').then(function (viewModel) {
    model(viewModel);
  });

  var loginListener = app.on('account:login').then(function (login) {
    if (login.success) {
      model('');
    }
  });

  return {
    model: model,

    binding: function () {
      return { cacheViews: false };
    },

    detached: function (view) {
      viewChanger.off();
      loginListener.off();
    },

    playSolo: function () {
      ctx.playerCount = 1;
      router.navigate('game');
    },

    playMulti: function () {
      ctx.playerCount = 2;
      router.navigate('game')
    }
  }
});