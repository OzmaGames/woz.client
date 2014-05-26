define( 'game/poem/background', ['api/datacontext'], function ( ctx ) {
   
   ctx.poem.tile = ko.observable();
   ctx.poem.lightColor = ko.observable( true );

   var ctor = function () {
      this.heading = 'Choose a background';
      this.valid = ko.observable( true );
   }

   ctor.prototype.activate = function () {
      this.tiles = ctx.tiles;
      this.tile = ctx.poem.tile;
      this.title = ctx.poem.title;
      this.phrases = ctx.poem.chosenPhrases;
      this.lightColor = ctx.poem.lightColor;
   }
   
   ctor.prototype.compositionComplete = function ( el ) {
      //this.el = el;
      //return $( this.el ).hide().slideDown().promise();
      //app.trigger( "dialog:adjust-size" );
   }

   return ctor;

} );