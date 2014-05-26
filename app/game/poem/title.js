define( 'game/poem/title', ['api/datacontext'], function ( ctx ) {

   ctx.poem.title = ko.observable('sample');

   var ctor = function () {
      var base = this;

      this.title = ctx.poem.title;
      this.valid = ko.computed( function () {
         return base.title().trim() != '';
      } );
   }

   ctor.prototype.activate = function () {
      this.phrases = ctx.poem.chosenPhrases();
   }

   ctor.prototype.compositionComplete = function ( el ) {
      //this.el = el;
      //return $( this.el ).hide().slideDown().promise();
      //app.trigger( "dialog:adjust-size" );
   }

   return ctor;

} );