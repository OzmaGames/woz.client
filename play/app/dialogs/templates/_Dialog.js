define(['durandal/app', './_Effects'], function (app, Effects) {

   var resolvedDFD = $.Deferred(function (dfd) { dfd.resolve(); }).promise();
   var defaults = {
      effectDuration: 500
   }

   function Dialog(type, opt) {
      this.type = type;
      this.content = null;
      this.modal = null;
      this._closing = false;

      this.attributes = $.extend({
         fixed: true,
         singleton: true
      }, opt);
   }

   Dialog.Inherit = function (type, typeName, opt) {
      type.prototype = new Dialog(typeName || type.name.toLowerCase(), opt);
      type.prototype.constructor = type;
      type.prototype.super = Dialog.prototype;
      return type;
   }

   Dialog.Create = function (typeName, opt) {
      var type = function () { };
      return Dialog.Inherit(type, typeName, opt);
   }

   Dialog.prototype.activate = function (data) {
      this.content = data.content;
      this.modal = data.modal || false;

      if (this.attributes.activate) this.attributes.activate.apply(this, arguments);
   };


   function applyEffects(prefix) {
      var effects = this.attributes['effect' + prefix].split(' ');

      for (var i = 0; i < effects.length; i++) {
         Effects[effects[i]](this.el, this.attributes['effect' + prefix + 'Duration'] || defaults.effectDuration, this._closing);
      }

      var func = this.attributes['effect' + prefix + 'Done'];
      if (func) func.call(this, this.el);
   }

   function startEffect() {
      if (this.attributes.effectStart) {
         applyEffects.call(this, 'Start');
      }
   }

   function closeEffect() {
      if (this.attributes.effectClose) {
         applyEffects.call(this, 'Close');
      }
      return this.el.promise();
   }

   Dialog.prototype.attached = function (el) {
      this.el = $('.' + this.type, el);

      if (this._closing) throw "Unexpected Error: dialog attached before former one is closed!"

      startEffect.apply(this);

      if (this.attributes.attached) this.attributes.attached.apply(this, arguments);
   };

   Dialog.prototype.close = function (opt) {
      this._closing = true;

      if (opt && opt.forced) {
         return resolvedDFD;
      }

      return closeEffect.apply(this);
   }

   Dialog.prototype.canDeactivate = function () {
      var base = this;
      return $.Deferred(function (dfd) {
         if (!base.el || base._closing) {
            //dfd.reject();   //this cause error on durandal framework
            return;
         }
         base.close().then(function () { dfd.resolve(); });
      }).promise();
   };

   return Dialog;
});