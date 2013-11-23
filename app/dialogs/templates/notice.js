define(['durandal/app'], function (app) {
   var duration = 400;

   //app.dialog.show("notice", { model: { message: 'Master of Poetry', imageName: 'images/game/feather.png' }, view: "dialogs/pages/levelup" })
   //app.dialog.show("notice", {model: {},view: "dialogs/pages/welcome"})

   function Notice() {
      this.modal = false;
      this.model = {};
      this.view = "";
      this.images = true;

      var base = this;
      this.close = function () {
         duration = duration || 500;
         var dfd = base.el
           .transition({ y: 10 }, duration / 2, 'ease')
           .transition({ y: -100, opacity: 0 }, duration).promise().then(function () {
              base.el.css({ y: 0, display: 'none' });
           });

         if (this.model && this.model.onClose) {
            this.model.onClose();
         }

         return dfd;
      }
   }

   Notice.prototype.activate = function (data) {
      this.modal = data.modal || this.modal;
      this.view = data.view;
      this.model = data.model;

      if (!this.model.close) {
         this.model.close = this.close;
      }
   }
   Notice.prototype.bindingComplete = function (el) {
      this.el = $('.notice', el).hide();
      this.__dialog__.settings.bindingComplete(el);
   }

   Notice.prototype.load = function (el) {
      this.el.show().css({ y: 0, opacity: 0, scale: 0.8 })
        .transition({ scale: 1.1, opacity: 1 }, 400, 'ease')
        .transition({ scale: 1 }, 300, 'ease');
   }

   Notice.prototype.canDeactivate = function (a, s, d) {
      var base = this;
      return $.Deferred(function (dfd) {
         base.el.promise().then(function () { dfd.resolve(true); });
      }).promise();
   }

   return Notice;
});