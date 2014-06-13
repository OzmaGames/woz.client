define(['durandal/app','api/datacontext'], function (app, ctx) {
   return {
      showProfile: function () {
         app.dialog.showProfile();
      },
      players: ctx.players,
      loading: ctx.loading,
      binding: function () {
         return { cacheViews: false };
      }
   }
});