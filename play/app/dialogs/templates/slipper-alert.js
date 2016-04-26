define(['durandal/app'], function (app) {

  function Slipper() {
    this.heading = '';
    this.content = '';
    this.isConnection = undefined;
    this.connectionError = false;
    this.images = true;

    var base = this;
    this.close = function (duration) {
      duration = duration || 500;
      if (!base.el) {
        return $.Deferred(function (dfd) { dfd.resolve() });
      }
      var dfd = base.el.transition({ y: 10 }, duration / 2, 'ease')
        .transition({ y: -100, opacity: 0 }, duration).promise().then(function () {
          base.el.css({ y: 0, display: 'none' });
          //base.onClose();
        });

      base.el.parent().removeClass('modal');

      return dfd;
    }

    this.collapse = function (a, e) {
      e.preventDefault();
      e.stopPropagation();
      base.el.toggleClass('minimized');
    }

    this.onClose = function () { }
  }

  Slipper.prototype.attributes = {
    fixed: false,
    singleton: true
  };

  Slipper.prototype.activate = function (data) {
    this.heading = data.heading;
    this.content = data.content;

    this.isConnection = data.connected !== undefined;
    if (this.isConnection) {

      if (!data.connected) {
        this.heading = 'Connection Interrupted';
        this.connectionError = true;
        this.content = 'You are offline! The game requires internet connection to work.';
      } else {
        this.heading = 'Connected';
        this.content = 'You are back online!';
      }
    }

    if (data.modal === true) {
      this.el.parent().addClass('modal');
    }
  }

  Slipper.prototype.bindingComplete = function (el) {
    this.el = $('.slipper', el).hide();

    this.__dialog__.settings.bindingComplete(el);
  }

  Slipper.prototype.load = function () {
    app.Sound.play(app.Sound.sounds.dialog.slipper);

    var base = this;
    this.el.show().css({ y: -100, display: 'block', opacity: 0 })
      .transition({ y: 10, opacity: 1 }, 500, 'ease')
      .transition({ y: 0 }, 300);

    if (base.isConnection && !base.connectionError) {
      base && base.el && base.el.find && base.el.find('img').remove();
    }

    setTimeout(function () {
      if (base.isConnection && !base.connectionError) {
        app.dialog.close('slipper-alert');
      } else {
        base.el.addClass('minimized');
      }
    }, 5000);
  }

  Slipper.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return this.close(200);
  }

  return Slipper;
});