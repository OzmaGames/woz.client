define( 'game/poem/index', ['durandal/activator', './phrase', './title', './background', './share', 'api/datacontext'],
   function ( activator, p1, p2, p3, p4, ctx ) {

      var pages = [new p1, new p2, new p3, new p4], index = 0;

      var page = activator.create();

      var heading = ko.computed( function () {
         var pg = page();
         return pg && pg.heading ? pg.heading : 'Make a poem!';
      } );

      var btnNextCaption = ko.computed( function () {
         var pg = page();
         return pg && pg.btnNextCaption ? pg.btnNextCaption : 'Next >';
      } );


      //ctx.poem.gameID = ctx.gameID;
      //var p = ctx.paths().map( function ( p, index ) {
      //   return {
      //      phrase: p.phrase.words.sort( function ( a, b ) { return a.index - b.index; } ).map( function ( w ) { return w.word.lemma; } ).join( ' ' ),
      //      index: index,
      //      excluded: false
      //   }
      //} );
      //ctx.poem.chosenPhrases = ko.observableArray( p );
      //ctx.poem.title = 'sample title';

      return {
         activate: function () {
            page( pages[index = 0] );
         },
         heading: heading,
         btnNextCaption: btnNextCaption,
         page: page,
         hasBack: ko.computed( function () {
            page();
            return index != 0;
         } ).extend( { throttle: 150 } ),
         canNext: ko.computed( function () {
            var pg = page();
            return pg && pg.valid ? pg.valid() : false;
         } ).extend( { throttle: 150 } ),
         next: function () {
            if ( index >= pages.length - 1 ) {
               app.trigger( "notice:close" );
            } else {
               page( pages[++index] );
            }
         },
         back: function () {
            page( pages[--index] );
         }
      };

   } );