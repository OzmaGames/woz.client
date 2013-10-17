define(['durandal/app'], function (app) {

  function Window() {
    this.nWords = ko.observable();
  }

  Window.prototype.activate = function (data) {
    this.content = data.content || '';
    this.left = data.left || 0;
    this.top = data.top || 0;
    this.nWords(data.nWords);

    this.up = function () {
      var nWords = this.nWords();
      if (nWords < 6) {
        if (nWords == 0) nWords = 2;
        this.nWords(nWords + 1);
        data.changed(this.nWords());
      }
    };
    this.down = function () {
      var nWords = this.nWords();
      if (nWords > 3) {
        this.nWords(nWords - 1);
        data.changed(this.nWords());
      } else if (nWords == 3) {
        this.nWords(0);
        data.changed(0);
      }
    };
    this.del = function () {
      data.changed(null);
      this.onClose();
    }
    this.cw = function () {
      data.changed("cw");
    }
  }

  Window.prototype.attached = function (el) {
    this.el = $('.control', el)
      .css({ left: this.left, top: this.top });
  }

  Window.prototype.canDeactivate = function () {
    return $.Deferred(function (dfd) { dfd.resolve(true) });
  }

  return Window;
});