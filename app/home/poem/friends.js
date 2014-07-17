﻿define( ['durandal/app', 'api/datacontext', 'api/helper/facebook', 'api/helper/CanvasCapture'], function ( app, ctx, facebook, CanvasCapture ) {

   var PoemPerPage = 6;
   var nVisiblePoems = ko.observable( PoemPerPage );

   function ctor() {
      var base = this;

      this.loading = ctx.user.poems.loading;
      this.list = ctx.user.poems.friends;
      this.visibleList = ko.computed( function () {
         var max = nVisiblePoems();

         return ko.utils.arrayFilter( base.list(), function ( item ) {
            return --max >= 0;
         } );
      } );
   }

   ctor.prototype.activate = function () {
      var base = this;

      ctx.user.poems.load();
   }

   ctor.prototype.loadNextPage = function () {
      var base = this;
      nVisiblePoems( nVisiblePoems() + PoemPerPage );

      return Task.run.call( this, function () {
         return nVisiblePoems() < base.list().length;
      }, 150 * PoemPerPage );
   }

   ctor.prototype.like = function ( poem ) {
      ( poem.liked ? ctx.user.poems.unlike( poem.id ) : ctx.user.poems.like( poem.id ) ).then( function ( json ) {
         poem.liked = !poem.liked;
         //var index = ctx.user.poems.friends.indexOf( poem );
         //ctx.user.poems.friends.splice( index, 1 );
         //ctx.user.poems.friends.splice( index, 0, poem );
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