define( ['durandal/app', 'api/datacontext'], function ( app, ctx ) {

   var time = function () { return new Date().toTimeString(); }

   window.objs = [{
      b: 'test1'
   }, {
      b: 'test2'
   }, {
      b: 'test3'
   }];

   window.obs = ko.observableArray( );
   window.obs.show = function (elem) {
      if ( elem.nodeType === 1 )
         $( elem ).hide().slideDown()
   }
   for ( var i = 0; objs[i]; i++ ) {
      obs.push( objs[i] );
   }


   return {
      a: obs,
      binding: function () {
         return { cacheViews: false };
      },
      compositionComplete: function ( el ) {
         for ( var i = 0; i < 16; i++ ) {
            var line = $( '<div/>', { 'class': 'shiny' } );

            line.addClass(
               i % 5 == 0 ? 'typeA' :
               i % 5 == 1 ? 'typeB' :
               i % 5 == 2 ? 'typeC' :
               i % 5 == 3 ? 'typeD' : 'typeE'
               );

            var width = Math.random() * 40;
            line.css( {
               width: width,
               left: 50 - ( width / 2 ),
               opacity: 0,
               scale: .99
            } );

            $( '.shine', el ).append( line );

            setTimeout( function ( d ) {
               d.l.css( {
                  opacity: 1,
                  width: d.w,
                  left: 50 - ( d.w / 2 )
               } )
            }, i * 300, { l: line, w: width + 30 } );
            setTimeout( function ( l ) { l.css( { opacity: 0 } ) }, i * 200 + 2000, line );
         }

         //setTimeout(function () {
         //   app.scrollDown();
         //   app.scrollUp();
         //}, 1000);

         //for (var i = 0; i < 20; i++) {
         //   var star = $('<div/>', { 'class': 'starB' });

         //   star.css({
         //      left: Math.random() * 100,
         //      top: Math.random() * 100,
         //      backgroundColor: '#'+Math.floor(Math.random()*16777215).toString(16)
         //   });

         //   $('.star-box', el).append(star);
         //}
      }
   }
} );