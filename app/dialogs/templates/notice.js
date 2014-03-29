define(['durandal/app'], function (app) {
   var duration = 400;

   //app.dialog.show("notice", { model: { message: 'Master of Poetry', imageName: 'images/game/feather.png' }, view: "dialogs/pages/levelup" })
   //app.dialog.show("notice", {model: {},view: "dialogs/pages/welcome"})
   //app.dialog.show("notice", {model: 'dialogs/pages/currency', css: 'long', closeOnClick: false, fixed: true, centered: true, modal: true})

   function Notice() {
      this.modal = false;
      this.model = {};
      this.view = "";
      this.images = true;
      this.css = "";

      this.dfd1 = $.Deferred();
      this.dfd2 = $.Deferred();

      var base = this;
      this.close = function () {
         duration = duration || 500;
         var dfd = base.el
           .transition({ y: 10 }, duration / 2, 'ease')
           .transition({ y: -100, opacity: 0 }, duration).promise().then(function () {
              base.el.css({ y: 0, display: 'none' });
           });

         if (base.onClose) {
            base.onClose();
         }

         return dfd;
      }
   }

   Notice.prototype.activate = function (data) {
      this.modal = data.modal || this.modal;
      this.view = data.view;
      this.model = data.model || {};
      this.css = data.css;
      this.closeOnClick = (data.closeOnClick == undefined) ? true : data.closeOnClick;
      this.centered = data.centered || false;

      this.model.close = this.close;

      var base = this;
      $.when(this.dfd1, this.dfd2).then(function () {
         if (base.centered) {
            base.el.css({ top: 0 }).show();
            adjust(base.el);
         } else {
            base.el.show().css({ y: 0, opacity: 0, scale: 0.8 })
               .transition({ scale: 1.1, opacity: 1 }, 400, 'ease')
               .transition({ scale: 1 }, 300, 'ease');
         }
      });
   }

   Notice.prototype.bindingComplete = function (el) {
      this.el = $('.notice', el).hide();
      this.__dialog__.settings.bindingComplete(el);
   }

   Notice.prototype.load = function (el) {
      this.dfd1.resolve();
   }

   Notice.prototype.compositionComplete = function () {
      this.dfd2.resolve();
   }

   Notice.prototype.canDeactivate = function (a, s, d) {
      var base = this;
      return $.Deferred(function (dfd) {
         if (base.el) {
            base.el.promise().then(function () { dfd.resolve(true); });
         } else {
            dfd.reject();
         }
      }).promise();
   }

   function adjust(el) {
      var height = window.innerHeight;
      var top = (height - el.outerHeight()) / 2;
      if (top < 0) top = 0;

      el.transition({ y: top });
   }

   return Notice;
});