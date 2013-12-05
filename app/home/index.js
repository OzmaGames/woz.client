define(['durandal/app', 'durandal/activator', 'api/datacontext', 'dialogs/templates/panel'],
  function (app, activator, ctx, panel) {

     var viewChanger = app.on('account:view:change').then(function (viewModel) {
        app.loading(true);
        app.dialog.show("panel", viewModel, {
           compositionComplete: function () {
              app.loading(false);
           }
        });
     });

     return {        
        activate: function () {
           app.commandMenuVisibility(false);           
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
           app.commandMenuVisibility(true);
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