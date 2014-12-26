define(['durandal/app', 'api/datacontext'], function (app, ctx) {
   return {
      getView: function () {
         return $('<div/>').get(0);
      },
      activate: function () {         
         app.navigate( 'tutorial/next', { replace: true, trigger: true } );
      }
   }
});