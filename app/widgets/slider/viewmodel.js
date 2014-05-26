define( 'widgets/slider/viewmodel', ['durandal/composition'], function ( composition ) {

   var ctor = function () { };

   ctor.prototype.activate = function ( settings ) {
      this.settings = settings;
      this.afterRenderItem = this.afterRenderItem.bind( this );

      var base = this;

      this.index = ko.observable();
      this.canLeft = ko.computed( function () { return base.index() > 0 } );
      this.canRight = ko.computed( function () { return base.index() < ko.unwrap( base.settings.items ).length - 1 } );

      this.indexSub = this.index.subscribe( function () {
         var index = base.index();
         if ( base.$ul ) {
            var left = $( $( 'li', base.$ul )[index] ).position().left + base.$ul.scrollLeft();
            base.$ul.animate( { scrollLeft: left }, 300 );
            console.log( index, left );
         }

         var item = ko.unwrap( base.settings.items )[index];
         if ( ko.isObservable( base.settings.selectedItem ) ) {
            base.settings.selectedItem( item );
         } else {
            base.settings.selectedItem = item;
         }
      } );
   };

   ctor.prototype.afterRenderItem = function ( elements, item ) {
      //var parts = composition.getParts( elements );
      //$( parts.item ).parent( 'li' ).hide().slideDown( 500 );
   };

   ctor.prototype.binding = function () {
      return { cacheViews: false };
   }

   ctor.prototype.detached = function () {
      this.indexSub.dispose();
   }

   ctor.prototype.bindingComplete = function ( el ) {

   }

   ctor.prototype.compositionComplete = function ( el ) {
      var index = this.settings.items.indexOf( ko.unwrap( this.settings.selectedItem ) );
      this.$ul = $( '.slider', el );
      this.index( index > -1 ? index : 0 );
   }

   ctor.prototype.goLeft = function () {
      this.index( this.index() - 1 );
   }

   ctor.prototype.goRight = function () {
      this.index( this.index() + 1 );
   }

   return ctor;
} );