/*!
 * jQuery UI Touch Punch 0.2.2
 *
 * Copyright 2011, Dave Furfero
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Depends:
 *  jquery.ui.widget.js
 *  jquery.ui.mouse.js
 */
(function ($) {
   // Detect touch support
   $.support.touch = 'ontouchend' in document;

   // Ignore browsers without touch support
   if (!$.support.touch) {
      return;
   }

   var mouseProto = {}, touchHandled;

   /**
    * Simulate a mouse event based on a corresponding touch event
    * @param {Object} event A touch event
    * @param {String} simulatedType The corresponding mouse event
    */
   function simulateMouseEvent(event, simulatedType) {

      // Ignore multi-touch events
      if (event.originalEvent.touches.length > 1) {
         return;
      }

      if (event.currentTarget.onlyClick || self._clickOnly) {
         if (simulatedType == 'click') {
            event.preventDefault();            
            event.currentTarget.onlyClick(event);
         }
         return;
      }
      event.preventDefault();      

      var touch = event.originalEvent.changedTouches[0],
          simulatedEvent = document.createEvent('MouseEvents');

      // Initialize the simulated mouse event using the touch event's coordinates
      simulatedEvent.initMouseEvent(
        simulatedType,    // type
        true,             // bubbles                    
        true,             // cancelable                 
        window,           // view                       
        1,                // detail                     
        touch.screenX,    // screenX                    
        touch.screenY,    // screenY                    
        touch.clientX,    // clientX                    
        touch.clientY,    // clientY                    
        false,            // ctrlKey                    
        false,            // altKey                     
        false,            // shiftKey                   
        false,            // metaKey                    
        0,                // button                     
        null              // relatedTarget              
      );

      // Dispatch the simulated event to the target element
      event.target.dispatchEvent(simulatedEvent);
   }

   /**
    * Handle the jQuery UI widget's touchstart events
    * @param {Object} event The widget element's touchstart event
    */
   mouseProto._touchStart = function (event) {
      var self = this;

      // Ignore the event if another widget is already being handled
      if (touchHandled) return;
      touchHandled = true;

      // Track movement to determine if interaction was a click
      self._touchMoved = false;
      
      if (event.currentTarget.immovable) {
         if (event.currentTarget.immovable()) {
            self._clickOnly = true;            
         } else {
            self._clickOnly = false;
         }
      }

      // Simulate the mouseover event
      simulateMouseEvent(event, 'mouseover');

      // Simulate the mousemove event
      //simulateMouseEvent(event, 'mousemove');

      // Simulate the mousedown event
      simulateMouseEvent(event, 'mousedown');
   };

   /**
    * Handle the jQuery UI widget's touchmove events
    * @param {Object} event The document's touchmove event
    */
   mouseProto._touchMove = function (event) {

      // Ignore event if not handled
      if (!touchHandled) {
         return;
      }
      //var str = "";
      //for (var i in event) {
      //   str += i + ': ' + event[i] +  '<br/>'
      //}
      //app.console.log( event.currentTarget.onlyClick +'<br/>' + str);
      // Interaction was not a click
      this._touchMoved = true;

      // Simulate the mousemove event
      simulateMouseEvent(event, 'mousemove');
   };

   /**
    * Handle the jQuery UI widget's touchend events
    * @param {Object} event The document's touchend event
    */
   mouseProto._touchEnd = function (event) {
      // Ignore event if not handled
      if (!touchHandled) {
         return;
      }

      // Simulate the mouseup event
      simulateMouseEvent(event, 'mouseup');

      // Simulate the mouseout event
      simulateMouseEvent(event, 'mouseout');

      // If the touch interaction did not move, it should trigger a click
      if (!this._touchMoved) {
         simulateMouseEvent(event, 'click');
         event.preventDefault();
      }

      touchHandled = false;
   };

   /**
    * A duck punch of the $.ui.mouse _mouseInit method to support touch events.
    * This method extends the widget with bound touch event handlers that
    * translate touch events to mouse events and pass them to the widget's
    * original mouse event handling methods.
    */
   mouseProto.touchInit = function (element, options) {

      var self = this;

      // Delegate the touch handlers to the widget's element
      element
        .bind('touchstart', $.proxy(self, '_touchStart'))
        .bind('touchcancel', $.proxy(self, '_touchEnd'))
        .bind('touchmove', $.proxy(self, '_touchMove'))
        .bind('touchend', $.proxy(self, '_touchEnd'));
   };

   $.fn.touchPunch = function (options) {
      return this.each(function () {
         mouseProto.touchInit($(this), options);
      });
   }


   //mouseProto.touchInit($(window));

})(jQuery);