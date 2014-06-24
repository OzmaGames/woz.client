define( 'widgets/xp/viewmodel', ['durandal/composition'], function ( composition ) {

   var NUM = 26;

   var ctor = function () {
      this.sectors = [];
      for ( var i = 0; i < NUM; i++ ) {
         this.sectors.push( { index: i, active: false } );
      }
   };

   ctor.prototype.activate = function ( settings ) {
      this.settings = settings;
      this.settings.max = this.settings.max || 100;

      var value = ko.unwrap( this.settings.value ), max = ko.unwrap( this.settings.max );
      this.sectors.forEach( function ( s ) {
         s.active = ( value / max > s.index / NUM );
      } );

      this.afterRenderItem = this.afterRenderItem.bind( this );
   };

   ctor.prototype.afterRenderItem = function ( elements, item ) {

   };

   return ctor;
} );