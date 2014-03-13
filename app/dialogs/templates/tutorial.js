define(['durandal/app', 'api/draggable'], function (app) {

   function Tutorial() {
      this.heading = '';
      this.content = '';
      this.css = '';


      var base = this;
      this.onChange = app.on("dialog:data:changed").then(function (data) {      
         base.activate(data);
         if (base.el) {
            base.el.transition({ top: base.top, left: base.left });
         }
      });

      this.close = function () {
         base.onChange.off();
         return $.Deferred(function (dfd) { dfd.resolve(); });
      }

      this.onClose = function () { }
   }

   Tutorial.prototype.activate = function (data) {
      this.heading = data.heading;
      this.content = data.content;
      this.left = data.left || 0;
      this.top = data.top || 0;
      this.css = data.css || '';
      this.attributes.fixed = data.fixed || false;
   }

   Tutorial.prototype.attached = function (el) {
      this.el = $('.tutorial', el);

      this.el.css({ x: 100, opacity: 0, top: this.top, left: this.left })
        .transition({ x: -10, opacity: 1 }, 500, 'ease')
        .transition({ x: 0 }, 300).promise().then(function () {
           this.css({ x: 0 });
        });
   }

   Tutorial.prototype.canDeactivate = function () {
      return this.close();
   }

   Tutorial.prototype.attributes = {
      fixed: false,
      singleton: true
   };

   return Tutorial;
});