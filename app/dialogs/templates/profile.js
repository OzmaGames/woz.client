define(['durandal/app', 'api/datacontext.user'], function (app, user) {

   function Profile() {
      this.level = user.level;
      this.xp = user.xp;
      this.title = user.title;
      this.images = true;

      var base = this;
      this.close = function (duration) {
         duration = duration || 500;
         var dfd = base.el.transition({ y: 10 }, duration / 2, 'ease')
           .transition({ y: -100, opacity: 0 }, duration).promise().then(function () {
              base.el.css({ y: 0, display: 'none' });
              //base.onClose();
           });

         base.el.parent().removeClass('modal');

         return dfd;
      }
      
      this.onClose = function () { }
   }

   Profile.prototype.attributes = {
      fixed: false,
      singleton: true
   };

   Profile.prototype.activate = function ( data ) {
      user.refresh();      
   }

   Profile.prototype.bindingComplete = function ( el ) {
      var base = this;
      base.el = $('.slipper', el).hide();

      this.__dialog__.settings.bindingComplete(el);
   }

   Profile.prototype.load = function () {
      app.Sound.play( app.Sound.sounds.dialog.slipper );

      this.el.show().css({ y: -100, opacity: 0 })
           .transition({ y: 10, opacity: 1 }, 500, 'ease')
           .transition({ y: 0 }, 300);
   }

   Profile.prototype.canDeactivate = function ( a, s, d ) {
      var base = this;
      return this.close(200);
   }

   return Profile;
});