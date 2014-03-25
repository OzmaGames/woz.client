define(['durandal/app', 'api/datacontext', './games'], function (app, ctx, Games) {

   var gamesDFD = $.Deferred();

   Games.compositionComplete = function () {      
      gamesDFD.resolve();
      console.log('resolved');
   }

   return {
      loading: ko.observable(true),

      module: ko.observable(),

      mode: ko.observable(),

      activeTab: 0,

      games: Games,

      navigate: function (tabIndex, dfd) {
         var base = this;
         base.loading(true);
         
         tabIndex *= 1;

         return dfd.then(function () {
            base.module(null);
            base.module(
               tabIndex === 0 ? 'home/lobby/games' :
               tabIndex === 1 ? 'home/lobby/notifications' :
                                'home/lobby/games');

            base.mode(tabIndex);

            switch (tabIndex) {
               case 0:
                  sessionStorage.setItem("lobby", 0);
                  gamesDFD = $.Deferred();
                  return Games.loadGames().then(function () {
                     base.loading(false);
                     return gamesDFD;
                  }).promise();                  
               case 1:
                  sessionStorage.setItem("lobby", 1);
                  return $.Deferred(function (dfd) {
                     base.loading(false);
                     setTimeout(function () { dfd.resolve(); }, 500)
                  }).promise();
               case 2:
                  sessionStorage.setItem("lobby", 2);
                  gamesDFD = $.Deferred();
                  return Games.loadArchive().then(function () {
                     base.loading(false);
                     return gamesDFD;
                  }).promise();
            }
         });                
      },

      activate: function () {
         app.trigger("game:dispose");
         app.dialog.closeAll();
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