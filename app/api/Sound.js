define( 'api/Sound', ['sounds/manifest'], function ( manifest ) {

   function Sound( collection ) {
      var sounds = [];
      var dictionary = {};
      var loadedFiles = 0;
      var dfd = $.Deferred();

      for ( var item in collection ) {
         if ( item.match( '__' ) ) continue;
         if ( collection[item].push ) {
            pushItems( collection, item, '' );
         } else {
            dictionary[item] = {};
            for ( var sub in collection[item] ) {
               pushItems( collection[item], sub, item );
            }
         }
      }

      console.log( sounds );
      console.log( dictionary );

      createjs.Sound.addEventListener( "fileload", handleFileLoad );

      var base = this;
      function handleFileLoad() {
         loadedFiles++;
         base.onLoad( loadedFiles / sounds.length );

         if ( loadedFiles == sounds.length ) {
            dfd.resolve( loadedFiles );
         }
      }

      this.sounds = dictionary;
      this.play = function ( arr ) {
         index = Math.floor( Math.random() * arr.length );
         console.log( index );
         var clip = createjs.Sound.play( arr[index] );

         toastr.success( clip.src.match( /\/([^\/]*)/ig )[1], null, { timeOut: 5000 } );
      }
      this.load = function () {
         createjs.Sound.registerManifest( sounds, 'sounds/' );
      }
      this.onLoad = function () { };
      this.loaded = dfd.promise();

      function pushItems( collection, key, sKey ) {
         var arr = collection[key];
         var dic = dictionary;
         if ( sKey ) dic = dictionary[sKey];
         dic[key] = [];

         for ( var i = 0; i < arr.length; i++ ) {
            sounds.push( { id: sKey + key + i, src: arr[i] } );
            dic[key].push( sKey + key + i );
         }
      }
   }

   return new Sound( manifest );
} );