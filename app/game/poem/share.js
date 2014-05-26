define( 'game/poem/share', ['api/datacontext'], function ( ctx ) {
   
   var ctor = function () {
      this.heading = 'Share with friends!';
      this.valid = ko.observable( true );
      this.btnNextCaption = 'Done';
   }

   ctor.prototype.activate = function () {
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