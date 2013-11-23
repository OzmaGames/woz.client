define(['durandal/app'], function (app) {

   function Confirm() {
      this.content = '';
      this.cancelText = 'CANCEL';
      this.doneText = 'DONE';
      this.duration = 400;
      this.modal = false;
      this.images = true;

      var base = this;
      this.done = function () {
         base.close("done");
      }

      this.cancel = function () {
         base.close("cancel");
      }

      this.close = function (command) {
         base.el.transition({ y: 0 }, 300)
           .transition({ y: 100, opacity: 0 }).promise().then(function () {
              base.el.hide().css({ opacity: '' });
           });
         base.el.parent().removeClass('modal');
         base.onClose(command);
      }

      this.onClose = function () { };
   }

   Confirm.prototype.activate = function (data) {
      if (data) {
         this.modal = data.modal || this.modal;
         this.duration = data.duration || this.duration;
         this.content = data.content || this.content;
         this.doneText = data.doneText || this.doneText;
         this.cancelText = data.cancelText || this.cancelText;
      }
   }

   Confirm.prototype.bindingComplete = function (el) {
      this.el = $('.confirm', el).css({ opacity: 0 });
      if (this.modal) this.el.parent().addClass('modal');
      this.__dialog__.settings.bindingComplete(el);
   }

   Confirm.prototype.load = function () {
      var base = this;
      base.el.css({ y: 100, opacity: 0 })
       .transition({ y: 0, opacity: 1 }, 300, 'ease')
       .transition({ y: 10 }, 200);
   }

   Confirm.prototype.canDeactivate = function () {
      var base = this;
      return $.Deferred(function (dfd) {
         base.el.promise().then(function () { dfd.resolve(true); });
      }).promise();
   }

   return Confirm;
});