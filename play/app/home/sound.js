define( ['api/Sound'], function ( Sound ) {

   function ctor() {
      var collections = [];

      for ( var item in Sound.sounds ) {
         var obj = Sound.sounds[item];
         if ( obj.push ) {
            collections.push( { key: item, items: obj } );
         } else {
            for ( var sub in obj ) {
               collections.push( { key: item + '.' + sub, items: obj[sub] } );
            }
         }
      }

      this.collection = collections;
   }

   ctor.prototype.save = function () {
      return Sound.save( function ( error ) {
         if ( !error ) {
            app.dialog.show( "alert", { content: 'save ' + (error ? 'failed' : 'completed') } );
         }
      } );
   }

   ctor.prototype.play = function ( key ) {
      return Sound.play( key, true );
   }

   ctor.prototype.meta = function ( key ) {
      return Sound.metaSounds[key];
   }

   ctor.prototype.activate = function () {
      app.palette.dispose();
   }

   ctor.prototype.binding = function () {
      return { cacheViews: false };
   }

   return ctor;
} );