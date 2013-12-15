define(['durandal/app', 'api/datacontext', './games'], function (app, ctx, Games) {

   return {
      loading: ko.observable(true),

      module: ko.observable(),

      activeTab: 0,

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
               sessionStorage.setItem("lobby", 0);
               return Games.loadGames().then(function () {
                  base.loading(false)
               });
               break;
            case 1:
               sessionStorage.setItem("lobby", 1);
               break;
            case 2:
               sessionStorage.setItem("lobby", 2);
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

         if (!sessionStorage.getItem("lobby")) {
            sessionStorage.setItem("lobby", 0);
         } else {
            this.activeTab = sessionStorage.getItem("lobby");
         }
      },

      start: function () {
         app.navigate("newGame");
      },

      binding: function () {
         return { cacheViews: false };
      }
   }
});