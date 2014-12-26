define(['durandal/app'], function (app) {

   return {
      'downCustom': function ($el, duration) {
         $el.css({ y: -100, opacity: 0 })
           .transition({ y: 20, opacity: 0.8 }, duration, 'ease')
           .transition({ y: 0, opacity: 1 }, duration / 2, 'ease');
      },

      'zoom': function ($el, duration) {
         $el.css({ scale: .5, opacity: 0 });
         $el.transition({ scale: 1, opacity: 1 });
      },

      'middle': function ($el) {
         $el.css({ top: ($(window).innerHeight() - $el.outerHeight()) / 2 });
      },

      'bottom': function ($el) {
         
      },

      'down': function ($el, duration, closing) {
         if (!closing) {
            $el.css({ opacity: 0 });
         }
         $el.transition({ y: 0 }, duration * 1 / 4)
            .transition({ y: 100, opacity: closing ? 0 : 1 }, duration * 3 / 4);
      },

      'up': function ($el, duration, closing) {
         if (!closing) {
            $el.css({ opacity: 0 });
         }
         $el.transition({ y: -100, opacity: closing ? 0 : 1 }, duration * 3 / 4);
      }
   }

});