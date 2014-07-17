define( ['durandal/app', 'api/datacontext', 'api/helper/facebook', 'api/helper/CanvasCapture'], function ( app, ctx, facebook, CanvasCapture ) {
   
   var PoemPerPage = 6;
   var nVisiblePoems = ko.observable( PoemPerPage );

   function ctor() {
      var base = this;

      this.loading = ctx.user.poems.loading;
      this.list = ctx.user.poems.mine;
      this.visibleList = ko.computed( function () {
         var max = nVisiblePoems();

         return ko.utils.arrayFilter( base.list(), function ( item ) {
            return --max >= 0;
         } );
      } );
   }

   ctor.prototype.activate = function () {
      var base = this;

      ctx.user.poems.load( true );      
   }

   ctor.prototype.loadNextPage = function () {
      var base = this;
      nVisiblePoems( nVisiblePoems() + PoemPerPage );

      return Task.run.call( this, function () {
         return nVisiblePoems() < base.list().length;
      }, 150 * PoemPerPage );
   }

   ctor.prototype.remove = function ( poem ) {
      app.dialog.confirm( "Are you sure you want to delete this poem?", {
         doneText: 'YES',
         cancelText: 'NO',
         modal: true
      } ).then( function () {
         ctx.user.poems.del( poem.id ).then( function (json) {
            if ( json.success ) {
               poem.$el.hide( 400, function () { $( this ).remove() } );
            }
         } );         
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