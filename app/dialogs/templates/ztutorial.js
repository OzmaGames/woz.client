define(['durandal/app'], function (app) {

  /*
  app.dialog.show("tutorial", {content: '', expose: $('.magnet-placeholder')})
  app.dialog.show("tutorial", {content: '', expose: $('.tile')})
  */
  function Tutorial() {
    this.content = '';

    this.close = function (command) {
      base.el.transition({ y: 0 }, 300)
        .transition({ y: 100, opacity: 0 }).promise().then(function () {
          base.el.hide().css({ opacity: '' });
        });
      base.el.parent().fadeOut();
      base.expose.removeClass('tutorial-expose');
      base.overlay.fadeOut();
      base.onClose(command);
    }

    this.onClose = function () { };
  }

  Tutorial.prototype.activate = function (data) {
    this.content = data.content;
    this.expose = data.expose;
  }

  Tutorial.prototype.compositionComplete = function (el) {
    this.el = $('.tutorial', el);
    this.overlay = $('.overlay', el);

    this.el.css({ y: 100, opacity: 0 })
     .transition({ y: 0, opacity: 1 }, 300, 'ease')
     .transition({ y: 10 }, 200);
    
    var parent = this.expose.parent(), element = this.expose;
    do {
      if (parent.css('position') == 'relative') {
        element.addClass('tutorial-expose');
        element = parent;
      }
      parent = parent.parent();
    } while (parent[0].tagName != 'BODY');
    parent.append(this.overlay);    
  }

  Tutorial.prototype.canDeactivate = function () {
    var base = this;
    return $.Deferred(function (dfd) {
      base.el.promise().then(function () { dfd.resolve(true); });
    }).promise();
  }

  return Tutorial;
});