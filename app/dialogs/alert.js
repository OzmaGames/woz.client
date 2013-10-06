﻿define(['durandal/app'], function (app) { 
  var delay = 2000, duration = 500;
  
  function Alert() {
    this.content = '';
  }

  Alert.prototype.activate = function (data) {
    if (typeof data === "string") {
      this.content = data;
    }
    else {
      this.content = data.content;
      delay = data.delay || delay;
    }
  };

  Alert.prototype.attached = function (el) {
    this.el = $('.alert', el);

    this.el.css({
      top: ($(window).innerHeight() - this.el.outerHeight()) / 2,
    });

    this.el.css({ y: -100, display: 'block', opacity: 0 })
      .transition({ y: 20, opacity: 0.8 }, duration, 'ease')
      .transition({ y: 0, opacity: 1 }, duration / 2, 'ease')
      .delay(delay).fadeOut();
  };

  Alert.prototype.canDeactivate = function (a, s, d) {
    var base = this;
    return $.Deferred(function (dfd) {
      base.el.promise().then(function () { dfd.resolve(true); });
    }).promise();
  };
  
  return Alert;
});