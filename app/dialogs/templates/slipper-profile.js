define( ['durandal/app', 'api/context/user'], function ( app, user ) {

   function Slipper() {
      this.owner = false;
      this.level = ko.observable();
      this.xp = ko.observable();
      this.xpMax = ko.observable();
      this.username = ko.observable();
      this.title = ko.observable( '' );
      this.isFriend = ko.observable( false );
      this.images = true;

      var base = this;
      this.close = function ( duration ) {
         duration = duration || 500;
         var dfd = base.el.transition( { y: 10 }, duration / 2, 'ease' )
           .transition( { y: -100, opacity: 0 }, duration ).promise().then( function () {
              base.el.css( { y: 0, display: 'none' } );
              //base.onClose();
           } );

         base.el.parent().removeClass( 'modal' );

         return dfd;
      }

      this.onClose = function () { }

      this.addFriend = function ( vm, e ) {
         e.stopPropagation();

         if ( this.isFriend() || this.owner ) return;
         this.isFriend( true );

         app.Sound.play( app.Sound.sounds.click.button );

         var base = this;
         user.friends.add( base.username() ).then( function ( json ) {
            app.dialog.show( "alert", {
               content: json.success ?
                  base.username() + ' is now your friend.' : 'Oh, Something went wrong!'
            } );
         } );
      }

      this.removeFriend = function ( vm, e ) {
         e.stopPropagation();

         if ( this.isFriend() || this.owner ) return;

         app.Sound.play( app.Sound.sounds.click.button );

         var base = this;
         user.friends.del( base.username() ).then( function ( json ) {
            app.dialog.show( "alert", {
               content: json.success ?
                  base.username() + ' has been unfriended.' : 'Oh, Something went wrong!'
            } );
         } );
      }

      this.blockUser = function ( vm, e ) {
         e.stopPropagation();

         if ( this.isFriend() || this.owner ) return;
         
         app.Sound.play( app.Sound.sounds.click.button );

         var base = this;
         app.dialog.confirm( "Are you sure you want to block <b>" + base.username() + "</b>? <br> " + base.username() + " will not be able to start a game with you anymore!", {
            doneText: 'YES',
            cancelText: 'NO',
            modal: true
         } ).then( function () {
            user.block.add( base.username() ).then( function ( json ) {
               if ( json.success ) this.isFriend( true );

               app.dialog.show( "alert", {
                  content: json.success ?
                     base.username() + ' has been blocked.' : 'Oh, Something went wrong!'
               } );

               if ( json.success ) {
                  app.navigate( 'lobby' );
               } else {
                  base.isFriend( false );
               }
            } )
         } );
      }
   }

   Slipper.prototype.attributes = {
      fixed: true,
      singleton: true
   };

   Slipper.prototype.activate = function ( data ) {
      var base = this;
      if ( data && data.username && data.username != app.ctx.username ) {
         this.owner = false;
         app.trigger( "server:user:info", { username: app.ctx.username, targetUsername: data.username }, function ( data ) {
            base.level( data.level );
            base.xp( data.xp );
            base.xpMax( data.xpMax );
            base.username( data.username );
            base.title( data.title );

            base.isFriend( user.friends.has( data.username ) );
         } );
      } else {
         user.refresh();
         this.owner = true;
         this.level = user.level;
         this.xp = user.xp;
         this.xpMax = user.xpMax;
         this.username = user.username;
         this.title = user.title;
      }
   }

   Slipper.prototype.bindingComplete = function ( el ) {
      this.el = $( '.profile', el ).hide();

      this.__dialog__.settings.bindingComplete( el );
   }

   Slipper.prototype.load = function () {
      app.Sound.play( app.Sound.sounds.dialog.slipper );

      this.el.show().css( { y: -100, display: 'block', opacity: 0 } )
        .transition( { y: 10, opacity: 1 }, 500, 'ease' )
        .transition( { y: 0 }, 300 );
   }

   Slipper.prototype.canDeactivate = function ( a, s, d ) {
      var base = this;
      return this.close( 200 );
   }

   return Slipper;
} );