define( 'game/poem/phrase', ['api/datacontext'], function ( ctx ) {

   ctx.poem = {
      gameID: undefined,
      phrases: ko.observableArray(),
      chosenPhrases: ko.observableArray()
   };

   var ctor = function () {
      var base = this;

      this.phrases = ctx.poem.phrases;
      this.splitters = [
         { text: 'Include', fixed: true },
         { text: 'Exclude', fixed: false }
      ];

      this.validate = ko.observable();
      this.valid = ko.computed( function () {
         base.validate();
         return ctx.poem.phrases().some( function ( p ) { return !p.excluded; } );
      } );

      this.moved = this.moved.bind( this );
   }

   ctor.prototype.activate = function () {
      if ( ctx.poem.gameID != ctx.gameID ) {
         ctx.poem.gameID = ctx.gameID;
         var p = ctx.paths().map( function ( p, index ) {
            return {
               phrase: p.phrase.words.sort( function ( a, b ) { return a.index - b.index; } ).map( function ( w ) { return w.word.lemma; } ).join( ' ' ),
               index: index,
               excluded: true
            }
         } );
         ctx.poem.phrases( p );
      }
      this.splitters[1].index = ctx.poem.phrases().filter( function ( p ) { return !p.excluded; } ).length + 1;
   }

   ctor.prototype.moved = function ( movedItem, swapedItem, movedIndex, swapedIndex ) {
      if ( swapedItem.excluded == undefined ) {
         movedItem.excluded = movedIndex < swapedIndex;
         this.validate.valueHasMutated();
      } else {
         var tmp = swapedItem.index;
         swapedItem.index = movedItem.index;
         movedItem.index = tmp;
      }
   }

   ctor.prototype.canDeactivate = function () {
      return true;
   }

   ctor.prototype.deactivate = function () {
      ctx.poem.phrases().sort( function ( a, b ) { return a.index - b.index } );
      ctx.poem.chosenPhrases( ctx.poem.phrases().filter( function ( p ) { return !p.excluded; } ) );
      //return $( this.el ).transition( { x: -100, opacity: 0} );
   }   
   ctor.prototype.bindingComplete = function ( el ) {
      //this.el = el;
      //return $( this.el ).hide().promise();
   }
   ctor.prototype.compositionComplete = function (el) {
      //this.el = el;
      //return $( this.el ).hide().slideDown().promise();
      //app.trigger( "dialog:adjust-size" );
   }

   return ctor;

} );