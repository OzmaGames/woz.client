define( ['api/datacontext'], function ( ctx ) {
   return {
      getView: function () {
         return $( '<div/>' ).get( 0 );
      },
      activate: function () {
         ctx.logout();
      }
   };
} );