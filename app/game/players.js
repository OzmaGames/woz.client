define(['api/datacontext'], function (ctx) {
   return {
      players: ctx.players,
      loading: ctx.loading,
      binding: function () {
         return { cacheViews: false };
      }
   }
});