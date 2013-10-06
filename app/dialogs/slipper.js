define(['durandal/app'], function (app) {

  function Slipper() {
    this.heading = '';
    this.content = '';
    
    var base = this;
    this.close = function (duration) {
      duration = duration || 500;
      var dfd = base.el.transition({ y: 10 }, duration / 2, 'ease')
        .transition({ y: -100, opacity: 0 }, duration).promise().then(function () {
          base.el.css({ y: 0, display: 'none' });
          //base.onClose();
        });

      base.el.parent().removeClass('modal');

      return dfd;
    }

    this.onClose = function () { }
  }

  Slipper.prototype.activate = function (data) {
    this.heading = data.heading;
    this.content = data.content;

    if (data.modal === true) {
      this.el.parent().addClass('modal');
    }    
  }

  Slipper.prototype.attached = function (el) {
    this.el = $('.slipper', el);

    this.el.css({ y: -100, display: 'block', opacity: 0 })
      .transition({ y: 10, opacity: 1 }, 500, 'ease')
      .transition({ y: 0 }, 300).promise().then(function () {
        this.css({ y: 0 });
      });
  }

  Slipper.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return this.close(200);    
  }

  return Slipper;
});