requirejs.config({
    paths: {
        'durandal': '../shared/lib/durandal',
        'plugins': '../shared/lib/durandal/plugins',
        'transitions': '../shared/lib/durandal/transitions',
        'crypto.sha3': '../shared/lib/crypto.sha3.min',
        'socket.io': '../shared/lib/socket.io',
        'jquery': '../shared/lib/jquery.min',
        'jquery.trans': '../shared/lib/jquery.transit.min',
        'knockout': '../shared/lib/knockout',
        'text': '../shared/lib/text.min',
        'facebook': '//connect.facebook.net/en_US/sdk',
    },
    urlArgs: (new Date).getTime(),
    shim: {
        'facebook': {
            'export': 'FB'
        }
    }
});

define('socket', ['socket.io'], function (io) { return io; });

define(['durandal/system', 'durandal/app', 'plugins/router', 'durandal/viewLocator',
    'api/datacontext', 'jquery', 'knockout', 'dialogs/_builder'],
    function (system, app, router, viewLocator, ctx, jQuery, ko, Dialog) {
    //>>excludeStart("build", true);
    //system.debug(true);
    //>>excludeEnd("build");    
    require(['jquery.trans']);

    window.app = app;
    app.title = 'Words of Oz';
    app.ctx = ctx;
    app.dialog = Dialog;

    app.loading = ko.observable(false);
    app.Sound = { play: function () { } };
    ko.bindingHandlers["verifiableValue"] = {
        init: function (element, valueAccessor, allBindingsAccessor) {
            ko.bindingHandlers.value.init(element, valueAccessor, allBindingsAccessor);
            setTimeout(function () {
                var model = valueAccessor();

                if (model() != $(element).val() && $(element).val()) {
                    model($(element).val());
                }

                if (!model()) {
                    setTimeout(function () {
                        if (model() != $(element).val() && $(element).val()) {
                            model($(element).val());
                        }
                    }, 500);
                }
            }, 200);
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

                event.preventDefault();
                if (element.checkValidity()) {
                    valueAccessor().call(viewModel, element);
                }
            });

            //setTimeout(function () {
            //    if (viewModel.getFormModels) {
            //        var models = viewModel.getFormModels();
            //        var index = 0;
            //        $('input', element).each(function () {
            //            if (!models[index]() && $(this).val()) {
            //                models[index]($(this).val());
            //            }
            //            index++;
            //        });
            //    }
            //    //$('input', element).first().focus().select();
            //}, 10);
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


    app.start().then(function () {
        viewLocator.useConvention();
        app.setRoot('shell', null, 'app');
    });

    function loadCSS(css) {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = 'css/' + css + '.css';
        document.getElementsByTagName("head")[0].appendChild(link);
    }
});