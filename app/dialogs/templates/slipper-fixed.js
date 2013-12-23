define(['durandal/app'], function (app) {

   function Slipper() {
      this.heading = '';
      this.content = '';
      this.images = true;

      var base = this;
      this.close = function (duration) {
         duration = duration || 500;
         if (!base.el) {
            return $.Deferred(function (dfd) { dfd.resolve() });
         }
         var dfd = base.el.transition({ y: 10 }, duration / 2, 'ease')
           .transition({ y: -100, opacity: 0 }, duration).promise().then(function () {
              base.el.css({ y: 0, display: 'none' });
              //base.onClose();
           });

         base.el.parent().removeClass('modal');

         return dfd;
      }

      this.collapse = function (a, e) {
         e.preventDefault();
         e.stopPropagation();
         base.el.toggleClass('minimized');
      }

      this.onClose = function () { }
   }

   Slipper.prototype.attributes = {
      fixed: false,
      singleton: true
   };

   Slipper.prototype.activate = function (data) {
      this.heading = data.heading;
      this.content = data.content;

      if (data.modal === true) {
         this.el.parent().addClass('modal');
      }
   }

   Slipper.prototype.bindingComplete = function (el) {
      this.el = $('.slipper', el).hide();

      this.__dialog__.settings.bindingComplete(el);
   }

   Slipper.prototype.load = function () {
      var base = this;
      this.el.show().css({ y: -100, display: 'block', opacity: 0 })
        .transition({ y: 10, opacity: 1 }, 500, 'ease')
        .transition({ y: 0 }, 300);

      setTimeout(function () {
         base.el.toggleClass('minimized');
      }, 5000);
   }

   Slipper.prototype.canDeactivate = function (a, s, d) {
      var base = this;
      return this.close(200);
   }

   return Slipper;
});