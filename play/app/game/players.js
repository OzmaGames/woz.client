define(['durandal/app','api/datacontext'], function (app, ctx) {
   return {
      showProfile: function (player) {
         app.dialog.showProfile(player.username);
      },
      players: ko.computed( function () {
         var players = ctx.players();
         if ( players.length <= 1 ) return players;
         if ( players[1].username == ctx.username ) return players;
         return [players[1], players[0]];
      } ),
      loading: ctx.loading,
      binding: function () {
         return { cacheViews: false };
      }
   }
});