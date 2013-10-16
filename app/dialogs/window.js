define(['durandal/app', 'api/draggable'], function (app) {

  function Window() {
    this.heading = '';
    this.content = '';
    
    var base = this;
    this.close = function (duration) {
      base.el.data("draggable").dispose();
      return base.el.animate({ height: 0, opacity: 0 }, 250);
    }

    this.onClose = function () { }
  }

  Window.prototype.activate = function (data) {
    this.heading = data.heading;
    this.content = data.content;
    this.left = data.left || 0;
    this.top = data.top || 0;

    var width = $(window).innerWidth();      
    if (width - this.left < 300) {
      this.left = width - 350;
    }
  }

  Window.prototype.attached = function (el) {
    this.el = $('.window', el);

    this.el.css({ x: 100, opacity: 0, top: this.top, left: this.left })
      .transition({ x: -10, opacity: 1 }, 500, 'ease')
      .transition({ x: 0 }, 300).promise().then(function () {
        this.css({ x: 0 });
      });
    
    this.el.draggable({ usePercentage: false });
  }

  Window.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return this.close(200);    
  }

  return Window;
});