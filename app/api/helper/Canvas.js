define( 'api/helper/Canvas', [], function () {
   
   var model = {};

   model.toDataURL = function ( canvas ) {
      return canvas.toDataURL( "image/png" );
   }

   model.toBlob = function (canvas) {      
      return toBlob( model.toDataURL(canvas) );
   }
   
   return model;

   function toBlob( dataURI ) {
      var byteString = atob( dataURI.split( ',' )[1] );
      var ab = new ArrayBuffer( byteString.length );
      var ia = new Uint8Array( ab );
      for ( var i = 0; i < byteString.length; i++ ) {
         ia[i] = byteString.charCodeAt( i );
      }
      return new Blob( [ab], {
         type: 'image/png'
      } );
   }
} )