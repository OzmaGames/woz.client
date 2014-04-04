define(function () {
   ko.bindingHandlers["fadeVisible"] = {
      init: function (element, valueAccessor, allBindingsAccessor) {
         var value = valueAccessor();
         $(element).toggle(ko.utils.unwrapObservable(value));
      },
      update: function (element, valueAccessor, allBindingsAccessor) {
         var value = valueAccessor(), fadeIn, fadeOut;
         others = allBindingsAccessor();

         if (others.duration === undefined) {
            others.duration = value.duration;
         }

         if (others.duration !== undefined) {
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

   ko.bindingHandlers["dVisible"] = {
      init: function (element, valueAccessor, allBindingsAccessor) {
         var value = valueAccessor();
         $(element).toggle(ko.utils.unwrapObservable(value));
      },
      update: function (element, valueAccessor, allBindingsAccessor) {
         var value = valueAccessor(), fadeIn, fadeOut;
         others = allBindingsAccessor();

         if (others.duration === undefined) {
            others.duration = value.duration;
         }

         if (others.duration !== undefined) {
            if (typeof others.duration == "number") {
               fadeIn = fadeOut = others.duration;
            } else {
               fadeIn = others.duration.fadeIn || 0;
               fadeOut = others.duration.fadeOut || 500;
            }
         } else {
            fadeIn = fadeOut = 0;
         }

         var isActive = ko.utils.unwrapObservable(value);

         setTimeout(function () {
            $(element).toggle(isActive);
         }, isActive ? fadeIn : fadeOut);

      }
   };

   ko.bindingHandlers["timeAgo"] = {
      init: function (element, valueAccessor, allBindingsAccessor) {

         var intervalID = setInterval(function (data) {
            if (ko.dataFor(data.element)) {
               var time = new Date().getTime() - data.time;
               $(data.element).text(timeAgo(time) + 'ago');
            } else {
               clearInterval(intervalID);
            }
         }, 5000, { element: element, time: valueAccessor() });

         var time = new Date(new Date().getTime() - valueAccessor());
         $(element).text(timeAgo(time) + 'ago');


         function suffix_s(number, name, s) {
            return number + ' ' + name + (number > 1 ? (s || 's') : '') + ' ';
         }

         function timeAgo(time) {
            var str = "", count = 0;
            if (time / 86400000 > 1) {
               str += suffix_s(Math.floor(time / 86400000), "day")
               count++;
            }
            time %= 86400000;

            if (str || time / 3600000 > 1) {
               str += suffix_s(Math.floor(time / 3600000), "hour")
               count++;
            }
            time %= 3600000;

            if (count == 2) return str;
            if (str || time / 60000 > 1) {
               str += suffix_s(Math.floor(time / 60000), "min", ' ')
               count++;
            }
            time %= 60000;

            if (count == 2 || str) return str;
            return "few seconds ";
         }
      }
   };

   ko.bindingHandlers["date"] = {
      init: function (element, valueAccessor, allBindingsAccessor) {
         var time = new Date(valueAccessor()), str = "";

         str += ko.bindingHandlers.date.months[time.getMonth()] + ' ';
         str += ('0' + time.getDate()).substr(-2) + ' ';
         str += ('0' + time.getHours()).substr(-2) + ':' + ('0' + time.getUTCMinutes()).substr(-2);

         $(element).text(str);
      },
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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

   ko.bindingHandlers["search"] = {
      init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
         element.addEventListener("search", function (e) {
            valueAccessor().call(viewModel, e);
         });
      }
   };
   
   ko.bindingHandlers["tab"] = {
      init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
         var obj = valueAccessor();

         var activeIndex = ko.observable(obj.activeTab || 0),
            items = $(element).find('li:not(:last)').each(function (index, el) {
               $(this).data('index', index);
            }).click(function () {
               activeIndex($(this).data('index'));
            });

         ko.computed({
            disposeWhenNodeIsRemoved: element,
            read: function () {            
               var index = activeIndex();

               for (var i = 0; i < items.length; i++) {
                  items[i].classList.remove('active');
               }
               items[index].classList.add('active');

               if (typeof obj.nav == "function") {
                  var dfd = $('.content', element).slideUp().delay(30).promise();
                  obj.nav.call(viewModel, index, dfd).then(function () {
                     $('.content', element).slideDown(500);
                  });
               }
            }
         });
      }
   };

   var clickInit = ko.bindingHandlers.click.init;

   ko.bindingHandlers["click"].init = function (element, valueAccessor, allBindingsAccessor, viewModel) {
      if ($.support.touch) {
         $(element).bind("touchstart", function (e) {
            //e.preventDefault();
            e.stopPropagation();
         });

         $(element).touchPunch();

         element.onlyClick = function (event) {
            if (valueAccessor().apply(viewModel, [viewModel, event]) !== true) {
               event.preventDefault();
            }
         }
      }
      else {
         clickInit.apply(this, arguments);
      }
   };

   ko.bindingHandlers["pointer"] = {
      init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
         var value = valueAccessor();                 

         if (value.enter)
            element.addEventListener($.support.touch ? "touchenter" : "mouseenter", function (event) {               
               value.enter.call(viewModel, event);
            });
         if (value.leave)
            element.addEventListener($.support.touch ? "touchleave" : "mouseleave", function (event) {               
               value.leave.call(viewModel, event);
            });
         if (value.drop)
            element.addEventListener($.support.touch ? "touchend" : "mouseup", function (event) {               
               value.drop.call(viewModel, event);
            });
      }
   };

   ko.bindingHandlers["verifiableValue"] = {
      init: function (element, valueAccessor, allBindingsAccessor) {
         ko.bindingHandlers.value.init(element, valueAccessor, allBindingsAccessor);
      },
      update: function (element, valueAccessor) {
         ko.bindingHandlers.value.update(element, valueAccessor);
         element.setCustomValidity(valueAccessor().validationMessage() || '');
      }
   };

   ko.bindingHandlers["verifiableSubmit"] = {
      init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
         ko.utils.registerEventHandler(element, "submit", function (event) {
            for (var name in viewModel) {
               var item = viewModel[name];
               if (ko.isObservable(item) && item.validate) {
                  item.validate();
               }
            }

            if (!element.checkValidity() || valueAccessor().call(viewModel, element) !== true) {
               event.preventDefault();
            }
         });
      }
   };

   ko.extenders["required"] = function (target, data) {
      SetupValidation("required", target, function (target, newValue, overrideMessage) {
         return newValue ? "" : overrideMessage || "This field is required";
      }, data);

      return target;
   };

   ko.extenders["stringLength"] = function (target, data) {
      SetupValidation("stringLength", target, function (target, newValue, rule) {
         return newValue.length >= rule.minLength ? "" : rule.message || "min length is " + rule.minLength;
      }, data);

      return target;
   };

   ko.extenders["customValidation"] = function (target, data) {
      SetupValidation("stringLength", target, function (target, newValue, customFunc) {
         return customFunc(newValue);
      }, data);

      return target;
   };

   function SetupValidation(ruleName, target, validateFunc, data) {
      if (!target.hasOwnProperty("validate")) {
         target.rules = {};
         target.hasError = ko.observable();
         target.validationMessage = ko.observable();
         target.validate = function () { validate(target()); };
         target.subscribe(validate);
      }

      target.rules[ruleName] = {
         validate: validateFunc,
         data: data
      };

      function validate(newValue) {
         for (var ruleName in target.rules) {
            var rule = target.rules[ruleName];
            var validationMessage = rule.validate(target, newValue, rule.data);

            if (validationMessage) {
               target.hasError(true);
               target.validationMessage(validationMessage);
               return;
            }
         }
         target.hasError(false);
         target.validationMessage('');
      }
   }
});