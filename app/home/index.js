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
        },

        binding: function () {
           return { cacheViews: false };
        },

        compositionComplete: function () {
           app.trigger("account:view:change", "account/login");
        },

        detached: function (view) {
           viewChanger.off();
           app.dialog.close("panel");
           palette.get("menu").visible(true);
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