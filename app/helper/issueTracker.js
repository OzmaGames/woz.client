define( 'helper/issueTracker', ['api/history', 'firebase'], function ( history ) {
   return;
   var fb = new Firebase( "https://flickering-fire-3516.firebaseio.com/ozma/woz/issues" );
   
   var guid = ( function () {
      function s4() {
         return Math.floor(( 1 + Math.random() ) * 0x10000 )
                    .toString( 16 )
                    .substring( 1 );
      }
      return function () {
         return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
      };
   } )();

   var clientGUID = guid();

   var model = {
      log: function ( obj ) {
         var routes = location.hash.split( /[#\/]/ig ).slice(1);

         if ( routes.length == 0 ) routes.push( '_root_' );

         var fbChild = fb.child( routes[0] );
         fbChild.push( {            
            route: routes.slice(1).join('/'),
            time: new Date().toUTCString(),
            details: obj
         } );
      },
      updateClient: function () {
         var fbChild = fb.child( '_clients_/' + clientGUID );

         fbChild.set( {
            browser: {
               userAgent: navigator.userAgent,
               platform: navigator.platform,
               appName: navigator.appName,
               appVersion: navigator.appVersion,
               vendor: navigator.vendor,
               vendorSub: navigator.vendorSub,
               product: navigator.product
            },
            history: history.getHistory(),
            issues: history.getIssues()
         } );
      }
   }   

   history.onError = function ( obj ) {      
      model.log( obj );
      model.updateClient( );
   }   

   window.addEventListener( "error", function ( e ) {      
      history.pushIssue( { message: e.message, line: e.lineno, filename: e.filename.match( /\/(.*?\.js)/ig )[0], username: app.ctx.username } );
   } );

   return model;
} );