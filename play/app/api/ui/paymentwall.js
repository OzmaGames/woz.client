define( 'api/ui/paymentwall', ['api/helper/facebook'], function ( facebook ) {
   return {
      activate: function () {
         
      },      
      close: function () {         
         app.dialog.close( "panel" );
      }
   };
} );