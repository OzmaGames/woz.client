define(['durandal/app','api/datacontext'], function (app, ctx) {
   return {
      showProfile: function (player) {
         app.dialog.showProfile(player.username);
      },
      players: ctx.players,
      loading: ctx.loading,
      binding: function () {
         return { cacheViews: false };
      }
   }
});