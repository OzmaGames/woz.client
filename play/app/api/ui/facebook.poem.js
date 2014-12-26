define( 'api/ui/facebook.poem', ['api/helper/facebook'], function ( facebook ) {
   return {
      activate: function () {
         this.uploading( false );
         this.message( '' );
      },
      loading: app.loading,
      uploading: ko.observable(false),
      user: facebook.user,
      poem: facebook.PublishImage.poemImageSrc,
      message: ko.observable( '' ),
      uploadPercent: facebook.PublishImage.uploadPercent,         
      publish: function () {
         app.loading( true );
         this.uploading( true );         
         facebook.PublishImage.publishImage( this.message() ).then( function () {            
            app.loading( false );
            app.dialog.close("panel");

            ga('send', 'event', 'poem', 'shared', 'facebook');

         } );
      },
      close: function () {
         if ( this.uploading() ) return;
         app.dialog.close( "panel" );
      }
   };
} );