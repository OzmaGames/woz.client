define(['durandal/app', 'durandal/activator', 'palette', 'api/datacontext', 'dialogs/templates/panel'],
  function (app, activator, palette, ctx, panel) {

     var viewChanger = app.on('account:view:change').then(function (viewModel) {
        app.loading(true);
        app.dialog.show("panel", viewModel, {
           compositionComplete: function () {
              $('input[autofocus]').focus();
              app.loading(false);
           }
        });
     });

     return {
        activate: function () {
           palette.get("menu").visible(false);
           palette.get("currency").visible(false);

           var base = this;
           //this.sub = app.on("app:resized:hook").then(function () {
           //   if (app.el.clientHeight < 2 * document.getElementById('bKey').clientHeight) {
           //      document.getElementById('fKey').classList.remove("footer");
           //   } else {
           //      document.getElementById('fKey').classList.add("footer");
           //   }
           //});
        },

        binding: function () {
           return { cacheViews: false };
        },

        compositionComplete: function () {
           app.trigger("account:view:change", "account/login");           
        },

        detached: function (view) {
           //this.sub.off();
           viewChanger.off();
           app.dialog.close("panel");
           palette.get("menu").visible(true);
           palette.get("currency").visible(true);
        },

        playSolo: function () {
           ctx.playerCount = 1;
           router.navigate('game');
        },

        playMulti: function () {
           ctx.playerCount = 2;
           router.navigate('game');
        }
     }
  });