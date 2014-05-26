define( 'widgets/slider/viewmodel', ['durandal/composition'], function ( composition ) {

   var ctor = function () { };

   ctor.prototype.activate = function ( settings ) {
      this.settings = settings;
      this.afterRenderItem = this.afterRenderItem.bind( this );

      var base = this;

      this.index = ko.observable( 0 );
      this.canLeft = ko.computed( function () { return base.index() > 0 } );
      this.canRight = ko.computed( function () { return base.index() < base.settings.items.length - 1 } );

      ko.computed( function () {
         var index = base.index();
         if ( base.$ul ) {
            var left = $( $( 'li', base.$ul )[index] ).position().left + base.$ul.scrollLeft();
            base.$ul.animate( { scrollLeft: left }, 300 );
         }
      } )
   };

   ctor.prototype.afterRenderItem = function ( elements, item ) {
      //var parts = composition.getParts( elements );
      //$( parts.item ).parent( 'li' ).hide().slideDown( 500 );
   };

   ctor.prototype.compositionComplete = function ( el ) {
      this.$ul = $( '.slider', el );
   }

   ctor.prototype.goLeft = function () {
      this.index( this.index() - 1 );
   }

   ctor.prototype.goRight = function () {
      this.index( this.index() + 1 );
   }

   return ctor;
} );