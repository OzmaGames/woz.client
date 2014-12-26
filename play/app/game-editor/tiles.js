define( ['durandal/app', 'api/datacontext', 'api/helper/draggable.static'], function ( app, ctx ) {

   var animationQueue = [];

   function showTiles() {
      for ( var i = 0; i < animationQueue.length; i++ ) {
         var $el = animationQueue[i].$el;
         var tile = animationQueue[i].tile;
         $el.css( {
            left: tile.x * 100 + '%',
            top: tile.y * 100 + '%'
         } );

         $el.find( '.mask' ).css( {
            scale: 1,
            fontSize: "1em"
         } );

         tile.ruleOffset = { x: 0, y: 0 };

         UpdateTileInstruction( tile );
      }
      animationQueue = [];
   }

   function UpdateTileInstruction( tile ) {
      var angle = tile.angle();

      tile.$inst.css( { rotate: angle } );
      if ( angle > 90 || angle < -90 ) {
         tile.$inst.find( '.rule' ).css( { rotate: 180 } );
      } else {
         tile.$inst.find( '.rule' ).css( { rotate: 0 } );
      }
   }

   return {
      tiles: ctx.tiles,
      collection: ctx.collection,

      tileAngleUp: function ( tile, e ) {
         tile.angle( tile.angle() + 1 );
         UpdateTileInstruction( tile );
      },

      tileAngleDown: function ( tile, e ) {
         tile.angle( tile.angle() - 1 );
         UpdateTileInstruction( tile );
      },

      del: function ( tile, e ) {
         app.dialog.show( "confirm", {
            content: "Delete tile?", modal: true,
            doneText: 'YES', cancelText: 'NO'
         } ).then( function ( res ) {
            if ( res == "done" ) {

               var paths = ctx.paths();
               for ( var i = 0; i < paths.length; i++ ) {
                  var path = paths[i];
                  if ( path.startTile.id == tile.id || path.endTile.id == tile.id ) {
                     ctx.paths.splice( ctx.paths.indexOf( path ), 1 );
                     path.dispose();
                     i--;
                  }
               }

               ctx.tiles.splice( ctx.tiles.indexOf( tile ), 1 );
            }
         } );
      },

      afterRender: function ( el, tile ) {
         var $el = $( el ).filter( '.tile:first' );

         tile.$el = $el;
         tile.$inst = $el.find( '.cloud' );

         tile.$el.draggableStatic( {
            withinEl: $el.parent(),
            centerBased: true,
            topLimit: true,
            usePercentage: false,
            dragStart: function ( e ) {
               tile.lastAngle = tile.angle();
               tile.lastX = tile.x;
            },
            move: function ( e, data ) {
               tile.x = data.left / $el.parent().innerWidth();
               tile.y = data.top / $el.parent().innerHeight();

               if ( tile.lastAngle > 90 || tile.lastAngle < -90 )
                  tile.angle( tile.lastAngle - Math.floor(( tile.x - tile.lastX ) * 90 ) );
               else
                  tile.angle( tile.lastAngle + Math.floor(( tile.x - tile.lastX ) * 90 ) );
               UpdateTileInstruction( tile );
               return true;
            },
            dropped: function ( e, data ) {
               if ( !data.hasMoved ) return;

               if ( !data.isWithin ) {

               }
               tile.$el.css( {
                  top: 100 * tile.y + '%',
                  left: 100 * tile.x + '%'
               } );

               app.trigger( "game:tiles:update" );
               var paths = ctx.paths();
               for ( var i = 0; i < paths.length; i++ ) {
                  var p = paths[i];
                  if ( p.startTile.x > p.endTile.x ) {
                     var tmp = p.startTile;
                     p.startTile = p.endTile;
                     p.endTile = tmp;
                     p.cw ^= 1;
                  }
                  p.phrase.words.valueHasMutated();
               }
            }
         } );

         tile.$inst.find( '.rule' ).draggableStatic( {
            withinEl: $( document ),
            centerBased: true,
            usePercentage: false,
            topLimit: false,
            move: function ( e, data ) {
               var angle = Math.ceil( 90 + Math.atan2( data.top, data.left ) * ( 180 / Math.PI ) );

               tile.angle( angle );
               UpdateTileInstruction( tile );
               return false;
            }
         } );

         if ( animationQueue.length == 0 ) setTimeout( showTiles, 100 );
         animationQueue.push( { $el: $el, tile: tile } );
      }
   };
} );