define( 'game/poem/index', ['durandal/activator', './phrase', './background', './share', 'api/datacontext'],
   function ( activator, p1, p2, p3, ctx ) {

      var pages = [new p1, new p2, new p3], index = 0;

      var page = activator.create();
      
      var heading = ko.computed( function () {
         var pg = page();
         return pg && pg.heading ? pg.heading : 'Make a poem!';
      } );

      var btnNextCaption = ko.computed( function () {
         var pg = page();
         return pg && pg.btnNextCaption ? pg.btnNextCaption : 'Next >';
      } );

      
      //pages[0].activate(); var i = 2;
      //ctx.poem.chosenPhrases( ctx.poem.phrases().filter( function () { return i--; }) );
            

      return {
         activate: function () {
            pages.forEach( function ( p ) { p.reset() } );
            pages[0].activate();
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