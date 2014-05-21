define( 'api/Sound', ['sounds/manifest', 'firebase'], function ( manifest ) {
   var fb = new Firebase( "https://flickering-fire-3516.firebaseio.com/ozma/woz/sounds" );

   function Sound( collection ) {
      var manifest = [];
      var soundsKey = {};
      var metaSounds = {};
      var loadedFiles = 0;
      var dfd = $.Deferred();

      for ( var item in collection ) {
         if ( item.match( '__' ) ) continue;
         if ( collection[item].push ) {
            pushItems( collection, item, '' );
         } else {
            soundsKey[item] = {};
            for ( var sub in collection[item] ) {
               pushItems( collection[item], sub, item );
            }
         }
      }

      fb.on( "value", function ( sounds ) {
         if ( sounds.val() ) {
            var collection = sounds.val();
            for ( var key in collection ) {
               metaSounds[key].volumn = collection[key].volumn;
            }
         }         
      } );

      createjs.Sound.addEventListener( "fileload", handleFileLoad );

      var base = this;
      function handleFileLoad() {
         loadedFiles++;
         base.onLoad( loadedFiles / manifest.length );

         if ( loadedFiles == manifest.length ) {
            dfd.resolve( loadedFiles );
         }
      }

      this.sounds = soundsKey;
      this.metaSounds = metaSounds;
      this.load = function () {
         //createjs.Sound.registerManifest( manifest, 'sounds/' );
         dfd.resolve();
      }
      this.onLoad = function () { };
      this.loaded = dfd.promise();

      function pushItems( collection, key, sKey ) {
         var arr = collection[key];
         var dic = soundsKey;
         if ( sKey ) dic = soundsKey[sKey];
         dic[key] = [];

         for ( var i = 0; i < arr.length; i++ ) {
            if ( typeof arr[i] == "string" ) {
               arr[i] = {
                  src: arr[i],
                  volumn: 1
               };
            }
            if ( typeof arr[i].volumn != "number" ) {
               arr[i].volumn = 1;
            }

            manifest.push( { id: sKey + key + i, src: arr[i].src } );
            dic[key].push( sKey + key + i );
            metaSounds[sKey + key + i] = arr[i];
         }
      }
   }

   Sound.prototype.save = function (func) {
      fb.set( this.metaSounds, func);
   }

   Sound.prototype.play = function ( arr, noNotify ) {
      return;
      var key, instance;
      if ( arr.push ) {
         key = arr[Math.floor( Math.random() * arr.length )];
      } else {
         key = arr;
      }
      //var instance = createjs.Sound.play( key );
      //instance.setVolume( this.metaSounds[key].volumn );

      //if(!noNotify)
      //   toastr.success( instance.src.split( /\//ig )[2], null, { timeOut: 5000 } );
   }

   return new Sound( manifest );
} );