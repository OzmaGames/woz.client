define( 'game/poem/title', ['api/datacontext'], function ( ctx ) {

   
   var phrases = ctx.poem.phrases.filter( function ( p ) { return !p.excluded; } ).sort( function ( a, b ) { a.index - b.index } );
   
   return {
      phrases: phrases      
   };

} );