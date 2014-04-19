define(['durandal/app', 'api/datacontext','./games'], function (app, ctx, parser) {
   
   var gamesDFD = $.Deferred();   
   
   return {
      loading: ko.observable(true),
      loadingData: ctx.lobby.loading,
      unseens: ctx.lobby.unseens,

      mode: ko.observable(),

      activeTab: 0,

      compose: ko.observable({
         model: parser,
         view: '',
         cacheViews: false,
         //preserveContext: true
      }),

      navigate: function (tabIndex, dfd) {
         var base = this;
         base.loading(true);

         tabIndex *= 1;

         return dfd.then(function () {

            if (tabIndex == 0) {
               parser.loadOnGoing();
            } else if (tabIndex == 1) {
               parser.loadNotification();
               ctx.lobby.seenAll();               
            } else if (tabIndex == 2) {
               parser.loadArchive();
            }

            base.compose().view =
               tabIndex === 0 ? 'home/lobby/games' :
               tabIndex === 1 ? 'home/lobby/notifications' :
                                'home/lobby/games';

            base.compose.valueHasMutated();

            base.mode(tabIndex);

            sessionStorage.setItem("lobby", tabIndex);
            
            base.loading(false);

            var nDfd = $.Deferred();
            setTimeout(function () {
               nDfd.resolve();
            }, 100);
            return nDfd;
         });
      },

      repository: ko.observableArray(),

      activate: function () {
         app.trigger("game:dispose");
         app.dialog.closeAll();
         app.palette.dispose();

         if (!sessionStorage.getItem("lobby")) {
            sessionStorage.setItem("lobby", 0);
         } else {
            this.activeTab = sessionStorage.getItem("lobby");
         }
         var base = this;

         app.trigger( "user:authenticated", { username: ctx.username, online: 1 } );
      },

      start: function () {
         app.navigate("newGame");
      },

      binding: function () {
         return { cacheViews: false };
      }
   }
});