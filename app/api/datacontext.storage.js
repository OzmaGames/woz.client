define( 'api/datacontext.storage', [], function () {

   function Storage( prefixProvider, version, names ) {
      var base = this;

      if ( typeof prefixProvider !== "function" )
         prefixProvider = ( function ( provider ) {
            return function () { return provider; }
         } )( prefixProvider );

      names = names || { null: null };
      version = version || 1;

      var localVersion = localStorage.getItem( getKey( 'ver' ) );
      if ( localVersion != version ) {
         localStorage.removeItem( getKey() );
         for ( var name in names ) {
            localStorage.removeItem( getKey( name ) );
         }
      }
      localStorage.setItem( getKey( 'ver' ), version );

      function getKey( name ) {
         return prefixProvider() + ( name ? '.' + name : '' );
      }

      function save( name, obj ) {
         console.log( "%cSave Storage (" + getKey( name ) + ")", "background: lightblue; color: white" );

         localStorage.setItem( getKey( name ), JSON.stringify( obj ) );
      }

      function load( name ) {
         console.log( "%cLoad Storage (" + getKey( name ) + ")", "background: lightblue" );

         var strObj = localStorage.getItem( getKey( name ) );

         return strObj ? JSON.parse( strObj ) : names[name];
      }

      var model = {};
      for ( var name in names ) {
         model[name] = {
            save: ( function ( n ) {
               return function ( obj ) {
                  return save( n, obj );
               }
            } )( name ),
            load: ( function ( n ) {
               return function () {
                  return load( n );
               }
            } )( name )
         }
      }

      model.save = function ( obj ) {
         return save( null, obj );
      }
      model.load = function () {
         return load( null );
      }

      return model;
   }

   return Storage;
} );