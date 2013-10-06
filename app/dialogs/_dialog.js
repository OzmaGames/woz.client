define(['durandal/system', 'durandal/app', 'durandal/composition', 'durandal/activator'],
  function (system, app, composition, activator) {

    var className = 'dialogs';
    var dialogs = {};

    function createBaseHost() {
      var body = $('body'), host = body.children('.' + className).get(0);
      if (host === undefined) {
        return $('<div/>', { 'class': className }).appendTo(body).get(0);
      }
      return host;
    }

    function getHost(moduleId, singleton) {
      var baseHost = createBaseHost();

      return system.defer(function (dfd) {
        if (singleton) {
          close(moduleId, { msg: 'queue' }).then(createHost);
        } else { createHost(); }

        function createHost() {
          //dialogs[moduleId] = theDialog;
          var host = $('<div/>', { 'module': moduleId }).appendTo(baseHost).get(0);
          dfd.resolve(host);
        }
      }).promise();
    }

    function ensureDialogInstance(objOrModuleId) {
      return system.defer(function (dfd) {
        if (system.isString(objOrModuleId)) {
          system.acquire(objOrModuleId).then(function (module) {
            dfd.resolve(system.resolveObject(module));
          });
        } else {
          dfd.resolve(objOrModuleId);
        }
      }).promise();
    }

    function createCompositionSettings(moduleId, dialogContext) {
      var settings = {
        model: moduleId,
        activate: false
      };

      if (dialogContext) {
        if (dialogContext.attached)
          settings.attached = dialogContext.attached;
        if (dialogContext.compositionComplete)
          settings.compositionComplete = dialogContext.compositionComplete;
      }

      return settings;
    }

    function show(obj, activationData, context) {
      return system.defer(function (dfd) {
        $.when(ensureDialogInstance(obj), getHost(obj, true)).then(function (instance, host) {
          var dialogActivator = activator.create();
          dialogActivator.activateItem(instance, activationData).then(function (success) {
            if (success) {
              var theDialog = instance.__dialog__ = {
                owner: instance,
                context: context,
                activator: dialogActivator,
                close: function () {
                  var args = arguments, last = args.length ? args[args.length - 1] : {};
                  if (last && last.forced) {
                    resolve(args);
                  }
                  return dialogActivator.deactivateItem(instance, true).then(function (closeSuccess) {
                    if (closeSuccess) {
                      ko.removeNode(dialogs[obj].host);
                      delete instance.__dialog__;
                      if (!last || !last.forced) { resolve(args); }
                    }
                  });

                  function resolve(args) {
                    if (args.length === 0) {
                      dfd.resolve();
                    } else if (args.length === 1) {
                      dfd.resolve(args[0]);
                    } else {
                      dfd.resolve.apply(dfd, args);
                    }
                  }
                }
              };
              dialogs[obj] = theDialog;

              instance.onClose = function () {
                var args = [];
                for (var i = 0; i < arguments.length; i++) {
                  args.push(arguments[i]);
                }
                args.push({ forced: true });
                theDialog.close.apply(this, args);
              };
              theDialog.settings = createCompositionSettings(instance, context);
              theDialog.host = host;
              composition.compose(theDialog.host, theDialog.settings);
            } else {
              dfd.resolve(false);
            }
          });
        });
      }).promise();
    }

    function close(key, deactivationData) {
      return system.defer(function (dfd) {
        if (dialogs.hasOwnProperty(key)) {
          dialogs[key].close(deactivationData).then(function () {
            delete dialogs[key];
            dfd.resolve();
          });
        } else {
          dfd.resolve();
        }
      }).promise();
    }

    return {
      show: function (type, activationData, context) {
        return show('dialogs/' + type, activationData, context);
      },
      close: function (type, deactivationData) {
        return close('dialogs/' + type, deactivationData);
      }
    };
  });