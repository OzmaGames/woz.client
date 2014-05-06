define( 'api/datacontext.storage', [], function () {

   function Storage( prefixProvider, version, names ) {
      var base = this, cache = {};

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

      function copyOf( obj ) {
         return JSON.parse( JSON.stringify( obj ) );
      }

      function save( name, obj ) {
         localStorage.setItem( getKey( name ), JSON.stringify( obj ) );

         cache[name] = copyOf( obj );

         console.log( "%cSave Storage (" + getKey( name ) + ")", "background: lightblue; color: white", cache[name] );
      }

      function load( name, noCache ) {
         if ( !noCache && cache[name] ) return cache[name];

         var strObj = localStorage.getItem( getKey( name ) );
         cache[name] = strObj ? JSON.parse( strObj ) : names[name];

         console.log( "%cLoad Storage (" + getKey( name ) + ")", "background: lightblue", cache[name] );

         return cache[name];
      }

      function loadCopy( name ) {
         return copyOf( load( name ) );
      }

      var model = {};
      for ( var name in names ) {
         ( function ( name ) {
            model[name] = {
               save: function ( obj ) {
                  return save( name, obj );
               },
               load: function ( noCache ) {
                  return load( name, noCache );
               },
               loadCopy: function () {
                  return loadCopy( name );
               }
            }
         } )( name );
      }

      model.save = function ( obj ) {
         return save( null, obj );
      }
      model.load = function ( noCache ) {
         return load( null, noCache );
      }

      return model;
   }

   return window.STG = Storage;
} );