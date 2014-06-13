define(['./_Dialog', 'durandal/app'], function (Dialog, app) {

   //var Confirm = Dialog.Create("confirm", {
   //   effectStart: 'bottom up',
   //   effectStartDuration: 400,
   //   effectStartDone: function ($el) { },
   //   effectClose: 'down',
   //   effectCloseDuration: 200,
   //   effectCloseDone: function($el){ },
   //   activate: function (data) {
   //      var base = this;

   //      this.duration = data.duration || this.duration;
   //      this.content = data.content || this.content;
   //      this.doneText = data.doneText || 'DONE';
   //      this.cancelText = data.cancelText || 'CANCEL';
   //      this.images = true;

   //      this.done = function () {
   //         base.close("done");
   //      }

   //      this.cancel = function () {
   //         base.close("cancel");
   //      }
   //   }
   //});

   //return Confirm;

   function Confirm() {
      this.content = '';
      this.cancelText = 'CANCEL';
      this.doneText = 'DONE';
      this.duration = 400;
      this.modal = false;
      this.images = true;

      var base = this;
      this.done = function () {
         app.Sound.play( app.Sound.sounds.click.button );
         base.close("done");
         app.Sound.play( app.Sound.sounds.dialog.confirmClosing );
      }

      this.cancel = function () {
         app.Sound.play( app.Sound.sounds.click.button );
         base.close("cancel");
         app.Sound.play( app.Sound.sounds.dialog.confirmClosing );
      }

      this.close = function (command) {
         if (this._closing) return;

         this._closing = true;         
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
      this.el = $('.confirm', el).css({ opacity: 0, y: 100 });
      if (this.modal) this.el.parent().addClass('modal');
      this.__dialog__.settings.bindingComplete(el);
   }

   Confirm.prototype.load = function () {
      var base = this;
      app.Sound.play( app.Sound.sounds.dialog.confirm );
      base.el.addClass( 'transit0-25' ).css( { y: 0, opacity: 1 } );
      base.el.one($.support.transitionEnd, function () { 
         base.el.css({ y: 10 }, 200);
         base.el.one($.support.transitionEnd, function () {
            base.el.removeClass('transit0-25');
         });
      });
   }

   Confirm.prototype.canDeactivate = function () {
      var base = this;   
      return $.Deferred( function ( dfd ) {
         if (base.el) {
            base.close()
            base.el.promise().then(function () { dfd.resolve(true); });
         }
      }).promise();
   }

   Confirm.prototype.attributes = {
      fixed: true,
      singleton: true
   };

   return Confirm;
});