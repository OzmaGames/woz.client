define(['durandal/app', 'api/datacontext'], function (app, ctx) {
   return {
      getView: function () {
         return $('<div/>').get(0);
      },
      activate: function () {
         ctx.playerCount = 1;
         app.navigate('game');
      }
   }
});