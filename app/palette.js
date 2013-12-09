define(function () {

   function Palette() {
      var base = this;

      this.items = ko.observableArray([new Palette.Icon("menu")]);

      this.fixedItems = ko.computed(function () {
         return ko.utils.arrayFilter(base.items(), function (item) { return item.place == "fixed"; });
      });

      this.rightItems = ko.computed(function () {
         return ko.utils.arrayFilter(base.items(), function (item) { return item.place == "right"; });
      });

      this.leftItems = ko.computed(function () {
         return ko.utils.arrayFilter(base.items(), function (item) { return item.place == "left"; });
      });

      this.get = function (name) {
         return ko.utils.arrayFirst(base.items(), function (item) {
            return item.name == name;
         });
      }

      this.visible = ko.observable(true);
      this.hide = function (obj) {
         if (obj) base.visible.duration = obj.duration;
         base.visible(false);
         delete base.visible.duration;
      };
      this.show = function () {
         base.visible(true);
         base.adjustPalettes();
      };

      this.add = function () {
         var icon = new Palette.Icon(arguments[0], arguments[1], arguments[2]);
         base.items.push(icon);
         base.adjustPalettes();
         return icon;
      }

      this.dispose = function () {
         this.items.splice(1);
      }
   }

   Palette.prototype.adjustPalettes = function (value) {
      $('.palette:not(.fixed)').each(function (i, el) {
         var $el = $(el);
         if (value === undefined) {
            $el.css('y', (window.innerHeight - $el.outerHeight()) / 2);
         } else {
            $el.css('y', value);
         }
      });
   }

   Palette.prototype.compositionComplete = function () {
      var base = this;

      base.adjustPalettes();

      var handler;
      $(window).bind("resize", function (e) {
         if (handler) clearTimeout(handler);
         handler = setTimeout(base.adjustPalettes, 100);         
      });
   }

   Palette.Icon = function (name, type, place) {
      var base = this;

      this.name = name;
      this.type = type || "command";
      this.place = place || "fixed";

      var clickEvent, visible = ko.observable(true),
         css = ko.observable(this.type + ' ' + this.name);

      this.click = function (func) {
         if (typeof func == "function") {
            clickEvent = func;
            clickEvent.owner = this;
            return base;
         }
         clickEvent.apply(clickEvent.owner, arguments);
      };

      this.visible = ko.computed({
         read: visible,
         write: function (value) {
            if (ko.isObservable(value)) {
               this.visible.dep = ko.computed(function () {
                  visible(value());
               });
            } else {
               if (this.visible.dep) this.visible.dep.dispose();
               visible(value);
            }
            return base;
         },
         owner: this
      });

      this.css = ko.computed({
         read: css,
         write: function (value) {
            if (ko.isObservable(value)) {
            } else {
               value[base.type] = true;
               value[base.name] = true;
               css(value);
            }
            return base;
         }
      });

      this.hide = function () { base.visible(false); };
      this.show = function () { base.visible(true); };
   }

   return new Palette();   //singliton
});