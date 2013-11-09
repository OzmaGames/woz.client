define(function () {
  ko.bindingHandlers["fadeVisible"] = {
    init: function (element, valueAccessor, allBindingsAccessor) {
      var value = valueAccessor();
      $(element).toggle(ko.utils.unwrapObservable(value));
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
      var value = valueAccessor(), fadeIn, fadeOut;
      others = allBindingsAccessor();

      if (others.duration) {
        if (typeof others.duration == "number") {
          fadeIn = fadeOut = others.duration;
        } else {
          fadeIn = others.duration.fadeIn || 200;
          fadeOut = others.duration.fadeOut || 500;
        }
      }

      ko.utils.unwrapObservable(value) ?
        $(element).fadeIn(fadeIn) :
        $(element).fadeOut(fadeOut);
    }
  };

  ko.bindingHandlers["dropdown"] = {
    init: function (element, valueAccessor) {
      var data = valueAccessor(), $element = $(element).hide();
      var dic = {};

      if (typeof (data.selected) !== "function") {
        data.selected = ko.observable(data.selected || $element.find('option[selected]').text());
      }
      data.options = data.options || $element.find('option').map(function () { return $(this).text() }).get();

      dic.selectedItem = data.selected();

      var $list = $('<ul/>', { 'class': 'container y scroll' }).hide();
      for (var i = 0; i < data.options.length; i++) {
        var listItem = $('<li/>', { text: data.options[i] }).on("click", function () {
          var text = $(this).text();
          if (data.selected() != text) {
            data.selected(text);
            $list.slideUp(200);
          }
        }).appendTo($list);

        dic[data.options[i]] = listItem;
      }

      var $lable = $('<label/>', { 'class': 'select' }).on("click", function () {
        $list.slideToggle(200);
      }).append(
        dic.selectedText = $('<span/>', { 'class': 'selected', text: data.selected() })
      )
        .append($('<span/>', { 'class': 'description', text: data.inst }));

      $lable.insertAfter($element);
      $list.insertAfter($lable);

      ko.computed({
        disposeWhenNodeIsRemoved: element,
        read: function () {
          var selectedItem = data.selected();
          dic[dic.selectedItem].removeClass("active");
          dic[selectedItem].addClass("active");
          dic.selectedItem = selectedItem;
          dic.selectedText.text(selectedItem);
        }
      });
    }
  };


  ko.bindingHandlers["verifiableValue"] = {
    init: function (element, valueAccessor, allBindingsAccessor) {
      ko.bindingHandlers.value.init(element, valueAccessor, allBindingsAccessor);
      valueAccessor().errorMessage = ko.observable("");

      element.addEventListener('invalid', element.verify, false);

      $(element).focusout(element.verify);
      //$(element).change(verify);

      element.verify = function() {        
        ko.bindingHandlers.verifiableValue.verify(element, valueAccessor, true)
      }
    },
    update: function (element, valueAccessor) {
      ko.bindingHandlers.value.update(element, valueAccessor);

      ko.bindingHandlers.verifiableValue.verify(element, valueAccessor);
    },
    verify: function (element, valueAccessor, force) {
      var newValue = ko.utils.unwrapObservable(valueAccessor());

      element.setCustomValidity("");
      if (newValue !== undefined || force) {
        var obs = valueAccessor();
        if (obs.verify) {
          var msg = obs.verify(newValue || "");
          obs.errorMessage(msg);
          element.validity = !msg;
          element.setCustomValidity(msg);
        }
      } else {
        valueAccessor()('');
      }
    }
  };

  ko.bindingHandlers["verifiableSubmit"] = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
      ko.utils.registerEventHandler(element, "submit", function (event) {
        $('input', element).each(function (i, input) {
          if(input.verify) input.verify();
        });
        var handlerReturnValue;
        var value = valueAccessor();
        try {
          if (element.checkValidity()) {
            handlerReturnValue = value.call(viewModel, element);
          }
        }
        finally {
          if (handlerReturnValue !== true) { // Normally we want to prevent default action. Developer can override this be explicitly returning true.
            if (event.preventDefault)
              event.preventDefault();
            else
              event.returnValue = false;
          }
        }
      });
    }
  };

});