define(['durandal/app'], function (app) {

  function Menu() {
    
    var base = this;
    this.close = function (duration) {
      console.log(duration);
      duration = duration || 500;
      var dfd = base.el.transition({ x: -10 }, duration / 2, 'ease')
        .transition({ x: 100, opacity: 0 }, duration).promise().then(function () {
          base.el.css({ x: 0, display: 'none' });
        });

      base.el.parent().removeClass('modal');

      return dfd;
    }    

    this.onClose = function () { }
  }

  Menu.prototype.activate = function (data) {
    if (data && data.modal === true) {
      this.el.parent().addClass('modal');
    }    
  }

  Menu.prototype.attached = function (el) {
    this.el = $('.menu', el);

    var base = this;
    this.el.css({ x: 100, opacity: 0, top: '100px' })
      .transition({ x: -10, opacity: 1 }, 400, 'ease')
      .transition({ y: 0 }, 300);
  }

  Menu.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return this.close(200);    
  }

  return Menu;
});