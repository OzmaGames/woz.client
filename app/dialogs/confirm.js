define(['durandal/app'], function (app) {
  
  function Confirm() {
    this.content = '';
    this.duration = 400;
    this.modal = false;

    var base = this;
    this.ok = function () {
      base.close("ok");
    }

    this.cancel = function () {
      base.close("cancel");
    }

    this.close = function (command) {
      base.onClose(command);
      base.el.transition({ y: 0 }, 300)
        .transition({ y: 100, opacity: 0 }).promise().then(function () {
          base.el.hide().css({ opacity: '' });
        });
      base.el.parent().removeClass('modal');
    }

    this.onClose = function () { };
  }

  Confirm.prototype.activate = function (data) {
    if (data) {
      this.modal = data.modal || this.modal;
      this.duration = data.duration || this.duration;
    }    
  }

  Confirm.prototype.attached = function (el) {
    this.el = $('.confirm', el);

    if (this.modal) this.el.parent().addClass('modal');

    this.el.css({ y: 100, opacity: 0 })
     .transition({ y: 0, opacity: 1 }, 500, 'ease')
     .transition({ y: 10 }, 300);
  }

  Confirm.prototype.canDeactivate = function () {
    var base = this;
    return $.Deferred(function (dfd) {
      base.el.promise().then(function () { dfd.resolve(true); });
    }).promise();
  }

  return Confirm;
});