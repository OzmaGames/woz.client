define( ['durandal/app'], function ( app ) {
   return {
      getView: function () {
         return $( '<div/>' ).get( 0 );
      },
      activate: function () {
         app.navigate( '', { replace: true, trigger: true } );
      }
   };
} );