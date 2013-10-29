define(function () {
  ko.bindingHandlers.fadeVisible = {
    init: function (element, valueAccessor) {
      var value = valueAccessor();
      $(element).toggle(ko.utils.unwrapObservable(value));
    },
    update: function (element, valueAccessor) {
      var value = valueAccessor();
      ko.utils.unwrapObservable(value) ? $(element).fadeIn(200) : $(element).fadeOut(500);
    }
  };

  ko.bindingHandlers.dropdown = {
    init: function (element, valueAccessor) {
      var data = valueAccessor(), $element = $(element).hide();
      var dic = {};

      if (typeof(data.selected) !== "function") {
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
});