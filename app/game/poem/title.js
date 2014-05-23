define( 'game/poem/title', ['api/datacontext'], function ( ctx ) {

   var ctor = function () {
      var base = this;

      this.title = ko.observable('sample');
      this.valid = ko.computed( function () {
         return base.title().trim() != '';
      } );
   }

   ctor.prototype.activate = function () {
      this.phrases = ctx.poem.phrases().filter( function ( p ) { return !p.excluded; } );
   }

   return ctor;

} );