define(['durandal/app', 'api/draggable'], function (app) {

  function Window() {
    this.heading = '';
    this.content = '';
    
    var base = this;
    this.close = function (duration) {
       return $.Deferred(function (dfd) {
          if (!base.el) {
             dfd.resolve();
             return;
          }
          if (base.draggable) base.el.data("draggable").dispose();

          base.el.animate({ height: 0, opacity: 0 }, 250).promise()
             .then(function () { $(this).hide(); dfd.resolve(); });          
       });       
    }

    this.onClose = function () { }
  }

  Window.prototype.activate = function (data) {
    this.heading = data.heading;
    this.content = data.content;
    this.left = data.left || 0;
    this.top = data.top || 0;
    this.draggable = (data.draggable === undefined) ? true : data.draggable;

    var width = $(window).innerWidth();      
    if (width - this.left < 300) {
      this.left = width - 350;
    }
  }

  Window.prototype.compositionComplete = function (el) {
    this.el = $('.window', el);

    this.left = ($(window).innerWidth() - this.el.outerWidth()) / 2
    
    this.top += document.getElementById('app').scrollTop;

    this.el.css({ x: 100, opacity: 0, top: this.top, left: this.left})
      .transition({ x: -10, opacity: 1 }, 500, 'ease')
      .transition({ x: 0 }, 300).promise().then(function () {
        this.css({ x: 0 });
      });
    
    if(this.draggable)
       this.el.draggable({
          usePercentage: false,
          topLimit: true,
          withinEl: $('#app')
       });
  }

  Window.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return this.close(200);    
  }

  return Window;
});