﻿define(['durandal/app', 'plugins/router'], function (app, router) {

   var items = [
     { text: "New Game", hash: 'newGame' },
     { text: "Shop",     hash: 'shop' },
     { text: "My Games", hash: 'lobby' },
     { text: "My Poems", hash: 'poems' },
     { text: "settings", hash: 'settings' },
     { text: "tutorial", hash: 'tutorial/new' },
     { text: "help",     hash: 'help' },
     { text: "Logout",   hash: 'account/logout' }
   ];

   if ( app.ctx.username == 'niklas' ) {
      items.push( { text: "sound", hash: 'sound' } );
   }

   function Menu() {
      this.images = true;

      var base = this;

      this.close = function (duration) {
         console.log(duration);

         if (base.el.is(":visible")) {
            duration = duration || 500;
            var dfd = base.el.transition({ x: -10 }, duration / 2, 'ease')
              .transition({ x: 100, opacity: 0 }, duration).promise().then(function () {
                 base.el.css({ x: 0 }).hide();
              });

            base.el.parent().removeClass('modal');

            return dfd;
         }

         return base.el.promise();
      };

      this.onClose = function () { };

      this.items = items;

      this.nav = function ( item ) {
         app.Sound.play( app.Sound.sounds.click.button );
         router.navigate(item.hash);
      };
   }

   Menu.prototype.attributes = {
      fixed: true,
      singleton: true
   };

   Menu.prototype.activate = function (data) {

   };

   Menu.prototype.bindingComplete = function (el) {
      this.el = $('.menu', el).hide();
      this.__dialog__.settings.bindingComplete(el);
   };

   Menu.prototype.load = function () {
      app.Sound.play( app.Sound.sounds.dialog.menu );
      var base = this;
      this.el.show().css({ x: 100, opacity: 0, top: '100px' })
        .transition({ x: -10, opacity: 1 }, 400, 'ease')
        .transition({ y: 0 }, 300);
   }

   Menu.prototype.canDeactivate = function (a, s, d) {
      var base = this;
      return this.close(200);
   };

   return Menu;
});