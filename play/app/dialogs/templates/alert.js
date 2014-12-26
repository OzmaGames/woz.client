define(['./_Dialog', 'durandal/app'], function (Dialog, app) {
      
   var Alert = Dialog.Create("alert", {
      effectStart: 'middle zoom',
      effectStartDuration: 500,
      effectStartDone: function ($el) {
         var base = this;
         $el.delay(this.delay).fadeOut(function () { base.forceClose(); });
      },
      activate: function (data) {
         this.delay = data.delay || 2000;
      }
   });
      
   return Alert;
});