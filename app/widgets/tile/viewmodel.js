define( 'widgets/tile/viewmodel', ['durandal/composition'], function ( composition ) {

   var ctor = function () { };

   ctor.prototype.activate = function ( settings ) {      
      this.settings = settings;
      this.afterRenderItem = this.afterRenderItem.bind( this );      
   };

   ctor.prototype.afterRenderItem = function ( elements, item ) {      
      
   };   

   return ctor;   
} );