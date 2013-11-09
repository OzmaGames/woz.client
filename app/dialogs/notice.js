define(['durandal/app', 'durandal/plugins/router'], function (app, router) {
  var duration = 400;

  function Notice() {
    this.heading = '';
    this.content = '';
    this.showXP = false;
    this.buttonText = '';
    this.modal = true;

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

    this.gotoLobby = function () {
      router.navigate("lobby");
    }
  }

  Notice.prototype.activate = function (data) {
    this.heading = data.heading || '';
    this.content = data.content || '';
    this.showXP = data.showXP || false;
    this.buttonText = data.buttonText || "";

    this.modal = data.modal || this.modal;
  }

  Notice.prototype.attached = function (el) {
    this.el = $('.notice', el);

    if (this.modal === true) {
      this.el.parent().addClass('modal');
    }

    this.el.css({ y: 0, opacity: 0.2, scale: 0.1, rotateY: '0deg' })
      //.transition({ y: 10, opacity: 0.5 }, 300, 'ease')
      //.transition({ y: 0 }, 100)
      .transition({ rotateY: 720, scale: 1, opacity: 1 }, 2000, 'ease');
  }

  Notice.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return $.Deferred(function (dfd) {
      base.el.promise().then(function () { dfd.resolve(true); });
    }).promise();
  }

  return Notice;
});