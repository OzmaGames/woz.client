define( 'game/poem/share', ['api/datacontext', 'api/helper/facebook'], function ( ctx, facebook ) {

   var ctor = function () {
      this.heading = 'Share with friends!';
      this.valid = ko.observable( true );
      this.btnNextCaption = 'Save';
      this.btnNextFn = this.save;

      this.reset = function () {

      }
   }

   var MASK = {
      width: 640,
      heigh: 640,
      innerCircleDiam: 529,
      left: 55,
      top: 55
   };

   ctor.prototype.activate = function () {
      this.tile = ctx.poem.tile;
      this.title = ctx.poem.title;
      this.phrases = ctx.poem.chosenPhrases;
      this.settings = ctx.poem.settings;
   }

   ctor.prototype.compositionComplete = function ( el ) {
      //this.el = el;
      //return $( this.el ).hide().slideDown().promise();
      //app.trigger( "dialog:adjust-size" );
      ctx.poem.title.valueHasMutated();
   }

   ctor.prototype.facebook = function () {

      var headingSize = parseInt( $( '.slider h1' ).css( 'fontSize' ) );
      var el = $( '<div/>' ).css( { display: 'block', width: 563, height: 563, position: 'absolute', zIndex: -1 } )
         .append( $( '.slider' ).clone().css( 'height', '100%' ) )[0];
      document.body.appendChild( el );

      $( '.tile', el ).css( 'fontSize', '563px' )
         .find( '.poem' ).css( 'fontSize', ctx.poem.settings.size.value() * ( 529 / 376 ) ).end()
         .find( 'h1' ).css( 'fontSize', headingSize * ( 529 / 376 ) );

      console.log( headingSize );

      html2canvas( el, {
         onrendered: function ( canvas ) {
            $( el ).remove();
            var cx = canvas.getContext( '2d' );

            //$( document.body ).append( $( canvas ).css( { position: 'fixed' } ) );
            console.log( canvas.toDataURL() );

            var i = 0;
            var back = new Image(), mask = new Image(), hasTile = !!ctx.poem.tile().imageName;
            back.onload = mask.onload = function () { draw( i++ ); };
            back.src = ctx.poem.tile().imageName || 'images/game/poem-mask-empty.jpg';
            mask.src = hasTile ? 'images/game/poem-mask.png' : 'images/game/poem-mask-empty.jpg';

            function draw( run ) {
               if ( !run ) return;
               var mem = document.createElement( 'canvas' ).getContext( '2d' );
               mem.canvas.height = mem.canvas.width = 529;
               mem.drawImage( canvas, -16.875, -16.875 );
               
               cx.canvas.width = MASK.width;
               cx.canvas.height = MASK.heigh;
               cx.clearRect( 0, 0, MASK.width, MASK.heigh );

               cx.webkitImageSmoothingEnabled = cx.mozImageSmoothingEnabled = cx.imageSmoothingEnabled = cx.msImageSmoothingEnabled = true;

               if ( hasTile ) {
                  cx.drawImage( back, MASK.left, MASK.top, MASK.innerCircleDiam, MASK.innerCircleDiam );
                  cx.drawImage( mem.canvas, MASK.left, MASK.top, MASK.innerCircleDiam, MASK.innerCircleDiam );
                  cx.drawImage( mask, 0, 0, MASK.width, MASK.heigh );

                  cx.beginPath();
                  cx.arc( MASK.left + MASK.innerCircleDiam / 2, MASK.top + MASK.innerCircleDiam / 2, MASK.innerCircleDiam / 2 + 2, 2 * Math.PI, 0, true );
                  cx.lineWidth = 4;
                  cx.strokeStyle = 'white';
                  cx.stroke();
               } else {
                  cx.drawImage( mask, 0, 0, MASK.width, MASK.heigh );
                  cx.drawImage( mem.canvas, MASK.left, MASK.top, MASK.innerCircleDiam, MASK.innerCircleDiam );
               }

               facebook.PublishImage.publishImageUI( canvas );
            }
         }
      } )
   }

   return ctor;

} );