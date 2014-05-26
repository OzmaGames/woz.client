define( 'game/poem/background', ['api/datacontext'], function ( ctx ) {
   
   var ctor = function () {
      this.heading = 'Choose a background';
      this.lightColor = ko.observable( true );
      this.valid = ko.observable( true );
   }

   ctor.prototype.activate = function () {
      this.tiles = ctx.tiles();
      this.title = ctx.poem.title;
      this.phrases = ctx.poem.chosenPhrases;
   }

   return ctor;

} );