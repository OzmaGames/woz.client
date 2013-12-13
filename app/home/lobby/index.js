define(['durandal/app', 'api/datacontext', './games'], function (app, ctx, Games) {

   return {
      loading: ko.observable(true),

      module: ko.observable(),

      games: Games,

      navigate: function (tabIndex, dfd) {
         var base = this;
         base.loading(true);

         dfd.then(function () {
            base.module(
               tabIndex === 0 ? 'home/lobby/games' :
               tabIndex === 1 ? 'home/lobby/notifications' :
                                'home/lobby/games');
         });

         switch (tabIndex) {
            case 0:
               return Games.loadGames().then(function () {
                  base.loading(false)
               });
               break;
            case 1:
               break;
            case 2:
               return Games.loadArchive().then(function () {
                  base.loading(false)
               });
               break;
         }

         return dfd;
      },

      activate: function () {
         app.dialog.close("all");
         app.palette.dispose();
      },

      start: function () {
         app.navigate("newGame");
      },

      binding: function () {
         return { cacheViews: false };
      }
   }
});