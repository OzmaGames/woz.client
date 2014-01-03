define(['durandal/system', 'durandal/app', 'durandal/composition', 'durandal/activator'],
  function (system, app, composition, activator) {

     var className = 'dialogs';
     var dialogs = {};

     function createRoot(fixed) {
        var container = document.getElementById(fixed ? 'fixed' : 'app'),
            root = container.querySelector('.' + className);

        if (!root) {
           root = document.createElement('div');
           root.className = className;
           container.appendChild(root);
        }

        return root;
     }

     function getHost(instance) {
        var root = createRoot(instance.attributes.fixed);

        return system.defer(function (dfd) {
           if (instance.attributes.singleton) {
              var z = close(instance.__moduleId__, { msg: 'queue' })
                 .then(createHost);
           } else {
              createHost();
           }

           function createHost() {
              var host = $('<div/>', { 'module': instance.__moduleId__ }).appendTo(root).get(0);
              dialogs[instance.__moduleId__] = {
                 ready: system.defer()
              };
              dfd.resolve(host);
           }
        }).promise();
     }

     function ensureInstance(objOrModuleId) {
        return system.defer(function (dfd) {
           if (system.isString(objOrModuleId)) {
              system.acquire(objOrModuleId).then(function (module) {
                 setup(system.resolveObject(module));
              });
           } else {
              setup(objOrModuleId);
           }

           function setup(instance) {
              instance.attributes = instance.attributes || { fixed: false, singleton: true };
              dfd.resolve(instance);
           }
        }).promise();
     }

     function createSettings(moduleId, context) {
        var settings = {
           model: moduleId,
           activate: false
        };

        if (context) {
           if (context.compositionComplete)
              settings.compositionComplete = context.compositionComplete;
        }

        settings.bindingComplete = function () {
           var base = this.model;
           if (base.images) {
              var img = new Image;
              img.onload = function () {
                 base.load.apply(base);
              };
              img.src = base.el.css('background-image').replace(/url|[\'\"\(\)]/g, '');
           }
        }

        return settings;
     }

     function show(obj, activationData, context) {
        return system.defer(function (dfd) {
           ensureInstance(obj).then(function (instance) {
              getHost(instance).then(function (host) {
                 var dialogActivator = activator.create();
                 dialogActivator.activateItem(instance, activationData).then(function (success) {
                    if (!success) { dfd.reject(); }
                 }).then(function () {
                    var theDialog = instance.__dialog__ = {
                       owner: instance,
                       context: context,
                       activator: dialogActivator,
                       host: host,
                       settings: createSettings(instance, context),
                    };

                    theDialog.close = function () {
                       var args = arguments, last = args.length ? args[args.length - 1] : {};

                       delete dialogs[obj];

                       if (last && last.forced) {
                          dfd.resolve.apply(dfd, args);
                       }

                       return dialogActivator.deactivateItem(theDialog.owner, true).then(function () {
                          ko.removeNode(theDialog.host);
                          delete theDialog.owner.__dialog__;
                          if (!last || !last.forced) {
                             dfd.resolve.apply(dfd, args);
                          }
                       });
                    }

                    instance.onClose = instance.forceClose = function () {
                       var args = [];
                       for (var i = 0; i < arguments.length; i++) {
                          args.push(arguments[i]);
                       }
                       args.push({ forced: true });
                       theDialog.close.apply(this, args);
                    };

                    dialogs[obj].ready.resolve(theDialog);

                    composition.compose(theDialog.host, theDialog.settings);
                 })
              })
           }).promise();
        })
     }

     function close(key, deactivationData) {
        return system.defer(function (dfd) {
           if (key in dialogs) {
              dialogs[key].ready.then(function (dialog) {
                 dialog.close(deactivationData).then(function () {
                    dfd.resolve();
                 });
              }, function () {
                 dfd.resolve();
              });
           } else {
              dfd.resolve();
           }
        }).promise();
     }

     function closeAll() {
        return system.defer(function (dfd) {
           var all = [];
           for (var name in dialogs) {
              all.push(close(name, { force: true }));
           }
           $.when.apply(this, all).always(function () {
              dfd.resolve();
           });
        }).promise();
     }

     return {
        _dialogs: dialogs,
        show: function (type, activationData, context) {
           return show('dialogs/templates/' + type, activationData, context);
        },
        close: function (type, deactivationData) {
           return close('dialogs/templates/' + type, deactivationData);
        },
        closeAll: closeAll
     };
  });