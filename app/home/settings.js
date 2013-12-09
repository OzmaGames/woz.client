define(['plugins/router', 'durandal/app', 'api/datacontext'], function (router, app, ctx) {

   return {
      activate: function () {
         app.palette.dispose();
      },
      binding: function () {
         return { cacheViews: false };
      }
   }
});