define(['durandal/app'], function (app) {
  var duration = 400;

  function Notice() {
    this.heading = '';
    this.content = '';
    this.modal = false;
  
    var base = this;
    this.close = function () {
      duration = duration || 500;
      var dfd = base.el
        .transition({ y: 10 }, duration / 2, 'ease')
        .transition({ y: -100, opacity: 0 }, duration).promise().then(function () {
          base.el.css({ y: 0, display: 'none' });
        });

      base.el.parent().removeClass('modal');

      return dfd;
    }
  }

  Notice.prototype.activate = function (data) {
    this.heading = data.heading || '';
    this.content = data.content || '';
    this.modal = data.modal || this.modal;
  }

  Notice.prototype.attached = function (el) {
    this.el = $('.notice', el);
    
    if (this.modal === true) {
      this.el.parent().addClass('modal');
    }

    this.el.css({ y: -100, display: 'block', opacity: 0 })
      .transition({ y: 10, opacity: 1 }, 500, 'ease')
      .transition({ y: 0 }, 300).promise().then(function () {
        this.css({ y: 0 });
      });
  }

  Notice.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return $.Deferred(function (dfd) {
      base.el.promise().then(function () { dfd.resolve(true); });
    }).promise();
  }

  return Notice;
});