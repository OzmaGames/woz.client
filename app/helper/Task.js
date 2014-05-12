( function () {
   "use strict";
   window.Task = {
      run: function ( func, time, funcOwner, suspend ) {
         var nextFns = [], nextRun, out = {
            then: function ( func ) {
               nextFns.push( func );
               return out;
            },
            thenRun: function ( func, time ) {
               return nextRun = Task.run( func, time, funcOwner, true );
            },
            _start: function () {
               setTimeout( function () {
                  var result = func.call( funcOwner );
                  for ( var i = 0; i < nextFns.length; i++ ) {
                     var res = nextFns[i].call( funcOwner, result );
                     if ( res !== undefined ) result = res;
                  }
                  if ( nextRun ) {
                     nextRun._start();
                  }
               }, time || 1 );
            }
         }
         funcOwner = funcOwner || this;

         if ( !suspend ) {
            out._start();
         }

         return out;
      },

      Queue: function () {
         this.timer = 0;

         this.runAfter = function ( func, time ) {
            this.timer += (time || 1);

            Task.run( func, this.timer, this ).then( function () {
               this.timer -= time;
            } );
         }
      }
   }
} )();


//Task.run( function () { return [1, ""] }, 1 )
//   .then( function ( b ) {  } )
//   .then( function ( c ) {  } )
//   .thenRun( function () {

//   }, 1 );

