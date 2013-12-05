define(['plugins/router', 'durandal/app', 'api/datacontext'], function (router, app, ctx) {

   return {
      activate: function () {
         $('#menu').remove();
      },
      binding: function () {
         return { cacheViews: false };
      }
   }
});