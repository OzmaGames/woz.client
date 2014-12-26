define( 'widgets/xp/viewmodel', ['durandal/composition'], function ( composition ) {

   var NUM = 26;

   var ctor = function () {
      this.sectors = [];
      for ( var i = 0; i < NUM; i++ ) {
         this.sectors.push( { index: i, active: ko.observable( false ) } );
      }
   };

   ctor.prototype.activate = function ( settings ) {
      this.settings = settings;
      this.settings.max = this.settings.max || 100;

      this.cmp = ko.computed( function () {
         var value = ko.unwrap( this.settings.value ), max = ko.unwrap( this.settings.max );
         this.sectors.forEach( function ( s ) {
            s.active( value / max > s.index / NUM );
         } );                  
      }, this );

      this.afterRenderItem = this.afterRenderItem.bind( this );
   };

   ctor.prototype.detached = function () {
      this.cmp.dispose();
   }

   ctor.prototype.afterRenderItem = function ( elements, item ) {

   };

   return ctor;
} );