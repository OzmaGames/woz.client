﻿define( 'api/Sound', ['sounds/manifest', 'sounds/manifest.meta', 'firebase'], function ( manifest, manifestMeta ) {
   var fb = null;
   //fb = new Firebase( "https://flickering-fire-3516.firebaseio.com/ozma/woz/sounds" );


   var soundSystem = false;   

   function Sound( collection ) {
      var manifest = [];
      var soundsKey = {};
      var metaSounds = {};
      var loadedFiles = 0;
      var dfd = $.Deferred();
      var firebaseDFD = $.Deferred();

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
         if ( soundSystem ) {
            createjs.Sound.registerManifest( manifest, 'sounds/' );

            if ( fb ) {
               fb.on( "value", function ( sounds ) {
                  if ( sounds.val() ) {
                     foo( sounds.val() );
                  }
               } );
            } else {
               foo( manifestMeta );               
            }
         } else {
            dfd.resolve();
            firebaseDFD.resolve();
         }

         function foo( collection ) {
            for ( var key in collection ) {
               if ( !metaSounds[key] ) {
                  metaSounds[key] = { volumn: 1, delay: 0 };
               }
               metaSounds[key].volumn = collection[key].volumn;
               metaSounds[key].delay = collection[key].delay;
            }

            firebaseDFD.resolve();
         }
      }
      this.onLoad = function () { };
      this.loaded = $.when( dfd, firebaseDFD );

      function pushItems( collection, key, sKey ) {
         var arr = collection[key];
         var dic = soundsKey;
         if ( sKey ) dic = soundsKey[sKey];
         dic[key] = [];

         for ( var i = 0; i < arr.length; i++ ) {
            if ( typeof arr[i] == "string" ) {
               arr[i] = {
                  src: arr[i],
                  volumn: 1,
                  delay: 0
               };
            }
            if ( typeof arr[i].volumn != "number" ) {
               arr[i].volumn = 1;
            }
            if ( typeof arr[i].delay != "number" ) {
               arr[i].delay = 0;
            }

            manifest.push( { id: sKey + key + i, src: arr[i].src } );
            dic[key].push( sKey + key + i );
            metaSounds[sKey + key + i] = arr[i];
         }
      }
   }

   Sound.prototype.save = function ( func ) {
      fb.set( this.metaSounds, func );
   }

   Sound.prototype.play = function ( arr, noNotify ) {
      if ( !soundSystem ) return;
      
      var key, instance;
      if ( !arr ) return;
      if ( arr.push && arr.length == 0 ) return;
      if ( arr.push ) {
         var index = 0;
         do {
            index = Math.floor( Math.random() * arr.length );
         } while ( arr.prev == index && arr.length > 1 )
         arr.prev = index;

         key = arr[index];
      } else {
         key = arr;
      }

      var instance = createjs.Sound.play( key );
      instance.setVolume( this.metaSounds[key].volumn );

      var delay = this.metaSounds[key].delay;
      if ( delay ) {
         instance.stop();
         Task.run( function () {
            instance.play();
         }, delay );
      }

      if ( !noNotify && app.ctx.username == 'niklas' ) {
         toastr.success( instance.src.split( /\//ig )[2], null, { timeOut: 5000 } );
      }

      return instance;
   }

   Sound.prototype.fade = function ( instance ) {
      if ( !soundSystem ) return;
      var q = new Task.Queue();

      for ( var i = 0; i < 20; i++ ) {
         q.runAfter( decrease, 50 );
      }

      q.runAfter( function () {
         instance.stop();
      } );

      function decrease() {
         //console.log( instance.getVolume() );
         instance.setVolume( instance.getVolume() * 9.0 / 10 );
      }
   }


   return new Sound( manifest );
} );