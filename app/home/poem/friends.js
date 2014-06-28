define( ['durandal/app', 'api/datacontext', 'api/helper/facebook', 'api/helper/CanvasCapture'], function ( app, ctx, facebook, CanvasCapture ) {

   function ctor() {
      this.loading = ko.observable();
      this.list = ko.observableArray();
   }

   ctor.prototype.activate = function () {
      var base = this;

      app.loading( true );

      app.trigger( "server:user:poem", { username: ctx.username, command: 'friends' }, function ( json ) {
         if ( json.success ) {
            json.poems.forEach( function ( poem ) {
               poem.imageName = 'images/tiles/' + poem.collection + '/' + poem.imageID + '.jpg';
            } )
            base.list( json.poems );
         }
         app.loading( false );
      } );
   }

   ctor.prototype.like = function ( poem ) {
      app.loading( true );
      app.trigger( "server:user:poem", { username: ctx.username, command: 'like', id: poem.id }, function ( json ) {
         if ( json.success ) {
            //poem.$el.hide( 400, function () { $( this ).remove() } );
         }
         app.loading( false );
      } );
   }

   ctor.prototype.afterRender = function ( el, poem ) {
      poem.$el = $( el[1] );
      poem.$slider = $( '.slider', poem.$el );
   }

   ctor.prototype.facebook = function ( item ) {
      CanvasCapture.capture( item.$slider, item.imageName, item.size ).then( function ( canvas ) {
         facebook.PublishImage.publishImageUI( canvas );
      } );
   };

   return ctor;
} );