(function () {
/**
 * almond 0.2.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name) && !defining.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    function onResourceLoad(name, defined, deps){
        if(requirejs.onResourceLoad && name){
            requirejs.onResourceLoad({defined:defined}, {id:name}, deps);
        }
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (defined.hasOwnProperty(depName) ||
                           waiting.hasOwnProperty(depName) ||
                           defining.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }

        onResourceLoad(name, defined, args);
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("../lib/almond-custom", function(){});

define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('text!account/index.html',[],function () { return '<div>\r\n    <ul class="nav nav-list">        \r\n        <!--ko foreach: navBar-->\r\n        <li data-bind="css: { active: isActive }">\r\n            <a data-bind="attr: { href: hash }, text: title" class="button-small"></a>\r\n        </li>\r\n        <!--/ko-->\r\n    </ul>\r\n\r\n    <div data-bind="router: { transition: \'entrance\', cacheViews: true }"></div>\r\n</div>';});

define('durandal/system',["require","jquery"],function(t,e){function n(t){var e="[object "+t+"]";i["is"+t]=function(t){return s.call(t)==e}}var i,r=!1,o=Object.keys,a=Object.prototype.hasOwnProperty,s=Object.prototype.toString,c=!1,u=Array.isArray,l=Array.prototype.slice;if(Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(t){console[t]=this.call(console[t],console)},Function.prototype.bind)}catch(h){c=!0}t.on&&t.on("moduleLoaded",function(t,e){i.setModuleId(t,e)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(t,e){i.setModuleId(t.defined[e.id],e.id)});var d=function(){},f=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var t=0;t<arguments.length;)console.log("Item "+(t+1)+": "+arguments[t]),t++;else 1==l.call(arguments).length&&"string"==typeof l.call(arguments)[0]?console.log(l.call(arguments).toString()):console.log.apply(console,l.call(arguments));else Function.prototype.bind&&!c||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,l.call(arguments))}catch(e){}},p=function(t){if(t instanceof Error)throw t;throw new Error(t)};i={version:"2.0.0",noop:d,getModuleId:function(t){return t?"function"==typeof t?t.prototype.__moduleId__:"string"==typeof t?null:t.__moduleId__:null},setModuleId:function(t,e){return t?"function"==typeof t?(t.prototype.__moduleId__=e,void 0):("string"!=typeof t&&(t.__moduleId__=e),void 0):void 0},resolveObject:function(t){return i.isFunction(t)?new t:t},debug:function(t){return 1==arguments.length&&(r=t,r?(this.log=f,this.error=p,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=d,this.error=d)),r},log:d,error:d,assert:function(t,e){t||i.error(new Error(e||"Assert:Failed"))},defer:function(t){return e.Deferred(t)},guid:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(t){var e=0|16*Math.random(),n="x"==t?e:8|3&e;return n.toString(16)})},acquire:function(){var e,n=arguments[0],r=!1;return i.isArray(n)?(e=n,r=!0):e=l.call(arguments,0),this.defer(function(n){t(e,function(){var t=arguments;setTimeout(function(){t.length>1||r?n.resolve(l.call(t,0)):n.resolve(t[0])},1)},function(t){n.reject(t)})}).promise()},extend:function(t){for(var e=l.call(arguments,1),n=0;n<e.length;n++){var i=e[n];if(i)for(var r in i)t[r]=i[r]}return t},wait:function(t){return i.defer(function(e){setTimeout(e.resolve,t)}).promise()}},i.keys=o||function(t){if(t!==Object(t))throw new TypeError("Invalid object");var e=[];for(var n in t)a.call(t,n)&&(e[e.length]=n);return e},i.isElement=function(t){return!(!t||1!==t.nodeType)},i.isArray=u||function(t){return"[object Array]"==s.call(t)},i.isObject=function(t){return t===Object(t)},i.isBoolean=function(t){return"boolean"==typeof t},i.isPromise=function(t){return t&&i.isFunction(t.then)};for(var g=["Arguments","Function","String","Number","Date","RegExp"],v=0;v<g.length;v++)n(g[v]);return i});
define('durandal/viewEngine',["durandal/system","jquery"],function(t,e){var n;return n=e.parseHTML?function(t){return e.parseHTML(t)}:function(t){return e(t).get()},{viewExtension:".html",viewPlugin:"text",isViewUrl:function(t){return-1!==t.indexOf(this.viewExtension,t.length-this.viewExtension.length)},convertViewUrlToViewId:function(t){return t.substring(0,t.length-this.viewExtension.length)},convertViewIdToRequirePath:function(t){return this.viewPlugin+"!"+t+this.viewExtension},parseMarkup:n,processMarkup:function(t){var e=this.parseMarkup(t);return this.ensureSingleElement(e)},ensureSingleElement:function(t){if(1==t.length)return t[0];for(var n=[],i=0;i<t.length;i++){var r=t[i];if(8!=r.nodeType){if(3==r.nodeType){var o=/\S/.test(r.nodeValue);if(!o)continue}n.push(r)}}return n.length>1?e(n).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0):n[0]},createView:function(e){var n=this,i=this.convertViewIdToRequirePath(e);return t.defer(function(r){t.acquire(i).then(function(t){var i=n.processMarkup(t);i.setAttribute("data-view",e),r.resolve(i)}).fail(function(t){n.createFallbackView(e,i,t).then(function(t){t.setAttribute("data-view",e),r.resolve(t)})})}).promise()},createFallbackView:function(e,n){var i=this,r='View Not Found. Searched for "'+e+'" via path "'+n+'".';return t.defer(function(t){t.resolve(i.processMarkup('<div class="durandal-view-404">'+r+"</div>"))}).promise()}}});
define('durandal/viewLocator',["durandal/system","durandal/viewEngine"],function(t,e){function n(t,e){for(var n=0;n<t.length;n++){var i=t[n],r=i.getAttribute("data-view");if(r==e)return i}}function i(t){return(t+"").replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g,"\\$1")}return{useConvention:function(t,e,n){t=t||"viewmodels",e=e||"views",n=n||e;var r=new RegExp(i(t),"gi");this.convertModuleIdToViewId=function(t){return t.replace(r,e)},this.translateViewIdToArea=function(t,e){return e&&"partial"!=e?n+"/"+e+"/"+t:n+"/"+t}},locateViewForObject:function(e,n,i){var r;if(e.getView&&(r=e.getView()))return this.locateView(r,n,i);if(e.viewUrl)return this.locateView(e.viewUrl,n,i);var o=t.getModuleId(e);return o?this.locateView(this.convertModuleIdToViewId(o),n,i):this.locateView(this.determineFallbackViewId(e),n,i)},convertModuleIdToViewId:function(t){return t},determineFallbackViewId:function(t){var e=/function (.{1,})\(/,n=e.exec(t.constructor.toString()),i=n&&n.length>1?n[1]:"";return"views/"+i},translateViewIdToArea:function(t){return t},locateView:function(i,r,o){if("string"==typeof i){var a;if(a=e.isViewUrl(i)?e.convertViewUrlToViewId(i):i,r&&(a=this.translateViewIdToArea(a,r)),o){var s=n(o,a);if(s)return t.defer(function(t){t.resolve(s)}).promise()}return e.createView(a)}return t.defer(function(t){t.resolve(i)}).promise()}}});
define('durandal/binder',["durandal/system","knockout"],function(t,e){function n(e){return void 0===e?{applyBindings:!0}:t.isBoolean(e)?{applyBindings:e}:(void 0===e.applyBindings&&(e.applyBindings=!0),e)}function i(i,u,l,h){if(!u||!l)return r.throwOnErrors?t.error(o):t.log(o,u,h),void 0;if(!u.getAttribute)return r.throwOnErrors?t.error(a):t.log(a,u,h),void 0;var d=u.getAttribute("data-view");try{var f;return i&&i.binding&&(f=i.binding(u)),f=n(f),r.binding(h,u,f),f.applyBindings?(t.log("Binding",d,h),e.applyBindings(l,u)):i&&e.utils.domData.set(u,c,{$data:i}),r.bindingComplete(h,u,f),i&&i.bindingComplete&&i.bindingComplete(u),e.utils.domData.set(u,s,f),f}catch(p){p.message=p.message+";\nView: "+d+";\nModuleId: "+t.getModuleId(h),r.throwOnErrors?t.error(p):t.log(p.message)}}var r,o="Insufficient Information to Bind",a="Unexpected View Type",s="durandal-binding-instruction",c="__ko_bindingContext__";return r={binding:t.noop,bindingComplete:t.noop,throwOnErrors:!1,getBindingInstruction:function(t){return e.utils.domData.get(t,s)},bindContext:function(t,e,n){return n&&t&&(t=t.createChildContext(n)),i(n,e,t,n||(t?t.$data:null))},bind:function(t,e){return i(t,e,t,t)}}});
define('durandal/activator',["durandal/system","knockout"],function(t,e){function n(t){return void 0==t&&(t={}),t.closeOnDeactivate||(t.closeOnDeactivate=u.defaults.closeOnDeactivate),t.beforeActivate||(t.beforeActivate=u.defaults.beforeActivate),t.afterDeactivate||(t.afterDeactivate=u.defaults.afterDeactivate),t.affirmations||(t.affirmations=u.defaults.affirmations),t.interpretResponse||(t.interpretResponse=u.defaults.interpretResponse),t.areSameItem||(t.areSameItem=u.defaults.areSameItem),t}function i(e,n,i){return t.isArray(i)?e[n].apply(e,i):e[n](i)}function r(e,n,i,r,o){if(e&&e.deactivate){t.log("Deactivating",e);var a;try{a=e.deactivate(n)}catch(s){return t.error(s),r.resolve(!1),void 0}a&&a.then?a.then(function(){i.afterDeactivate(e,n,o),r.resolve(!0)},function(e){t.log(e),r.resolve(!1)}):(i.afterDeactivate(e,n,o),r.resolve(!0))}else e&&i.afterDeactivate(e,n,o),r.resolve(!0)}function o(e,n,r,o){if(e)if(e.activate){t.log("Activating",e);var a;try{a=i(e,"activate",o)}catch(s){return t.error(s),r(!1),void 0}a&&a.then?a.then(function(){n(e),r(!0)},function(e){t.log(e),r(!1)}):(n(e),r(!0))}else n(e),r(!0);else r(!0)}function a(e,n,i){return i.lifecycleData=null,t.defer(function(r){if(e&&e.canDeactivate){var o;try{o=e.canDeactivate(n)}catch(a){return t.error(a),r.resolve(!1),void 0}o.then?o.then(function(t){i.lifecycleData=t,r.resolve(i.interpretResponse(t))},function(e){t.error(e),r.resolve(!1)}):(i.lifecycleData=o,r.resolve(i.interpretResponse(o)))}else r.resolve(!0)}).promise()}function s(e,n,r,o){return r.lifecycleData=null,t.defer(function(a){if(e==n())return a.resolve(!0),void 0;if(e&&e.canActivate){var s;try{s=i(e,"canActivate",o)}catch(c){return t.error(c),a.resolve(!1),void 0}s.then?s.then(function(t){r.lifecycleData=t,a.resolve(r.interpretResponse(t))},function(e){t.error(e),a.resolve(!1)}):(r.lifecycleData=s,a.resolve(r.interpretResponse(s)))}else a.resolve(!0)}).promise()}function c(i,c){var u,l=e.observable(null);c=n(c);var h=e.computed({read:function(){return l()},write:function(t){h.viaSetter=!0,h.activateItem(t)}});return h.__activator__=!0,h.settings=c,c.activator=h,h.isActivating=e.observable(!1),h.canDeactivateItem=function(t,e){return a(t,e,c)},h.deactivateItem=function(e,n){return t.defer(function(t){h.canDeactivateItem(e,n).then(function(i){i?r(e,n,c,t,l):(h.notifySubscribers(),t.resolve(!1))})}).promise()},h.canActivateItem=function(t,e){return s(t,l,c,e)},h.activateItem=function(e,n){var i=h.viaSetter;return h.viaSetter=!1,t.defer(function(a){if(h.isActivating())return a.resolve(!1),void 0;h.isActivating(!0);var s=l();return c.areSameItem(s,e,u,n)?(h.isActivating(!1),a.resolve(!0),void 0):(h.canDeactivateItem(s,c.closeOnDeactivate).then(function(d){d?h.canActivateItem(e,n).then(function(d){d?t.defer(function(t){r(s,c.closeOnDeactivate,c,t)}).promise().then(function(){e=c.beforeActivate(e,n),o(e,l,function(t){u=n,h.isActivating(!1),a.resolve(t)},n)}):(i&&h.notifySubscribers(),h.isActivating(!1),a.resolve(!1))}):(i&&h.notifySubscribers(),h.isActivating(!1),a.resolve(!1))}),void 0)}).promise()},h.canActivate=function(){var t;return i?(t=i,i=!1):t=h(),h.canActivateItem(t)},h.activate=function(){var t;return i?(t=i,i=!1):t=h(),h.activateItem(t)},h.canDeactivate=function(t){return h.canDeactivateItem(h(),t)},h.deactivate=function(t){return h.deactivateItem(h(),t)},h.includeIn=function(t){t.canActivate=function(){return h.canActivate()},t.activate=function(){return h.activate()},t.canDeactivate=function(t){return h.canDeactivate(t)},t.deactivate=function(t){return h.deactivate(t)}},c.includeIn?h.includeIn(c.includeIn):i&&h.activate(),h.forItems=function(e){c.closeOnDeactivate=!1,c.determineNextItemToActivate=function(t,e){var n=e-1;return-1==n&&t.length>1?t[1]:n>-1&&n<t.length-1?t[n]:null},c.beforeActivate=function(t){var n=h();if(t){var i=e.indexOf(t);-1==i?e.push(t):t=e()[i]}else t=c.determineNextItemToActivate(e,n?e.indexOf(n):0);return t},c.afterDeactivate=function(t,n){n&&e.remove(t)};var n=h.canDeactivate;h.canDeactivate=function(i){return i?t.defer(function(t){function n(){for(var e=0;e<o.length;e++)if(!o[e])return t.resolve(!1),void 0;t.resolve(!0)}for(var r=e(),o=[],a=0;a<r.length;a++)h.canDeactivateItem(r[a],i).then(function(t){o.push(t),o.length==r.length&&n()})}).promise():n()};var i=h.deactivate;return h.deactivate=function(n){return n?t.defer(function(t){function i(i){h.deactivateItem(i,n).then(function(){o++,e.remove(i),o==a&&t.resolve()})}for(var r=e(),o=0,a=r.length,s=0;a>s;s++)i(r[s])}).promise():i()},h},h}var u,l={closeOnDeactivate:!0,affirmations:["yes","ok","true"],interpretResponse:function(n){return t.isObject(n)&&(n=n.can||!1),t.isString(n)?-1!==e.utils.arrayIndexOf(this.affirmations,n.toLowerCase()):n},areSameItem:function(t,e){return t==e},beforeActivate:function(t){return t},afterDeactivate:function(t,e,n){e&&n&&n(null)}};return u={defaults:l,create:c,isActivator:function(t){return t&&t.__activator__}}});
define('durandal/composition',["durandal/system","durandal/viewLocator","durandal/binder","durandal/viewEngine","durandal/activator","jquery","knockout"],function(t,e,n,i,r,o,a){function s(t){for(var e=[],n={childElements:e,activeView:null},i=a.virtualElements.firstChild(t);i;)1==i.nodeType&&(e.push(i),i.getAttribute(m)&&(n.activeView=i)),i=a.virtualElements.nextSibling(i);return n.activeView||(n.activeView=e[0]),n}function c(){y--,0===y&&setTimeout(function(){for(var t=_.length;t--;)_[t]();_=[]},1)}function u(e,n,i){if(i)n();else if(e.activate&&e.model&&e.model.activate){var r;r=t.isArray(e.activationData)?e.model.activate.apply(e.model,e.activationData):e.model.activate(e.activationData),r&&r.then?r.then(n):r||void 0===r?n():c()}else n()}function l(){var e=this;e.activeView&&e.activeView.removeAttribute(m),e.child&&(e.model&&e.model.attached&&(e.composingNewView||e.alwaysTriggerAttach)&&e.model.attached(e.child,e.parent,e),e.attached&&e.attached(e.child,e.parent,e),e.child.setAttribute(m,!0),e.composingNewView&&e.model&&(e.model.compositionComplete&&g.current.complete(function(){e.model.compositionComplete(e.child,e.parent,e)}),e.model.detached&&a.utils.domNodeDisposal.addDisposeCallback(e.child,function(){e.model.detached(e.child,e.parent,e)})),e.compositionComplete&&g.current.complete(function(){e.compositionComplete(e.child,e.parent,e)})),c(),e.triggerAttach=t.noop}function h(e){if(t.isString(e.transition)){if(e.activeView){if(e.activeView==e.child)return!1;if(!e.child)return!0;if(e.skipTransitionOnSameViewId){var n=e.activeView.getAttribute("data-view"),i=e.child.getAttribute("data-view");return n!=i}}return!0}return!1}function d(t){for(var e=0,n=t.length,i=[];n>e;e++){var r=t[e].cloneNode(!0);i.push(r)}return i}function f(t){var e=d(t.parts),n=g.getParts(e),i=g.getParts(t.child);for(var r in n)o(i[r]).replaceWith(n[r])}function p(e){var n,i,r=a.virtualElements.childNodes(e);if(!t.isArray(r)){var o=[];for(n=0,i=r.length;i>n;n++)o[n]=r[n];r=o}for(n=1,i=r.length;i>n;n++)a.removeNode(r[n])}var g,v={},m="data-active-view",_=[],y=0,w="durandal-composition-data",b="data-part",x="["+b+"]",k=["model","view","transition","area","strategy","activationData"],S={complete:function(t){_.push(t)}};return g={convertTransitionToModuleId:function(t){return"transitions/"+t},defaultTransitionName:null,current:S,addBindingHandler:function(t,e,n){var i,r,o="composition-handler-"+t;e=e||a.bindingHandlers[t],n=n||function(){return void 0},r=a.bindingHandlers[t]={init:function(t,i,r,s,c){var u={trigger:a.observable(null)};return g.current.complete(function(){e.init&&e.init(t,i,r,s,c),e.update&&(a.utils.domData.set(t,o,e),u.trigger("trigger"))}),a.utils.domData.set(t,o,u),n(t,i,r,s,c)},update:function(t,e,n,i,r){var s=a.utils.domData.get(t,o);return s.update?s.update(t,e,n,i,r):(s.trigger(),void 0)}};for(i in e)"init"!==i&&"update"!==i&&(r[i]=e[i])},getParts:function(e){var n={};t.isArray(e)||(e=[e]);for(var i=0;i<e.length;i++){var r=e[i];if(r.getAttribute){var a=r.getAttribute(b);a&&(n[a]=r);for(var s=o(x,r).not(o("[data-bind] "+x,r)),c=0;c<s.length;c++){var u=s.get(c);n[u.getAttribute(b)]=u}}}return n},cloneNodes:d,finalize:function(e){if(e.transition=e.transition||this.defaultTransitionName,e.child||e.activeView)if(h(e)){var i=this.convertTransitionToModuleId(e.transition);t.acquire(i).then(function(t){e.transition=t,t(e).then(function(){if(e.cacheViews){if(e.activeView){var t=n.getBindingInstruction(e.activeView);void 0==t.cacheViews||t.cacheViews||a.removeNode(e.activeView)}}else e.child?p(e.parent):a.virtualElements.emptyNode(e.parent);e.triggerAttach()})}).fail(function(e){t.error("Failed to load transition ("+i+"). Details: "+e.message)})}else{if(e.child!=e.activeView){if(e.cacheViews&&e.activeView){var r=n.getBindingInstruction(e.activeView);void 0==r.cacheViews||r.cacheViews?o(e.activeView).hide():a.removeNode(e.activeView)}e.child?(e.cacheViews||p(e.parent),o(e.child).show()):e.cacheViews||a.virtualElements.emptyNode(e.parent)}e.triggerAttach()}else e.cacheViews||a.virtualElements.emptyNode(e.parent),e.triggerAttach()},bindAndShow:function(t,e,r){e.child=t,e.composingNewView=e.cacheViews?-1==a.utils.arrayIndexOf(e.viewElements,t):!0,u(e,function(){if(e.binding&&e.binding(e.child,e.parent,e),e.preserveContext&&e.bindingContext)e.composingNewView&&(e.parts&&f(e),o(t).hide(),a.virtualElements.prepend(e.parent,t),n.bindContext(e.bindingContext,t,e.model));else if(t){var r=e.model||v,s=a.dataFor(t);if(s!=r){if(!e.composingNewView)return o(t).remove(),i.createView(t.getAttribute("data-view")).then(function(t){g.bindAndShow(t,e,!0)}),void 0;e.parts&&f(e),o(t).hide(),a.virtualElements.prepend(e.parent,t),n.bind(r,t)}}g.finalize(e)},r)},defaultStrategy:function(t){return e.locateViewForObject(t.model,t.area,t.viewElements)},getSettings:function(e){var n,o=e(),s=a.utils.unwrapObservable(o)||{},c=r.isActivator(o);if(t.isString(s))return s=i.isViewUrl(s)?{view:s}:{model:s,activate:!0};if(n=t.getModuleId(s))return s={model:s,activate:!0};!c&&s.model&&(c=r.isActivator(s.model));for(var u in s)s[u]=-1!=a.utils.arrayIndexOf(k,u)?a.utils.unwrapObservable(s[u]):s[u];return c?s.activate=!1:void 0===s.activate&&(s.activate=!0),s},executeStrategy:function(t){t.strategy(t).then(function(e){g.bindAndShow(e,t)})},inject:function(n){return n.model?n.view?(e.locateView(n.view,n.area,n.viewElements).then(function(t){g.bindAndShow(t,n)}),void 0):(n.strategy||(n.strategy=this.defaultStrategy),t.isString(n.strategy)?t.acquire(n.strategy).then(function(t){n.strategy=t,g.executeStrategy(n)}).fail(function(e){t.error("Failed to load view strategy ("+n.strategy+"). Details: "+e.message)}):this.executeStrategy(n),void 0):(this.bindAndShow(null,n),void 0)},compose:function(n,i,r,o){y++,o||(i=g.getSettings(function(){return i},n));var a=s(n);i.activeView=a.activeView,i.parent=n,i.triggerAttach=l,i.bindingContext=r,i.cacheViews&&!i.viewElements&&(i.viewElements=a.childElements),i.model?t.isString(i.model)?t.acquire(i.model).then(function(e){i.model=t.resolveObject(e),g.inject(i)}).fail(function(e){t.error("Failed to load composed module ("+i.model+"). Details: "+e.message)}):g.inject(i):i.view?(i.area=i.area||"partial",i.preserveContext=!0,e.locateView(i.view,i.area,i.viewElements).then(function(t){g.bindAndShow(t,i)})):this.bindAndShow(null,i)}},a.bindingHandlers.compose={init:function(){return{controlsDescendantBindings:!0}},update:function(t,e,n,r,o){var s=g.getSettings(e,t);if(s.mode){var c=a.utils.domData.get(t,w);if(!c){var u=a.virtualElements.childNodes(t);c={},"inline"===s.mode?c.view=i.ensureSingleElement(u):"templated"===s.mode&&(c.parts=d(u)),a.virtualElements.emptyNode(t),a.utils.domData.set(t,w,c)}"inline"===s.mode?s.view=c.view.cloneNode(!0):"templated"===s.mode&&(s.parts=c.parts),s.preserveContext=!0}g.compose(t,s,o,!0)}},a.virtualElements.allowedBindings.compose=!0,g});
define('durandal/events',["durandal/system"],function(t){var e=/\s+/,n=function(){},i=function(t,e){this.owner=t,this.events=e};return i.prototype.then=function(t,e){return this.callback=t||this.callback,this.context=e||this.context,this.callback?(this.owner.on(this.events,this.callback,this.context),this):this},i.prototype.on=i.prototype.then,i.prototype.off=function(){return this.owner.off(this.events,this.callback,this.context),this},n.prototype.on=function(t,n,r){var o,a,s;if(n){for(o=this.callbacks||(this.callbacks={}),t=t.split(e);a=t.shift();)s=o[a]||(o[a]=[]),s.push(n,r);return this}return new i(this,t)},n.prototype.off=function(n,i,r){var o,a,s,c;if(!(a=this.callbacks))return this;if(!(n||i||r))return delete this.callbacks,this;for(n=n?n.split(e):t.keys(a);o=n.shift();)if((s=a[o])&&(i||r))for(c=s.length-2;c>=0;c-=2)i&&s[c]!==i||r&&s[c+1]!==r||s.splice(c,2);else delete a[o];return this},n.prototype.trigger=function(t){var n,i,r,o,a,s,c,u;if(!(i=this.callbacks))return this;for(u=[],t=t.split(e),o=1,a=arguments.length;a>o;o++)u[o-1]=arguments[o];for(;n=t.shift();){if((c=i.all)&&(c=c.slice()),(r=i[n])&&(r=r.slice()),r)for(o=0,a=r.length;a>o;o+=2)r[o].apply(r[o+1]||this,u);if(c)for(s=[n].concat(u),o=0,a=c.length;a>o;o+=2)c[o].apply(c[o+1]||this,s)}return this},n.prototype.proxy=function(t){var e=this;return function(n){e.trigger(t,n)}},n.includeIn=function(t){t.on=n.prototype.on,t.off=n.prototype.off,t.trigger=n.prototype.trigger,t.proxy=n.prototype.proxy},n});
define('durandal/app',["durandal/system","durandal/viewEngine","durandal/composition","durandal/events","jquery"],function(t,e,n,i,r){function o(){return t.defer(function(e){return 0==s.length?(e.resolve(),void 0):(t.acquire(s).then(function(n){for(var i=0;i<n.length;i++){var r=n[i];if(r.install){var o=c[i];t.isObject(o)||(o={}),r.install(o),t.log("Plugin:Installed "+s[i])}else t.log("Plugin:Loaded "+s[i])}e.resolve()}).fail(function(e){t.error("Failed to load plugin(s). Details: "+e.message)}),void 0)}).promise()}var a,s=[],c=[];return a={title:"Application",configurePlugins:function(e,n){var i=t.keys(e);n=n||"plugins/",-1===n.indexOf("/",n.length-1)&&(n+="/");for(var r=0;r<i.length;r++){var o=i[r];s.push(n+o),c.push(e[o])}},start:function(){return t.log("Application:Starting"),this.title&&(document.title=this.title),t.defer(function(e){r(function(){o().then(function(){e.resolve(),t.log("Application:Started")})})}).promise()},setRoot:function(i,r,o){var a,s={activate:!0,transition:r};a=!o||t.isString(o)?document.getElementById(o||"applicationHost"):o,t.isString(i)?e.isViewUrl(i)?s.view=i:s.model=i:s.model=i,n.compose(a,s)}},i.includeIn(a),a});
define('plugins/history',["durandal/system","jquery"],function(t,e){function n(t,e,n){if(n){var i=t.href.replace(/(javascript:|#).*$/,"");t.replace(i+"#"+e)}else t.hash="#"+e}var i=/^[#\/]|\s+$/g,r=/^\/+|\/+$/g,o=/msie [\w.]+/,a=/\/$/,s={interval:50,active:!1};return"undefined"!=typeof window&&(s.location=window.location,s.history=window.history),s.getHash=function(t){var e=(t||s).location.href.match(/#(.*)$/);return e?e[1]:""},s.getFragment=function(t,e){if(null==t)if(s._hasPushState||!s._wantsHashChange||e){t=s.location.pathname;var n=s.root.replace(a,"");t.indexOf(n)||(t=t.substr(n.length))}else t=s.getHash();return t.replace(i,"")},s.activate=function(n){s.active&&t.error("History has already been activated."),s.active=!0,s.options=t.extend({},{root:"/"},s.options,n),s.root=s.options.root,s._wantsHashChange=s.options.hashChange!==!1,s._wantsPushState=!!s.options.pushState,s._hasPushState=!!(s.options.pushState&&s.history&&s.history.pushState);var a=s.getFragment(),c=document.documentMode,u=o.exec(navigator.userAgent.toLowerCase())&&(!c||7>=c);s.root=("/"+s.root+"/").replace(r,"/"),u&&s._wantsHashChange&&(s.iframe=e('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,s.navigate(a,!1)),s._hasPushState?e(window).on("popstate",s.checkUrl):s._wantsHashChange&&"onhashchange"in window&&!u?e(window).on("hashchange",s.checkUrl):s._wantsHashChange&&(s._checkUrlInterval=setInterval(s.checkUrl,s.interval)),s.fragment=a;var l=s.location,h=l.pathname.replace(/[^\/]$/,"$&/")===s.root;if(s._wantsHashChange&&s._wantsPushState){if(!s._hasPushState&&!h)return s.fragment=s.getFragment(null,!0),s.location.replace(s.root+s.location.search+"#"+s.fragment),!0;s._hasPushState&&h&&l.hash&&(this.fragment=s.getHash().replace(i,""),this.history.replaceState({},document.title,s.root+s.fragment+l.search))}return s.options.silent?void 0:s.loadUrl()},s.deactivate=function(){e(window).off("popstate",s.checkUrl).off("hashchange",s.checkUrl),clearInterval(s._checkUrlInterval),s.active=!1},s.checkUrl=function(){var t=s.getFragment();return t===s.fragment&&s.iframe&&(t=s.getFragment(s.getHash(s.iframe))),t===s.fragment?!1:(s.iframe&&s.navigate(t,!1),s.loadUrl(),void 0)},s.loadUrl=function(t){var e=s.fragment=s.getFragment(t);return s.options.routeHandler?s.options.routeHandler(e):!1},s.navigate=function(e,i){if(!s.active)return!1;if(void 0===i?i={trigger:!0}:t.isBoolean(i)&&(i={trigger:i}),e=s.getFragment(e||""),s.fragment!==e){s.fragment=e;var r=s.root+e;if(s._hasPushState)s.history[i.replace?"replaceState":"pushState"]({},document.title,r);else{if(!s._wantsHashChange)return s.location.assign(r);n(s.location,e,i.replace),s.iframe&&e!==s.getFragment(s.getHash(s.iframe))&&(i.replace||s.iframe.document.open().close(),n(s.iframe.location,e,i.replace))}return i.trigger?s.loadUrl(e):void 0}},s.navigateBack=function(){s.history.back()},s});
define('plugins/router',["durandal/system","durandal/app","durandal/activator","durandal/events","durandal/composition","plugins/history","knockout","jquery"],function(t,e,n,i,r,o,a,s){function c(t){return t=t.replace(_,"\\$&").replace(g,"(?:$1)?").replace(v,function(t,e){return e?t:"([^/]+)"}).replace(m,"(.*?)"),new RegExp("^"+t+"$")}function u(t){var e=t.indexOf(":"),n=e>0?e-1:t.length;return t.substring(0,n)}function l(t){return t.router&&t.router.loadUrl}function h(t,e){return-1!==t.indexOf(e,t.length-e.length)}function d(t,e){if(!t||!e)return!1;if(t.length!=e.length)return!1;for(var n=0,i=t.length;i>n;n++)if(t[n]!=e[n])return!1;return!0}var f,p,g=/\((.*?)\)/g,v=/(\(\?)?:\w+/g,m=/\*\w+/g,_=/[\-{}\[\]+?.,\\\^$|#\s]/g,y=/\/$/,w=function(){function r(e,n){t.log("Navigation Complete",e,n);var i=t.getModuleId(A);i&&B.trigger("router:navigation:from:"+i),A=e,P=n;var r=t.getModuleId(A);r&&B.trigger("router:navigation:to:"+r),l(e)||B.updateDocumentTitle(e,n),p.explicitNavigation=!1,p.navigatingBack=!1,B.trigger("router:navigation:complete",e,n,B)}function s(e,n){t.log("Navigation Cancelled"),B.activeInstruction(P),P&&B.navigate(P.fragment,!1),M(!1),p.explicitNavigation=!1,p.navigatingBack=!1,B.trigger("router:navigation:cancelled",e,n,B)}function g(e){t.log("Navigation Redirecting"),M(!1),p.explicitNavigation=!1,p.navigatingBack=!1,B.navigate(e,{trigger:!0,replace:!0})}function v(t,e,n){p.navigatingBack=!p.explicitNavigation&&A!=n.fragment,B.trigger("router:route:activating",e,n,B),t.activateItem(e,n.params).then(function(i){if(i){var o=A;r(e,n),l(e)&&k({router:e.router,fragment:n.fragment,queryString:n.queryString}),o==e&&B.attached()}else t.settings.lifecycleData&&t.settings.lifecycleData.redirect?g(t.settings.lifecycleData.redirect):s(e,n);f&&(f.resolve(),f=null)})}function m(e,n,i){var r=B.guardRoute(n,i);r?r.then?r.then(function(r){r?t.isString(r)?g(r):v(e,n,i):s(n,i)}):t.isString(r)?g(r):v(e,n,i):s(n,i)}function _(t,e,n){B.guardRoute?m(t,e,n):v(t,e,n)}function b(t){return P&&P.config.moduleId==t.config.moduleId&&A&&(A.canReuseForRoute&&A.canReuseForRoute.apply(A,t.params)||A.router&&A.router.loadUrl)}function x(){if(!M()){var e=O.shift();if(O=[],e){if(e.router){var i=e.fragment;return e.queryString&&(i+="?"+e.queryString),e.router.loadUrl(i),void 0}M(!0),B.activeInstruction(e),b(e)?_(n.create(),A,e):t.acquire(e.config.moduleId).then(function(n){var i=t.resolveObject(n);_(E,i,e)}).fail(function(n){t.error("Failed to load routed module ("+e.config.moduleId+"). Details: "+n.message)})}}}function k(t){O.unshift(t),x()}function S(t,e,n){for(var i=t.exec(e).slice(1),r=0;r<i.length;r++){var o=i[r];i[r]=o?decodeURIComponent(o):null}var a=B.parseQueryString(n);return a&&i.push(a),{params:i,queryParams:a}}function C(e){B.trigger("router:route:before-config",e,B),t.isRegExp(e)?e.routePattern=e.route:(e.title=e.title||B.convertRouteToTitle(e.route),e.moduleId=e.moduleId||B.convertRouteToModuleId(e.route),e.hash=e.hash||B.convertRouteToHash(e.route),e.routePattern=c(e.route)),B.trigger("router:route:after-config",e,B),B.routes.push(e),B.route(e.routePattern,function(t,n){var i=S(e.routePattern,t,n);k({fragment:t,queryString:n,config:e,params:i.params,queryParams:i.queryParams})})}function T(e){if(t.isArray(e.route))for(var n=0,i=e.route.length;i>n;n++){var r=t.extend({},e);r.route=e.route[n],n>0&&delete r.nav,C(r)}else C(e);return B}function I(t){t.isActive||(t.isActive=a.computed(function(){var e=E();return e&&e.__moduleId__==t.moduleId}))}var A,P,O=[],M=a.observable(!1),E=n.create(),B={handlers:[],routes:[],navigationModel:a.observableArray([]),activeItem:E,isNavigating:a.computed(function(){var t=E(),e=M(),n=t&&t.router&&t.router!=B&&t.router.isNavigating()?!0:!1;return e||n}),activeInstruction:a.observable(null),__router__:!0};return i.includeIn(B),E.settings.areSameItem=function(t,e,n,i){return t==e?d(n,i):!1},B.parseQueryString=function(t){var e,n;if(!t)return null;if(n=t.split("&"),0==n.length)return null;e={};for(var i=0;i<n.length;i++){var r=n[i];if(""!==r){var o=r.split("=");e[o[0]]=o[1]&&decodeURIComponent(o[1].replace(/\+/g," "))}}return e},B.route=function(t,e){B.handlers.push({routePattern:t,callback:e})},B.loadUrl=function(e){var n=B.handlers,i=null,r=e,a=e.indexOf("?");if(-1!=a&&(r=e.substring(0,a),i=e.substr(a+1)),B.relativeToParentRouter){var s=this.parent.activeInstruction();r=s.params.join("/"),r&&"/"==r[0]&&(r=r.substr(1)),r||(r=""),r=r.replace("//","/").replace("//","/")}r=r.replace(y,"");for(var c=0;c<n.length;c++){var u=n[c];if(u.routePattern.test(r))return u.callback(r,i),!0}return t.log("Route Not Found"),B.trigger("router:route:not-found",e,B),P&&o.navigate(P.fragment,{trigger:!1,replace:!0}),p.explicitNavigation=!1,p.navigatingBack=!1,!1},B.updateDocumentTitle=function(t,n){n.config.title?document.title=e.title?n.config.title+" | "+e.title:n.config.title:e.title&&(document.title=e.title)},B.navigate=function(t,e){return t&&-1!=t.indexOf("://")?(window.location.href=t,!0):(p.explicitNavigation=!0,o.navigate(t,e))},B.navigateBack=function(){o.navigateBack()},B.attached=function(){setTimeout(function(){M(!1),B.trigger("router:navigation:attached",A,P,B),x()},10)},B.compositionComplete=function(){B.trigger("router:navigation:composition-complete",A,P,B)},B.convertRouteToHash=function(t){if(B.relativeToParentRouter){var e=B.parent.activeInstruction(),n=e.config.hash+"/"+t;return o._hasPushState&&(n="/"+n),n=n.replace("//","/").replace("//","/")}return o._hasPushState?t:"#"+t},B.convertRouteToModuleId=function(t){return u(t)},B.convertRouteToTitle=function(t){var e=u(t);return e.substring(0,1).toUpperCase()+e.substring(1)},B.map=function(e,n){if(t.isArray(e)){for(var i=0;i<e.length;i++)B.map(e[i]);return B}return t.isString(e)||t.isRegExp(e)?(n?t.isString(n)&&(n={moduleId:n}):n={},n.route=e):n=e,T(n)},B.buildNavigationModel=function(e){var n=[],i=B.routes;e=e||100;for(var r=0;r<i.length;r++){var o=i[r];o.nav&&(t.isNumber(o.nav)||(o.nav=e),I(o),n.push(o))}return n.sort(function(t,e){return t.nav-e.nav}),B.navigationModel(n),B},B.mapUnknownRoutes=function(e,n){var i="*catchall",r=c(i);return B.route(r,function(a,s){var c=S(r,a,s),u={fragment:a,queryString:s,config:{route:i,routePattern:r},params:c.params,queryParams:c.queryParams};if(e)if(t.isString(e))u.config.moduleId=e,n&&o.navigate(n,{trigger:!1,replace:!0});else if(t.isFunction(e)){var l=e(u);if(l&&l.then)return l.then(function(){B.trigger("router:route:before-config",u.config,B),B.trigger("router:route:after-config",u.config,B),k(u)}),void 0}else u.config=e,u.config.route=i,u.config.routePattern=r;else u.config.moduleId=a;B.trigger("router:route:before-config",u.config,B),B.trigger("router:route:after-config",u.config,B),k(u)}),B},B.reset=function(){return P=A=void 0,B.handlers=[],B.routes=[],B.off(),delete B.options,B},B.makeRelative=function(e){return t.isString(e)&&(e={moduleId:e,route:e}),e.moduleId&&!h(e.moduleId,"/")&&(e.moduleId+="/"),e.route&&!h(e.route,"/")&&(e.route+="/"),e.fromParent&&(B.relativeToParentRouter=!0),B.on("router:route:before-config").then(function(t){e.moduleId&&(t.moduleId=e.moduleId+t.moduleId),e.route&&(t.route=""===t.route?e.route.substring(0,e.route.length-1):e.route+t.route)}),B},B.createChildRouter=function(){var t=w();return t.parent=B,t},B};return p=w(),p.explicitNavigation=!1,p.navigatingBack=!1,p.activate=function(e){return t.defer(function(n){if(f=n,p.options=t.extend({routeHandler:p.loadUrl},p.options,e),o.activate(p.options),o._hasPushState)for(var i=p.routes,r=i.length;r--;){var a=i[r];a.hash=a.hash.replace("#","")}s(document).delegate("a","click",function(t){if(p.explicitNavigation=!0,o._hasPushState&&!(t.altKey||t.ctrlKey||t.metaKey||t.shiftKey)){var e=s(this).attr("href"),n=this.protocol+"//";(!e||"#"!==e.charAt(0)&&e.slice(n.length)!==n)&&(t.preventDefault(),o.navigate(e))}})}).promise()},p.deactivate=function(){o.deactivate()},p.install=function(){a.bindingHandlers.router={init:function(){return{controlsDescendantBindings:!0}},update:function(t,e,n,i,o){var s=a.utils.unwrapObservable(e())||{};if(s.__router__)s={model:s.activeItem(),attached:s.attached,compositionComplete:s.compositionComplete,activate:!1};else{var c=a.utils.unwrapObservable(s.router||i.router)||p;s.model=c.activeItem(),s.attached=c.attached,s.compositionComplete=c.compositionComplete,s.activate=!1}r.compose(t,s,o)}},a.virtualElements.allowedBindings.router=!0},p});
define('account/index',["plugins/router","knockout"],function(e,n){var t=e.createChildRouter().makeRelative({moduleId:"account",fromParent:!0}).map([{route:"",moduleId:"login",title:"Login"},{route:"login",moduleId:"login",title:"Login",type:"nav",nav:!0},{route:"sign-up",moduleId:"signUp",title:"Sign Up",type:"nav",nav:!0}]).buildNavigationModel();return{router:t,navBar:n.computed(function(){return n.utils.arrayFilter(t.navigationModel(),function(e){return"nav"==e.type})})}});
define('text!account/login.html',[],function () { return '<div>\r\n    <div class="popup-dialog-container">\r\n        <div class="ui-overlay fullscreen"></div>\r\n        <div class="popup-dialog login">\r\n            <h1>Join The Game!</h1>\r\n\r\n            <input type="text" placeholder="Username" data-bind="value: username"><br />\r\n            <input type="password" placeholder="Password" data-bind="value: password"><br />\r\n\r\n            <p class="error" data-bind="text: errorMessage"></p>\r\n\r\n            <button class="blue width40" data-bind="click: login, disable: loading()">\r\n                <span>LOG IN</span>\r\n                <i data-bind="visible: loading()" class="icon-spinner icon-spin"></i>\r\n            </button>\r\n            \r\n            <h2 class="link" data-bind="click: signUp">SIGN UP</h2>\r\n            <h4 class="link">recover password</h4>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});

define('api/constants',[],function(){for(var e={images:[{id:0,imageName:"barbed_wire"},{id:1,imageName:"bear"},{id:2,imageName:"black_cat"},{id:3,imageName:"clock_in_sand"},{id:4,imageName:"couple"},{id:5,imageName:"dark_forest"},{id:6,imageName:"deer_in_snow"},{id:7,imageName:"fire"},{id:8,imageName:"fox"},{id:9,imageName:"frozen_cattai"},{id:10,imageName:"girl_in_rain"},{id:11,imageName:"girl_in_white_dress"},{id:12,imageName:"goat"},{id:13,imageName:"golden_forest"},{id:14,imageName:"hands_with_soil"},{id:15,imageName:"misty_forest"},{id:16,imageName:"moon"},{id:17,imageName:"old_house"},{id:18,imageName:"old_woman"},{id:19,imageName:"rail"},{id:20,imageName:"statue"},{id:21,imageName:"still_water"},{id:22,imageName:"stream"},{id:23,imageName:"tomb"},{id:24,imageName:"white_flower"}],getURL:function(e){return"images/core/tiles/"+e+".jpg"},salt:"!XXX.666.ozma,is,awesome.666.XXX!"},a=0;a<e.images.length;a++){var i=e.images[a].imageName;e.images[a].imageName="images/core/tiles/"+i.replace(" ","_")+(-1==i.indexOf(".")?".jpg":"")}return e});
define('account/login',["durandal/app","api/constants"],function(n){function e(){n.loading(!0);var e={username:o(),password:12345};n.trigger("server:account:login",e,function(e){n.loading(!1),e.success?(e.username=o(),n.trigger("account:login",e)):t("Error: "+e.errorMessage)})}var o=ko.observable(),r=ko.observable(),t=ko.observable();return{activate:function(){n.loading(!0)},compositionComplete:function(){n.loading(!1)},loading:n.loading,username:o,password:r,errorMessage:t,login:e,signUp:function(){n.trigger("account:view:change","account/sign-up")}}});
define('text!account/sign-up.html',[],function () { return '<div>\r\n    <div class="popup-dialog-container">\r\n        <div class="ui-overlay fullscreen"></div>\r\n        <div class="popup-dialog login">                  \r\n            <h1>Join The Game!</h1>\r\n\r\n            <input type="text" placeholder="Username" data-bind="value: username" /><br />\r\n            <input type="text" placeholder="E-mail" data-bind="value: email"><br>\r\n            <input type="password" placeholder="Password" data-bind="value: password"><br>\r\n            \r\n            <p class="error" data-bind="text: errorMessage"></p>\r\n\r\n            <button class="blue width40" data-bind="click: signUp, disable: loading()">\r\n                <span>SIGN UP</span>\r\n                <i data-bind="visible: loading()" class="icon-spinner icon-spin"></i>\r\n            </button>\r\n            \r\n            <p id="agreement">By clicking <i>sign up</i> you confirm that you have read and agree to the terms of service.</p>\r\n\r\n            <h2 class="link" data-bind="click: login">Back to Login</h2>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});

define('account/sign-up',["durandal/app"],function(n){function o(){n.loading(!0);var o={username:e(),email:r(),password:CryptoJS.SHA3(constants.salt+e()+a()).toString()};n.trigger("server:account:sign-up",o,function(o){o=JSON.parse(o),n.loading(!1),o.success?n.trigger("account:login",o):i(o.errorMessage)})}var e=ko.observable(),a=ko.observable(),r=ko.observable(),i=ko.observable();return{activate:function(){n.loading(!0)},compositionComplete:function(){n.loading(!1)},loading:n.loading,username:e,password:a,errorMessage:i,email:r,signUp:o,login:function(){n.trigger("account:view:change","account/login")}}});
define('const/DIALOGS',[],function(){return{LOGIN_FAILURE:{heading:"INCORRECT LOG-IN",content:"Please try again."},GAME_OVER_YOU_WON:{heading:"GAME OVER!",content:"You won!"},GAME_OVER_THEY_WON:{heading:"GAME OVER!",content:"Your opponent won!"},YOUR_TURN_FIRST_ROUND:{heading:"IT'S YOUR TURN!",content:"To score you need to place a phrase, but first you can use the buttons on the left to choose one out of 3 actions: Swap words, Place tile and Swap tile. Use checkmark to skip turn."},YOUR_TURN:{heading:"IT'S YOUR TURN!",content:"Place a phrase, or use the buttons on the left to select an action. If you don't want to do anything, you can end your turn with the check mark button."},THEIR_TURN:{heading:"IT'S YOUR OPPONENT'S TURN!",content:"Work on your masterpiece while you wait for your opponent to place a phrase."},YOUR_TURN_SELECT_MAGNETS:{heading:"IT'S YOUR TURN! - Select a phrase!",content:"Drag and drop words to make a phrase. A phrase must have 3 – 9 words. Select a phrase by circling it. Make sure the phrase is following the rules of the two tiles you wish to connect."},YOUR_TURN_MAKE_PHRASE:{heading:"IT'S YOUR TURN! - Make a phrase!",content:"To score you must place a phrase between two picture tiles. Turn tiles over to find the rules the phrase must follow. Go to your workspace to make a phrase, or use checkmark to skip turn."},YOUR_TURN_PLACE_PHRASE:{heading:"IT'S YOUR TURN! - Place a phrase!",content:"To place a phrase: Draw a line on the gameboard between the two tiles you wish to connect. When you’re happy use the DONE-button to submit your phrase."},SWAP_WORDS:{heading:"SWAP WORDS",content:'Select the words you like to swap to exchange them for new ones. Then click "Done"'},SWAP_TILE:{heading:"SWAP TILE",content:"You can only swap unlinked picture tiles. Circle the tile you like to swap to exchange it for a new one."},ACTIONS:{title:"actions",heading:"It's your turn, select an action!",options:[{name:"Swap words",imageURLs:{unselected:"images/app/dialogs/actions/option-swap-words.png",selected:"images/app/dialogs/actions/option-swap-words-selected.png"},description:""},{name:"Place tile",imageURLs:{unselected:"images/app/dialogs/actions/option-place-tile.png",selected:"images/app/dialogs/actions/option-place-tiles-selected.png"},description:""},{name:"Swap tile",imageURLs:{unselected:"images/app/dialogs/actions/option-swap-tile.png",selected:"images/app/dialogs/actions/option-swap-tile-unselected.png"},description:""},{name:"Sneak peek",imageURLs:{unselected:"images/app/dialogs/actions/option-sneak-peek.png",selected:"images/app/dialogs/actions/option-skeak-peek-selected.png"},description:""},{name:"No action",imageURLs:{unselected:"images/app/dialogs/actions/option-no-action.png",selected:"images/app/dialogs/actions/option-no-action.png"},description:""}],buttons:[{name:"Choose"}]}}});
define('api/utils',[],function(){function e(e,o){for(var a in o)if(e[a]!=o[a])return!1;return!0}return{find:function(o,a){for(var r=0;r<o.length;r++)if(e(o[r],a))return o[r]}}});
define('api/model/Path',["durandal/app","api/constants","api/utils"],function(e,a,r){function o(a,o,i,t,n,s,d){var l=this;l.id=o,l.nWords=i,l.startTile=r.find(a.tiles(),{id:t}),l.endTile=r.find(a.tiles(),{id:n}),l.cw=void 0===s?!0:s;var u=d&&d.words?d.words:[];l.phrase={_complete:ko.observable(!1),playerId:0,score:0,words:ko.observableArray(u)},l.phrase.complete=ko.computed(function(){return this.phrase._complete()===!0||0!=this.nWords&&this.phrase.words().length==this.nWords},l),l.phrase.complete.subscribe(function(r){r&&e.woz.dialog.show("confirm",{modal:!0}).then(function(r){if(a.activeWords(null),"cancel"==r)l.phrase._complete(!1),l.removeAll();else{e.loading(!0),$("body").animate({scrollTop:0},"slow"),a.player.active(!1);var o={gameID:a.gameID,pathID:l.id,username:a.player.username,words:ko.utils.arrayMap(l.phrase.words(),function(e){return e.word.id})};e.trigger("server:game:place-phrase",o)}}),ko.utils.arrayForEach(l.phrase.words(),function(e){e.word.isPlayed=r?2:1})}),l.hasWordAt=function(e){var a=l._getEntityAt(e);return null!=a?!0:!1},l.getWordAt=function(e){var a=l._getEntityAt(e);return null!=a?a.word:null},l._getEntityAt=function(e){return ko.utils.arrayFirst(l.phrase.words(),function(a){return a.index==e})},l.addWord=function(e,r){if(!a.player.active())return!1;if(void 0===r)for(var o=0;10>o;o++)if(null==ko.utils.arrayFirst(l.phrase.words(),function(e){return e.index===o})){r=o;break}if(0==i&&r>=6||0!=i&&r>=i)return!1;if(null==ko.utils.arrayFirst(l.phrase.words(),function(e){return e.index===r}))return e.isPlayed=1,l.phrase.words.push({word:e,index:r}),a.words.valueHasMutated(),!0},l.removeAll=function(){for(var e=l.phrase.words(),r=0;r<e.length;r++)e[r].word.isPlayed=0;l.phrase.words.removeAll(),a.words.valueHasMutated()},l._removeEntity=function(e){e.word.isPlayed=0,l.phrase.words.remove(e),a.words.valueHasMutated()},l.removeWordAt=function(e){var a=l._getEntityAt(e);if(l._removeEntity(a),0==l.nWords){for(var r=a.index+1;10>r&&null!=(a=l._getEntityAt(r));r++)a.index--;l.phrase.words.valueHasMutated()}}}return o});
define('api/datacontext',["durandal/app","api/constants","const/DIALOGS","api/model/Path"],function(e,a,r,o){function i(e,a){function r(e,a){for(var r in a)if(e[r]!==a[r])return!1;return!0}for(var o=0;o<e.length;o++)if(r(e[o],a))return e[o]}var n="ali";e.on("account:login",function(e){e.success&&(n=e.username)});var t={gameID:0,player:{active:ko.observable()},players:ko.observableArray([]),words:ko.observableArray([]),tiles:ko.observableArray([]),paths:ko.observableArray([]),loading:ko.observable(null),loadingStatus:ko.observable(""),activeWord:ko.observable(null),activeWords:ko.observable(null),playerCount:1};return t._gameOver=ko.observable(!1),t.gameOver=ko.computed(function(){var e=ko.utils.arrayFilter(this.paths(),function(e){return e.phrase.complete()===!0});return 0!==e.length&&e.length===this.paths().length?!0:this._gameOver()},t),t.mode=ko.observable(""),t.words.immovable=ko.computed(function(){return"swap"===t.mode()}),t.load=function(s){t.loading(!0),e.on("game:start",function(s){t.loadingStatus("Starting The Game..."),t.gameID=s.id,ko.utils.arrayForEach(s.players,function(a){a.username===n?(t.player.active(a.active),a.active=t.player.active,a.tickets={swap:1},e.woz.dialog.show("slipper",r.YOUR_TURN_FIRST_ROUND)):(a.active=ko.observable(a.active),e.woz.dialog.show("slipper",r.THEIR_TURN_FIRST_ROUND)),a.resigned=ko.observable(a.resigned||!1),a.score=ko.observable(a.score)}),t.player=i(s.players,{username:n}),t.players(s.players),ko.utils.arrayForEach(s.words,function(e){e.isSelected=ko.observable(!1)}),t.words(s.words);for(var l=0;l<s.tiles.length;l++)s.tiles[l].imageName=a.getURL(s.tiles[l].imageName),s.tiles[l].info=0!==s.tiles[l].bonus?"+"+s.tiles[l].bonus:"X"+s.tiles[l].mult,s.tiles[l].active=ko.observable(!1);t.tiles(s.tiles),s.paths=ko.utils.arrayMap(s.paths,function(e){return new o(t,e.id,e.nWords,e.startTile,e.endTile,e.cw,e.phrase)}),t.paths(s.paths),t._gameOver(s.gameOver),t.winner=function(){if(t.gameOver()){var e=0,a=t.player;return ko.utils.arrayForEach(this.players(),function(r){e<r.score()&&(a=r,e=r.score())}),a}return null},t.loadingStatus("Ready"),setTimeout(function(){t.loading(!1)},100)}),e.on("game:update",function(a){if(e.loading(!1),a.success){for(var o=0;o<a.playerInfo.length;o++){var n=a.playerInfo[o],s=i(t.players(),{username:n.username}),l=n.score-s.score();if(s.score(n.score),s.active(n.active),s.resigned(n.resigned||!1),n.active&&(n.username===t.player.username?e.woz.dialog.show("slipper",r.YOUR_TURN):e.woz.dialog.show("slipper",r.THEIR_TURN)),s.username===t.player.username&&(l&&e.woz.dialog.show("alert",{content:"You scored <b>"+l+"</b> points!"}),a.words))for(var u=0;u<a.words.length;u++)a.words[u].isSelected=ko.observable(!1),t.words.push(a.words[u])}if(t.player.active()&&(t.player.tickets.swap=1),t._gameOver(a.gameOver||!1),t.gameOver()){e.woz.dialog.close("slipper");var d,g=t.winner();d=g===t.player?r.GAME_OVER_YOU_WON:r.GAME_OVER_THEY_WON,d.content=$("<b/>",{text:d.content}).prepend("<br/>").html(),e.woz.dialog.show("notice",d)}t.players.valueHasMutated()}}),e.on("game:swap-words",function(e){if(e.success&&e.words){for(var a=0;a<e.oldWords.length;a++){var r=ko.utils.arrayFirst(t.words(),function(r){return r.id===e.oldWords[a]});t.words.remove(r)}for(var a=0;a<e.words.length;a++)e.words[a].isSelected=ko.observable(!1),t.words.push(e.words[a])}}),t.loadingStatus("Waiting for the server..."),setTimeout(function(){e.trigger("server:game:queue",{username:n,password:12345,playerCount:s},function(){t.loadingStatus("Waiting to pair up...")})},2e3)},t.playedWords=ko.computed(function(){return ko.utils.arrayFilter(t.words(),function(e){return e.isPlayed||!1})}),t.unplayedWords=ko.computed(function(){return ko.utils.arrayFilter(t.words(),function(e){return!e.isPlayed})}),t.selectedWords=ko.computed(function(){return ko.utils.arrayFilter(t.words(),function(e){return e.isSelected()})}),window.ctx=t});
define('api/draggable',["jquery"],function(e){e.fn.draggable=function(a){a=e.extend({},e.fn.draggable.defaults,a);var i=e(this),o=i.css("z-index"),t=!1;e.support.touch&&i.touchPunch();var r={mousedown:function(o){if(o.preventDefault(),a.withinEl){var t=a.withinEl.innerHeight(),n=a.withinEl.innerWidth(),s=parseInt(a.withinEl.css("padding-left")),l=parseInt(a.withinEl.css("padding-top")),d=parseInt(a.withinEl.css("padding-right")),u=parseInt(a.withinEl.css("padding-bottom"));a.within={l:s,t:l,r:n-s-d,b:t-l-u}}var g={h:i.outerHeight(),w:i.outerWidth(),t:i.position().top-o.pageY,l:i.position().left-o.pageX,windowTop:e(window).scrollTop()};return i.css("z-index",1e3),i.addClass("drag"),a.dragStart.call(o),i.data("immovable")&&i.data("immovable")()===!0||a.parent.bind("mousemove",g,r.mousemove),a.parent.one("mouseup",g,r.mouseup),g},mouseup:function(e){if(i.hasClass("drag")){a.parent.unbind("mousemove",r.mousemove),i.css("z-index",o),i.removeClass("drag");var n=r.isWithinBoundaries(e),s=n?e.data.t+e.pageY:i.position().top,l=n?e.data.l+e.pageX:i.position().left;i.position().top<a.within.t&&(s=a.within.t,i.css({top:s})),t&&(s=100*s/(a.within.b-a.within.t),l=100*l/(a.within.r-a.within.l),i.css({top:s+"%",left:l+"%"})),a.dropped(e,{top:s,left:l,hasMoved:t}),t=!1}},mousemove:function(o){var r=o.pageY+o.data.t,n=o.pageX+o.data.l;n<a.within.l&&(n=a.within.l),r+o.data.h>a.within.b&&(r=a.within.b-o.data.h),n+o.data.w>a.within.r&&(n=a.within.r-o.data.w),i.css({top:r,left:n}),a.move(o,{top:r,left:n}),t=!0,0!=o.data.windowTop&&o.pageY-o.data.windowTop<100&&(o.data.windowTop=o.data.windowTop-50,o.data.windowTop<0&&(o.data.windowTop=0),e("body").animate({scrollTop:o.data.windowTop},"fast"))},isWithinBoundaries:function(e){var i=e.pageY+e.data.t,o=e.pageX+e.data.l;return i-e.data.h/2<a.within.t||i+e.data.h/2>a.within.b||o-e.data.w/2<a.within.l||o+e.data.w/2>a.within.r?!1:!0}};return i.bind({mousedown:r.mousedown}),i.data("draggable",this),this.dispose=function(){i.unbind(),r.mouseup()},i.css("cursor",a.cursor)},e.fn.draggable.defaults={within:{l:0,r:window.innerWidth,t:0,b:window.innerHeight},withinEl:null,dragStart:function(){},dropped:function(){},move:function(){},parent:e(document),dragable:!0,cursor:"pointer"}});
/*! Socket.IO.js build:0.9.16, development. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */

var io = ('undefined' === typeof module ? {} : module.exports);
(function() {

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * IO namespace.
   *
   * @namespace
   */

  var io = exports;

  /**
   * Socket.IO version
   *
   * @api public
   */

  io.version = '0.9.16';

  /**
   * Protocol implemented.
   *
   * @api public
   */

  io.protocol = 1;

  /**
   * Available transports, these will be populated with the available transports
   *
   * @api public
   */

  io.transports = [];

  /**
   * Keep track of jsonp callbacks.
   *
   * @api private
   */

  io.j = [];

  /**
   * Keep track of our io.Sockets
   *
   * @api private
   */
  io.sockets = {};


  /**
   * Manages connections to hosts.
   *
   * @param {String} uri
   * @Param {Boolean} force creation of new socket (defaults to false)
   * @api public
   */

  io.connect = function (host, details) {
    var uri = io.util.parseUri(host)
      , uuri
      , socket;

    if (global && global.location) {
      uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
      uri.host = uri.host || (global.document
        ? global.document.domain : global.location.hostname);
      uri.port = uri.port || global.location.port;
    }

    uuri = io.util.uniqueUri(uri);

    var options = {
        host: uri.host
      , secure: 'https' == uri.protocol
      , port: uri.port || ('https' == uri.protocol ? 443 : 80)
      , query: uri.query || ''
    };

    io.util.merge(options, details);

    if (options['force new connection'] || !io.sockets[uuri]) {
      socket = new io.Socket(options);
    }

    if (!options['force new connection'] && socket) {
      io.sockets[uuri] = socket;
    }

    socket = socket || io.sockets[uuri];

    // if path is different from '' or /
    return socket.of(uri.path.length > 1 ? uri.path : '');
  };

})('object' === typeof module ? module.exports : (this.io = {}), this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, global) {

  /**
   * Utilities namespace.
   *
   * @namespace
   */

  var util = exports.util = {};

  /**
   * Parses an URI
   *
   * @author Steven Levithan <stevenlevithan.com> (MIT license)
   * @api public
   */

  var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

  var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
               'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
               'anchor'];

  util.parseUri = function (str) {
    var m = re.exec(str || '')
      , uri = {}
      , i = 14;

    while (i--) {
      uri[parts[i]] = m[i] || '';
    }

    return uri;
  };

  /**
   * Produces a unique url that identifies a Socket.IO connection.
   *
   * @param {Object} uri
   * @api public
   */

  util.uniqueUri = function (uri) {
    var protocol = uri.protocol
      , host = uri.host
      , port = uri.port;

    if ('document' in global) {
      host = host || document.domain;
      port = port || (protocol == 'https'
        && document.location.protocol !== 'https:' ? 443 : document.location.port);
    } else {
      host = host || 'localhost';

      if (!port && protocol == 'https') {
        port = 443;
      }
    }

    return (protocol || 'http') + '://' + host + ':' + (port || 80);
  };

  /**
   * Mergest 2 query strings in to once unique query string
   *
   * @param {String} base
   * @param {String} addition
   * @api public
   */

  util.query = function (base, addition) {
    var query = util.chunkQuery(base || '')
      , components = [];

    util.merge(query, util.chunkQuery(addition || ''));
    for (var part in query) {
      if (query.hasOwnProperty(part)) {
        components.push(part + '=' + query[part]);
      }
    }

    return components.length ? '?' + components.join('&') : '';
  };

  /**
   * Transforms a querystring in to an object
   *
   * @param {String} qs
   * @api public
   */

  util.chunkQuery = function (qs) {
    var query = {}
      , params = qs.split('&')
      , i = 0
      , l = params.length
      , kv;

    for (; i < l; ++i) {
      kv = params[i].split('=');
      if (kv[0]) {
        query[kv[0]] = kv[1];
      }
    }

    return query;
  };

  /**
   * Executes the given function when the page is loaded.
   *
   *     io.util.load(function () { console.log('page loaded'); });
   *
   * @param {Function} fn
   * @api public
   */

  var pageLoaded = false;

  util.load = function (fn) {
    if ('document' in global && document.readyState === 'complete' || pageLoaded) {
      return fn();
    }

    util.on(global, 'load', fn, false);
  };

  /**
   * Adds an event.
   *
   * @api private
   */

  util.on = function (element, event, fn, capture) {
    if (element.attachEvent) {
      element.attachEvent('on' + event, fn);
    } else if (element.addEventListener) {
      element.addEventListener(event, fn, capture);
    }
  };

  /**
   * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
   *
   * @param {Boolean} [xdomain] Create a request that can be used cross domain.
   * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest.
   * @api private
   */

  util.request = function (xdomain) {

    if (xdomain && 'undefined' != typeof XDomainRequest && !util.ua.hasCORS) {
      return new XDomainRequest();
    }

    if ('undefined' != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
      return new XMLHttpRequest();
    }

    if (!xdomain) {
      try {
        return new window[(['Active'].concat('Object').join('X'))]('Microsoft.XMLHTTP');
      } catch(e) { }
    }

    return null;
  };

  /**
   * XHR based transport constructor.
   *
   * @constructor
   * @api public
   */

  /**
   * Change the internal pageLoaded value.
   */

  if ('undefined' != typeof window) {
    util.load(function () {
      pageLoaded = true;
    });
  }

  /**
   * Defers a function to ensure a spinner is not displayed by the browser
   *
   * @param {Function} fn
   * @api public
   */

  util.defer = function (fn) {
    if (!util.ua.webkit || 'undefined' != typeof importScripts) {
      return fn();
    }

    util.load(function () {
      setTimeout(fn, 100);
    });
  };

  /**
   * Merges two objects.
   *
   * @api public
   */

  util.merge = function merge (target, additional, deep, lastseen) {
    var seen = lastseen || []
      , depth = typeof deep == 'undefined' ? 2 : deep
      , prop;

    for (prop in additional) {
      if (additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
        if (typeof target[prop] !== 'object' || !depth) {
          target[prop] = additional[prop];
          seen.push(additional[prop]);
        } else {
          util.merge(target[prop], additional[prop], depth - 1, seen);
        }
      }
    }

    return target;
  };

  /**
   * Merges prototypes from objects
   *
   * @api public
   */

  util.mixin = function (ctor, ctor2) {
    util.merge(ctor.prototype, ctor2.prototype);
  };

  /**
   * Shortcut for prototypical and static inheritance.
   *
   * @api private
   */

  util.inherit = function (ctor, ctor2) {
    function f() {};
    f.prototype = ctor2.prototype;
    ctor.prototype = new f;
  };

  /**
   * Checks if the given object is an Array.
   *
   *     io.util.isArray([]); // true
   *     io.util.isArray({}); // false
   *
   * @param Object obj
   * @api public
   */

  util.isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  };

  /**
   * Intersects values of two arrays into a third
   *
   * @api public
   */

  util.intersect = function (arr, arr2) {
    var ret = []
      , longest = arr.length > arr2.length ? arr : arr2
      , shortest = arr.length > arr2.length ? arr2 : arr;

    for (var i = 0, l = shortest.length; i < l; i++) {
      if (~util.indexOf(longest, shortest[i]))
        ret.push(shortest[i]);
    }

    return ret;
  };

  /**
   * Array indexOf compatibility.
   *
   * @see bit.ly/a5Dxa2
   * @api public
   */

  util.indexOf = function (arr, o, i) {

    for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0;
         i < j && arr[i] !== o; i++) {}

    return j <= i ? -1 : i;
  };

  /**
   * Converts enumerables to array.
   *
   * @api public
   */

  util.toArray = function (enu) {
    var arr = [];

    for (var i = 0, l = enu.length; i < l; i++)
      arr.push(enu[i]);

    return arr;
  };

  /**
   * UA / engines detection namespace.
   *
   * @namespace
   */

  util.ua = {};

  /**
   * Whether the UA supports CORS for XHR.
   *
   * @api public
   */

  util.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
    try {
      var a = new XMLHttpRequest();
    } catch (e) {
      return false;
    }

    return a.withCredentials != undefined;
  })();

  /**
   * Detect webkit.
   *
   * @api public
   */

  util.ua.webkit = 'undefined' != typeof navigator
    && /webkit/i.test(navigator.userAgent);

   /**
   * Detect iPad/iPhone/iPod.
   *
   * @api public
   */

  util.ua.iDevice = 'undefined' != typeof navigator
      && /iPad|iPhone|iPod/i.test(navigator.userAgent);

})('undefined' != typeof io ? io : module.exports, this);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.EventEmitter = EventEmitter;

  /**
   * Event emitter constructor.
   *
   * @api public.
   */

  function EventEmitter () {};

  /**
   * Adds a listener
   *
   * @api public
   */

  EventEmitter.prototype.on = function (name, fn) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = fn;
    } else if (io.util.isArray(this.$events[name])) {
      this.$events[name].push(fn);
    } else {
      this.$events[name] = [this.$events[name], fn];
    }

    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  /**
   * Adds a volatile listener.
   *
   * @api public
   */

  EventEmitter.prototype.once = function (name, fn) {
    var self = this;

    function on () {
      self.removeListener(name, on);
      fn.apply(this, arguments);
    };

    on.listener = fn;
    this.on(name, on);

    return this;
  };

  /**
   * Removes a listener.
   *
   * @api public
   */

  EventEmitter.prototype.removeListener = function (name, fn) {
    if (this.$events && this.$events[name]) {
      var list = this.$events[name];

      if (io.util.isArray(list)) {
        var pos = -1;

        for (var i = 0, l = list.length; i < l; i++) {
          if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
            pos = i;
            break;
          }
        }

        if (pos < 0) {
          return this;
        }

        list.splice(pos, 1);

        if (!list.length) {
          delete this.$events[name];
        }
      } else if (list === fn || (list.listener && list.listener === fn)) {
        delete this.$events[name];
      }
    }

    return this;
  };

  /**
   * Removes all listeners for an event.
   *
   * @api public
   */

  EventEmitter.prototype.removeAllListeners = function (name) {
    if (name === undefined) {
      this.$events = {};
      return this;
    }

    if (this.$events && this.$events[name]) {
      this.$events[name] = null;
    }

    return this;
  };

  /**
   * Gets all listeners for a certain event.
   *
   * @api publci
   */

  EventEmitter.prototype.listeners = function (name) {
    if (!this.$events) {
      this.$events = {};
    }

    if (!this.$events[name]) {
      this.$events[name] = [];
    }

    if (!io.util.isArray(this.$events[name])) {
      this.$events[name] = [this.$events[name]];
    }

    return this.$events[name];
  };

  /**
   * Emits an event.
   *
   * @api public
   */

  EventEmitter.prototype.emit = function (name) {
    if (!this.$events) {
      return false;
    }

    var handler = this.$events[name];

    if (!handler) {
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    if ('function' == typeof handler) {
      handler.apply(this, args);
    } else if (io.util.isArray(handler)) {
      var listeners = handler.slice();

      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }

    return true;
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Based on JSON2 (http://www.JSON.org/js.html).
 */

(function (exports, nativeJSON) {
  

  // use native JSON if it's available
  if (nativeJSON && nativeJSON.parse){
    return exports.JSON = {
      parse: nativeJSON.parse
    , stringify: nativeJSON.stringify
    };
  }

  var JSON = exports.JSON = {};

  function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
  }

  function date(d, key) {
    return isFinite(d.valueOf()) ?
        d.getUTCFullYear()     + '-' +
        f(d.getUTCMonth() + 1) + '-' +
        f(d.getUTCDate())      + 'T' +
        f(d.getUTCHours())     + ':' +
        f(d.getUTCMinutes())   + ':' +
        f(d.getUTCSeconds())   + 'Z' : null;
  };

  var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      gap,
      indent,
      meta = {    // table of character substitutions
          '\b': '\\b',
          '\t': '\\t',
          '\n': '\\n',
          '\f': '\\f',
          '\r': '\\r',
          '"' : '\\"',
          '\\': '\\\\'
      },
      rep;


  function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

      escapable.lastIndex = 0;
      return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
          var c = meta[a];
          return typeof c === 'string' ? c :
              '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + string + '"';
  }


  function str(key, holder) {

// Produce a string from holder[key].

      var i,          // The loop counter.
          k,          // The member key.
          v,          // The member value.
          length,
          mind = gap,
          partial,
          value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

      if (value instanceof Date) {
          value = date(key);
      }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

      if (typeof rep === 'function') {
          value = rep.call(holder, key, value);
      }

// What happens next depends on the value's type.

      switch (typeof value) {
      case 'string':
          return quote(value);

      case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

          return isFinite(value) ? String(value) : 'null';

      case 'boolean':
      case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

          return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

      case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

          if (!value) {
              return 'null';
          }

// Make an array to hold the partial results of stringifying this object value.

          gap += indent;
          partial = [];

// Is the value an array?

          if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

              length = value.length;
              for (i = 0; i < length; i += 1) {
                  partial[i] = str(i, value) || 'null';
              }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

              v = partial.length === 0 ? '[]' : gap ?
                  '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                  '[' + partial.join(',') + ']';
              gap = mind;
              return v;
          }

// If the replacer is an array, use it to select the members to be stringified.

          if (rep && typeof rep === 'object') {
              length = rep.length;
              for (i = 0; i < length; i += 1) {
                  if (typeof rep[i] === 'string') {
                      k = rep[i];
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          } else {

// Otherwise, iterate through all of the keys in the object.

              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = str(k, value);
                      if (v) {
                          partial.push(quote(k) + (gap ? ': ' : ':') + v);
                      }
                  }
              }
          }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

          v = partial.length === 0 ? '{}' : gap ?
              '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
              '{' + partial.join(',') + '}';
          gap = mind;
          return v;
      }
  }

// If the JSON object does not yet have a stringify method, give it one.

  JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

      var i;
      gap = '';
      indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

      if (typeof space === 'number') {
          for (i = 0; i < space; i += 1) {
              indent += ' ';
          }

// If the space parameter is a string, it will be used as the indent string.

      } else if (typeof space === 'string') {
          indent = space;
      }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

      rep = replacer;
      if (replacer && typeof replacer !== 'function' &&
              (typeof replacer !== 'object' ||
              typeof replacer.length !== 'number')) {
          throw new Error('JSON.stringify');
      }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

      return str('', {'': value});
  };

// If the JSON object does not yet have a parse method, give it one.

  JSON.parse = function (text, reviver) {
  // The parse method takes a text and an optional reviver function, and returns
  // a JavaScript value if the text is a valid JSON text.

      var j;

      function walk(holder, key) {

  // The walk method is used to recursively walk the resulting structure so
  // that modifications can be made.

          var k, v, value = holder[key];
          if (value && typeof value === 'object') {
              for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                      v = walk(value, k);
                      if (v !== undefined) {
                          value[k] = v;
                      } else {
                          delete value[k];
                      }
                  }
              }
          }
          return reviver.call(holder, key, value);
      }


  // Parsing happens in four stages. In the first stage, we replace certain
  // Unicode characters with escape sequences. JavaScript handles many characters
  // incorrectly, either silently deleting them, or treating them as line endings.

      text = String(text);
      cx.lastIndex = 0;
      if (cx.test(text)) {
          text = text.replace(cx, function (a) {
              return '\\u' +
                  ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          });
      }

  // In the second stage, we run the text against regular expressions that look
  // for non-JSON patterns. We are especially concerned with '()' and 'new'
  // because they can cause invocation, and '=' because it can cause mutation.
  // But just to be safe, we want to reject all unexpected forms.

  // We split the second stage into 4 regexp operations in order to work around
  // crippling inefficiencies in IE's and Safari's regexp engines. First we
  // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
  // replace all simple value tokens with ']' characters. Third, we delete all
  // open brackets that follow a colon or comma or that begin the text. Finally,
  // we look to see that the remaining characters are only whitespace or ']' or
  // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

      if (/^[\],:{}\s]*$/
              .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                  .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                  .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

  // In the third stage we use the eval function to compile the text into a
  // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
  // in JavaScript: it can begin a block or an object literal. We wrap the text
  // in parens to eliminate the ambiguity.

          j = eval('(' + text + ')');

  // In the optional fourth stage, we recursively walk the new structure, passing
  // each name/value pair to a reviver function for possible transformation.

          return typeof reviver === 'function' ?
              walk({'': j}, '') : j;
      }

  // If the text is not JSON parseable, then a SyntaxError is thrown.

      throw new SyntaxError('JSON.parse');
  };

})(
    'undefined' != typeof io ? io : module.exports
  , typeof JSON !== 'undefined' ? JSON : undefined
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Parser namespace.
   *
   * @namespace
   */

  var parser = exports.parser = {};

  /**
   * Packet types.
   */

  var packets = parser.packets = [
      'disconnect'
    , 'connect'
    , 'heartbeat'
    , 'message'
    , 'json'
    , 'event'
    , 'ack'
    , 'error'
    , 'noop'
  ];

  /**
   * Errors reasons.
   */

  var reasons = parser.reasons = [
      'transport not supported'
    , 'client not handshaken'
    , 'unauthorized'
  ];

  /**
   * Errors advice.
   */

  var advice = parser.advice = [
      'reconnect'
  ];

  /**
   * Shortcuts.
   */

  var JSON = io.JSON
    , indexOf = io.util.indexOf;

  /**
   * Encodes a packet.
   *
   * @api private
   */

  parser.encodePacket = function (packet) {
    var type = indexOf(packets, packet.type)
      , id = packet.id || ''
      , endpoint = packet.endpoint || ''
      , ack = packet.ack
      , data = null;

    switch (packet.type) {
      case 'error':
        var reason = packet.reason ? indexOf(reasons, packet.reason) : ''
          , adv = packet.advice ? indexOf(advice, packet.advice) : '';

        if (reason !== '' || adv !== '')
          data = reason + (adv !== '' ? ('+' + adv) : '');

        break;

      case 'message':
        if (packet.data !== '')
          data = packet.data;
        break;

      case 'event':
        var ev = { name: packet.name };

        if (packet.args && packet.args.length) {
          ev.args = packet.args;
        }

        data = JSON.stringify(ev);
        break;

      case 'json':
        data = JSON.stringify(packet.data);
        break;

      case 'connect':
        if (packet.qs)
          data = packet.qs;
        break;

      case 'ack':
        data = packet.ackId
          + (packet.args && packet.args.length
              ? '+' + JSON.stringify(packet.args) : '');
        break;
    }

    // construct packet with required fragments
    var encoded = [
        type
      , id + (ack == 'data' ? '+' : '')
      , endpoint
    ];

    // data fragment is optional
    if (data !== null && data !== undefined)
      encoded.push(data);

    return encoded.join(':');
  };

  /**
   * Encodes multiple messages (payload).
   *
   * @param {Array} messages
   * @api private
   */

  parser.encodePayload = function (packets) {
    var decoded = '';

    if (packets.length == 1)
      return packets[0];

    for (var i = 0, l = packets.length; i < l; i++) {
      var packet = packets[i];
      decoded += '\ufffd' + packet.length + '\ufffd' + packets[i];
    }

    return decoded;
  };

  /**
   * Decodes a packet
   *
   * @api private
   */

  var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;

  parser.decodePacket = function (data) {
    var pieces = data.match(regexp);

    if (!pieces) return {};

    var id = pieces[2] || ''
      , data = pieces[5] || ''
      , packet = {
            type: packets[pieces[1]]
          , endpoint: pieces[4] || ''
        };

    // whether we need to acknowledge the packet
    if (id) {
      packet.id = id;
      if (pieces[3])
        packet.ack = 'data';
      else
        packet.ack = true;
    }

    // handle different packet types
    switch (packet.type) {
      case 'error':
        var pieces = data.split('+');
        packet.reason = reasons[pieces[0]] || '';
        packet.advice = advice[pieces[1]] || '';
        break;

      case 'message':
        packet.data = data || '';
        break;

      case 'event':
        try {
          var opts = JSON.parse(data);
          packet.name = opts.name;
          packet.args = opts.args;
        } catch (e) { }

        packet.args = packet.args || [];
        break;

      case 'json':
        try {
          packet.data = JSON.parse(data);
        } catch (e) { }
        break;

      case 'connect':
        packet.qs = data || '';
        break;

      case 'ack':
        var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
        if (pieces) {
          packet.ackId = pieces[1];
          packet.args = [];

          if (pieces[3]) {
            try {
              packet.args = pieces[3] ? JSON.parse(pieces[3]) : [];
            } catch (e) { }
          }
        }
        break;

      case 'disconnect':
      case 'heartbeat':
        break;
    };

    return packet;
  };

  /**
   * Decodes data payload. Detects multiple messages
   *
   * @return {Array} messages
   * @api public
   */

  parser.decodePayload = function (data) {
    // IE doesn't like data[i] for unicode chars, charAt works fine
    if (data.charAt(0) == '\ufffd') {
      var ret = [];

      for (var i = 1, length = ''; i < data.length; i++) {
        if (data.charAt(i) == '\ufffd') {
          ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
          i += Number(length) + 1;
          length = '';
        } else {
          length += data.charAt(i);
        }
      }

      return ret;
    } else {
      return [parser.decodePacket(data)];
    }
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.Transport = Transport;

  /**
   * This is the transport template for all supported transport methods.
   *
   * @constructor
   * @api public
   */

  function Transport (socket, sessid) {
    this.socket = socket;
    this.sessid = sessid;
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Transport, io.EventEmitter);


  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  Transport.prototype.heartbeats = function () {
    return true;
  };

  /**
   * Handles the response from the server. When a new response is received
   * it will automatically update the timeout, decode the message and
   * forwards the response to the onMessage function for further processing.
   *
   * @param {String} data Response from the server.
   * @api private
   */

  Transport.prototype.onData = function (data) {
    this.clearCloseTimeout();

    // If the connection in currently open (or in a reopening state) reset the close
    // timeout since we have just received data. This check is necessary so
    // that we don't reset the timeout on an explicitly disconnected connection.
    if (this.socket.connected || this.socket.connecting || this.socket.reconnecting) {
      this.setCloseTimeout();
    }

    if (data !== '') {
      // todo: we should only do decodePayload for xhr transports
      var msgs = io.parser.decodePayload(data);

      if (msgs && msgs.length) {
        for (var i = 0, l = msgs.length; i < l; i++) {
          this.onPacket(msgs[i]);
        }
      }
    }

    return this;
  };

  /**
   * Handles packets.
   *
   * @api private
   */

  Transport.prototype.onPacket = function (packet) {
    this.socket.setHeartbeatTimeout();

    if (packet.type == 'heartbeat') {
      return this.onHeartbeat();
    }

    if (packet.type == 'connect' && packet.endpoint == '') {
      this.onConnect();
    }

    if (packet.type == 'error' && packet.advice == 'reconnect') {
      this.isOpen = false;
    }

    this.socket.onPacket(packet);

    return this;
  };

  /**
   * Sets close timeout
   *
   * @api private
   */

  Transport.prototype.setCloseTimeout = function () {
    if (!this.closeTimeout) {
      var self = this;

      this.closeTimeout = setTimeout(function () {
        self.onDisconnect();
      }, this.socket.closeTimeout);
    }
  };

  /**
   * Called when transport disconnects.
   *
   * @api private
   */

  Transport.prototype.onDisconnect = function () {
    if (this.isOpen) this.close();
    this.clearTimeouts();
    this.socket.onDisconnect();
    return this;
  };

  /**
   * Called when transport connects
   *
   * @api private
   */

  Transport.prototype.onConnect = function () {
    this.socket.onConnect();
    return this;
  };

  /**
   * Clears close timeout
   *
   * @api private
   */

  Transport.prototype.clearCloseTimeout = function () {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  };

  /**
   * Clear timeouts
   *
   * @api private
   */

  Transport.prototype.clearTimeouts = function () {
    this.clearCloseTimeout();

    if (this.reopenTimeout) {
      clearTimeout(this.reopenTimeout);
    }
  };

  /**
   * Sends a packet
   *
   * @param {Object} packet object.
   * @api private
   */

  Transport.prototype.packet = function (packet) {
    this.send(io.parser.encodePacket(packet));
  };

  /**
   * Send the received heartbeat message back to server. So the server
   * knows we are still connected.
   *
   * @param {String} heartbeat Heartbeat response from the server.
   * @api private
   */

  Transport.prototype.onHeartbeat = function (heartbeat) {
    this.packet({ type: 'heartbeat' });
  };

  /**
   * Called when the transport opens.
   *
   * @api private
   */

  Transport.prototype.onOpen = function () {
    this.isOpen = true;
    this.clearCloseTimeout();
    this.socket.onOpen();
  };

  /**
   * Notifies the base when the connection with the Socket.IO server
   * has been disconnected.
   *
   * @api private
   */

  Transport.prototype.onClose = function () {
    var self = this;

    /* FIXME: reopen delay causing a infinit loop
    this.reopenTimeout = setTimeout(function () {
      self.open();
    }, this.socket.options['reopen delay']);*/

    this.isOpen = false;
    this.socket.onClose();
    this.onDisconnect();
  };

  /**
   * Generates a connection url based on the Socket.IO URL Protocol.
   * See <https://github.com/learnboost/socket.io-node/> for more details.
   *
   * @returns {String} Connection url
   * @api private
   */

  Transport.prototype.prepareUrl = function () {
    var options = this.socket.options;

    return this.scheme() + '://'
      + options.host + ':' + options.port + '/'
      + options.resource + '/' + io.protocol
      + '/' + this.name + '/' + this.sessid;
  };

  /**
   * Checks if the transport is ready to start a connection.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Transport.prototype.ready = function (socket, fn) {
    fn.call(this);
  };
})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.Socket = Socket;

  /**
   * Create a new `Socket.IO client` which can establish a persistent
   * connection with a Socket.IO enabled server.
   *
   * @api public
   */

  function Socket (options) {
    this.options = {
        port: 80
      , secure: false
      , document: 'document' in global ? document : false
      , resource: 'socket.io'
      , transports: io.transports
      , 'connect timeout': 10000
      , 'try multiple transports': true
      , 'reconnect': true
      , 'reconnection delay': 500
      , 'reconnection limit': Infinity
      , 'reopen delay': 3000
      , 'max reconnection attempts': 10
      , 'sync disconnect on unload': false
      , 'auto connect': true
      , 'flash policy port': 10843
      , 'manualFlush': false
    };

    io.util.merge(this.options, options);

    this.connected = false;
    this.open = false;
    this.connecting = false;
    this.reconnecting = false;
    this.namespaces = {};
    this.buffer = [];
    this.doBuffer = false;

    if (this.options['sync disconnect on unload'] &&
        (!this.isXDomain() || io.util.ua.hasCORS)) {
      var self = this;
      io.util.on(global, 'beforeunload', function () {
        self.disconnectSync();
      }, false);
    }

    if (this.options['auto connect']) {
      this.connect();
    }
};

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(Socket, io.EventEmitter);

  /**
   * Returns a namespace listener/emitter for this socket
   *
   * @api public
   */

  Socket.prototype.of = function (name) {
    if (!this.namespaces[name]) {
      this.namespaces[name] = new io.SocketNamespace(this, name);

      if (name !== '') {
        this.namespaces[name].packet({ type: 'connect' });
      }
    }

    return this.namespaces[name];
  };

  /**
   * Emits the given event to the Socket and all namespaces
   *
   * @api private
   */

  Socket.prototype.publish = function () {
    this.emit.apply(this, arguments);

    var nsp;

    for (var i in this.namespaces) {
      if (this.namespaces.hasOwnProperty(i)) {
        nsp = this.of(i);
        nsp.$emit.apply(nsp, arguments);
      }
    }
  };

  /**
   * Performs the handshake
   *
   * @api private
   */

  function empty () { };

  Socket.prototype.handshake = function (fn) {
    var self = this
      , options = this.options;

    function complete (data) {
      if (data instanceof Error) {
        self.connecting = false;
        self.onError(data.message);
      } else {
        fn.apply(null, data.split(':'));
      }
    };

    var url = [
          'http' + (options.secure ? 's' : '') + ':/'
        , options.host + ':' + options.port
        , options.resource
        , io.protocol
        , io.util.query(this.options.query, 't=' + +new Date)
      ].join('/');

    if (this.isXDomain() && !io.util.ua.hasCORS) {
      var insertAt = document.getElementsByTagName('script')[0]
        , script = document.createElement('script');

      script.src = url + '&jsonp=' + io.j.length;
      insertAt.parentNode.insertBefore(script, insertAt);

      io.j.push(function (data) {
        complete(data);
        script.parentNode.removeChild(script);
      });
    } else {
      var xhr = io.util.request();

      xhr.open('GET', url, true);
      if (this.isXDomain()) {
        xhr.withCredentials = true;
      }
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          xhr.onreadystatechange = empty;

          if (xhr.status == 200) {
            complete(xhr.responseText);
          } else if (xhr.status == 403) {
            self.onError(xhr.responseText);
          } else {
            self.connecting = false;            
            !self.reconnecting && self.onError(xhr.responseText);
          }
        }
      };
      xhr.send(null);
    }
  };

  /**
   * Find an available transport based on the options supplied in the constructor.
   *
   * @api private
   */

  Socket.prototype.getTransport = function (override) {
    var transports = override || this.transports, match;

    for (var i = 0, transport; transport = transports[i]; i++) {
      if (io.Transport[transport]
        && io.Transport[transport].check(this)
        && (!this.isXDomain() || io.Transport[transport].xdomainCheck(this))) {
        return new io.Transport[transport](this, this.sessionid);
      }
    }

    return null;
  };

  /**
   * Connects to the server.
   *
   * @param {Function} [fn] Callback.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.connect = function (fn) {
    if (this.connecting) {
      return this;
    }

    var self = this;
    self.connecting = true;
    
    this.handshake(function (sid, heartbeat, close, transports) {
      self.sessionid = sid;
      self.closeTimeout = close * 1000;
      self.heartbeatTimeout = heartbeat * 1000;
      if(!self.transports)
          self.transports = self.origTransports = (transports ? io.util.intersect(
              transports.split(',')
            , self.options.transports
          ) : self.options.transports);

      self.setHeartbeatTimeout();

      function connect (transports){
        if (self.transport) self.transport.clearTimeouts();

        self.transport = self.getTransport(transports);
        if (!self.transport) return self.publish('connect_failed');

        // once the transport is ready
        self.transport.ready(self, function () {
          self.connecting = true;
          self.publish('connecting', self.transport.name);
          self.transport.open();

          if (self.options['connect timeout']) {
            self.connectTimeoutTimer = setTimeout(function () {
              if (!self.connected) {
                self.connecting = false;

                if (self.options['try multiple transports']) {
                  var remaining = self.transports;

                  while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                         self.transport.name) {}

                    if (remaining.length){
                      connect(remaining);
                    } else {
                      self.publish('connect_failed');
                    }
                }
              }
            }, self.options['connect timeout']);
          }
        });
      }

      connect(self.transports);

      self.once('connect', function (){
        clearTimeout(self.connectTimeoutTimer);

        fn && typeof fn == 'function' && fn();
      });
    });

    return this;
  };

  /**
   * Clears and sets a new heartbeat timeout using the value given by the
   * server during the handshake.
   *
   * @api private
   */

  Socket.prototype.setHeartbeatTimeout = function () {
    clearTimeout(this.heartbeatTimeoutTimer);
    if(this.transport && !this.transport.heartbeats()) return;

    var self = this;
    this.heartbeatTimeoutTimer = setTimeout(function () {
      self.transport.onClose();
    }, this.heartbeatTimeout);
  };

  /**
   * Sends a message.
   *
   * @param {Object} data packet.
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.packet = function (data) {
    if (this.connected && !this.doBuffer) {
      this.transport.packet(data);
    } else {
      this.buffer.push(data);
    }

    return this;
  };

  /**
   * Sets buffer state
   *
   * @api private
   */

  Socket.prototype.setBuffer = function (v) {
    this.doBuffer = v;

    if (!v && this.connected && this.buffer.length) {
      if (!this.options['manualFlush']) {
        this.flushBuffer();
      }
    }
  };

  /**
   * Flushes the buffer data over the wire.
   * To be invoked manually when 'manualFlush' is set to true.
   *
   * @api public
   */

  Socket.prototype.flushBuffer = function() {
    this.transport.payload(this.buffer);
    this.buffer = [];
  };
  

  /**
   * Disconnect the established connect.
   *
   * @returns {io.Socket}
   * @api public
   */

  Socket.prototype.disconnect = function () {
    if (this.connected || this.connecting) {
      if (this.open) {
        this.of('').packet({ type: 'disconnect' });
      }

      // handle disconnection immediately
      this.onDisconnect('booted');
    }

    return this;
  };

  /**
   * Disconnects the socket with a sync XHR.
   *
   * @api private
   */

  Socket.prototype.disconnectSync = function () {
    // ensure disconnection
    var xhr = io.util.request();
    var uri = [
        'http' + (this.options.secure ? 's' : '') + ':/'
      , this.options.host + ':' + this.options.port
      , this.options.resource
      , io.protocol
      , ''
      , this.sessionid
    ].join('/') + '/?disconnect=1';

    xhr.open('GET', uri, false);
    xhr.send(null);

    // handle disconnection immediately
    this.onDisconnect('booted');
  };

  /**
   * Check if we need to use cross domain enabled transports. Cross domain would
   * be a different port or different domain name.
   *
   * @returns {Boolean}
   * @api private
   */

  Socket.prototype.isXDomain = function () {

    var port = global.location.port ||
      ('https:' == global.location.protocol ? 443 : 80);

    return this.options.host !== global.location.hostname 
      || this.options.port != port;
  };

  /**
   * Called upon handshake.
   *
   * @api private
   */

  Socket.prototype.onConnect = function () {
    if (!this.connected) {
      this.connected = true;
      this.connecting = false;
      if (!this.doBuffer) {
        // make sure to flush the buffer
        this.setBuffer(false);
      }
      this.emit('connect');
    }
  };

  /**
   * Called when the transport opens
   *
   * @api private
   */

  Socket.prototype.onOpen = function () {
    this.open = true;
  };

  /**
   * Called when the transport closes.
   *
   * @api private
   */

  Socket.prototype.onClose = function () {
    this.open = false;
    clearTimeout(this.heartbeatTimeoutTimer);
  };

  /**
   * Called when the transport first opens a connection
   *
   * @param text
   */

  Socket.prototype.onPacket = function (packet) {
    this.of(packet.endpoint).onPacket(packet);
  };

  /**
   * Handles an error.
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    if (err && err.advice) {
      if (err.advice === 'reconnect' && (this.connected || this.connecting)) {
        this.disconnect();
        if (this.options.reconnect) {
          this.reconnect();
        }
      }
    }

    this.publish('error', err && err.reason ? err.reason : err);
  };

  /**
   * Called when the transport disconnects.
   *
   * @api private
   */

  Socket.prototype.onDisconnect = function (reason) {
    var wasConnected = this.connected
      , wasConnecting = this.connecting;

    this.connected = false;
    this.connecting = false;
    this.open = false;

    if (wasConnected || wasConnecting) {
      this.transport.close();
      this.transport.clearTimeouts();
      if (wasConnected) {
        this.publish('disconnect', reason);

        if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
          this.reconnect();
        }
      }
    }
  };

  /**
   * Called upon reconnection.
   *
   * @api private
   */

  Socket.prototype.reconnect = function () {
    this.reconnecting = true;
    this.reconnectionAttempts = 0;
    this.reconnectionDelay = this.options['reconnection delay'];

    var self = this
      , maxAttempts = this.options['max reconnection attempts']
      , tryMultiple = this.options['try multiple transports']
      , limit = this.options['reconnection limit'];

    function reset () {
      if (self.connected) {
        for (var i in self.namespaces) {
          if (self.namespaces.hasOwnProperty(i) && '' !== i) {
              self.namespaces[i].packet({ type: 'connect' });
          }
        }
        self.publish('reconnect', self.transport.name, self.reconnectionAttempts);
      }

      clearTimeout(self.reconnectionTimer);

      self.removeListener('connect_failed', maybeReconnect);
      self.removeListener('connect', maybeReconnect);

      self.reconnecting = false;

      delete self.reconnectionAttempts;
      delete self.reconnectionDelay;
      delete self.reconnectionTimer;
      delete self.redoTransports;

      self.options['try multiple transports'] = tryMultiple;
    };

    function maybeReconnect () {
      if (!self.reconnecting) {
        return;
      }

      if (self.connected) {
        return reset();
      };

      if (self.connecting && self.reconnecting) {
        return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
      }

      if (self.reconnectionAttempts++ >= maxAttempts) {
        if (!self.redoTransports) {
          self.on('connect_failed', maybeReconnect);
          self.options['try multiple transports'] = true;
          self.transports = self.origTransports;
          self.transport = self.getTransport();
          self.redoTransports = true;
          self.connect();
        } else {
          self.publish('reconnect_failed');
          reset();
        }
      } else {
        if (self.reconnectionDelay < limit) {
          self.reconnectionDelay *= 2; // exponential back off
        }

        self.connect();
        self.publish('reconnecting', self.reconnectionDelay, self.reconnectionAttempts);
        self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
      }
    };

    this.options['try multiple transports'] = false;
    this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);

    this.on('connect', maybeReconnect);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.SocketNamespace = SocketNamespace;

  /**
   * Socket namespace constructor.
   *
   * @constructor
   * @api public
   */

  function SocketNamespace (socket, name) {
    this.socket = socket;
    this.name = name || '';
    this.flags = {};
    this.json = new Flag(this, 'json');
    this.ackPackets = 0;
    this.acks = {};
  };

  /**
   * Apply EventEmitter mixin.
   */

  io.util.mixin(SocketNamespace, io.EventEmitter);

  /**
   * Copies emit since we override it
   *
   * @api private
   */

  SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;

  /**
   * Creates a new namespace, by proxying the request to the socket. This
   * allows us to use the synax as we do on the server.
   *
   * @api public
   */

  SocketNamespace.prototype.of = function () {
    return this.socket.of.apply(this.socket, arguments);
  };

  /**
   * Sends a packet.
   *
   * @api private
   */

  SocketNamespace.prototype.packet = function (packet) {
    packet.endpoint = this.name;
    this.socket.packet(packet);
    this.flags = {};
    return this;
  };

  /**
   * Sends a message
   *
   * @api public
   */

  SocketNamespace.prototype.send = function (data, fn) {
    var packet = {
        type: this.flags.json ? 'json' : 'message'
      , data: data
    };

    if ('function' == typeof fn) {
      packet.id = ++this.ackPackets;
      packet.ack = true;
      this.acks[packet.id] = fn;
    }

    return this.packet(packet);
  };

  /**
   * Emits an event
   *
   * @api public
   */
  
  SocketNamespace.prototype.emit = function (name) {
    var args = Array.prototype.slice.call(arguments, 1)
      , lastArg = args[args.length - 1]
      , packet = {
            type: 'event'
          , name: name
        };

    if ('function' == typeof lastArg) {
      packet.id = ++this.ackPackets;
      packet.ack = 'data';
      this.acks[packet.id] = lastArg;
      args = args.slice(0, args.length - 1);
    }

    packet.args = args;

    return this.packet(packet);
  };

  /**
   * Disconnects the namespace
   *
   * @api private
   */

  SocketNamespace.prototype.disconnect = function () {
    if (this.name === '') {
      this.socket.disconnect();
    } else {
      this.packet({ type: 'disconnect' });
      this.$emit('disconnect');
    }

    return this;
  };

  /**
   * Handles a packet
   *
   * @api private
   */

  SocketNamespace.prototype.onPacket = function (packet) {
    var self = this;

    function ack () {
      self.packet({
          type: 'ack'
        , args: io.util.toArray(arguments)
        , ackId: packet.id
      });
    };

    switch (packet.type) {
      case 'connect':
        this.$emit('connect');
        break;

      case 'disconnect':
        if (this.name === '') {
          this.socket.onDisconnect(packet.reason || 'booted');
        } else {
          this.$emit('disconnect', packet.reason);
        }
        break;

      case 'message':
      case 'json':
        var params = ['message', packet.data];

        if (packet.ack == 'data') {
          params.push(ack);
        } else if (packet.ack) {
          this.packet({ type: 'ack', ackId: packet.id });
        }

        this.$emit.apply(this, params);
        break;

      case 'event':
        var params = [packet.name].concat(packet.args);

        if (packet.ack == 'data')
          params.push(ack);

        this.$emit.apply(this, params);
        break;

      case 'ack':
        if (this.acks[packet.ackId]) {
          this.acks[packet.ackId].apply(this, packet.args);
          delete this.acks[packet.ackId];
        }
        break;

      case 'error':
        if (packet.advice){
          this.socket.onError(packet);
        } else {
          if (packet.reason == 'unauthorized') {
            this.$emit('connect_failed', packet.reason);
          } else {
            this.$emit('error', packet.reason);
          }
        }
        break;
    }
  };

  /**
   * Flag interface.
   *
   * @api private
   */

  function Flag (nsp, name) {
    this.namespace = nsp;
    this.name = name;
  };

  /**
   * Send a message
   *
   * @api public
   */

  Flag.prototype.send = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.send.apply(this.namespace, arguments);
  };

  /**
   * Emit an event
   *
   * @api public
   */

  Flag.prototype.emit = function () {
    this.namespace.flags[this.name] = true;
    this.namespace.emit.apply(this.namespace, arguments);
  };

})(
    'undefined' != typeof io ? io : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports.websocket = WS;

  /**
   * The WebSocket transport uses the HTML5 WebSocket API to establish an
   * persistent connection with the Socket.IO server. This transport will also
   * be inherited by the FlashSocket fallback as it provides a API compatible
   * polyfill for the WebSockets.
   *
   * @constructor
   * @extends {io.Transport}
   * @api public
   */

  function WS (socket) {
    io.Transport.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(WS, io.Transport);

  /**
   * Transport name
   *
   * @api public
   */

  WS.prototype.name = 'websocket';

  /**
   * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
   * all the appropriate listeners to handle the responses from the server.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.open = function () {
    var query = io.util.query(this.socket.options.query)
      , self = this
      , Socket


    if (!Socket) {
      Socket = global.MozWebSocket || global.WebSocket;
    }

    this.websocket = new Socket(this.prepareUrl() + query);

    this.websocket.onopen = function () {
      self.onOpen();
      self.socket.setBuffer(false);
    };
    this.websocket.onmessage = function (ev) {
      self.onData(ev.data);
    };
    this.websocket.onclose = function () {
      self.onClose();
      self.socket.setBuffer(true);
    };
    this.websocket.onerror = function (e) {
      self.onError(e);
    };

    return this;
  };

  /**
   * Send a message to the Socket.IO server. The message will automatically be
   * encoded in the correct message format.
   *
   * @returns {Transport}
   * @api public
   */

  // Do to a bug in the current IDevices browser, we need to wrap the send in a 
  // setTimeout, when they resume from sleeping the browser will crash if 
  // we don't allow the browser time to detect the socket has been closed
  if (io.util.ua.iDevice) {
    WS.prototype.send = function (data) {
      var self = this;
      setTimeout(function() {
         self.websocket.send(data);
      },0);
      return this;
    };
  } else {
    WS.prototype.send = function (data) {
      this.websocket.send(data);
      return this;
    };
  }

  /**
   * Payload
   *
   * @api private
   */

  WS.prototype.payload = function (arr) {
    for (var i = 0, l = arr.length; i < l; i++) {
      this.packet(arr[i]);
    }
    return this;
  };

  /**
   * Disconnect the established `WebSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  WS.prototype.close = function () {
    this.websocket.close();
    return this;
  };

  /**
   * Handle the errors that `WebSocket` might be giving when we
   * are attempting to connect or send messages.
   *
   * @param {Error} e The error.
   * @api private
   */

  WS.prototype.onError = function (e) {
    this.socket.onError(e);
  };

  /**
   * Returns the appropriate scheme for the URI generation.
   *
   * @api private
   */
  WS.prototype.scheme = function () {
    return this.socket.options.secure ? 'wss' : 'ws';
  };

  /**
   * Checks if the browser has support for native `WebSockets` and that
   * it's not the polyfill created for the FlashSocket transport.
   *
   * @return {Boolean}
   * @api public
   */

  WS.check = function () {
    return ('WebSocket' in global && !('__addTask' in WebSocket))
          || 'MozWebSocket' in global;
  };

  /**
   * Check if the `WebSocket` transport support cross domain communications.
   *
   * @returns {Boolean}
   * @api public
   */

  WS.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('websocket');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.flashsocket = Flashsocket;

  /**
   * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket
   * specification. It uses a .swf file to communicate with the server. If you want
   * to serve the .swf file from a other server than where the Socket.IO script is
   * coming from you need to use the insecure version of the .swf. More information
   * about this can be found on the github page.
   *
   * @constructor
   * @extends {io.Transport.websocket}
   * @api public
   */

  function Flashsocket () {
    io.Transport.websocket.apply(this, arguments);
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(Flashsocket, io.Transport.websocket);

  /**
   * Transport name
   *
   * @api public
   */

  Flashsocket.prototype.name = 'flashsocket';

  /**
   * Disconnect the established `FlashSocket` connection. This is done by adding a 
   * new task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.open = function () {
    var self = this
      , args = arguments;

    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.open.apply(self, args);
    });
    return this;
  };
  
  /**
   * Sends a message to the Socket.IO server. This is done by adding a new
   * task to the FlashSocket. The rest will be handled off by the `WebSocket` 
   * transport.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.send = function () {
    var self = this, args = arguments;
    WebSocket.__addTask(function () {
      io.Transport.websocket.prototype.send.apply(self, args);
    });
    return this;
  };

  /**
   * Disconnects the established `FlashSocket` connection.
   *
   * @returns {Transport}
   * @api public
   */

  Flashsocket.prototype.close = function () {
    WebSocket.__tasks.length = 0;
    io.Transport.websocket.prototype.close.call(this);
    return this;
  };

  /**
   * The WebSocket fall back needs to append the flash container to the body
   * element, so we need to make sure we have access to it. Or defer the call
   * until we are sure there is a body element.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  Flashsocket.prototype.ready = function (socket, fn) {
    function init () {
      var options = socket.options
        , port = options['flash policy port']
        , path = [
              'http' + (options.secure ? 's' : '') + ':/'
            , options.host + ':' + options.port
            , options.resource
            , 'static/flashsocket'
            , 'WebSocketMain' + (socket.isXDomain() ? 'Insecure' : '') + '.swf'
          ];

      // Only start downloading the swf file when the checked that this browser
      // actually supports it
      if (!Flashsocket.loaded) {
        if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined') {
          // Set the correct file based on the XDomain settings
          WEB_SOCKET_SWF_LOCATION = path.join('/');
        }

        if (port !== 843) {
          WebSocket.loadFlashPolicyFile('xmlsocket://' + options.host + ':' + port);
        }

        WebSocket.__initialize();
        Flashsocket.loaded = true;
      }

      fn.call(self);
    }

    var self = this;
    if (document.body) return init();

    io.util.load(init);
  };

  /**
   * Check if the FlashSocket transport is supported as it requires that the Adobe
   * Flash Player plug-in version `10.0.0` or greater is installed. And also check if
   * the polyfill is correctly loaded.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.check = function () {
    if (
        typeof WebSocket == 'undefined'
      || !('__initialize' in WebSocket) || !swfobject
    ) return false;

    return swfobject.getFlashPlayerVersion().major >= 10;
  };

  /**
   * Check if the FlashSocket transport can be used as cross domain / cross origin 
   * transport. Because we can't see which type (secure or insecure) of .swf is used
   * we will just return true.
   *
   * @returns {Boolean}
   * @api public
   */

  Flashsocket.xdomainCheck = function () {
    return true;
  };

  /**
   * Disable AUTO_INITIALIZATION
   */

  if (typeof window != 'undefined') {
    WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
  }

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('flashsocket');
})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
if ('undefined' != typeof window) {
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O[(['Active'].concat('Object').join('X'))]!=D){try{var ad=new window[(['Active'].concat('Object').join('X'))](W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?(['Active'].concat('').join('X')):"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
}
// Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
// License: New BSD License
// Reference: http://dev.w3.org/html5/websockets/
// Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

(function() {
  
  if ('undefined' == typeof window || window.WebSocket) return;

  var console = window.console;
  if (!console || !console.log || !console.error) {
    console = {log: function(){ }, error: function(){ }};
  }
  
  if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
    console.error("Flash Player >= 10.0.0 is required.");
    return;
  }
  if (location.protocol == "file:") {
    console.error(
      "WARNING: web-socket-js doesn't work in file:///... URL " +
      "unless you set Flash Security Settings properly. " +
      "Open the page via Web server i.e. http://...");
  }

  /**
   * This class represents a faux web socket.
   * @param {string} url
   * @param {array or string} protocols
   * @param {string} proxyHost
   * @param {int} proxyPort
   * @param {string} headers
   */
  WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
    var self = this;
    self.__id = WebSocket.__nextId++;
    WebSocket.__instances[self.__id] = self;
    self.readyState = WebSocket.CONNECTING;
    self.bufferedAmount = 0;
    self.__events = {};
    if (!protocols) {
      protocols = [];
    } else if (typeof protocols == "string") {
      protocols = [protocols];
    }
    // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
    // Otherwise, when onopen fires immediately, onopen is called before it is set.
    setTimeout(function() {
      WebSocket.__addTask(function() {
        WebSocket.__flash.create(
            self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
      });
    }, 0);
  };

  /**
   * Send data to the web socket.
   * @param {string} data  The data to send to the socket.
   * @return {boolean}  True for success, false for failure.
   */
  WebSocket.prototype.send = function(data) {
    if (this.readyState == WebSocket.CONNECTING) {
      throw "INVALID_STATE_ERR: Web Socket connection has not been established";
    }
    // We use encodeURIComponent() here, because FABridge doesn't work if
    // the argument includes some characters. We don't use escape() here
    // because of this:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
    // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
    // preserve all Unicode characters either e.g. "\uffff" in Firefox.
    // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
    // additional testing.
    var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
    if (result < 0) { // success
      return true;
    } else {
      this.bufferedAmount += result;
      return false;
    }
  };

  /**
   * Close this web socket gracefully.
   */
  WebSocket.prototype.close = function() {
    if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
      return;
    }
    this.readyState = WebSocket.CLOSING;
    WebSocket.__flash.close(this.__id);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) {
      this.__events[type] = [];
    }
    this.__events[type].push(listener);
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {string} type
   * @param {function} listener
   * @param {boolean} useCapture
   * @return void
   */
  WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
    if (!(type in this.__events)) return;
    var events = this.__events[type];
    for (var i = events.length - 1; i >= 0; --i) {
      if (events[i] === listener) {
        events.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
   *
   * @param {Event} event
   * @return void
   */
  WebSocket.prototype.dispatchEvent = function(event) {
    var events = this.__events[event.type] || [];
    for (var i = 0; i < events.length; ++i) {
      events[i](event);
    }
    var handler = this["on" + event.type];
    if (handler) handler(event);
  };

  /**
   * Handles an event from Flash.
   * @param {Object} flashEvent
   */
  WebSocket.prototype.__handleEvent = function(flashEvent) {
    if ("readyState" in flashEvent) {
      this.readyState = flashEvent.readyState;
    }
    if ("protocol" in flashEvent) {
      this.protocol = flashEvent.protocol;
    }
    
    var jsEvent;
    if (flashEvent.type == "open" || flashEvent.type == "error") {
      jsEvent = this.__createSimpleEvent(flashEvent.type);
    } else if (flashEvent.type == "close") {
      // TODO implement jsEvent.wasClean
      jsEvent = this.__createSimpleEvent("close");
    } else if (flashEvent.type == "message") {
      var data = decodeURIComponent(flashEvent.message);
      jsEvent = this.__createMessageEvent("message", data);
    } else {
      throw "unknown event type: " + flashEvent.type;
    }
    
    this.dispatchEvent(jsEvent);
  };
  
  WebSocket.prototype.__createSimpleEvent = function(type) {
    if (document.createEvent && window.Event) {
      var event = document.createEvent("Event");
      event.initEvent(type, false, false);
      return event;
    } else {
      return {type: type, bubbles: false, cancelable: false};
    }
  };
  
  WebSocket.prototype.__createMessageEvent = function(type, data) {
    if (document.createEvent && window.MessageEvent && !window.opera) {
      var event = document.createEvent("MessageEvent");
      event.initMessageEvent("message", false, false, data, null, null, window, null);
      return event;
    } else {
      // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
      return {type: type, data: data, bubbles: false, cancelable: false};
    }
  };
  
  /**
   * Define the WebSocket readyState enumeration.
   */
  WebSocket.CONNECTING = 0;
  WebSocket.OPEN = 1;
  WebSocket.CLOSING = 2;
  WebSocket.CLOSED = 3;

  WebSocket.__flash = null;
  WebSocket.__instances = {};
  WebSocket.__tasks = [];
  WebSocket.__nextId = 0;
  
  /**
   * Load a new flash security policy file.
   * @param {string} url
   */
  WebSocket.loadFlashPolicyFile = function(url){
    WebSocket.__addTask(function() {
      WebSocket.__flash.loadManualPolicyFile(url);
    });
  };

  /**
   * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
   */
  WebSocket.__initialize = function() {
    if (WebSocket.__flash) return;
    
    if (WebSocket.__swfLocation) {
      // For backword compatibility.
      window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
    }
    if (!window.WEB_SOCKET_SWF_LOCATION) {
      console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
      return;
    }
    var container = document.createElement("div");
    container.id = "webSocketContainer";
    // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
    // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
    // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
    // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
    // the best we can do as far as we know now.
    container.style.position = "absolute";
    if (WebSocket.__isFlashLite()) {
      container.style.left = "0px";
      container.style.top = "0px";
    } else {
      container.style.left = "-100px";
      container.style.top = "-100px";
    }
    var holder = document.createElement("div");
    holder.id = "webSocketFlash";
    container.appendChild(holder);
    document.body.appendChild(container);
    // See this article for hasPriority:
    // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
    swfobject.embedSWF(
      WEB_SOCKET_SWF_LOCATION,
      "webSocketFlash",
      "1" /* width */,
      "1" /* height */,
      "10.0.0" /* SWF version */,
      null,
      null,
      {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
      null,
      function(e) {
        if (!e.success) {
          console.error("[WebSocket] swfobject.embedSWF failed");
        }
      });
  };
  
  /**
   * Called by Flash to notify JS that it's fully loaded and ready
   * for communication.
   */
  WebSocket.__onFlashInitialized = function() {
    // We need to set a timeout here to avoid round-trip calls
    // to flash during the initialization process.
    setTimeout(function() {
      WebSocket.__flash = document.getElementById("webSocketFlash");
      WebSocket.__flash.setCallerUrl(location.href);
      WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
      for (var i = 0; i < WebSocket.__tasks.length; ++i) {
        WebSocket.__tasks[i]();
      }
      WebSocket.__tasks = [];
    }, 0);
  };
  
  /**
   * Called by Flash to notify WebSockets events are fired.
   */
  WebSocket.__onFlashEvent = function() {
    setTimeout(function() {
      try {
        // Gets events using receiveEvents() instead of getting it from event object
        // of Flash event. This is to make sure to keep message order.
        // It seems sometimes Flash events don't arrive in the same order as they are sent.
        var events = WebSocket.__flash.receiveEvents();
        for (var i = 0; i < events.length; ++i) {
          WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 0);
    return true;
  };
  
  // Called by Flash.
  WebSocket.__log = function(message) {
    console.log(decodeURIComponent(message));
  };
  
  // Called by Flash.
  WebSocket.__error = function(message) {
    console.error(decodeURIComponent(message));
  };
  
  WebSocket.__addTask = function(task) {
    if (WebSocket.__flash) {
      task();
    } else {
      WebSocket.__tasks.push(task);
    }
  };
  
  /**
   * Test if the browser is running flash lite.
   * @return {boolean} True if flash lite is running, false otherwise.
   */
  WebSocket.__isFlashLite = function() {
    if (!window.navigator || !window.navigator.mimeTypes) {
      return false;
    }
    var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
    if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
      return false;
    }
    return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
  };
  
  if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
    if (window.addEventListener) {
      window.addEventListener("load", function(){
        WebSocket.__initialize();
      }, false);
    } else {
      window.attachEvent("onload", function(){
        WebSocket.__initialize();
      });
    }
  }
  
})();

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   *
   * @api public
   */

  exports.XHR = XHR;

  /**
   * XHR constructor
   *
   * @costructor
   * @api public
   */

  function XHR (socket) {
    if (!socket) return;

    io.Transport.apply(this, arguments);
    this.sendBuffer = [];
  };

  /**
   * Inherits from Transport.
   */

  io.util.inherit(XHR, io.Transport);

  /**
   * Establish a connection
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.open = function () {
    this.socket.setBuffer(false);
    this.onOpen();
    this.get();

    // we need to make sure the request succeeds since we have no indication
    // whether the request opened or not until it succeeded.
    this.setCloseTimeout();

    return this;
  };

  /**
   * Check if we need to send data to the Socket.IO server, if we have data in our
   * buffer we encode it and forward it to the `post` method.
   *
   * @api private
   */

  XHR.prototype.payload = function (payload) {
    var msgs = [];

    for (var i = 0, l = payload.length; i < l; i++) {
      msgs.push(io.parser.encodePacket(payload[i]));
    }

    this.send(io.parser.encodePayload(msgs));
  };

  /**
   * Send data to the Socket.IO server.
   *
   * @param data The message
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.send = function (data) {
    this.post(data);
    return this;
  };

  /**
   * Posts a encoded message to the Socket.IO server.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  function empty () { };

  XHR.prototype.post = function (data) {
    var self = this;
    this.socket.setBuffer(true);

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;
        self.posting = false;

        if (this.status == 200){
          self.socket.setBuffer(false);
        } else {
          self.onClose();
        }
      }
    }

    function onload () {
      this.onload = empty;
      self.socket.setBuffer(false);
    };

    this.sendXHR = this.request('POST');

    if (global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
      this.sendXHR.onload = this.sendXHR.onerror = onload;
    } else {
      this.sendXHR.onreadystatechange = stateChange;
    }

    this.sendXHR.send(data);
  };

  /**
   * Disconnects the established `XHR` connection.
   *
   * @returns {Transport}
   * @api public
   */

  XHR.prototype.close = function () {
    this.onClose();
    return this;
  };

  /**
   * Generates a configured XHR request
   *
   * @param {String} url The url that needs to be requested.
   * @param {String} method The method the request should use.
   * @returns {XMLHttpRequest}
   * @api private
   */

  XHR.prototype.request = function (method) {
    var req = io.util.request(this.socket.isXDomain())
      , query = io.util.query(this.socket.options.query, 't=' + +new Date);

    req.open(method || 'GET', this.prepareUrl() + query, true);

    if (method == 'POST') {
      try {
        if (req.setRequestHeader) {
          req.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
        } else {
          // XDomainRequest
          req.contentType = 'text/plain';
        }
      } catch (e) {}
    }

    return req;
  };

  /**
   * Returns the scheme to use for the transport URLs.
   *
   * @api private
   */

  XHR.prototype.scheme = function () {
    return this.socket.options.secure ? 'https' : 'http';
  };

  /**
   * Check if the XHR transports are supported
   *
   * @param {Boolean} xdomain Check if we support cross domain requests.
   * @returns {Boolean}
   * @api public
   */

  XHR.check = function (socket, xdomain) {
    try {
      var request = io.util.request(xdomain),
          usesXDomReq = (global.XDomainRequest && request instanceof XDomainRequest),
          socketProtocol = (socket && socket.options && socket.options.secure ? 'https:' : 'http:'),
          isXProtocol = (global.location && socketProtocol != global.location.protocol);
      if (request && !(usesXDomReq && isXProtocol)) {
        return true;
      }
    } catch(e) {}

    return false;
  };

  /**
   * Check if the XHR transport supports cross domain requests.
   *
   * @returns {Boolean}
   * @api public
   */

  XHR.xdomainCheck = function (socket) {
    return XHR.check(socket, true);
  };

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);
/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io) {

  /**
   * Expose constructor.
   */

  exports.htmlfile = HTMLFile;

  /**
   * The HTMLFile transport creates a `forever iframe` based transport
   * for Internet Explorer. Regular forever iframe implementations will 
   * continuously trigger the browsers buzy indicators. If the forever iframe
   * is created inside a `htmlfile` these indicators will not be trigged.
   *
   * @constructor
   * @extends {io.Transport.XHR}
   * @api public
   */

  function HTMLFile (socket) {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(HTMLFile, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  HTMLFile.prototype.name = 'htmlfile';

  /**
   * Creates a new Ac...eX `htmlfile` with a forever loading iframe
   * that can be used to listen to messages. Inside the generated
   * `htmlfile` a reference will be made to the HTMLFile transport.
   *
   * @api private
   */

  HTMLFile.prototype.get = function () {
    this.doc = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
    this.doc.open();
    this.doc.write('<html></html>');
    this.doc.close();
    this.doc.parentWindow.s = this;

    var iframeC = this.doc.createElement('div');
    iframeC.className = 'socketio';

    this.doc.body.appendChild(iframeC);
    this.iframe = this.doc.createElement('iframe');

    iframeC.appendChild(this.iframe);

    var self = this
      , query = io.util.query(this.socket.options.query, 't='+ +new Date);

    this.iframe.src = this.prepareUrl() + query;

    io.util.on(window, 'unload', function () {
      self.destroy();
    });
  };

  /**
   * The Socket.IO server will write script tags inside the forever
   * iframe, this function will be used as callback for the incoming
   * information.
   *
   * @param {String} data The message
   * @param {document} doc Reference to the context
   * @api private
   */

  HTMLFile.prototype._ = function (data, doc) {
    // unescape all forward slashes. see GH-1251
    data = data.replace(/\\\//g, '/');
    this.onData(data);
    try {
      var script = doc.getElementsByTagName('script')[0];
      script.parentNode.removeChild(script);
    } catch (e) { }
  };

  /**
   * Destroy the established connection, iframe and `htmlfile`.
   * And calls the `CollectGarbage` function of Internet Explorer
   * to release the memory.
   *
   * @api private
   */

  HTMLFile.prototype.destroy = function () {
    if (this.iframe){
      try {
        this.iframe.src = 'about:blank';
      } catch(e){}

      this.doc = null;
      this.iframe.parentNode.removeChild(this.iframe);
      this.iframe = null;

      CollectGarbage();
    }
  };

  /**
   * Disconnects the established connection.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  HTMLFile.prototype.close = function () {
    this.destroy();
    return io.Transport.XHR.prototype.close.call(this);
  };

  /**
   * Checks if the browser supports this transport. The browser
   * must have an `Ac...eXObject` implementation.
   *
   * @return {Boolean}
   * @api public
   */

  HTMLFile.check = function (socket) {
    if (typeof window != "undefined" && (['Active'].concat('Object').join('X')) in window){
      try {
        var a = new window[(['Active'].concat('Object').join('X'))]('htmlfile');
        return a && io.Transport.XHR.check(socket);
      } catch(e){}
    }
    return false;
  };

  /**
   * Check if cross domain requests are supported.
   *
   * @returns {Boolean}
   * @api public
   */

  HTMLFile.xdomainCheck = function () {
    // we can probably do handling for sub-domains, we should
    // test that it's cross domain but a subdomain here
    return false;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('htmlfile');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {

  /**
   * Expose constructor.
   */

  exports['xhr-polling'] = XHRPolling;

  /**
   * The XHR-polling transport uses long polling XHR requests to create a
   * "persistent" connection with the server.
   *
   * @constructor
   * @api public
   */

  function XHRPolling () {
    io.Transport.XHR.apply(this, arguments);
  };

  /**
   * Inherits from XHR transport.
   */

  io.util.inherit(XHRPolling, io.Transport.XHR);

  /**
   * Merge the properties from XHR transport
   */

  io.util.merge(XHRPolling, io.Transport.XHR);

  /**
   * Transport name
   *
   * @api public
   */

  XHRPolling.prototype.name = 'xhr-polling';

  /**
   * Indicates whether heartbeats is enabled for this transport
   *
   * @api private
   */

  XHRPolling.prototype.heartbeats = function () {
    return false;
  };

  /** 
   * Establish a connection, for iPhone and Android this will be done once the page
   * is loaded.
   *
   * @returns {Transport} Chaining.
   * @api public
   */

  XHRPolling.prototype.open = function () {
    var self = this;

    io.Transport.XHR.prototype.open.call(self);
    return false;
  };

  /**
   * Starts a XHR request to wait for incoming messages.
   *
   * @api private
   */

  function empty () {};

  XHRPolling.prototype.get = function () {
    if (!this.isOpen) return;

    var self = this;

    function stateChange () {
      if (this.readyState == 4) {
        this.onreadystatechange = empty;

        if (this.status == 200) {
          self.onData(this.responseText);
          self.get();
        } else {
          self.onClose();
        }
      }
    };

    function onload () {
      this.onload = empty;
      this.onerror = empty;
      self.retryCounter = 1;
      self.onData(this.responseText);
      self.get();
    };

    function onerror () {
      self.retryCounter ++;
      if(!self.retryCounter || self.retryCounter > 3) {
        self.onClose();  
      } else {
        self.get();
      }
    };

    this.xhr = this.request();

    if (global.XDomainRequest && this.xhr instanceof XDomainRequest) {
      this.xhr.onload = onload;
      this.xhr.onerror = onerror;
    } else {
      this.xhr.onreadystatechange = stateChange;
    }

    this.xhr.send(null);
  };

  /**
   * Handle the unclean close behavior.
   *
   * @api private
   */

  XHRPolling.prototype.onClose = function () {
    io.Transport.XHR.prototype.onClose.call(this);

    if (this.xhr) {
      this.xhr.onreadystatechange = this.xhr.onload = this.xhr.onerror = empty;
      try {
        this.xhr.abort();
      } catch(e){}
      this.xhr = null;
    }
  };

  /**
   * Webkit based browsers show a infinit spinner when you start a XHR request
   * before the browsers onload event is called so we need to defer opening of
   * the transport until the onload event is called. Wrapping the cb in our
   * defer method solve this.
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  XHRPolling.prototype.ready = function (socket, fn) {
    var self = this;

    io.util.defer(function () {
      fn.call(self);
    });
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('xhr-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

/**
 * socket.io
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

(function (exports, io, global) {
  /**
   * There is a way to hide the loading indicator in Firefox. If you create and
   * remove a iframe it will stop showing the current loading indicator.
   * Unfortunately we can't feature detect that and UA sniffing is evil.
   *
   * @api private
   */

  var indicator = global.document && "MozAppearance" in
    global.document.documentElement.style;

  /**
   * Expose constructor.
   */

  exports['jsonp-polling'] = JSONPPolling;

  /**
   * The JSONP transport creates an persistent connection by dynamically
   * inserting a script tag in the page. This script tag will receive the
   * information of the Socket.IO server. When new information is received
   * it creates a new script tag for the new data stream.
   *
   * @constructor
   * @extends {io.Transport.xhr-polling}
   * @api public
   */

  function JSONPPolling (socket) {
    io.Transport['xhr-polling'].apply(this, arguments);

    this.index = io.j.length;

    var self = this;

    io.j.push(function (msg) {
      self._(msg);
    });
  };

  /**
   * Inherits from XHR polling transport.
   */

  io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);

  /**
   * Transport name
   *
   * @api public
   */

  JSONPPolling.prototype.name = 'jsonp-polling';

  /**
   * Posts a encoded message to the Socket.IO server using an iframe.
   * The iframe is used because script tags can create POST based requests.
   * The iframe is positioned outside of the view so the user does not
   * notice it's existence.
   *
   * @param {String} data A encoded message.
   * @api private
   */

  JSONPPolling.prototype.post = function (data) {
    var self = this
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (!this.form) {
      var form = document.createElement('form')
        , area = document.createElement('textarea')
        , id = this.iframeId = 'socketio_iframe_' + this.index
        , iframe;

      form.className = 'socketio';
      form.style.position = 'absolute';
      form.style.top = '0px';
      form.style.left = '0px';
      form.style.display = 'none';
      form.target = id;
      form.method = 'POST';
      form.setAttribute('accept-charset', 'utf-8');
      area.name = 'd';
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.prepareUrl() + query;

    function complete () {
      initIframe();
      self.socket.setBuffer(false);
    };

    function initIframe () {
      if (self.iframe) {
        self.form.removeChild(self.iframe);
      }

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
      } catch (e) {
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
      }

      iframe.id = self.iframeId;

      self.form.appendChild(iframe);
      self.iframe = iframe;
    };

    initIframe();

    // we temporarily stringify until we figure out how to prevent
    // browsers from turning `\n` into `\r\n` in form inputs
    this.area.value = io.JSON.stringify(data);

    try {
      this.form.submit();
    } catch(e) {}

    if (this.iframe.attachEvent) {
      iframe.onreadystatechange = function () {
        if (self.iframe.readyState == 'complete') {
          complete();
        }
      };
    } else {
      this.iframe.onload = complete;
    }

    this.socket.setBuffer(true);
  };

  /**
   * Creates a new JSONP poll that can be used to listen
   * for messages from the Socket.IO server.
   *
   * @api private
   */

  JSONPPolling.prototype.get = function () {
    var self = this
      , script = document.createElement('script')
      , query = io.util.query(
             this.socket.options.query
          , 't='+ (+new Date) + '&i=' + this.index
        );

    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.prepareUrl() + query;
    script.onerror = function () {
      self.onClose();
    };

    var insertAt = document.getElementsByTagName('script')[0];
    insertAt.parentNode.insertBefore(script, insertAt);
    this.script = script;

    if (indicator) {
      setTimeout(function () {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  /**
   * Callback function for the incoming message stream from the Socket.IO server.
   *
   * @param {String} data The message
   * @api private
   */

  JSONPPolling.prototype._ = function (msg) {
    this.onData(msg);
    if (this.isOpen) {
      this.get();
    }
    return this;
  };

  /**
   * The indicator hack only works after onload
   *
   * @param {Socket} socket The socket instance that needs a transport
   * @param {Function} fn The callback
   * @api private
   */

  JSONPPolling.prototype.ready = function (socket, fn) {
    var self = this;
    if (!indicator) return fn.call(this);

    io.util.load(function () {
      fn.call(self);
    });
  };

  /**
   * Checks if browser supports this transport.
   *
   * @return {Boolean}
   * @api public
   */

  JSONPPolling.check = function () {
    return 'document' in global;
  };

  /**
   * Check if cross domain requests are supported
   *
   * @returns {Boolean}
   * @api public
   */

  JSONPPolling.xdomainCheck = function () {
    return true;
  };

  /**
   * Add the transport to your public io.transports array.
   *
   * @api private
   */

  io.transports.push('jsonp-polling');

})(
    'undefined' != typeof io ? io.Transport : module.exports
  , 'undefined' != typeof io ? io : module.parent.exports
  , this
);

if (typeof define === "function" && define.amd) {
  define('socket',[], function () { return io; });
}
})();
define('api/server',["socket","durandal/app"],function(e,a){function o(e,o){a.on(e).then(function(a,t){r.promise().then(function(){console.log("%c"+e+" sent:","background: #222; color: #bada55",a),o(a,function(a){console.log("%c"+e+" received:","background: #222; color: #bada55",a),t&&t(a)})})})}var r=$.Deferred();e=io.connect("http://wordstesting.herokuapp.com:80"),e.on("connect",function(){r.resolve(),console.log("connected")}),e.on("disconnect",function(){r.reject(),console.log("disconnected")});var t={"server:account:login":function(a,o){e.emit("account:login",a,o)},"server:account:sign-up":function(a,o){e.emit("account:sign-up",a,o)},"server:account:recover-password":function(a,o){e.emit("account:recover-password",a,o)},"server:account:logout":function(a,o){e.emit("account:logout",a,o)},"server:game:move-word":function(a){e.emit("game:move-word",a)},"server:game:place-phrase":function(a,o){e.emit("game:place-phrase",a,o)},"server:game:more-words":function(a,o){e.emit("game:more-words",a,o)},"server:game:swap-words":function(o,r){e.emit("game:swap-words",o,function(e){e.oldWords=o.words,a.trigger("game:swap-words",e),r&&r(e)})},"server:game:skip-turn":function(a,o){e.emit("game:skip-turn",a,o)},"server:game:resign":function(a,o){e.emit("game:resign",a,o)},"server:game:queue":function(o,r){e.on("game:update",function(e){console.log("%cgame:update","background: #222; color: #bada55",e),a.trigger("game:update",e)}),e.on("game:start",function(e){console.log("%cgame:start","background: #222; color: #bada55",e),a.trigger("game:start",e)}),e.emit("game:queue",o,r)}};for(var n in t)o(n,t[n])});
define('transitions/slidedown',["durandal/system","durandal/composition","jquery"],function(e,o,a){var r=100,t={top:"-100px",opacity:0,display:"block"},i={top:"20px",opacity:.9},n={top:0,opacity:1},s={top:"",opacity:"",display:""},d=function(o){return e.defer(function(e){function d(){e.resolve()}function l(){o.keepScrollPosition||a(document).scrollTop(0)}function u(){l(),o.triggerAttach();var e=o.el?a(o.el,o.child):a(o.child);e.css(t),e.animate(i,c,"swing",function(){e.animate(n,c/2,"swing",function(){e.css(s),d()})}),o.el&&a(o.child).fadeIn(c)}if(o.child){var c=o.duration||500;o.activeView?a(o.activeView).fadeOut(r,u):u()}else a(o.activeView).fadeOut(r,d)}).promise()};return d});
define('dialogs/_dialog',["durandal/system","durandal/app","durandal/composition","durandal/activator"],function(e,o,t,n){function a(){var e=$("body"),o=e.children("."+c).get(0);return void 0===o?$("<div/>",{"class":c}).appendTo(e).get(0):o}function i(o,t){var n=a();return e.defer(function(e){function a(){var t=$("<div/>",{module:o}).appendTo(n).get(0);e.resolve(t)}t?d(o,{msg:"queue"}).then(a):a()}).promise()}function r(o){return e.defer(function(t){e.isString(o)?e.acquire(o).then(function(o){t.resolve(e.resolveObject(o))}):t.resolve(o)}).promise()}function s(e,o){var t={model:e,activate:!1};return o&&(o.attached&&(t.attached=o.attached),o.compositionComplete&&(t.compositionComplete=o.compositionComplete)),t}function l(o,a,l){return e.defer(function(e){$.when(r(o),i(o,!0)).then(function(i,r){var d=n.create();d.activateItem(i,a).then(function(n){if(n){var a=i.__dialog__={owner:i,context:l,activator:d,close:function(){function t(o){0===o.length?e.resolve():1===o.length?e.resolve(o[0]):e.resolve.apply(e,o)}var n=arguments,a=n.length?n[n.length-1]:{};return a&&a.forced&&t(n),d.deactivateItem(i,!0).then(function(e){e&&(ko.removeNode(u[o].host),delete i.__dialog__,a&&a.forced||t(n))})}};u[o]=a,i.onClose=function(){for(var e=[],o=0;o<arguments.length;o++)e.push(arguments[o]);e.push({forced:!0}),a.close.apply(this,e)},a.settings=s(i,l),a.host=r,t.compose(a.host,a.settings)}else e.resolve(!1)})})}).promise()}function d(o,t){return e.defer(function(e){u.hasOwnProperty(o)?u[o].close(t).then(function(){delete u[o],e.resolve()}):e.resolve()}).promise()}var c="dialogs",u={};return{show:function(e,o,t){return l("dialogs/"+e,o,t)},close:function(e,o){return d("dialogs/"+e,o)}}});
define('text!dialogs/alert.html',[],function () { return '<div class="dialog top-center">\r\n    <div class="alert" data-bind="html: content"></div>\r\n</div>\r\n';});

define('dialogs/alert',["durandal/app"],function(){function e(){this.content=""}var o=2e3,t=500;return e.prototype.activate=function(e){"string"==typeof e?this.content=e:(this.content=e.content,o=e.delay||o)},e.prototype.attached=function(e){this.el=$(".alert",e),this.el.css({top:($(window).innerHeight()-this.el.outerHeight())/2}),this.el.css({y:-100,display:"block",opacity:0}).transition({y:20,opacity:.8},t,"ease").transition({y:0,opacity:1},t/2,"ease").delay(o).fadeOut()},e.prototype.canDeactivate=function(){var e=this;return $.Deferred(function(o){e.el.promise().then(function(){o.resolve(!0)})}).promise()},e});
define('text!dialogs/confirm.html',[],function () { return '<div class="dialog bottom-center">\r\n    <div class="ui-overlay"></div>\r\n    <div class="confirm">\r\n        <p data-bind="text:content, visible:content"></p>\r\n        <button data-bind="click: cancel, text:cancelText">CANCEL</button>\r\n        <button data-bind="click: done, text: doneText">DONE</button>\r\n    </div>\r\n</div>\r\n';});

define('dialogs/confirm',["durandal/app"],function(){function e(){this.content="",this.cancelText="CANCEL",this.doneText="DONE",this.duration=400,this.modal=!1;var e=this;this.done=function(){e.close("done")},this.cancel=function(){e.close("cancel")},this.close=function(t){e.el.transition({y:0},300).transition({y:100,opacity:0}).promise().then(function(){e.el.hide().css({opacity:""})}),e.el.parent().removeClass("modal"),e.onClose(t)},this.onClose=function(){}}return e.prototype.activate=function(e){e&&(this.modal=e.modal||this.modal,this.duration=e.duration||this.duration,this.content=e.content||this.content,this.doneText=e.doneText||this.doneText,this.cancelText=e.cancelText||this.cancelText)},e.prototype.attached=function(e){this.el=$(".confirm",e),this.modal&&this.el.parent().addClass("modal"),this.el.css({y:100,opacity:0}).transition({y:0,opacity:1},300,"ease").transition({y:10},200)},e.prototype.canDeactivate=function(){var e=this;return $.Deferred(function(t){e.el.promise().then(function(){t.resolve(!0)})}).promise()},e});
define('text!dialogs/loading.html',[],function () { return '<div class="dialog top-center modal">\r\n    <div class="ui-overlay" data-bind="fadeVisible: loading"></div>\r\n    <div class="loading" data-bind="fadeVisible: loading">\r\n        <h1 data-bind="text: loadingStatus"></h1>\r\n        <i data-bind="visible: loading" class="icon-spinner icon-2x icon-spin active"></i>\r\n    </div>\r\n</div>\r\n';});

define('dialogs/loading',["durandal/app","api/datacontext"],function(e,t){function o(){this.loadingStatus=t.loadingStatus,this.loading=t.loading,this.duration=400}return ko.bindingHandlers.fadeVisible={init:function(e,t){var o=t();$(e).toggle(ko.utils.unwrapObservable(o))},update:function(e,t){var o=t();ko.utils.unwrapObservable(o)?$(e).fadeIn(200):$(e).fadeOut(500)}},o.prototype.activate=function(){},o.prototype.attached=function(e){this.el=$(".loading",e),this.el.css({top:($(window).innerHeight()-this.el.outerHeight())/2}),this.el.css({y:-100,display:"block",opacity:0}).transition({y:20,opacity:.8},this.duration,"ease").transition({y:0,opacity:1},this.duration/2,"ease")},o.prototype.canDeactivate=function(){var e=this;return $.Deferred(function(t){e.el.promise().then(function(){t.resolve(!0)})}).promise()},o});
define('text!dialogs/notice.html',[],function () { return '<div class="dialog top-center">\r\n    <div class="ui-overlay"></div>\r\n    <div class="notice" data-bind="click: close">\r\n        <h1 data-bind="text: heading"></h1>\r\n        <div data-bind="html: content"></div>        \r\n    </div>\r\n</div>\r\n';});

define('dialogs/notice',["durandal/app"],function(){function e(){this.heading="",this.content="",this.modal=!0;var e=this;this.close=function(){t=t||500;var o=e.el.transition({y:10},t/2,"ease").transition({y:-100,opacity:0},t).promise().then(function(){e.el.css({y:0,display:"none"})});return e.el.parent().removeClass("modal"),o}}var t=400;return e.prototype.activate=function(e){this.heading=e.heading||"",this.content=e.content||"",this.modal=e.modal||this.modal},e.prototype.attached=function(e){this.el=$(".notice",e),this.modal===!0&&this.el.parent().addClass("modal"),this.el.css({y:0,opacity:.2,scale:.1,rotateY:"0deg"}).transition({rotateY:720,scale:1,opacity:1},2e3,"ease")},e.prototype.canDeactivate=function(){var e=this;return $.Deferred(function(t){e.el.promise().then(function(){t.resolve(!0)})}).promise()},e});
define('text!dialogs/slipper.html',[],function () { return '<div class="dialog top-center">\r\n    <div class="ui-overlay"></div>\r\n    <div class="slipper" data-bind="click: close">\r\n        <h1 data-bind="text: heading"></h1>\r\n        <div data-bind="html: content"></div>        \r\n    </div>\r\n</div>\r\n';});

define('dialogs/slipper',["durandal/app"],function(){function e(){this.heading="",this.content="";var e=this;this.close=function(t){t=t||500;var o=e.el.transition({y:10},t/2,"ease").transition({y:-100,opacity:0},t).promise().then(function(){e.el.css({y:0,display:"none"})});return e.el.parent().removeClass("modal"),o},this.onClose=function(){}}return e.prototype.activate=function(e){this.heading=e.heading,this.content=e.content,e.modal===!0&&this.el.parent().addClass("modal")},e.prototype.attached=function(e){this.el=$(".slipper",e),this.el.css({y:-100,display:"block",opacity:0}).transition({y:10,opacity:1},500,"ease").transition({y:0},300).promise().then(function(){this.css({y:0})})},e.prototype.canDeactivate=function(){return this.close(200)},e});
define('text!error/not-found.html',[],function () { return '<div style="width:100%">\r\n    <div id=splash>\r\n        <h1>Page not found</h1>\r\n    </div>\r\n</div>';});

define('error/not-found',[],function(){return{}});
/*!
 * Paper.js v0.9.9 - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 *
 * Date: Sun Jul 21 16:44:30 2013 -0700
 *
 ***
 *
 * straps.js - Class inheritance library with support for bean-style accessors
 *
 * Copyright (c) 2006 - 2013 Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the MIT license.
 *
 ***
 *
 * acorn.js
 * http://marijnhaverbeke.nl/acorn/
 *
 * Acorn is a tiny, fast JavaScript parser written in JavaScript,
 * created by Marijn Haverbeke and released under an MIT license.
 *
 */

var paper = new function() {

var Base = new function() {
	var hidden = /^(statics|generics|preserve|enumerable|prototype|toString|valueOf)$/,
		toString = Object.prototype.toString,
		proto = Array.prototype,
		slice = proto.slice,

		forEach = proto.forEach || function(iter, bind) {
			for (var i = 0, l = this.length; i < l; i++)
				iter.call(bind, this[i], i, this);
		},

		forIn = function(iter, bind) {
			for (var i in this)
				if (this.hasOwnProperty(i))
					iter.call(bind, this[i], i, this);
		},

		isArray = Array.isArray = Array.isArray || function(obj) {
			return toString.call(obj) === '[object Array]';
		},

		create = Object.create || function(proto) {
			return { __proto__: proto };
		},

		describe = Object.getOwnPropertyDescriptor || function(obj, name) {
			var get = obj.__lookupGetter__ && obj.__lookupGetter__(name);
			return get
					? { get: get, set: obj.__lookupSetter__(name),
						enumerable: true, configurable: true }
					: obj.hasOwnProperty(name)
						? { value: obj[name], enumerable: true,
							configurable: true, writable: true }
						: null;
		},

		_define = Object.defineProperty || function(obj, name, desc) {
			if ((desc.get || desc.set) && obj.__defineGetter__) {
				if (desc.get)
					obj.__defineGetter__(name, desc.get);
				if (desc.set)
					obj.__defineSetter__(name, desc.set);
			} else {
				obj[name] = desc.value;
			}
			return obj;
		},

		define = function(obj, name, desc) {
			delete obj[name];
			return _define(obj, name, desc);
		};

	function inject(dest, src, enumerable, base, preserve, generics) {
		var beans;

		function field(name, val, dontCheck, generics) {
			var val = val || (val = describe(src, name))
					&& (val.get ? val : val.value);
			if (typeof val === 'string' && val[0] === '#')
				val = dest[val.substring(1)] || val;
			var isFunc = typeof val === 'function',
				res = val,
				prev = preserve || isFunc
					? (val && val.get ? name in dest : dest[name]) : null,
				bean;
			if ((dontCheck || val !== undefined && src.hasOwnProperty(name))
					&& (!preserve || !prev)) {
				if (isFunc && prev)
					val.base = prev;
				if (isFunc && beans && val.length === 0
						&& (bean = name.match(/^(get|is)(([A-Z])(.*))$/)))
					beans.push([ bean[3].toLowerCase() + bean[4], bean[2] ]);
				if (!res || isFunc || !res.get)
					res = { value: res, writable: true };
				if ((describe(dest, name)
						|| { configurable: true }).configurable) {
					res.configurable = true;
					res.enumerable = enumerable;
				}
				define(dest, name, res);
			}
			if (generics && isFunc && (!preserve || !generics[name])) {
				generics[name] = function(bind) {
					return bind && dest[name].apply(bind,
							slice.call(arguments, 1));
				};
			}
		}
		if (src) {
			beans = [];
			for (var name in src)
				if (src.hasOwnProperty(name) && !hidden.test(name))
					field(name, null, true, generics);
			field('toString');
			field('valueOf');
			for (var i = 0, l = beans && beans.length; i < l; i++)
				try {
					var bean = beans[i],
						part = bean[1];
					field(bean[0], {
						get: dest['get' + part] || dest['is' + part],
						set: dest['set' + part]
					}, true);
				} catch (e) {}
		}
		return dest;
	}

	function each(obj, iter, bind, asArray) {
		try {
			if (obj)
				(asArray || typeof asArray === 'undefined' && isArray(obj)
					? forEach : forIn).call(obj, iter, bind = bind || obj);
		} catch (e) {
			if (e !== Base.stop)
				throw e;
		}
		return bind;
	}

	function clone(obj) {
		return each(obj, function(val, i) {
			this[i] = val;
		}, new obj.constructor());
	}

	return inject(function Base() {}, {
		inject: function(src) {
			if (src) {
				var proto = this.prototype,
					base = Object.getPrototypeOf(proto).constructor,
					statics = src.statics === true ? src : src.statics;
				if (statics != src)
					inject(proto, src, src.enumerable, base && base.prototype,
							src.preserve, src.generics && this);
				inject(this, statics, true, base, src.preserve);
			}
			for (var i = 1, l = arguments.length; i < l; i++)
				this.inject(arguments[i]);
			return this;
		},

		extend: function() {
			var base = this,
				ctor;
			for (var i = 0, l = arguments.length; i < l; i++)
				if (ctor = arguments[i].initialize)
					break;
			ctor = ctor || function() {
				base.apply(this, arguments);
			};
			ctor.prototype = create(this.prototype);
			define(ctor.prototype, 'constructor',
					{ value: ctor, writable: true, configurable: true });
			inject(ctor, this, true);
			return arguments.length ? this.inject.apply(ctor, arguments) : ctor;
		}
	}, true).inject({
		inject: function() {
			for (var i = 0, l = arguments.length; i < l; i++)
				inject(this, arguments[i], arguments[i].enumerable);
			return this;
		},

		extend: function() {
			var res = create(this);
			return res.inject.apply(res, arguments);
		},

		each: function(iter, bind) {
			return each(this, iter, bind);
		},

		clone: function() {
			return clone(this);
		},

		statics: {
			each: each,
			clone: clone,
			define: define,
			describe: describe,

			create: function(ctor) {
				return create(ctor.prototype);
			},

			isPlainObject: function(obj) {
				var ctor = obj != null && obj.constructor;
				return ctor && (ctor === Object || ctor === Base
						|| ctor.name === 'Object');
			},

			check: function(obj) {
				return !!(obj || obj === 0);
			},

			pick: function() {
				for (var i = 0, l = arguments.length; i < l; i++)
					if (arguments[i] !== undefined)
						return arguments[i];
				return null;
			},

			stop: {}
		}
	});
};

if (typeof module !== 'undefined')
	module.exports = Base;

Base.inject({
	generics: true,

	clone: function() {
		return new this.constructor(this);
	},

	toString: function() {
		return this._id != null
			?  (this._class || 'Object') + (this._name
				? " '" + this._name + "'"
				: ' @' + this._id)
			: '{ ' + Base.each(this, function(value, key) {
				if (!/^_/.test(key)) {
					var type = typeof value;
					this.push(key + ': ' + (type === 'number'
							? Formatter.instance.number(value)
							: type === 'string' ? "'" + value + "'" : value));
				}
			}, []).join(', ') + ' }';
	},

	exportJSON: function(options) {
		return Base.exportJSON(this, options);
	},

	toJSON: function() {
		return Base.serialize(this);
	},

	_set: function(props, exclude) {
		if (props && Base.isPlainObject(props)) {
			for (var key in props)
				if (props.hasOwnProperty(key) && key in this
						&& (!exclude || !exclude[key]))
					this[key] = props[key];
			return true;
		}
	},

	statics: {

		exports: {},

		extend: function extend() {
			var res = extend.base.apply(this, arguments),
				name = res.prototype._class;
			if (name && !Base.exports[name])
				Base.exports[name] = res;
			return res;
		},

		equals: function(obj1, obj2) {
			function checkKeys(o1, o2) {
				for (var i in o1)
					if (o1.hasOwnProperty(i) && typeof o2[i] === 'undefined')
						return false;
				return true;
			}
			if (obj1 === obj2)
				return true;
			if (obj1 && obj1.equals)
				return obj1.equals(obj2);
			if (obj2 && obj2.equals)
				return obj2.equals(obj1);
			if (Array.isArray(obj1) && Array.isArray(obj2)) {
				if (obj1.length !== obj2.length)
					return false;
				for (var i = 0, l = obj1.length; i < l; i++) {
					if (!Base.equals(obj1[i], obj2[i]))
						return false;
				}
				return true;
			}
			if (obj1 && typeof obj1 === 'object'
					&& obj2 && typeof obj2 === 'object') {
				if (!checkKeys(obj1, obj2) || !checkKeys(obj2, obj1))
					return false;
				for (var i in obj1) {
					if (obj1.hasOwnProperty(i) && !Base.equals(obj1[i], obj2[i]))
						return false;
				}
				return true;
			}
			return false;
		},

		read: function(list, start, length, options) {
			if (this === Base) {
				var value = this.peek(list, start);
				list._index++;
				list.__read = 1;
				return value;
			}
			var proto = this.prototype,
				readIndex = proto._readIndex,
				index = start || readIndex && list._index || 0;
			if (!length)
				length = list.length - index;
			var obj = list[index];
			if (obj instanceof this
				|| options && options.readNull && obj == null && length <= 1) {
				if (readIndex)
					list._index = index + 1;
				return obj && options && options.clone ? obj.clone() : obj;
			}
			obj = Base.create(this);
			if (readIndex)
				obj.__read = true;
			if (options)
				obj.__options = options;
			obj = obj.initialize.apply(obj, index > 0 || length < list.length
				? Array.prototype.slice.call(list, index, index + length)
				: list) || obj;
			if (readIndex) {
				list._index = index + obj.__read;
				list.__read = obj.__read;
				delete obj.__read;
				if (options)
					delete obj.__options;
			}
			return obj;
		},

		peek: function(list, start) {
			return list[list._index = start || list._index || 0];
		},

		readAll: function(list, start, options) {
			var res = [], entry;
			for (var i = start || 0, l = list.length; i < l; i++) {
				res.push(Array.isArray(entry = list[i])
						? this.read(entry, 0, 0, options)
						: this.read(list, i, 1, options));
			}
			return res;
		},

		readNamed: function(list, name, start, length, options) {
			var value = this.getNamed(list, name);
			return this.read(value != null ? [value] : list, start, length,
					options);
		},

		getNamed: function(list, name) {
			var arg = list[0];
			if (list._hasObject === undefined)
				list._hasObject = list.length === 1 && Base.isPlainObject(arg);
			if (list._hasObject)
				return name ? arg[name] : arg;
		},

		hasNamed: function(list, name) {
			return !!this.getNamed(list, name);
		},

		isPlainValue: function(obj) {
			return this.isPlainObject(obj) || Array.isArray(obj);
		},

		serialize: function(obj, options, compact, dictionary) {
			options = options || {};

			var root = !dictionary,
				res;
			if (root) {
				options.formatter = new Formatter(options.precision);
				dictionary = {
					length: 0,
					definitions: {},
					references: {},
					add: function(item, create) {
						var id = '#' + item._id,
							ref = this.references[id];
						if (!ref) {
							this.length++;
							var res = create.call(item),
								name = item._class;
							if (name && res[0] !== name)
								res.unshift(name);
							this.definitions[id] = res;
							ref = this.references[id] = [id];
						}
						return ref;
					}
				};
			}
			if (obj && obj._serialize) {
				res = obj._serialize(options, dictionary);
				var name = obj._class;
				if (name && !compact && !res._compact && res[0] !== name)
					res.unshift(name);
			} else if (Array.isArray(obj)) {
				res = [];
				for (var i = 0, l = obj.length; i < l; i++)
					res[i] = Base.serialize(obj[i], options, compact,
							dictionary);
				if (compact)
					res._compact = true;
			} else if (Base.isPlainObject(obj)) {
				res = {};
				for (var i in obj)
					if (obj.hasOwnProperty(i))
						res[i] = Base.serialize(obj[i], options, compact,
								dictionary);
			} else if (typeof obj === 'number') {
				res = options.formatter.number(obj, options.precision);
			} else {
				res = obj;
			}
			return root && dictionary.length > 0
					? [['dictionary', dictionary.definitions], res]
					: res;
		},

		deserialize: function(obj, data) {
			var res = obj;
			data = data || {};
			if (Array.isArray(obj)) {
				var type = obj[0],
					isDictionary = type === 'dictionary';
				if (!isDictionary) {
					if (data.dictionary && obj.length == 1 && /^#/.test(type))
						return data.dictionary[type];
					type = Base.exports[type];
				}
				res = [];
				for (var i = type ? 1 : 0, l = obj.length; i < l; i++)
					res.push(Base.deserialize(obj[i], data));
				if (isDictionary) {
					data.dictionary = res[0];
				} else if (type) {
					var args = res;
					res = Base.create(type);
					type.apply(res, args);
				}
			} else if (Base.isPlainObject(obj)) {
				res = {};
				for (var key in obj)
					res[key] = Base.deserialize(obj[key], data);
			}
			return res;
		},

		exportJSON: function(obj, options) {
			return JSON.stringify(Base.serialize(obj, options));
		},

		importJSON: function(json) {
			return Base.deserialize(
					typeof json === 'string' ? JSON.parse(json) : json);
		},

		splice: function(list, items, index, remove) {
			var amount = items && items.length,
				append = index === undefined;
			index = append ? list.length : index;
			if (index > list.length)
				index = list.length;
			for (var i = 0; i < amount; i++)
				items[i]._index = index + i;
			if (append) {
				list.push.apply(list, items);
				return [];
			} else {
				var args = [index, remove];
				if (items)
					args.push.apply(args, items);
				var removed = list.splice.apply(list, args);
				for (var i = 0, l = removed.length; i < l; i++)
					delete removed[i]._index;
				for (var i = index + amount, l = list.length; i < l; i++)
					list[i]._index = i;
				return removed;
			}
		},

		merge: function() {
			return Base.each(arguments, function(hash) {
				Base.each(hash, function(value, key) {
					this[key] = value;
				}, this);
			}, new Base(), true); 
		},

		capitalize: function(str) {
			return str.replace(/\b[a-z]/g, function(match) {
				return match.toUpperCase();
			});
		},

		camelize: function(str) {
			return str.replace(/-(.)/g, function(all, chr) {
				return chr.toUpperCase();
			});
		},

		hyphenate: function(str) {
			return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		}
	}
});

var Callback = {
	attach: function(type, func) {
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.attach(key, value);
			}, this);
			return;
		}
		var entry = this._eventTypes[type];
		if (entry) {
			var handlers = this._handlers = this._handlers || {};
			handlers = handlers[type] = handlers[type] || [];
			if (handlers.indexOf(func) == -1) { 
				handlers.push(func);
				if (entry.install && handlers.length == 1)
					entry.install.call(this, type);
			}
		}
	},

	detach: function(type, func) {
		if (typeof type !== 'string') {
			Base.each(type, function(value, key) {
				this.detach(key, value);
			}, this);
			return;
		}
		var entry = this._eventTypes[type],
			handlers = this._handlers && this._handlers[type],
			index;
		if (entry && handlers) {
			if (!func || (index = handlers.indexOf(func)) != -1
					&& handlers.length == 1) {
				if (entry.uninstall)
					entry.uninstall.call(this, type);
				delete this._handlers[type];
			} else if (index != -1) {
				handlers.splice(index, 1);
			}
		}
	},

	once: function(type, func) {
		this.attach(type, function() {
			func.apply(this, arguments);
			this.detach(type, func);
		});
	},

	fire: function(type, event) {
		var handlers = this._handlers && this._handlers[type];
		if (!handlers)
			return false;
		var args = [].slice.call(arguments, 1);
		Base.each(handlers, function(func) {
			if (func.apply(this, args) === false && event && event.stop)
				event.stop();
		}, this);
		return true;
	},

	responds: function(type) {
		return !!(this._handlers && this._handlers[type]);
	},

	on: '#attach',
	off: '#detach',
	trigger: '#fire',

	statics: {
		inject: function inject() {
			for (var i = 0, l = arguments.length; i < l; i++) {
				var src = arguments[i],
					events = src._events;
				if (events) {
					var types = {};
					Base.each(events, function(entry, key) {
						var isString = typeof entry === 'string',
							name = isString ? entry : key,
							part = Base.capitalize(name),
							type = name.substring(2).toLowerCase();
						types[type] = isString ? {} : entry;
						name = '_' + name;
						src['get' + part] = function() {
							return this[name];
						};
						src['set' + part] = function(func) {
							if (func) {
								this.attach(type, func);
							} else if (this[name]) {
								this.detach(type, this[name]);
							}
							this[name] = func;
						};
					});
					src._eventTypes = types;
				}
				inject.base.call(this, src);
			}
			return this;
		}
	}
};

var PaperScope = Base.extend({
	_class: 'PaperScope',

	initialize: function PaperScope(script) {
		paper = this;
		this.project = null;
		this.projects = [];
		this.tools = [];
		this.palettes = [];
		this._id = script && (script.getAttribute('id') || script.src)
				|| ('paperscope-' + (PaperScope._id++));
		if (script)
			script.setAttribute('id', this._id);
		PaperScope._scopes[this._id] = this;
		if (!this.support) {
			var ctx = CanvasProvider.getContext(1, 1);
			PaperScope.prototype.support = {
				nativeDash: 'setLineDash' in ctx || 'mozDash' in ctx,
				nativeBlendModes: BlendMode.nativeModes
			};
			CanvasProvider.release(ctx);
		}
	},

	version: '0.9.9',

	getView: function() {
		return this.project && this.project.view;
	},

	getTool: function() {
		if (!this._tool)
			this._tool = new Tool();
		return this._tool;
	},

	evaluate: function(code) {
		var res = paper.PaperScript.evaluate(code, this);
		View.updateFocus();
		return res;
	},

	install: function(scope) {
		var that = this;
		Base.each(['project', 'view', 'tool'], function(key) {
			Base.define(scope, key, {
				configurable: true,
				get: function() {
					return that[key];
				}
			});
		});
		for (var key in this) {
			if (!/^(version|_id)/.test(key) && !(key in scope))
				scope[key] = this[key];
		}
	},

	setup: function(canvas) {
		paper = this;
		this.project = new Project(canvas);
		return this;
	},

	activate: function() {
		paper = this;
	},

	clear: function() {
		for (var i = this.projects.length - 1; i >= 0; i--)
			this.projects[i].remove();
		for (var i = this.tools.length - 1; i >= 0; i--)
			this.tools[i].remove();
		for (var i = this.palettes.length - 1; i >= 0; i--)
			this.palettes[i].remove();
	},

	remove: function() {
		this.clear();
		delete PaperScope._scopes[this._id];
	},

	statics: new function() {
		function handleAttribute(name) {
			name += 'Attribute';
			return function(el, attr) {
				return el[name](attr) || el[name]('data-paper-' + attr);
			};
		}

		return {
			_scopes: {},
			_id: 0,

			get: function(id) {
				if (typeof id === 'object')
					id = id.getAttribute('id');
				return this._scopes[id] || null;
			},

			getAttribute: handleAttribute('get'),
			hasAttribute: handleAttribute('has')
		};
	}
});

var PaperScopeItem = Base.extend(Callback, {

	initialize: function(activate) {
		this._scope = paper;
		this._index = this._scope[this._list].push(this) - 1;
		if (activate || !this._scope[this._reference])
			this.activate();
	},

	activate: function() {
		if (!this._scope)
			return false;
		var prev = this._scope[this._reference];
		if (prev && prev != this)
			prev.fire('deactivate');
		this._scope[this._reference] = this;
		this.fire('activate', prev);
		return true;
	},

	isActive: function() {
		return this._scope[this._reference] === this;
	},

	remove: function() {
		if (this._index == null)
			return false;
		Base.splice(this._scope[this._list], null, this._index, 1);
		if (this._scope[this._reference] == this)
			this._scope[this._reference] = null;
		this._scope = null;
		return true;
	}
});

var Formatter = Base.extend({
	initialize: function(precision) {
		this.precision = precision || 5;
		this.multiplier = Math.pow(10, this.precision);
	},

	number: function(val) {
		return Math.round(val * this.multiplier) / this.multiplier;
	},

	point: function(val, separator) {
		return this.number(val.x) + (separator || ',') + this.number(val.y);
	},

	size: function(val, separator) {
		return this.number(val.width) + (separator || ',')
				+ this.number(val.height);
	},

	rectangle: function(val, separator) {
		return this.point(val, separator) + (separator || ',')
				+ this.size(val, separator);
	}
});

Formatter.instance = new Formatter(5);

var Numerical = new function() {

	var abscissas = [
		[  0.5773502691896257645091488],
		[0,0.7745966692414833770358531],
		[  0.3399810435848562648026658,0.8611363115940525752239465],
		[0,0.5384693101056830910363144,0.9061798459386639927976269],
		[  0.2386191860831969086305017,0.6612093864662645136613996,0.9324695142031520278123016],
		[0,0.4058451513773971669066064,0.7415311855993944398638648,0.9491079123427585245261897],
		[  0.1834346424956498049394761,0.5255324099163289858177390,0.7966664774136267395915539,0.9602898564975362316835609],
		[0,0.3242534234038089290385380,0.6133714327005903973087020,0.8360311073266357942994298,0.9681602395076260898355762],
		[  0.1488743389816312108848260,0.4333953941292471907992659,0.6794095682990244062343274,0.8650633666889845107320967,0.9739065285171717200779640],
		[0,0.2695431559523449723315320,0.5190961292068118159257257,0.7301520055740493240934163,0.8870625997680952990751578,0.9782286581460569928039380],
		[  0.1252334085114689154724414,0.3678314989981801937526915,0.5873179542866174472967024,0.7699026741943046870368938,0.9041172563704748566784659,0.9815606342467192506905491],
		[0,0.2304583159551347940655281,0.4484927510364468528779129,0.6423493394403402206439846,0.8015780907333099127942065,0.9175983992229779652065478,0.9841830547185881494728294],
		[  0.1080549487073436620662447,0.3191123689278897604356718,0.5152486363581540919652907,0.6872929048116854701480198,0.8272013150697649931897947,0.9284348836635735173363911,0.9862838086968123388415973],
		[0,0.2011940939974345223006283,0.3941513470775633698972074,0.5709721726085388475372267,0.7244177313601700474161861,0.8482065834104272162006483,0.9372733924007059043077589,0.9879925180204854284895657],
		[  0.0950125098376374401853193,0.2816035507792589132304605,0.4580167776572273863424194,0.6178762444026437484466718,0.7554044083550030338951012,0.8656312023878317438804679,0.9445750230732325760779884,0.9894009349916499325961542]
	];

	var weights = [
		[1],
		[0.8888888888888888888888889,0.5555555555555555555555556],
		[0.6521451548625461426269361,0.3478548451374538573730639],
		[0.5688888888888888888888889,0.4786286704993664680412915,0.2369268850561890875142640],
		[0.4679139345726910473898703,0.3607615730481386075698335,0.1713244923791703450402961],
		[0.4179591836734693877551020,0.3818300505051189449503698,0.2797053914892766679014678,0.1294849661688696932706114],
		[0.3626837833783619829651504,0.3137066458778872873379622,0.2223810344533744705443560,0.1012285362903762591525314],
		[0.3302393550012597631645251,0.3123470770400028400686304,0.2606106964029354623187429,0.1806481606948574040584720,0.0812743883615744119718922],
		[0.2955242247147528701738930,0.2692667193099963550912269,0.2190863625159820439955349,0.1494513491505805931457763,0.0666713443086881375935688],
		[0.2729250867779006307144835,0.2628045445102466621806889,0.2331937645919904799185237,0.1862902109277342514260976,0.1255803694649046246346943,0.0556685671161736664827537],
		[0.2491470458134027850005624,0.2334925365383548087608499,0.2031674267230659217490645,0.1600783285433462263346525,0.1069393259953184309602547,0.0471753363865118271946160],
		[0.2325515532308739101945895,0.2262831802628972384120902,0.2078160475368885023125232,0.1781459807619457382800467,0.1388735102197872384636018,0.0921214998377284479144218,0.0404840047653158795200216],
		[0.2152638534631577901958764,0.2051984637212956039659241,0.1855383974779378137417166,0.1572031671581935345696019,0.1215185706879031846894148,0.0801580871597602098056333,0.0351194603317518630318329],
		[0.2025782419255612728806202,0.1984314853271115764561183,0.1861610000155622110268006,0.1662692058169939335532009,0.1395706779261543144478048,0.1071592204671719350118695,0.0703660474881081247092674,0.0307532419961172683546284],
		[0.1894506104550684962853967,0.1826034150449235888667637,0.1691565193950025381893121,0.1495959888165767320815017,0.1246289712555338720524763,0.0951585116824927848099251,0.0622535239386478928628438,0.0271524594117540948517806]
	];

	var abs = Math.abs,
		sqrt = Math.sqrt,
		pow = Math.pow,
		cos = Math.cos,
		PI = Math.PI;

	return {
		TOLERANCE: 10e-6,
		EPSILON: 10e-12,
		KAPPA: 4 * (sqrt(2) - 1) / 3,

		isZero: function(val) {
			return abs(val) <= this.EPSILON;
		},

		integrate: function(f, a, b, n) {
			var x = abscissas[n - 2],
				w = weights[n - 2],
				A = 0.5 * (b - a),
				B = A + a,
				i = 0,
				m = (n + 1) >> 1,
				sum = n & 1 ? w[i++] * f(B) : 0; 
			while (i < m) {
				var Ax = A * x[i];
				sum += w[i++] * (f(B + Ax) + f(B - Ax));
			}
			return A * sum;
		},

		findRoot: function(f, df, x, a, b, n, tolerance) {
			for (var i = 0; i < n; i++) {
				var fx = f(x),
					dx = fx / df(x);
				if (abs(dx) < tolerance)
					return x;
				var nx = x - dx;
				if (fx > 0) {
					b = x;
					x = nx <= a ? 0.5 * (a + b) : nx;
				} else {
					a = x;
					x = nx >= b ? 0.5 * (a + b) : nx;
				}
			}
		},

		solveQuadratic: function(a, b, c, roots) {
			var epsilon = this.EPSILON;
			if (abs(a) < epsilon) {
				if (abs(b) >= epsilon) {
					roots[0] = -c / b;
					return 1;
				}
				return abs(c) < epsilon ? -1 : 0; 
			}
			var q = b * b - 4 * a * c;
			if (q < 0)
				return 0; 
			q = sqrt(q);
			a *= 2; 
			var n = 0;
			roots[n++] = (-b - q) / a;
			if (q > 0)
				roots[n++] = (-b + q) / a;
			return n; 
		},

		solveCubic: function(a, b, c, d, roots) {
			var epsilon = this.EPSILON;
			if (abs(a) < epsilon)
				return Numerical.solveQuadratic(b, c, d, roots);
			b /= a;
			c /= a;
			d /= a;
			var bb = b * b,
				p = (bb - 3 * c) / 9,
				q = (2 * bb * b - 9 * b * c + 27 * d) / 54,
				ppp = p * p * p,
				D = q * q - ppp;
			b /= 3;
			if (abs(D) < epsilon) {
				if (abs(q) < epsilon) { 
					roots[0] = - b;
					return 1;
				} 
				var sqp = sqrt(p),
					snq = q > 0 ? 1 : -1;
				roots[0] = -snq * 2 * sqp - b;
				roots[1] = snq * sqp - b;
				return 2;
			}
			if (D < 0) { 
				var sqp = sqrt(p),
					phi = Math.acos(q / (sqp * sqp * sqp)) / 3,
					t = -2 * sqp,
					o = 2 * PI / 3;
				roots[0] = t * cos(phi) - b;
				roots[1] = t * cos(phi + o) - b;
				roots[2] = t * cos(phi - o) - b;
				return 3;
			}
			var A = (q > 0 ? -1 : 1) * pow(abs(q) + sqrt(D), 1 / 3);
			roots[0] = A + p / A - b;
			return 1;
		}
	};
};

var Point = Base.extend({
	_class: 'Point',
	_readIndex: true,

	initialize: function Point(arg0, arg1) {
		var type = typeof arg0;
		if (type === 'number') {
			var hasY = typeof arg1 === 'number';
			this.x = arg0;
			this.y = hasY ? arg1 : arg0;
			if (this.__read)
				this.__read = hasY ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this.x = this.y = 0;
			if (this.__read)
				this.__read = arg0 === null ? 1 : 0;
		} else {
			if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.x != null) {
				this.x = arg0.x;
				this.y = arg0.y;
			} else if (arg0.width != null) {
				this.x = arg0.width;
				this.y = arg0.height;
			} else if (arg0.angle != null) {
				this.x = arg0.length;
				this.y = 0;
				this.setAngle(arg0.angle);
			} else {
				this.x = this.y = 0;
				if (this.__read)
					this.__read = 0;
			}
			if (this.__read)
				this.__read = 1;
		}
	},

	set: function(x, y) {
		this.x = x;
		this.y = y;
		return this;
	},

	equals: function(point) {
		return point === this || point && (this.x === point.x
				&& this.y === point.y
				|| Array.isArray(point) && this.x === point[0]
					&& this.y === point[1]) || false;
	},

	clone: function() {
		return new Point(this.x, this.y);
	},

	toString: function() {
		var f = Formatter.instance;
		return '{ x: ' + f.number(this.x) + ', y: ' + f.number(this.y) + ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		return [f.number(this.x),
				f.number(this.y)];
	},

	add: function(point) {
		point = Point.read(arguments);
		return new Point(this.x + point.x, this.y + point.y);
	},

	subtract: function(point) {
		point = Point.read(arguments);
		return new Point(this.x - point.x, this.y - point.y);
	},

	multiply: function(point) {
		point = Point.read(arguments);
		return new Point(this.x * point.x, this.y * point.y);
	},

	divide: function(point) {
		point = Point.read(arguments);
		return new Point(this.x / point.x, this.y / point.y);
	},

	modulo: function(point) {
		point = Point.read(arguments);
		return new Point(this.x % point.x, this.y % point.y);
	},

	negate: function() {
		return new Point(-this.x, -this.y);
	},

	transform: function(matrix) {
		return matrix ? matrix._transformPoint(this) : this;
	},

	getDistance: function(point, squared) {
		point = Point.read(arguments);
		var x = point.x - this.x,
			y = point.y - this.y,
			d = x * x + y * y;
		return squared ? d : Math.sqrt(d);
	},

	getLength: function() {
		var length = this.x * this.x + this.y * this.y;
		return arguments.length && arguments[0] ? length : Math.sqrt(length);
	},

	setLength: function(length) {
		if (this.isZero()) {
			var angle = this._angle || 0;
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		} else {
			var scale = length / this.getLength();
			if (Numerical.isZero(scale))
				this.getAngle();
			this.set(
				this.x * scale,
				this.y * scale
			);
		}
		return this;
	},

	normalize: function(length) {
		if (length === undefined)
			length = 1;
		var current = this.getLength(),
			scale = current !== 0 ? length / current : 0,
			point = new Point(this.x * scale, this.y * scale);
		point._angle = this._angle;
		return point;
	},

	getAngle: function() {
		return this.getAngleInRadians(arguments[0]) * 180 / Math.PI;
	},

	setAngle: function(angle) {
		angle = this._angle = angle * Math.PI / 180;
		if (!this.isZero()) {
			var length = this.getLength();
			this.set(
				Math.cos(angle) * length,
				Math.sin(angle) * length
			);
		}
		return this;
	},

	getAngleInRadians: function() {
		if (arguments[0] === undefined) {
			if (this._angle == null)
				this._angle = Math.atan2(this.y, this.x);
			return this._angle;
		} else {
			var point = Point.read(arguments),
				div = this.getLength() * point.getLength();
			if (Numerical.isZero(div)) {
				return NaN;
			} else {
				return Math.acos(this.dot(point) / div);
			}
		}
	},

	getAngleInDegrees: function() {
		return this.getAngle(arguments[0]);
	},

	getQuadrant: function() {
		return this.x >= 0 ? this.y >= 0 ? 1 : 4 : this.y >= 0 ? 2 : 3;
	},

	getDirectedAngle: function(point) {
		point = Point.read(arguments);
		return Math.atan2(this.cross(point), this.dot(point)) * 180 / Math.PI;
	},

	rotate: function(angle, center) {
		if (angle === 0)
			return this.clone();
		angle = angle * Math.PI / 180;
		var point = center ? this.subtract(center) : this,
			s = Math.sin(angle),
			c = Math.cos(angle);
		point = new Point(
			point.x * c - point.y * s,
			point.y * c + point.x * s
		);
		return center ? point.add(center) : point;
	},

	isInside: function(rect) {
		return rect.contains(this);
	},

	isClose: function(point, tolerance) {
		return this.getDistance(point) < tolerance;
	},

	isColinear: function(point) {
		return this.cross(point) < 0.00001;
	},

	isOrthogonal: function(point) {
		return this.dot(point) < 0.00001;
	},

	isZero: function() {
		return Numerical.isZero(this.x) && Numerical.isZero(this.y);
	},

	isNaN: function() {
		return isNaN(this.x) || isNaN(this.y);
	},

	dot: function(point) {
		point = Point.read(arguments);
		return this.x * point.x + this.y * point.y;
	},

	cross: function(point) {
		point = Point.read(arguments);
		return this.x * point.y - this.y * point.x;
	},

	project: function(point) {
		point = Point.read(arguments);
		if (point.isZero()) {
			return new Point(0, 0);
		} else {
			var scale = this.dot(point) / point.dot(point);
			return new Point(
				point.x * scale,
				point.y * scale
			);
		}
	},

	statics: {
		min: function() {
			var point1 = Point.read(arguments);
				point2 = Point.read(arguments);
			return new Point(
				Math.min(point1.x, point2.x),
				Math.min(point1.y, point2.y)
			);
		},

		max: function() {
			var point1 = Point.read(arguments);
				point2 = Point.read(arguments);
			return new Point(
				Math.max(point1.x, point2.x),
				Math.max(point1.y, point2.y)
			);
		},

		random: function() {
			return new Point(Math.random(), Math.random());
		}
	}
}, Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
	var op = Math[name];
	this[name] = function() {
		return new Point(op(this.x), op(this.y));
	};
}, {}));

var LinkedPoint = Point.extend({
	initialize: function Point(x, y, owner, setter) {
		this._x = x;
		this._y = y;
		this._owner = owner;
		this._setter = setter;
	},

	set: function(x, y, dontNotify) {
		this._x = x;
		this._y = y;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner[this._setter](this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner[this._setter](this);
	}
});

var Size = Base.extend({
	_class: 'Size',
	_readIndex: true,

	initialize: function Size(arg0, arg1) {
		var type = typeof arg0;
		if (type === 'number') {
			var hasHeight = typeof arg1 === 'number';
			this.width = arg0;
			this.height = hasHeight ? arg1 : arg0;
			if (this.__read)
				this.__read = hasHeight ? 2 : 1;
		} else if (type === 'undefined' || arg0 === null) {
			this.width = this.height = 0;
			if (this.__read)
				this.__read = arg0 === null ? 1 : 0;
		} else {
			if (Array.isArray(arg0)) {
				this.width = arg0[0];
				this.height = arg0.length > 1 ? arg0[1] : arg0[0];
			} else if (arg0.width != null) {
				this.width = arg0.width;
				this.height = arg0.height;
			} else if (arg0.x != null) {
				this.width = arg0.x;
				this.height = arg0.y;
			} else {
				this.width = this.height = 0;
				if (this.__read)
					this.__read = 0;
			}
			if (this.__read)
				this.__read = 1;
		}
	},

	set: function(width, height) {
		this.width = width;
		this.height = height;
		return this;
	},

	equals: function(size) {
		return size === this || size && (this.width === size.width
				&& this.height === size.height
				|| Array.isArray(size) && this.width === size[0]
					&& this.height === size[1]) || false;
	},

	clone: function() {
		return new Size(this.width, this.height);
	},

	toString: function() {
		var f = Formatter.instance;
		return '{ width: ' + f.number(this.width)
				+ ', height: ' + f.number(this.height) + ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		return [f.number(this.width),
				f.number(this.height)];
	},

	add: function(size) {
		size = Size.read(arguments);
		return new Size(this.width + size.width, this.height + size.height);
	},

	subtract: function(size) {
		size = Size.read(arguments);
		return new Size(this.width - size.width, this.height - size.height);
	},

	multiply: function(size) {
		size = Size.read(arguments);
		return new Size(this.width * size.width, this.height * size.height);
	},

	divide: function(size) {
		size = Size.read(arguments);
		return new Size(this.width / size.width, this.height / size.height);
	},

	modulo: function(size) {
		size = Size.read(arguments);
		return new Size(this.width % size.width, this.height % size.height);
	},

	negate: function() {
		return new Size(-this.width, -this.height);
	},

	isZero: function() {
		return Numerical.isZero(this.width) && Numerical.isZero(this.height);
	},

	isNaN: function() {
		return isNaN(this.width) || isNaN(this.height);
	},

	statics: {
		min: function(size1, size2) {
			return new Size(
				Math.min(size1.width, size2.width),
				Math.min(size1.height, size2.height));
		},

		max: function(size1, size2) {
			return new Size(
				Math.max(size1.width, size2.width),
				Math.max(size1.height, size2.height));
		},

		random: function() {
			return new Size(Math.random(), Math.random());
		}
	}
}, Base.each(['round', 'ceil', 'floor', 'abs'], function(name) {
	var op = Math[name];
	this[name] = function() {
		return new Size(op(this.width), op(this.height));
	};
}, {}));

var LinkedSize = Size.extend({
	initialize: function Size(width, height, owner, setter) {
		this._width = width;
		this._height = height;
		this._owner = owner;
		this._setter = setter;
	},

	set: function(width, height, dontNotify) {
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	},

	getWidth: function() {
		return this._width;
	},

	setWidth: function(width) {
		this._width = width;
		this._owner[this._setter](this);
	},

	getHeight: function() {
		return this._height;
	},

	setHeight: function(height) {
		this._height = height;
		this._owner[this._setter](this);
	}
});

var Rectangle = Base.extend({
	_class: 'Rectangle',
	_readIndex: true,

	initialize: function Rectangle(arg0, arg1, arg2, arg3) {
		var type = typeof arg0,
			read = 0;
		if (type === 'number') {
			this.x = arg0;
			this.y = arg1;
			this.width = arg2;
			this.height = arg3;
			read = 4;
		} else if (type === 'undefined' || arg0 === null) {
			this.x = this.y = this.width = this.height = 0;
			read = arg0 === null ? 1 : 0;
		} else if (arguments.length === 1) {
			if (Array.isArray(arg0)) {
				this.x = arg0[0];
				this.y = arg0[1];
				this.width = arg0[2];
				this.height = arg0[3];
				read = 1;
			} else if (arg0.x !== undefined || arg0.width !== undefined) {
				this.x = arg0.x || 0;
				this.y = arg0.y || 0;
				this.width = arg0.width || 0;
				this.height = arg0.height || 0;
				read = 1;
			} else if (arg0.from === undefined && arg0.to === undefined) {
				this.x = this.y = this.width = this.height = 0;
				this._set(arg0);
				read = 1;
			}
		}
		if (!read) {
			var point = Point.readNamed(arguments, 'from'),
				next = Base.peek(arguments);
			this.x = point.x;
			this.y = point.y;
			if (next && next.x !== undefined || Base.hasNamed(arguments, 'to')) {
				var to = Point.readNamed(arguments, 'to');
				this.width = to.x - point.x;
				this.height = to.y - point.y;
				if (this.width < 0) {
					this.x = to.x;
					this.width = -this.width;
				}
				if (this.height < 0) {
					this.y = to.y;
					this.height = -this.height;
				}
			} else {
				var size = Size.read(arguments);
				this.width = size.width;
				this.height = size.height;
			}
			read = arguments._index;
		}
		if (this.__read)
			this.__read = read;
	},

	set: function(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	},

	clone: function() {
		return new Rectangle(this.x, this.y, this.width, this.height);
	},

	equals: function(rect) {
		if (Base.isPlainValue(rect))
			rect = Rectangle.read(arguments);
		return rect === this
				|| rect && this.x === rect.x && this.y === rect.y
					&& this.width === rect.width && this.height=== rect.height
				|| false;
	},

	toString: function() {
		var f = Formatter.instance;
		return '{ x: ' + f.number(this.x)
				+ ', y: ' + f.number(this.y)
				+ ', width: ' + f.number(this.width)
				+ ', height: ' + f.number(this.height)
				+ ' }';
	},

	_serialize: function(options) {
		var f = options.formatter;
		return [f.number(this.x),
				f.number(this.y),
				f.number(this.width),
				f.number(this.height)];
	},

	getPoint: function() {
		return new (arguments[0] ? Point : LinkedPoint)
				(this.x, this.y, this, 'setPoint');
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this.x = point.x;
		this.y = point.y;
	},

	getSize: function() {
		return new (arguments[0] ? Size : LinkedSize)
				(this.width, this.height, this, 'setSize');
	},

	setSize: function(size) {
		size = Size.read(arguments);
		if (this._fixX)
			this.x += (this.width - size.width) * this._fixX;
		if (this._fixY)
			this.y += (this.height - size.height) * this._fixY;
		this.width = size.width;
		this.height = size.height;
		this._fixW = 1;
		this._fixH = 1;
	},

	getLeft: function() {
		return this.x;
	},

	setLeft: function(left) {
		if (!this._fixW)
			this.width -= left - this.x;
		this.x = left;
		this._fixX = 0;
	},

	getTop: function() {
		return this.y;
	},

	setTop: function(top) {
		if (!this._fixH)
			this.height -= top - this.y;
		this.y = top;
		this._fixY = 0;
	},

	getRight: function() {
		return this.x + this.width;
	},

	setRight: function(right) {
		if (this._fixX !== undefined && this._fixX !== 1)
			this._fixW = 0;
		if (this._fixW)
			this.x = right - this.width;
		else
			this.width = right - this.x;
		this._fixX = 1;
	},

	getBottom: function() {
		return this.y + this.height;
	},

	setBottom: function(bottom) {
		if (this._fixY !== undefined && this._fixY !== 1)
			this._fixH = 0;
		if (this._fixH)
			this.y = bottom - this.height;
		else
			this.height = bottom - this.y;
		this._fixY = 1;
	},

	getCenterX: function() {
		return this.x + this.width * 0.5;
	},

	setCenterX: function(x) {
		this.x = x - this.width * 0.5;
		this._fixX = 0.5;
	},

	getCenterY: function() {
		return this.y + this.height * 0.5;
	},

	setCenterY: function(y) {
		this.y = y - this.height * 0.5;
		this._fixY = 0.5;
	},

	getCenter: function() {
		return new (arguments[0] ? Point : LinkedPoint)
				(this.getCenterX(), this.getCenterY(), this, 'setCenter');
	},

	setCenter: function(point) {
		point = Point.read(arguments);
		this.setCenterX(point.x);
		this.setCenterY(point.y);
		return this;
	},

	isEmpty: function() {
		return this.width == 0 || this.height == 0;
	},

	contains: function(arg) {
		return arg && arg.width !== undefined
				|| (Array.isArray(arg) ? arg : arguments).length == 4
				? this._containsRectangle(Rectangle.read(arguments))
				: this._containsPoint(Point.read(arguments));
	},

	_containsPoint: function(point) {
		var x = point.x,
			y = point.y;
		return x >= this.x && y >= this.y
				&& x <= this.x + this.width
				&& y <= this.y + this.height;
	},

	_containsRectangle: function(rect) {
		var x = rect.x,
			y = rect.y;
		return x >= this.x && y >= this.y
				&& x + rect.width <= this.x + this.width
				&& y + rect.height <= this.y + this.height;
	},

	intersects: function(rect) {
		rect = Rectangle.read(arguments);
		return rect.x + rect.width > this.x
				&& rect.y + rect.height > this.y
				&& rect.x < this.x + this.width
				&& rect.y < this.y + this.height;
	},

	touches: function(rect) {
		rect = Rectangle.read(arguments);
		return rect.x + rect.width >= this.x
				&& rect.y + rect.height >= this.y
				&& rect.x <= this.x + this.width
				&& rect.y <= this.y + this.height;
	},

	intersect: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.max(this.x, rect.x),
			y1 = Math.max(this.y, rect.y),
			x2 = Math.min(this.x + this.width, rect.x + rect.width),
			y2 = Math.min(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	unite: function(rect) {
		rect = Rectangle.read(arguments);
		var x1 = Math.min(this.x, rect.x),
			y1 = Math.min(this.y, rect.y),
			x2 = Math.max(this.x + this.width, rect.x + rect.width),
			y2 = Math.max(this.y + this.height, rect.y + rect.height);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	include: function(point) {
		point = Point.read(arguments);
		var x1 = Math.min(this.x, point.x),
			y1 = Math.min(this.y, point.y),
			x2 = Math.max(this.x + this.width, point.x),
			y2 = Math.max(this.y + this.height, point.y);
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	expand: function(hor, ver) {
		if (ver === undefined)
			ver = hor;
		return new Rectangle(this.x - hor / 2, this.y - ver / 2,
				this.width + hor, this.height + ver);
	},

	scale: function(hor, ver) {
		return this.expand(this.width * hor - this.width,
				this.height * (ver === undefined ? hor : ver) - this.height);
	}
}, new function() {
	return Base.each([
			['Top', 'Left'], ['Top', 'Right'],
			['Bottom', 'Left'], ['Bottom', 'Right'],
			['Left', 'Center'], ['Top', 'Center'],
			['Right', 'Center'], ['Bottom', 'Center']
		],
		function(parts, index) {
			var part = parts.join('');
			var xFirst = /^[RL]/.test(part);
			if (index >= 4)
				parts[1] += xFirst ? 'Y' : 'X';
			var x = parts[xFirst ? 0 : 1],
				y = parts[xFirst ? 1 : 0],
				getX = 'get' + x,
				getY = 'get' + y,
				setX = 'set' + x,
				setY = 'set' + y,
				get = 'get' + part,
				set = 'set' + part;
			this[get] = function() {
				return new (arguments[0] ? Point : LinkedPoint)
						(this[getX](), this[getY](), this, set);
			};
			this[set] = function(point) {
				point = Point.read(arguments);
				this[setX](point.x);
				this[setY](point.y);
			};
		}, {});
});

var LinkedRectangle = Rectangle.extend({
	initialize: function Rectangle(x, y, width, height, owner, setter) {
		this.set(x, y, width, height, true);
		this._owner = owner;
		this._setter = setter;
	},

	set: function(x, y, width, height, dontNotify) {
		this._x = x;
		this._y = y;
		this._width = width;
		this._height = height;
		if (!dontNotify)
			this._owner[this._setter](this);
		return this;
	}
}, new function() {
	var proto = Rectangle.prototype;

	return Base.each(['x', 'y', 'width', 'height'], function(key) {
		var part = Base.capitalize(key);
		var internal = '_' + key;
		this['get' + part] = function() {
			return this[internal];
		};

		this['set' + part] = function(value) {
			this[internal] = value;
			if (!this._dontNotify)
				this._owner[this._setter](this);
		};
	}, Base.each(['Point', 'Size', 'Center',
			'Left', 'Top', 'Right', 'Bottom', 'CenterX', 'CenterY',
			'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
			'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'],
		function(key) {
			var name = 'set' + key;
			this[name] = function() {
				this._dontNotify = true;
				proto[name].apply(this, arguments);
				delete this._dontNotify;
				this._owner[this._setter](this);
			};
		}, {
			isSelected: function() {
				return this._owner._boundsSelected;
			},

			setSelected: function(selected) {
				var owner = this._owner;
				if (owner.setSelected) {
					owner._boundsSelected = selected;
					owner.setSelected(selected || owner._selectedSegmentState > 0);
				}
			}
		})
	);
});

var Matrix = Base.extend({
	_class: 'Matrix',

	initialize: function Matrix(arg) {
		var count = arguments.length,
			ok = true;
		if (count == 6) {
			this.set.apply(this, arguments);
		} else if (count == 1) {
			if (arg instanceof Matrix) {
				this.set(arg._a, arg._c, arg._b, arg._d, arg._tx, arg._ty);
			} else if (Array.isArray(arg)) {
				this.set.apply(this, arg);
			} else {
				ok = false;
			}
		} else if (count == 0) {
			this.reset();
		} else {
			ok = false;
		}
		if (!ok)
			throw new Error('Unsupported matrix parameters');
	},

	set: function(a, c, b, d, tx, ty) {
		this._a = a;
		this._c = c;
		this._b = b;
		this._d = d;
		this._tx = tx;
		this._ty = ty;
		return this;
	},

	_serialize: function(options) {
		return Base.serialize(this.getValues(), options);
	},

	clone: function() {
		return new Matrix(this._a, this._c, this._b, this._d,
				this._tx, this._ty);
	},

	equals: function(mx) {
		return mx === this || mx && this._a == mx._a && this._b == mx._b
				&& this._c == mx._c && this._d == mx._d && this._tx == mx._tx
				&& this._ty == mx._ty
				|| false;
	},

	toString: function() {
		var f = Formatter.instance;
		return '[[' + [f.number(this._a), f.number(this._b),
					f.number(this._tx)].join(', ') + '], ['
				+ [f.number(this._c), f.number(this._d),
					f.number(this._ty)].join(', ') + ']]';
	},

	reset: function() {
		this._a = this._d = 1;
		this._c = this._b = this._tx = this._ty = 0;
		return this;
	},

	scale: function() {
		var scale = Point.read(arguments),
			center = Point.read(arguments, 0, 0, { readNull: true });
		if (center)
			this.translate(center);
		this._a *= scale.x;
		this._c *= scale.x;
		this._b *= scale.y;
		this._d *= scale.y;
		if (center)
			this.translate(center.negate());
		return this;
	},

	translate: function(point) {
		point = Point.read(arguments);
		var x = point.x,
			y = point.y;
		this._tx += x * this._a + y * this._b;
		this._ty += x * this._c + y * this._d;
		return this;
	},

	rotate: function(angle, center) {
		center = Point.read(arguments, 1);
		angle = angle * Math.PI / 180;
		var x = center.x,
			y = center.y,
			cos = Math.cos(angle),
			sin = Math.sin(angle),
			tx = x - x * cos + y * sin,
			ty = y - x * sin - y * cos,
			a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = cos * a + sin * b;
		this._b = -sin * a + cos * b;
		this._c = cos * c + sin * d;
		this._d = -sin * c + cos * d;
		this._tx += tx * a + ty * b;
		this._ty += tx * c + ty * d;
		return this;
	},

	shear: function() {
		var point = Point.read(arguments),
			center = Point.read(arguments, 0, 0, { readNull: true });
		if (center)
			this.translate(center);
		var a = this._a,
			c = this._c;
		this._a += point.y * this._b;
		this._c += point.y * this._d;
		this._b += point.x * a;
		this._d += point.x * c;
		if (center)
			this.translate(center.negate());
		return this;
	},

	isIdentity: function() {
		return this._a == 1 && this._c == 0 && this._b == 0 && this._d == 1
				&& this._tx == 0 && this._ty == 0;
	},

	isInvertible: function() {
		return !!this._getDeterminant();
	},

	isSingular: function() {
		return !this._getDeterminant();
	},

	concatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d;
		this._a = mx._a * a + mx._c * b;
		this._b = mx._b * a + mx._d * b;
		this._c = mx._a * c + mx._c * d;
		this._d = mx._b * c + mx._d * d;
		this._tx += mx._tx * a + mx._ty * b;
		this._ty += mx._tx * c + mx._ty * d;
		return this;
	},

	preConcatenate: function(mx) {
		var a = this._a,
			b = this._b,
			c = this._c,
			d = this._d,
			tx = this._tx,
			ty = this._ty;
		this._a = mx._a * a + mx._b * c;
		this._b = mx._a * b + mx._b * d;
		this._c = mx._c * a + mx._d * c;
		this._d = mx._c * b + mx._d * d;
		this._tx = mx._a * tx + mx._b * ty + mx._tx;
		this._ty = mx._c * tx + mx._d * ty + mx._ty;
		return this;
	},

	transform: function( src, srcOff, dst, dstOff, numPts) {
		return arguments.length < 5
			? this._transformPoint(Point.read(arguments))
			: this._transformCoordinates(src, srcOff, dst, dstOff, numPts);
	},

	_transformPoint: function(point, dest, dontNotify) {
		var x = point.x,
			y = point.y;
		if (!dest)
			dest = new Point();
		return dest.set(
			x * this._a + y * this._b + this._tx,
			x * this._c + y * this._d + this._ty,
			dontNotify
		);
	},

	_transformCoordinates: function(src, srcOff, dst, dstOff, numPts) {
		var i = srcOff, j = dstOff,
			srcEnd = srcOff + 2 * numPts;
		while (i < srcEnd) {
			var x = src[i++],
				y = src[i++];
			dst[j++] = x * this._a + y * this._b + this._tx;
			dst[j++] = x * this._c + y * this._d + this._ty;
		}
		return dst;
	},

	_transformCorners: function(rect) {
		var x1 = rect.x,
			y1 = rect.y,
			x2 = x1 + rect.width,
			y2 = y1 + rect.height,
			coords = [ x1, y1, x2, y1, x2, y2, x1, y2 ];
		return this._transformCoordinates(coords, 0, coords, 0, 4);
	},

	_transformBounds: function(bounds, dest, dontNotify) {
		var coords = this._transformCorners(bounds),
			min = coords.slice(0, 2),
			max = coords.slice();
		for (var i = 2; i < 8; i++) {
			var val = coords[i],
				j = i & 1;
			if (val < min[j])
				min[j] = val;
			else if (val > max[j])
				max[j] = val;
		}
		if (!dest)
			dest = new Rectangle();
		return dest.set(min[0], min[1], max[0] - min[0], max[1] - min[1],
				dontNotify);
	},

	inverseTransform: function() {
		return this._inverseTransform(Point.read(arguments));
	},

	_getDeterminant: function() {
		var det = this._a * this._d - this._b * this._c;
		return isFinite(det) && !Numerical.isZero(det)
				&& isFinite(this._tx) && isFinite(this._ty)
				? det : null;
	},

	_inverseTransform: function(point, dest, dontNotify) {
		var det = this._getDeterminant();
		if (!det)
			return null;
		var x = point.x - this._tx,
			y = point.y - this._ty;
		if (!dest)
			dest = new Point();
		return dest.set(
			(x * this._d - y * this._b) / det,
			(y * this._a - x * this._c) / det,
			dontNotify
		);
	},

	decompose: function() {
		var a = this._a, b = this._b, c = this._c, d = this._d;
		if (Numerical.isZero(a * d - b * c))
			return null;

		var scaleX = Math.sqrt(a * a + b * b);
		a /= scaleX;
		b /= scaleX;

		var shear = a * c + b * d;
		c -= a * shear;
		d -= b * shear;

		var scaleY = Math.sqrt(c * c + d * d);
		c /= scaleY;
		d /= scaleY;
		shear /= scaleY;

		if (a * d < b * c) {
			a = -a;
			b = -b;
			shear = -shear;
			scaleX = -scaleX;
		}

		return {
			translation: this.getTranslation(),
			scaling: new Point(scaleX, scaleY),
			rotation: -Math.atan2(b, a) * 180 / Math.PI,
			shearing: shear
		};
	},

	getValues: function() {
		return [ this._a, this._c, this._b, this._d, this._tx, this._ty ];
	},

	getTranslation: function() {
		return new Point(this._tx, this._ty);
	},

	getScaling: function() {
		return (this.decompose() || {}).scaling;
	},

	getRotation: function() {
		return (this.decompose() || {}).rotation;
	},

	inverted: function() {
		var det = this._getDeterminant();
		return det && new Matrix(
				this._d / det,
				-this._c / det,
				-this._b / det,
				this._a / det,
				(this._b * this._ty - this._d * this._tx) / det,
				(this._c * this._tx - this._a * this._ty) / det);
	},

	shiftless: function() {
		return new Matrix(this._a, this._c, this._b, this._d, 0, 0);
	},

	applyToContext: function(ctx) {
		ctx.transform(this._a, this._c, this._b, this._d, this._tx, this._ty);
	}
}, new function() {
	return Base.each({
		scaleX: '_a',
		scaleY: '_d',
		translateX: '_tx',
		translateY: '_ty',
		shearX: '_b',
		shearY: '_c'
	}, function(prop, name) {
		name = Base.capitalize(name);
		this['get' + name] = function() {
			return this[prop];
		};
		this['set' + name] = function(value) {
			this[prop] = value;
		};
	}, {});
});

var Line = Base.extend({
	_class: 'Line',

	initialize: function Line(arg0, arg1, arg2, arg3, arg4) {
		var asVector = false;
		if (arguments.length >= 4) {
			this._px = arg0;
			this._py = arg1;
			this._vx = arg2;
			this._vy = arg3;
			asVector = arg4;
		} else {
			this._px = arg0.x;
			this._py = arg0.y;
			this._vx = arg1.x;
			this._vy = arg1.y;
			asVector = arg2;
		}
		if (!asVector) {
			this._vx -= this._px;
			this._vy -= this._py;
		}
	},

	getPoint: function() {
		return new Point(this._px, this._py);
	},

	getVector: function() {
		return new Point(this._vx, this._vy);
	},

	getLength: function() {
		return this.getVector().getLength();
	},

	intersect: function(line, isInfinite) {
		return Line.intersect(
				this._px, this._py, this._vx, this._vy,
				line._px, line._py, line._vx, line._vy,
				true, isInfinite);
	},

	getSide: function(point) {
		return Line.getSide(
				this._px, this._py, this._vx, this._vy,
				point.x, point.y, true);
	},

	getDistance: function(point) {
		return Math.abs(Line.getSignedDistance(
				this._px, this._py, this._vx, this._vy,
				point.x, point.y, true));
	},

	statics: {
		intersect: function(apx, apy, avx, avy, bpx, bpy, bvx, bvy, asVector,
				isInfinite) {
			if (!asVector) {
				avx -= apx;
				avy -= apy;
				bvx -= bpx;
				bvy -= bpy;
			}
			var cross = bvy * avx - bvx * avy;
			if (!Numerical.isZero(cross)) {
				var dx = apx - bpx,
					dy = apy - bpy,
					ta = (bvx * dy - bvy * dx) / cross,
					tb = (avx * dy - avy * dx) / cross;
				if ((isInfinite || 0 <= ta && ta <= 1)
						&& (isInfinite || 0 <= tb && tb <= 1))
					return new Point(
								apx + ta * avx,
								apy + ta * avy);
			}
		},

		getSide: function(px, py, vx, vy, x, y, asVector) {
			if (!asVector) {
				vx -= px;
				vy -= py;
			}
			var v2x = x - px,
				v2y = y - py,
				ccw = v2x * vy - v2y * vx; 
			if (ccw === 0) {
				ccw = v2x * vx + v2y * vy; 
				if (ccw > 0) {
					v2x -= vx;
					v2y -= vy;
					ccw = v2x * vx + v2y * vy;
					if (ccw < 0)
						ccw = 0;
				}
			}
			return ccw < 0 ? -1 : ccw > 0 ? 1 : 0;
		},

		getSignedDistance: function(px, py, vx, vy, x, y, asVector) {
			if (!asVector) {
				vx -= px;
				vy -= py;
			}
			var m = vy / vx, 
				b = py - m * px; 
			return (y - (m * x) - b) / Math.sqrt(m * m + 1);
		}
	}
});

var Project = PaperScopeItem.extend({
	_class: 'Project',
	_list: 'projects',
	_reference: 'project',

	initialize: function Project(view) {
		PaperScopeItem.call(this, true);
		this.layers = [];
		this.symbols = [];
		this._currentStyle = new Style();
		this.activeLayer = new Layer();
		if (view)
			this.view = view instanceof View ? view : View.create(view);
		this._selectedItems = {};
		this._selectedItemCount = 0;
		this._drawCount = 0;
		this.options = {};
	},

	_serialize: function(options, dictionary) {
		return Base.serialize(this.layers, options, true, dictionary);
	},

	clear: function() {
		for (var i = this.layers.length - 1; i >= 0; i--)
			this.layers[i].remove();
		this.symbols = [];
	},

	remove: function remove() {
		if (!remove.base.call(this))
			return false;
		if (this.view)
			this.view.remove();
		return true;
	},

	getCurrentStyle: function() {
		return this._currentStyle;
	},

	setCurrentStyle: function(style) {
		this._currentStyle.initialize(style);
	},

	getIndex: function() {
		return this._index;
	},

	getSelectedItems: function() {
		var items = [];
		for (var id in this._selectedItems) {
			var item = this._selectedItems[id];
			if (item._drawCount === this._drawCount)
				items.push(item);
		}
		return items;
	},

	_updateSelection: function(item) {
		if (item._selected) {
			this._selectedItemCount++;
			this._selectedItems[item._id] = item;
			if (item.isInserted())
				item._drawCount = this._drawCount;
		} else {
			this._selectedItemCount--;
			delete this._selectedItems[item._id];
		}
	},

	selectAll: function() {
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].setSelected(true);
	},

	deselectAll: function() {
		for (var i in this._selectedItems)
			this._selectedItems[i].setSelected(false);
	},

	hitTest: function(point, options) {
		point = Point.read(arguments);
		options = HitResult.getOptions(Base.read(arguments));
		for (var i = this.layers.length - 1; i >= 0; i--) {
			var res = this.layers[i].hitTest(point, options);
			if (res) return res;
		}
		return null;
	},

	importJSON: function(json) {
		this.activate();
		return Base.importJSON(json);
	},

	draw: function(ctx, matrix) {
		this._drawCount++;
		ctx.save();
		matrix.applyToContext(ctx);
		var param = Base.merge({
			offset: new Point(0, 0),
			transforms: [matrix]
		});
		for (var i = 0, l = this.layers.length; i < l; i++)
			this.layers[i].draw(ctx, param);
		ctx.restore();

		if (this._selectedItemCount > 0) {
			ctx.save();
			ctx.strokeWidth = 1;
			for (var id in this._selectedItems) {
				var item = this._selectedItems[id];
				if (item._drawCount === this._drawCount
						&& (item._drawSelected || item._boundsSelected)) {
					var color = item.getSelectedColor()
							|| item.getLayer().getSelectedColor();
					ctx.strokeStyle = ctx.fillStyle = color
							? color.toCanvasStyle(ctx) : '#009dec';
					var mx = item._globalMatrix;
					if (item._drawSelected)
						item._drawSelected(ctx, mx);
					if (item._boundsSelected) {
						var coords = mx._transformCorners(
								item._getBounds('getBounds'));
						ctx.beginPath();
						for (var i = 0; i < 8; i++)
							ctx[i === 0 ? 'moveTo' : 'lineTo'](
									coords[i], coords[++i]);
						ctx.closePath();
						ctx.stroke();
						for (var i = 0; i < 8; i++) {
							ctx.beginPath();
							ctx.rect(coords[i] - 2, coords[++i] - 2, 4, 4);
							ctx.fill();
						}
					}
				}
			}
			ctx.restore();
		}
	}
});

var Symbol = Base.extend({
	_class: 'Symbol',

	initialize: function Symbol(item, dontCenter) {
		this._id = Symbol._id = (Symbol._id || 0) + 1;
		this.project = paper.project;
		this.project.symbols.push(this);
		if (item)
			this.setDefinition(item, dontCenter);
		this._instances = {};
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._class, this._definition],
					options, false, dictionary);
		});
	},

	_changed: function(flags) {
		Base.each(this._instances, function(item) {
			item._changed(flags);
		});
	},

	getDefinition: function() {
		return this._definition;
	},

	setDefinition: function(item ) {
		if (item._parentSymbol)
			item = item.clone();
		if (this._definition)
			delete this._definition._parentSymbol;
		this._definition = item;
		item.remove();
		item.setSelected(false);
		if (!arguments[1])
			item.setPosition(new Point());
		item._parentSymbol = this;
		this._changed(5);
	},

	place: function(position) {
		return new PlacedSymbol(this, position);
	},

	clone: function() {
		return new Symbol(this._definition.clone(false));
	}
});

var Item = Base.extend(Callback, {
	statics: {
		extend: function extend(src) {
			if (src._serializeFields)
				src._serializeFields = Base.merge(
						this.prototype._serializeFields, src._serializeFields);
			var res = extend.base.apply(this, arguments),
				proto = res.prototype,
				name = proto._class;
			if (name)
				proto._type = Base.hyphenate(name);
			return res;
		}
	},

	_class: 'Item',
	_transformContent: true,
	_boundsSelected: false,
	_serializeFields: {
		name: null,
		matrix: new Matrix(),
		locked: false,
		visible: true,
		blendMode: 'normal',
		opacity: 1,
		guide: false,
		clipMask: false,
		data: {}
	},

	initialize: function Item() {
	},

	_initialize: function(props, point) {
		this._id = Item._id = (Item._id || 0) + 1;
		if (!this._project) {
			var project = paper.project,
				layer = project.activeLayer;
			if (layer && !(props && props.insert === false)) {
				layer.addChild(this);
			} else {
				this._setProject(project);
			}
		}
		this._style = new Style(this._project._currentStyle, this);
		this._matrix = new Matrix();
		if (point)
			this._matrix.translate(point);
		return props ? this._set(props, { insert: true }) : true;
	},

	_events: new function() {

		var mouseFlags = {
			mousedown: {
				mousedown: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mouseup: {
				mouseup: 1,
				mousedrag: 1,
				click: 1,
				doubleclick: 1
			},
			mousemove: {
				mousedrag: 1,
				mousemove: 1,
				mouseenter: 1,
				mouseleave: 1
			}
		};

		var mouseEvent = {
			install: function(type) {
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags) {
						counters[key] = (counters[key] || 0)
								+ (mouseFlags[key][type] || 0);
					}
				}
			},
			uninstall: function(type) {
				var counters = this._project.view._eventCounters;
				if (counters) {
					for (var key in mouseFlags)
						counters[key] -= mouseFlags[key][type] || 0;
				}
			}
		};

		return Base.each(['onMouseDown', 'onMouseUp', 'onMouseDrag', 'onClick',
			'onDoubleClick', 'onMouseMove', 'onMouseEnter', 'onMouseLeave'],
			function(name) {
				this[name] = mouseEvent;
			}, {
				onFrame: {
					install: function() {
						this._project.view._animateItem(this, true);
					},
					uninstall: function() {
						this._project.view._animateItem(this, false);
					}
				},

				onLoad: {}
			}
		);
	},

	_serialize: function(options, dictionary) {
		var props = {},
			that = this;

		function serialize(fields) {
			for (var key in fields) {
				var value = that[key];
				if (!Base.equals(value, fields[key]))
					props[key] = Base.serialize(value, options,
							key !== 'data', dictionary);
			}
		}

		serialize(this._serializeFields);
		if (!(this instanceof Group))
			serialize(this._style._defaults);
		return [ this._class, props ];
	},

	_changed: function(flags) {
		var parent = this._parent,
			project = this._project,
			symbol = this._parentSymbol;
		if (flags & 4) {
			delete this._bounds;
			delete this._position;
		}
		if (parent && (flags
				& (4 | 8))) {
			parent._clearBoundsCache();
		}
		if (flags & 2) {
			this._clearBoundsCache();
		}
		if (project) {
			if (flags & 1) {
				project._needsRedraw = true;
			}
			if (project._changes) {
				var entry = project._changesById[this._id];
				if (entry) {
					entry.flags |= flags;
				} else {
					entry = { item: this, flags: flags };
					project._changesById[this._id] = entry;
					project._changes.push(entry);
				}
			}
		}
		if (symbol)
			symbol._changed(flags);
	},

	set: function(props) {
		if (props)
			this._set(props);
		return this;
	},

	getId: function() {
		return this._id;
	},

	getType: function() {
		return this._type;
	},

	getName: function() {
		return this._name;
	},

	setName: function(name, unique) {

		if (this._name)
			this._removeFromNamed();
		if (name && this._parent) {
			var children = this._parent._children,
				namedChildren = this._parent._namedChildren,
				orig = name,
				i = 1;
			while (unique && children[name])
				name = orig + ' ' + (i++);
			(namedChildren[name] = namedChildren[name] || []).push(this);
			children[name] = this;
		}
		this._name = name || undefined;
		this._changed(32);
	},

	getStyle: function() {
		return this._style;
	},

	setStyle: function(style) {
		this.getStyle().set(style);
	},

	hasFill: function() {
		return !!this.getStyle().getFillColor();
	},

	hasStroke: function() {
		var style = this.getStyle();
		return !!style.getStrokeColor() && style.getStrokeWidth() > 0;
	}
}, Base.each(['locked', 'visible', 'blendMode', 'opacity', 'guide'],
	function(name) {
		var part = Base.capitalize(name),
			name = '_' + name;
		this['get' + part] = function() {
			return this[name];
		};
		this['set' + part] = function(value) {
			if (value != this[name]) {
				this[name] = value;
				this._changed(name === '_locked'
						? 32 : 33);
			}
		};
}, {}), {

	_locked: false,

	_visible: true,

	_blendMode: 'normal',

	_opacity: 1,

	_guide: false,

	isSelected: function() {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (this._children[i].isSelected())
					return true;
		}
		return this._selected;
	},

	setSelected: function(selected ) {
		if (this._children && !arguments[1]) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setSelected(selected);
		}
		if ((selected = !!selected) != this._selected) {
			this._selected = selected;
			this._project._updateSelection(this);
			this._changed(33);
		}
	},

	_selected: false,

	isFullySelected: function() {
		if (this._children && this._selected) {
			for (var i = 0, l = this._children.length; i < l; i++)
				if (!this._children[i].isFullySelected())
					return false;
			return true;
		}
		return this._selected;
	},

	setFullySelected: function(selected) {
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i].setFullySelected(selected);
		}
		this.setSelected(selected, true);
	},

	isClipMask: function() {
		return this._clipMask;
	},

	setClipMask: function(clipMask) {
		if (this._clipMask != (clipMask = !!clipMask)) {
			this._clipMask = clipMask;
			if (clipMask) {
				this.setFillColor(null);
				this.setStrokeColor(null);
			}
			this._changed(33);
			if (this._parent)
				this._parent._changed(256);
		}
	},

	_clipMask: false,

	getData: function() {
		if (!this._data)
			this._data = {};
		return this._data;
	},

	setData: function(data) {
		this._data = data;		
	},

	getPosition: function() {
		var pos = this._position
				|| (this._position = this.getBounds().getCenter(true));
		return new (arguments[0] ? Point : LinkedPoint)
				(pos.x, pos.y, this, 'setPosition');
	},

	setPosition: function() {
		this.translate(Point.read(arguments).subtract(this.getPosition(true)));
	},

	getMatrix: function() {
		return this._matrix;
	},

	setMatrix: function(matrix) {
		this._matrix.initialize(matrix);
		this._changed(5);
	},

	isEmpty: function() {
		return this._children.length == 0;
	}
}, Base.each(['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
	function(name) {
		this[name] = function() {
			var getter = this._boundsGetter,
				bounds = this._getCachedBounds(typeof getter == 'string'
						? getter : getter && getter[name] || name, arguments[0]);
			return name === 'getBounds'
					? new LinkedRectangle(bounds.x, bounds.y, bounds.width,
							bounds.height, this, 'setBounds') 
					: bounds;
		};
	},
{
	_getCachedBounds: function(getter, matrix, cacheItem) {
		var cache = (!matrix || matrix.equals(this._matrix)) && getter;
		if (cacheItem && this._parent) {
			var id = cacheItem._id,
				ref = this._parent._boundsCache
					= this._parent._boundsCache || {
				ids: {},
				list: []
			};
			if (!ref.ids[id]) {
				ref.list.push(cacheItem);
				ref.ids[id] = cacheItem;
			}
		}
		if (cache && this._bounds && this._bounds[cache])
			return this._bounds[cache].clone();
		var identity = this._matrix.isIdentity();
		matrix = !matrix || matrix.isIdentity()
				? identity ? null : this._matrix
				: identity ? matrix : matrix.clone().concatenate(this._matrix);
		var bounds = this._getBounds(getter, matrix, cache ? this : cacheItem);
		if (cache) {
			if (!this._bounds)
				this._bounds = {};
			this._bounds[cache] = bounds.clone();
		}
		return bounds;
	},

	_clearBoundsCache: function() {
		if (this._boundsCache) {
			for (var i = 0, list = this._boundsCache.list, l = list.length;
					i < l; i++) {
				var item = list[i];
				delete item._bounds;
				if (item != this && item._boundsCache)
					item._clearBoundsCache();
			}
			delete this._boundsCache;
		}
	},

	_getBounds: function(getter, matrix, cacheItem) {
		var children = this._children;
		if (!children || children.length == 0)
			return new Rectangle();
		var x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			if (child._visible && !child.isEmpty()) {
				var rect = child._getCachedBounds(getter, matrix, cacheItem);
				x1 = Math.min(rect.x, x1);
				y1 = Math.min(rect.y, y1);
				x2 = Math.max(rect.x + rect.width, x2);
				y2 = Math.max(rect.y + rect.height, y2);
			}
		}
		return isFinite(x1)
				? new Rectangle(x1, y1, x2 - x1, y2 - y1)
				: new Rectangle();
	},

	setBounds: function(rect) {
		rect = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			matrix = new Matrix(),
			center = rect.getCenter();
		matrix.translate(center);
		if (rect.width != bounds.width || rect.height != bounds.height) {
			matrix.scale(
					bounds.width != 0 ? rect.width / bounds.width : 1,
					bounds.height != 0 ? rect.height / bounds.height : 1);
		}
		center = bounds.getCenter();
		matrix.translate(-center.x, -center.y);
		this.transform(matrix);
	}

}), {
	getProject: function() {
		return this._project;
	},

	_setProject: function(project) {
		if (this._project != project) {
			this._project = project;
			if (this._children) {
				for (var i = 0, l = this._children.length; i < l; i++) {
					this._children[i]._setProject(project);
				}
			}
		}
	},

	getLayer: function() {
		var parent = this;
		while (parent = parent._parent) {
			if (parent instanceof Layer)
				return parent;
		}
		return null;
	},

	getParent: function() {
		return this._parent;
	},

	setParent: function(item) {
		return item.addChild(this);
	},

	getChildren: function() {
		return this._children;
	},

	setChildren: function(items) {
		this.removeChildren();
		this.addChildren(items);
	},

	getFirstChild: function() {
		return this._children && this._children[0] || null;
	},

	getLastChild: function() {
		return this._children && this._children[this._children.length - 1]
				|| null;
	},

	getNextSibling: function() {
		return this._parent && this._parent._children[this._index + 1] || null;
	},

	getPreviousSibling: function() {
		return this._parent && this._parent._children[this._index - 1] || null;
	},

	getIndex: function() {
		return this._index;
	},

	isInserted: function() {
		return this._parent ? this._parent.isInserted() : false;
	},

	clone: function(insert) {
		return this._clone(new this.constructor({ insert: false }), insert);
	},

	_clone: function(copy, insert) {
		copy.setStyle(this._style);
		if (this._children) {
			for (var i = 0, l = this._children.length; i < l; i++)
				copy.addChild(this._children[i].clone(false), true);
		}
		if (insert || insert === undefined)
			copy.insertAbove(this);
		var keys = ['_locked', '_visible', '_blendMode', '_opacity',
				'_clipMask', '_guide'];
		for (var i = 0, l = keys.length; i < l; i++) {
			var key = keys[i];
			if (this.hasOwnProperty(key))
				copy[key] = this[key];
		}
		copy._matrix.initialize(this._matrix);
		copy.setSelected(this._selected);
		if (this._name)
			copy.setName(this._name, true);
		return copy;
	},

	copyTo: function(itemOrProject) {
		var copy = this.clone();
		if (itemOrProject.layers) {
			itemOrProject.activeLayer.addChild(copy);
		} else {
			itemOrProject.addChild(copy);
		}
		return copy;
	},

	rasterize: function(resolution) {
		var bounds = this.getStrokeBounds(),
			scale = (resolution || 72) / 72,
			topLeft = bounds.getTopLeft().floor(),
			bottomRight = bounds.getBottomRight().ceil()
			size = new Size(bottomRight.subtract(topLeft)),
			canvas = CanvasProvider.getCanvas(size),
			ctx = canvas.getContext('2d'),
			matrix = new Matrix().scale(scale).translate(topLeft.negate());
		ctx.save();
		matrix.applyToContext(ctx);
		this.draw(ctx, Base.merge({ transforms: [matrix] }));
		var raster = new Raster(canvas);
		raster.setPosition(topLeft.add(size.divide(2)));
		ctx.restore();
		return raster;
	},

	contains: function() {
		return !!this._contains(
				this._matrix._inverseTransform(Point.read(arguments)));
	},

	_contains: function(point) {
		if (this._children) {
			for (var i = this._children.length - 1; i >= 0; i--) {
				if (this._children[i].contains(point))
					return true;
			}
			return false;
		}
		return point.isInside(this._getBounds('getBounds'));
	},

	hitTest: function(point, options) {
		point = Point.read(arguments);
		options = HitResult.getOptions(Base.read(arguments));

		if (this._locked || !this._visible || this._guide && !options.guides)
			return null;

		if (!this._children && !this.getRoughBounds()
				.expand(options.tolerance)._containsPoint(point))
			return null;
		point = this._matrix._inverseTransform(point);

		var that = this,
			res;
		function checkBounds(type, part) {
			var pt = bounds['get' + part]();
			if (point.getDistance(pt) < options.tolerance)
				return new HitResult(type, that,
						{ name: Base.hyphenate(part), point: pt });
		}

		if ((options.center || options.bounds) &&
				!(this instanceof Layer && !this._parent)) {
			var bounds = this._getBounds('getBounds');
			if (options.center)
				res = checkBounds('center', 'Center');
			if (!res && options.bounds) {
				var points = [
					'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight',
					'LeftCenter', 'TopCenter', 'RightCenter', 'BottomCenter'
				];
				for (var i = 0; i < 8 && !res; i++)
					res = checkBounds('bounds', points[i]);
			}
		}

		if ((res || (res = this._children || !(options.guides && !this._guide
				|| options.selected && !this._selected)
					? this._hitTest(point, options) : null))
				&& res.point) {
			res.point = that._matrix.transform(res.point);
		}
		return res;
	},

	_hitTest: function(point, options) {
		if (this._children) {
			for (var i = this._children.length - 1, res; i >= 0; i--)
				if (res = this._children[i].hitTest(point, options))
					return res;
		} else if (options.fill && this.hasFill() && this._contains(point)) {
			return new HitResult('fill', this);
		}
	},

	importJSON: function(json) {
		return this.addChild(Base.importJSON(json));
	},

	addChild: function(item, _preserve) {
		return this.insertChild(undefined, item, _preserve);
	},

	insertChild: function(index, item, _preserve) {
		var res = this.insertChildren(index, [item], _preserve);
		return res && res[0];
	},

	addChildren: function(items, _preserve) {
		return this.insertChildren(this._children.length, items, _preserve);
	},

	insertChildren: function(index, items, _preserve, _type) {
		var children = this._children;
		if (children && items && items.length > 0) {
			items = Array.prototype.slice.apply(items);
			for (var i = items.length - 1; i >= 0; i--) {
				var item = items[i];
				if (_type && item._type !== _type)
					items.splice(i, 1);
				else
					item._remove(true);
			}
			Base.splice(children, items, index, 0);
			for (var i = 0, l = items.length; i < l; i++) {
				var item = items[i];
				item._parent = this;
				item._setProject(this._project);
				if (item._name)
					item.setName(item._name);
			}
			this._changed(7);
		} else {
			items = null;
		}
		return items;
	},

	_insert: function(above, item, _preserve) {
		if (!item._parent)
			return null;
		var index = item._index + (above ? 1 : 0);
		if (item._parent === this._parent && index > this._index)
			 index--;
		return item._parent.insertChild(index, this, _preserve);
	},

	insertAbove: function(item, _preserve) {
		return this._insert(true, item, _preserve);
	},

	insertBelow: function(item, _preserve) {
	 	return this._insert(false, item, _preserve);
	 },

	sendToBack: function() {
		return this._parent.insertChild(0, this);
	},

	bringToFront: function() {
		return this._parent.addChild(this);
	},

	appendTop: '#addChild',

	appendBottom: function(item) {
		return this.insertChild(0, item);
	},

	moveAbove: '#insertAbove',

	moveBelow: '#insertBelow',

	_removeFromNamed: function() {
		var children = this._parent._children,
			namedChildren = this._parent._namedChildren,
			name = this._name,
			namedArray = namedChildren[name],
			index = namedArray ? namedArray.indexOf(this) : -1;
		if (index == -1)
			return;
		if (children[name] == this)
			delete children[name];
		namedArray.splice(index, 1);
		if (namedArray.length) {
			children[name] = namedArray[namedArray.length - 1];
		} else {
			delete namedChildren[name];
		}
	},

	_remove: function(notify) {
		if (this._parent) {
			if (this._name)
				this._removeFromNamed();
			if (this._index != null)
				Base.splice(this._parent._children, null, this._index, 1);
			if (notify)
				this._parent._changed(7);
			this._parent = null;
			return true;
		}
		return false;
	},

	remove: function() {
		return this._remove(true);
	},

	removeChildren: function(from, to) {
		if (!this._children)
			return null;
		from = from || 0;
		to = Base.pick(to, this._children.length);
		var removed = Base.splice(this._children, null, from, to - from);
		for (var i = removed.length - 1; i >= 0; i--)
			removed[i]._remove(false);
		if (removed.length > 0)
			this._changed(7);
		return removed;
	},

	reverseChildren: function() {
		if (this._children) {
			this._children.reverse();
			for (var i = 0, l = this._children.length; i < l; i++)
				this._children[i]._index = i;
			this._changed(7);
		}
	},

	isEditable: function() {
		var item = this;
		while (item) {
			if (!item._visible || item._locked)
				return false;
			item = item._parent;
		}
		return true;
	},

	_getOrder: function(item) {
		function getList(item) {
			var list = [];
			do {
				list.unshift(item);
			} while (item = item._parent);
			return list;
		}
		var list1 = getList(this),
			list2 = getList(item);
		for (var i = 0, l = Math.min(list1.length, list2.length); i < l; i++) {
			if (list1[i] != list2[i]) {
				return list1[i]._index < list2[i]._index ? 1 : -1;
			}
		}
		return 0;
	},

	hasChildren: function() {
		return this._children && this._children.length > 0;
	},

	isAbove: function(item) {
		return this._getOrder(item) === -1;
	},

	isBelow: function(item) {
		return this._getOrder(item) === 1;
	},

	isParent: function(item) {
		return this._parent === item;
	},

	isChild: function(item) {
		return item && item._parent === this;
	},

	isDescendant: function(item) {
		var parent = this;
		while (parent = parent._parent) {
			if (parent == item)
				return true;
		}
		return false;
	},

	isAncestor: function(item) {
		return item ? item.isDescendant(this) : false;
	},

	isGroupedWith: function(item) {
		var parent = this._parent;
		while (parent) {
			if (parent._parent
				&& /^(group|layer|compound-path)$/.test(parent._type)
				&& item.isDescendant(parent))
					return true;
			parent = parent._parent;
		}
		return false;
	},

	scale: function(hor, ver , center) {
		if (arguments.length < 2 || typeof ver === 'object') {
			center = ver;
			ver = hor;
		}
		return this.transform(new Matrix().scale(hor, ver,
				center || this.getPosition(true)));
	},

	translate: function() {
		var mx = new Matrix();
		return this.transform(mx.translate.apply(mx, arguments));
	},

	rotate: function(angle, center) {
		return this.transform(new Matrix().rotate(angle,
				center || this.getPosition(true)));
	},

	shear: function(hor, ver, center) {
		if (arguments.length < 2 || typeof ver === 'object') {
			center = ver;
			ver = hor;
		}
		return this.transform(new Matrix().shear(hor, ver,
				center || this.getPosition(true)));
	},

	transform: function(matrix ) {
		var bounds = this._bounds,
			position = this._position;
		this._matrix.preConcatenate(matrix);
		if (this._transformContent || arguments[1])
			this.applyMatrix(true);
		this._changed(5);
		if (bounds && matrix.getRotation() % 90 === 0) {
			for (var key in bounds) {
				var rect = bounds[key];
				matrix._transformBounds(rect, rect);
			}
			var getter = this._boundsGetter,
				rect = bounds[getter && getter.getBounds || getter || 'getBounds'];
			if (rect)
				this._position = rect.getCenter(true);
			this._bounds = bounds;
		} else if (position) {
			this._position = matrix._transformPoint(position, position);
		}
		return this;
	},

	_applyMatrix: function(matrix, applyMatrix) {
		var children = this._children;
		if (children && children.length > 0) {
			for (var i = 0, l = children.length; i < l; i++)
				children[i].transform(matrix, applyMatrix);
			return true;
		}
	},

	applyMatrix: function(_dontNotify) {
		var matrix = this._matrix;
		if (this._applyMatrix(matrix, true)) {
			var style = this._style,
				fillColor = style.getFillColor(true),
				strokeColor = style.getStrokeColor(true);
			if (fillColor)
				fillColor.transform(matrix);
			if (strokeColor)
				strokeColor.transform(matrix);
			matrix.reset();
		}
		if (!_dontNotify)
			this._changed(5);
	},

	fitBounds: function(rectangle, fill) {
		rectangle = Rectangle.read(arguments);
		var bounds = this.getBounds(),
			itemRatio = bounds.height / bounds.width,
			rectRatio = rectangle.height / rectangle.width,
			scale = (fill ? itemRatio > rectRatio : itemRatio < rectRatio)
					? rectangle.width / bounds.width
					: rectangle.height / bounds.height,
			newBounds = new Rectangle(new Point(),
					new Size(bounds.width * scale, bounds.height * scale));
		newBounds.setCenter(rectangle.getCenter());
		this.setBounds(newBounds);
	},

	_setStyles: function(ctx) {
		var style = this._style,
			width = style.getStrokeWidth(),
			join = style.getStrokeJoin(),
			cap = style.getStrokeCap(),
			limit = style.getMiterLimit(),
			fillColor = style.getFillColor(),
			strokeColor = style.getStrokeColor(),
			shadowColor = style.getShadowColor();
		if (width != null)
			ctx.lineWidth = width;
		if (join)
			ctx.lineJoin = join;
		if (cap)
			ctx.lineCap = cap;
		if (limit)
			ctx.miterLimit = limit;
		if (fillColor)
			ctx.fillStyle = fillColor.toCanvasStyle(ctx);
		if (strokeColor) {
			ctx.strokeStyle = strokeColor.toCanvasStyle(ctx);
			var dashArray = style.getDashArray(),
				dashOffset = style.getDashOffset();
			if (paper.support.nativeDash && dashArray && dashArray.length) {
				if ('setLineDash' in ctx) {
					ctx.setLineDash(dashArray);
					ctx.lineDashOffset = dashOffset;
				} else {
					ctx.mozDash = dashArray;
					ctx.mozDashOffset = dashOffset;
				}
			}
		}
		if (shadowColor) {
			ctx.shadowColor = shadowColor.toCanvasStyle(ctx);
			ctx.shadowBlur = style.getShadowBlur();
			var offset = this.getShadowOffset();
			ctx.shadowOffsetX = offset.x;
			ctx.shadowOffsetY = offset.y;
		}
	},

	draw: function(ctx, param) {
		if (!this._visible || this._opacity === 0)
			return;
		this._drawCount = this._project._drawCount;
		var transforms = param.transforms,
			parentMatrix = transforms[transforms.length - 1],
			globalMatrix = parentMatrix.clone().concatenate(this._matrix);
		transforms.push(this._globalMatrix = globalMatrix);
		var blendMode = this._blendMode,
			opacity = this._opacity,
			normalBlend = blendMode === 'normal',
			nativeBlend = BlendMode.nativeModes[blendMode],
			direct = normalBlend && opacity === 1
					|| (nativeBlend || normalBlend && opacity < 1)
						&& this._canComposite(),
			mainCtx, itemOffset, prevOffset;
		if (!direct) {
			var bounds = this.getStrokeBounds(parentMatrix);
			if (!bounds.width || !bounds.height)
				return;
			prevOffset = param.offset;
			itemOffset = param.offset = bounds.getTopLeft().floor();
			mainCtx = ctx;
			ctx = CanvasProvider.getContext(
					bounds.getSize().ceil().add(new Size(1, 1)));
		}
		ctx.save();
		if (direct) {
			ctx.globalAlpha = opacity;
			if (nativeBlend)
				ctx.globalCompositeOperation = blendMode;
		} else {
			ctx.translate(-itemOffset.x, -itemOffset.y);
		}
		(direct ? this._matrix : globalMatrix).applyToContext(ctx);
		if (!direct && param.clipItem)
			param.clipItem.draw(ctx, param.extend({ clip: true }));
		this._draw(ctx, param);
		ctx.restore();
		transforms.pop();
		if (param.clip)
			ctx.clip();
		if (!direct) {
			BlendMode.process(blendMode, ctx, mainCtx, opacity,
					itemOffset.subtract(prevOffset));
			CanvasProvider.release(ctx);
			param.offset = prevOffset;
		}
	},

	_canComposite: function() {
		return false;
	}
}, Base.each(['down', 'drag', 'up', 'move'], function(name) {
	this['removeOn' + Base.capitalize(name)] = function() {
		var hash = {};
		hash[name] = true;
		return this.removeOn(hash);
	};
}, {

	removeOn: function(obj) {
		for (var name in obj) {
			if (obj[name]) {
				var key = 'mouse' + name,
					project = this._project,
					sets = project._removeSets = project._removeSets || {};
				sets[key] = sets[key] || {};
				sets[key][this._id] = this;
			}
		}
		return this;
	}
}));

var Group = Item.extend({
	_class: 'Group',
	_serializeFields: {
		children: []
	},

	initialize: function Group(arg) {
		this._children = [];
		this._namedChildren = {};
		if (!this._initialize(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		if (flags & 2 && this._transformContent
				&& !this._matrix.isIdentity()) {
			this.applyMatrix();
		}
		if (flags & (2 | 256)) {
			delete this._clipItem;
		}
	},

	_getClipItem: function() {
		if (this._clipItem !== undefined)
			return this._clipItem;
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child._clipMask)
				return this._clipItem = child;
		}
		return this._clipItem = null;
	},

	getTransformContent: function() {
		return this._transformContent;
	},

	setTransformContent: function(transform) {
		this._transformContent = transform;
		if (transform)
			this.applyMatrix();
	},

	isClipped: function() {
		return !!this._getClipItem();
	},

	setClipped: function(clipped) {
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
	},

	_draw: function(ctx, param) {
		var clipItem = param.clipItem = this._getClipItem();
		if (clipItem)
			clipItem.draw(ctx, param.extend({ clip: true }));
		for (var i = 0, l = this._children.length; i < l; i++) {
			var item = this._children[i];
			if (item !== clipItem)
				item.draw(ctx, param);
		}
		param.clipItem = null;
	}
});

var Layer = Group.extend({
	_class: 'Layer',

	initialize: function Layer() {
		this._project = paper.project;
		this._index = this._project.layers.push(this) - 1;
		Group.apply(this, arguments);
		this.activate();
	},

	_remove: function _remove(notify) {
		if (this._parent)
			return _remove.base.call(this, notify);
		if (this._index != null) {
			if (this._project.activeLayer === this)
				this._project.activeLayer = this.getNextSibling()
						|| this.getPreviousSibling();
			Base.splice(this._project.layers, null, this._index, 1);
			this._project._needsRedraw = true;
			return true;
		}
		return false;
	},

	getNextSibling: function getNextSibling() {		
		return this._parent ? getNextSibling.base.call(this)
				: this._project.layers[this._index + 1] || null;
	},

	getPreviousSibling: function getPreviousSibling() {
		return this._parent ? getPreviousSibling.base.call(this)
				: this._project.layers[this._index - 1] || null;
	},

	isInserted: function isInserted() {
		return this._parent ? isInserted.base.call(this) : this._index != null;
	},

	activate: function() {
		this._project.activeLayer = this;
	},

	_insert: function _insert(above, item, _preserve) {
		if (item instanceof Layer && !item._parent && this._remove(true)) {
			Base.splice(item._project.layers, [this],
					item._index + (above ? 1 : 0), 0);
			this._setProject(item._project);
			return this;
		}
		return _insert.base.call(this, above, item, _preserve);
	}
});

var Shape = Item.extend({
	_class: 'Shape',
	_transformContent: false,

	initialize: function Shape(type, point, size, props) {
		this._initialize(props, point);
		this._type = type;
		this._size = size;
	},

	getSize: function() {
		var size = this._size;
		return new LinkedSize(size.width, size.height, this, 'setSize');
	},

	setSize: function() {
		var size = Size.read(arguments);
		if (!this._size.equals(size)) {
			this._size.set(size.width, size.height);
			this._changed(5);
		}
	},

	getRadius: function() {
		var size = this._size;
		return (size.width + size.height) / 4;
	},

	setRadius: function(radius) {
		var size = radius * 2;
		this.setSize(size, size);
	},

	_draw: function(ctx, param) {
		var style = this._style,
			size = this._size,
			width = size.width,
			height = size.height,
			fillColor = style.getFillColor(),
			strokeColor = style.getStrokeColor();
		if (fillColor || strokeColor || param.clip) {
			ctx.beginPath();
			switch (this._type) {
			case 'rect':
				ctx.rect(-width / 2, -height / 2, width, height);
				break;
			case 'circle':
				ctx.arc(0, 0, (width + height) / 4, 0, Math.PI * 2, true);
				break;
			case 'ellipse':
				var mx = width / 2,
					my = height / 2,
					kappa = Numerical.KAPPA,
					cx = mx * kappa,
					cy = my * kappa;
				ctx.moveTo(-mx, 0);
				ctx.bezierCurveTo(-mx, -cy, -cx, -my, 0, -my);
				ctx.bezierCurveTo(cx, -my, mx, -cy, mx, 0);
				ctx.bezierCurveTo(mx, cy, cx, my, 0, my);
				ctx.bezierCurveTo(-cx, my, -mx, cy, -mx, 0);
				break;
			}
		}
		if (!param.clip && (fillColor || strokeColor)) {
			this._setStyles(ctx);
			if (fillColor)
				ctx.fill();
			if (strokeColor)
				ctx.stroke();
		}
	},

	_canComposite: function() {
		return !(this.hasFill() && this.hasStroke());
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		if (getter !== 'getBounds' && this.hasStroke())
			rect = rect.expand(this.getStrokeWidth());
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_contains: function _contains(point) {
		switch (this._type) {
		case 'rect':
			return _contains.base.call(this, point);
		case 'circle':
		case 'ellipse':
			return point.divide(this._size).getLength() <= 0.5;
		}
	},

	_hitTest: function _hitTest(point) {
		if (this.hasStroke()) {
			var type = this._type,
				strokeWidth = this.getStrokeWidth();
			switch (type) {
			case 'rect':
				var rect = new Rectangle(this._size).setCenter(0, 0),
					outer = rect.expand(strokeWidth),
					inner = rect.expand(-strokeWidth);
				if (outer._containsPoint(point) && !inner._containsPoint(point))
					return new HitResult('stroke', this);
				break;
			case 'circle':
			case 'ellipse':
				var size = this._size,
					width = size.width,
					height = size.height,
					radius;
				if (type === 'ellipse') {
					var angle = point.getAngleInRadians(),
						x = width * Math.sin(angle),
						y = height * Math.cos(angle);
					radius = width * height / (2 * Math.sqrt(x * x + y * y));
				} else {
					radius = (width + height) / 4;
				}
				if (2 * Math.abs(point.getLength() - radius) <= strokeWidth)
					return new HitResult('stroke', this);
				break;
			}
		}
		return _hitTest.base.apply(this, arguments);
	},

	statics: new function() {
		function createShape(type, point, size, args) {
			return new Shape(type, point, size, Base.getNamed(args));
		}

		return {
			Circle: function() {
				var center = Point.readNamed(arguments, 'center'),
					radius = Base.readNamed(arguments, 'radius');
				return createShape('circle', center, new Size(radius * 2),
						arguments);
			},

			Rectangle: function() {
				var rect = Rectangle.readNamed(arguments, 'rectangle');
				return createShape('rect', rect.getCenter(true),
						rect.getSize(true), arguments);
			},

			Ellipse: function() {
				var rect = Rectangle.readNamed(arguments, 'rectangle');
				return createShape('ellipse', rect.getCenter(true),
						rect.getSize(true), arguments);
			}
		};
	}
});

var Raster = Item.extend({
	_class: 'Raster',
	_transformContent: false,
	_boundsGetter: 'getBounds',
	_boundsSelected: true,
	_serializeFields: {
		source: null
	},

	initialize: function Raster(object, position) {
		if (!this._initialize(object,
				position !== undefined && Point.read(arguments, 1))) {
			if (object.getContext) {
				this.setCanvas(object);
			} else if (typeof object === 'string') {
				this.setSource(object);
			} else {
				this.setImage(object);
			}
		}
		if (!this._size)
			this._size = new Size();
	},

	clone: function(insert) {
		var param = { insert: false },
			image = this._image;
		if (image) {
			param.image = image;
		} else if (this._canvas) {
			var canvas = param.canvas = CanvasProvider.getCanvas(this._size);
			canvas.getContext('2d').drawImage(this._canvas, 0, 0);
		}
		return this._clone(new Raster(param), insert);
	},

	getSize: function() {
		var size = this._size;
		return new LinkedSize(size.width, size.height, this, 'setSize');
	},

	setSize: function() {
		var size = Size.read(arguments);
		if (!this._size.equals(size)) {
			var element = this.getElement();
			this.setCanvas(CanvasProvider.getCanvas(size));
			if (element)
				this.getContext(true).drawImage(element, 0, 0,
						size.width, size.height);
		}
	},

	getWidth: function() {
		return this._size.width;
	},

	getHeight: function() {
		return this._size.height;
	},

	isEmpty: function() {
		return this._size.width == 0 && this._size.height == 0;
	},

	getPpi: function() {
		var matrix = this._matrix,
			orig = new Point(0, 0).transform(matrix),
			u = new Point(1, 0).transform(matrix).subtract(orig),
			v = new Point(0, 1).transform(matrix).subtract(orig);
		return new Size(
			72 / u.getLength(),
			72 / v.getLength()
		);
	},

	getContext: function() {
		if (!this._context)
			this._context = this.getCanvas().getContext('2d');
		if (arguments[0]) {
			this._image = null;
			this._changed(129);
		}
		return this._context;
	},

	setContext: function(context) {
		this._context = context;
	},

	getCanvas: function() {
		if (!this._canvas) {
			var ctx = CanvasProvider.getContext(this._size);
			try {
				if (this._image)
					ctx.drawImage(this._image, 0, 0);
				this._canvas = ctx.canvas;
			} catch (e) {
				CanvasProvider.release(ctx);
			}
		}
		return this._canvas;
	},

	setCanvas: function(canvas) {
		if (this._canvas)
			CanvasProvider.release(this._canvas);
		this._canvas = canvas;
		this._size = new Size(canvas.width, canvas.height);
		this._image = null;
		this._context = null;
		this._changed(5 | 129);
	},

	getImage: function() {
		return this._image;
	},

	setImage: function(image) {
		if (this._canvas)
			CanvasProvider.release(this._canvas);
		this._image = image;
		this._size = new Size(image.width, image.height);
		this._canvas = null;
		this._context = null;
		this._changed(5);
	},

	getSource: function() {
		return this._image && this._image.src || this.toDataURL();
	},

	setSource: function(src) {
		var that = this,
			image = document.getElementById(src) || new Image();

		function loaded() {
			that.fire('load');
			if (that._project.view)
				that._project.view.draw(true);
		}

		if (image.width && image.height) {
			setTimeout(loaded, 0);
		} else if (!image.src) {
			DomEvent.add(image, {
				load: function() {
					that.setImage(image);
					loaded();
				}
			});
			image.src = src;
		}
		this.setImage(image);
	},

	getElement: function() {
		return this._canvas || this._image;
	},

	getSubImage: function(rect) {
		rect = Rectangle.read(arguments);
		var ctx = CanvasProvider.getContext(rect.getSize());
		ctx.drawImage(this.getCanvas(), rect.x, rect.y,
				rect.width, rect.height, 0, 0, rect.width, rect.height);
		return ctx.canvas;
	},

	toDataURL: function() {
		var src = this._image && this._image.src;
		if (/^data:/.test(src))
			return src;
		var canvas = this.getCanvas();
		return canvas ? canvas.toDataURL() : null;
	},

	drawImage: function(image, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).drawImage(image, point.x, point.y);
	},

	getAverageColor: function(object) {
		var bounds, path;
		if (!object) {
			bounds = this.getBounds();
		} else if (object instanceof PathItem) {
			path = object;
			bounds = object.getBounds();
		} else if (object.width) {
			bounds = new Rectangle(object);
		} else if (object.x) {
			bounds = new Rectangle(object.x - 0.5, object.y - 0.5, 1, 1);
		}
		var sampleSize = 32,
			width = Math.min(bounds.width, sampleSize),
			height = Math.min(bounds.height, sampleSize);
		var ctx = Raster._sampleContext;
		if (!ctx) {
			ctx = Raster._sampleContext = CanvasProvider.getContext(
					new Size(sampleSize));
		} else {
			ctx.clearRect(0, 0, sampleSize + 1, sampleSize + 1);
		}
		ctx.save();
		var matrix = new Matrix()
				.scale(width / bounds.width, height / bounds.height)
				.translate(-bounds.x, -bounds.y);
		matrix.applyToContext(ctx);
		if (path)
			path.draw(ctx, Base.merge({ clip: true, transforms: [matrix] }));
		this._matrix.applyToContext(ctx);
		ctx.drawImage(this.getElement(),
				-this._size.width / 2, -this._size.height / 2);
		ctx.restore();
		var pixels = ctx.getImageData(0.5, 0.5, Math.ceil(width),
				Math.ceil(height)).data,
			channels = [0, 0, 0],
			total = 0;
		for (var i = 0, l = pixels.length; i < l; i += 4) {
			var alpha = pixels[i + 3];
			total += alpha;
			alpha /= 255;
			channels[0] += pixels[i] * alpha;
			channels[1] += pixels[i + 1] * alpha;
			channels[2] += pixels[i + 2] * alpha;
		}
		for (var i = 0; i < 3; i++)
			channels[i] /= total;
		return total ? Color.read(channels) : null;
	},

	getPixel: function(point) {
		point = Point.read(arguments);
		var data = this.getContext().getImageData(point.x, point.y, 1, 1).data;
		return new Color('rgb', [data[0] / 255, data[1] / 255, data[2] / 255],
				data[3] / 255);
	},

	setPixel: function() {
		var point = Point.read(arguments),
			color = Color.read(arguments),
			components = color._convert('rgb'),
			alpha = color._alpha,
			ctx = this.getContext(true),
			imageData = ctx.createImageData(1, 1),
			data = imageData.data;
		data[0] = components[0] * 255;
		data[1] = components[1] * 255;
		data[2] = components[2] * 255;
		data[3] = alpha != null ? alpha * 255 : 255;
		ctx.putImageData(imageData, point.x, point.y);
	},

	createImageData: function(size) {
		size = Size.read(arguments);
		return this.getContext().createImageData(size.width, size.height);
	},

	getImageData: function(rect) {
		rect = Rectangle.read(arguments);
		if (rect.isEmpty())
			rect = new Rectangle(this._size);
		return this.getContext().getImageData(rect.x, rect.y,
				rect.width, rect.height);
	},

	setImageData: function(data, point) {
		point = Point.read(arguments, 1);
		this.getContext(true).putImageData(data, point.x, point.y);
	},

	_getBounds: function(getter, matrix) {
		var rect = new Rectangle(this._size).setCenter(0, 0);
		return matrix ? matrix._transformBounds(rect) : rect;
	},

	_hitTest: function(point) {
		if (this._contains(point)) {
			var that = this;
			return new HitResult('pixel', that, {
				offset: point.add(that._size.divide(2)).round(),
				color: {
					get: function() {
						return that.getPixel(this.offset);
					}
				}
			});
		}
	},

	_draw: function(ctx) {
		var element = this.getElement();
		if (element) {
			ctx.globalAlpha = this._opacity;
			ctx.drawImage(element,
					-this._size.width / 2, -this._size.height / 2);
		}
	},

	_canComposite: function() {
		return true;
	}
});

var PlacedSymbol = Item.extend({
	_class: 'PlacedSymbol',
	_transformContent: false,
	_boundsGetter: { getBounds: 'getStrokeBounds' },
	_boundsSelected: true,
	_serializeFields: {
		symbol: null
	},

	initialize: function PlacedSymbol(arg0, arg1) {
		if (!this._initialize(arg0,
				arg1 !== undefined && Point.read(arguments, 1)))
			this.setSymbol(arg0 instanceof Symbol ? arg0 : new Symbol(arg0));
	},

	getSymbol: function() {
		return this._symbol;
	},

	setSymbol: function(symbol) {
		if (this._symbol)
			delete this._symbol._instances[this._id];
		this._symbol = symbol;
		symbol._instances[this._id] = this;
	},

	clone: function(insert) {
		return this._clone(new PlacedSymbol({
			symbol: this.symbol,
			insert: false
		}), insert);
	},

	isEmpty: function() {
		return this._symbol._definition.isEmpty();
	},

	_getBounds: function(getter, matrix) {
		return this.symbol._definition._getCachedBounds(getter, matrix);
	},

	_hitTest: function(point, options, matrix) {
		var result = this._symbol._definition._hitTest(point, options, matrix);
		if (result)
			result.item = this;
		return result;
	},

	_draw: function(ctx, param) {
		this.symbol._definition.draw(ctx, param);
	}

});

var HitResult = Base.extend({
	_class: 'HitResult',

	initialize: function HitResult(type, item, values) {
		this.type = type;
		this.item = item;
		if (values) {
			values.enumerable = true;
			this.inject(values);
		}
	},

	statics: {
		getOptions: function(options) {
			return options && options._merged ? options : Base.merge({
				type: null,
				tolerance: paper.project.options.hitTolerance || 2,
				fill: !options,
				stroke: !options,
				segments: !options,
				handles: false,
				ends: false,
				center: false,
				bounds: false,
				guides: false,
				selected: false,
				_merged: true
			}, options);
		}
	}
});

var Segment = Base.extend({
	_class: 'Segment',

	initialize: function Segment(arg0, arg1, arg2, arg3, arg4, arg5) {
		var count = arguments.length,
			point, handleIn, handleOut;
		if (count === 0) {
		} else if (count === 1) {
			if (arg0.point) {
				point = arg0.point;
				handleIn = arg0.handleIn;
				handleOut = arg0.handleOut;
			} else {
				point = arg0;
			}
		} else if (count < 6) {
			if (count == 2 && arg1.x === undefined) {
				point = [ arg0, arg1 ];
			} else {
				point = arg0;
				handleIn = arg1;
				handleOut = arg2;
			}
		} else if (count === 6) {
			point = [ arg0, arg1 ];
			handleIn = [ arg2, arg3 ];
			handleOut = [ arg4, arg5 ];
		}
		this._point = new SegmentPoint(point, this);
		this._handleIn = new SegmentPoint(handleIn, this);
		this._handleOut = new SegmentPoint(handleOut, this);
	},

	_serialize: function(options) {
		return Base.serialize(this.isLinear() ? this._point
				: [this._point, this._handleIn, this._handleOut], options, true);
	},

	_changed: function(point) {
		if (!this._path)
			return;
		var curve = this._path._curves && this.getCurve(),
			other;
		if (curve) {
			curve._changed();
			if (other = (curve[point == this._point
					|| point == this._handleIn && curve._segment1 == this
					? 'getPrevious' : 'getNext']())) {
				other._changed();
			}
		}
		this._path._changed(5);
	},

	getPoint: function() {
		return this._point;
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this._point.set(point.x, point.y);
	},

	getHandleIn: function() {
		return this._handleIn;
	},

	setHandleIn: function(point) {
		point = Point.read(arguments);
		this._handleIn.set(point.x, point.y);
	},

	getHandleOut: function() {
		return this._handleOut;
	},

	setHandleOut: function(point) {
		point = Point.read(arguments);
		this._handleOut.set(point.x, point.y);
	},

	isLinear: function() {
		return this._handleIn.isZero() && this._handleOut.isZero();
	},

	setLinear: function() {
		this._handleIn.set(0, 0);
		this._handleOut.set(0, 0);
	},

	_isSelected: function(point) {
		var state = this._selectionState;
		return point == this._point ? !!(state & 4)
			: point == this._handleIn ? !!(state & 1)
			: point == this._handleOut ? !!(state & 2)
			: false;
	},

	_setSelected: function(point, selected) {
		var path = this._path,
			selected = !!selected, 
			state = this._selectionState || 0,
			selection = [
				!!(state & 4),
				!!(state & 1),
				!!(state & 2)
			];
		if (point == this._point) {
			if (selected) {
				selection[1] = selection[2] = false;
			} else {
				var previous = this.getPrevious(),
					next = this.getNext();
				selection[1] = previous && (previous._point.isSelected()
						|| previous._handleOut.isSelected());
				selection[2] = next && (next._point.isSelected()
						|| next._handleIn.isSelected());
			}
			selection[0] = selected;
		} else {
			var index = point == this._handleIn ? 1 : 2;
			if (selection[index] != selected) {
				if (selected)
					selection[0] = false;
				selection[index] = selected;
			}
		}
		this._selectionState = (selection[0] ? 4 : 0)
				| (selection[1] ? 1 : 0)
				| (selection[2] ? 2 : 0);
		if (path && state != this._selectionState) {
			path._updateSelection(this, state, this._selectionState);
			path._changed(33);
		}
	},

	isSelected: function() {
		return this._isSelected(this._point);
	},

	setSelected: function(selected) {
		this._setSelected(this._point, selected);
	},

	getIndex: function() {
		return this._index !== undefined ? this._index : null;
	},

	getPath: function() {
		return this._path || null;
	},

	getCurve: function() {
		var path = this._path,
			index = this._index;
		if (path) {
			if (!path._closed && index == path._segments.length - 1)
				index--;
			return path.getCurves()[index] || null;
		}
		return null;
	},

	getLocation: function() {
		var curve = this.getCurve();
		return curve ? new CurveLocation(curve, curve.getNext() ? 0 : 1) : null;
	},

	getNext: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index + 1]
				|| this._path._closed && segments[0]) || null;
	},

	getPrevious: function() {
		var segments = this._path && this._path._segments;
		return segments && (segments[this._index - 1]
				|| this._path._closed && segments[segments.length - 1]) || null;
	},

	reverse: function() {
		return new Segment(this._point, this._handleOut, this._handleIn);
	},

	remove: function() {
		return this._path ? !!this._path.removeSegment(this._index) : false;
	},

	clone: function() {
		return new Segment(this._point, this._handleIn, this._handleOut);
	},

	equals: function(segment) {
		return segment === this || segment
				&& this._point.equals(segment._point)
				&& this._handleIn.equals(segment._handleIn)
				&& this._handleOut.equals(segment._handleOut)
				|| false;
	},

	toString: function() {
		var parts = [ 'point: ' + this._point ];
		if (!this._handleIn.isZero())
			parts.push('handleIn: ' + this._handleIn);
		if (!this._handleOut.isZero())
			parts.push('handleOut: ' + this._handleOut);
		return '{ ' + parts.join(', ') + ' }';
	},

	_transformCoordinates: function(matrix, coords, change) {
		var point = this._point,
			handleIn =  !change || !this._handleIn.isZero()
					? this._handleIn : null,
			handleOut = !change || !this._handleOut.isZero()
					? this._handleOut : null,
			x = point._x,
			y = point._y,
			i = 2;
		coords[0] = x;
		coords[1] = y;
		if (handleIn) {
			coords[i++] = handleIn._x + x;
			coords[i++] = handleIn._y + y;
		}
		if (handleOut) {
			coords[i++] = handleOut._x + x;
			coords[i++] = handleOut._y + y;
		}
		if (matrix) {
			matrix._transformCoordinates(coords, 0, coords, 0, i / 2);
			x = coords[0];
			y = coords[1];
			if (change) {
				point._x = x;
				point._y = y;
				i  = 2;
				if (handleIn) {
					handleIn._x = coords[i++] - x;
					handleIn._y = coords[i++] - y;
				}
				if (handleOut) {
					handleOut._x = coords[i++] - x;
					handleOut._y = coords[i++] - y;
				}
			} else {
				if (!handleIn) {
					coords[i++] = x;
					coords[i++] = y;
				}
				if (!handleOut) {
					coords[i++] = x;
					coords[i++] = y;
				}
			}
		}
		return coords;
	}
});

var SegmentPoint = Point.extend({
	initialize: function SegmentPoint(point, owner) {
		var x, y, selected;
		if (!point) {
			x = y = 0;
		} else if ((x = point[0]) !== undefined) { 
			y = point[1];
		} else {
			if ((x = point.x) === undefined) {
				point = Point.read(arguments);
				x = point.x;
			}
			y = point.y;
			selected = point.selected;
		}
		this._x = x;
		this._y = y;
		this._owner = owner;
		if (selected)
			this.setSelected(true);
	},

	set: function(x, y) {
		this._x = x;
		this._y = y;
		this._owner._changed(this);
		return this;
	},

	getX: function() {
		return this._x;
	},

	setX: function(x) {
		this._x = x;
		this._owner._changed(this);
	},

	getY: function() {
		return this._y;
	},

	setY: function(y) {
		this._y = y;
		this._owner._changed(this);
	},

	isZero: function() {
		return Numerical.isZero(this._x) && Numerical.isZero(this._y);
	},

	setSelected: function(selected) {
		this._owner._setSelected(this, selected);
	},

	isSelected: function() {
		return this._owner._isSelected(this);
	}
});

var Curve = Base.extend({
	_class: 'Curve',
	initialize: function Curve(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
		var count = arguments.length;
		if (count === 3) {
			this._path = arg0;
			this._segment1 = arg1;
			this._segment2 = arg2;
		} else if (count === 0) {
			this._segment1 = new Segment();
			this._segment2 = new Segment();
		} else if (count === 1) {
			this._segment1 = new Segment(arg0.segment1);
			this._segment2 = new Segment(arg0.segment2);
		} else if (count === 2) {
			this._segment1 = new Segment(arg0);
			this._segment2 = new Segment(arg1);
		} else {
			var point1, handle1, handle2, point2;
			if (count === 4) {
				point1 = arg0;
				handle1 = arg1;
				handle2 = arg2;
				point2 = arg3;
			} else if (count === 8) {
				point1 = [arg0, arg1];
				point2 = [arg6, arg7];
				handle1 = [arg2 - arg0, arg3 - arg1];
				handle2 = [arg4 - arg6, arg5 - arg7];
			}
			this._segment1 = new Segment(point1, null, handle1);
			this._segment2 = new Segment(point2, handle2, null);
		}
	},

	_changed: function() {
		delete this._length;
		delete this._bounds;
	},

	getPoint1: function() {
		return this._segment1._point;
	},

	setPoint1: function(point) {
		point = Point.read(arguments);
		this._segment1._point.set(point.x, point.y);
	},

	getPoint2: function() {
		return this._segment2._point;
	},

	setPoint2: function(point) {
		point = Point.read(arguments);
		this._segment2._point.set(point.x, point.y);
	},

	getHandle1: function() {
		return this._segment1._handleOut;
	},

	setHandle1: function(point) {
		point = Point.read(arguments);
		this._segment1._handleOut.set(point.x, point.y);
	},

	getHandle2: function() {
		return this._segment2._handleIn;
	},

	setHandle2: function(point) {
		point = Point.read(arguments);
		this._segment2._handleIn.set(point.x, point.y);
	},

	getSegment1: function() {
		return this._segment1;
	},

	getSegment2: function() {
		return this._segment2;
	},

	getPath: function() {
		return this._path;
	},

	getIndex: function() {
		return this._segment1._index;
	},

	getNext: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index + 1]
				|| this._path._closed && curves[0]) || null;
	},

	getPrevious: function() {
		var curves = this._path && this._path._curves;
		return curves && (curves[this._segment1._index - 1]
				|| this._path._closed && curves[curves.length - 1]) || null;
	},

	isSelected: function() {
		return this.getHandle1().isSelected() && this.getHandle2().isSelected();
	},

	setSelected: function(selected) {
		this.getHandle1().setSelected(selected);
		this.getHandle2().setSelected(selected);
	},

	getValues: function() {
		return Curve.getValues(this._segment1, this._segment2);
	},

	getPoints: function() {
		var coords = this.getValues(),
			points = [];
		for (var i = 0; i < 8; i += 2)
			points.push(new Point(coords[i], coords[i + 1]));
		return points;
	},

	getLength: function() {
		var from = arguments[0],
			to = arguments[1],
			fullLength = arguments.length === 0 || from === 0 && to === 1;
		if (fullLength && this._length != null)
			return this._length;
		var length = Curve.getLength(this.getValues(), from, to);
		if (fullLength)
			this._length = length;
		return length;
	},

	getArea: function() {
		return Curve.getArea(this.getValues());
	},

	getPart: function(from, to) {
		return new Curve(Curve.getPart(this.getValues(), from, to));
	},

	isLinear: function() {
		return this._segment1._handleOut.isZero()
				&& this._segment2._handleIn.isZero();
	},

	getIntersections: function(curve) {
		return Curve.getIntersections(this.getValues(), curve.getValues(),
				this, curve, []);
	},

	reverse: function() {
		return new Curve(this._segment2.reverse(), this._segment1.reverse());
	},

	_getParameter: function(offset, isParameter) {
		return isParameter
				? offset
				: offset && offset.curve === this
					? offset.parameter
					: offset === undefined && isParameter === undefined
						? 0.5 
						: this.getParameterAt(offset, 0);
	},

	divide: function(offset, isParameter) {
		var parameter = this._getParameter(offset, isParameter),
			res = null;
		if (parameter > 0 && parameter < 1) {
			var parts = Curve.subdivide(this.getValues(), parameter),
				isLinear = this.isLinear(),
				left = parts[0],
				right = parts[1];

			if (!isLinear) {
				this._segment1._handleOut.set(left[2] - left[0],
						left[3] - left[1]);
				this._segment2._handleIn.set(right[4] - right[6],
						right[5] - right[7]);
			}

			var x = left[6], y = left[7],
				segment = new Segment(new Point(x, y),
						!isLinear && new Point(left[4] - x, left[5] - y),
						!isLinear && new Point(right[2] - x, right[3] - y));

			if (this._path) {
				if (this._segment1._index > 0 && this._segment2._index === 0) {
					this._path.add(segment);
				} else {
					this._path.insert(this._segment2._index, segment);
				}
				res = this; 
			} else {
				var end = this._segment2;
				this._segment2 = segment;
				res = new Curve(segment, end);
			}
		}
		return res;
	},

	split: function(offset, isParameter) {
		return this._path
			? this._path.split(this._segment1._index,
					this._getParameter(offset, isParameter))
			: null;
	},

	clone: function() {
		return new Curve(this._segment1, this._segment2);
	},

	toString: function() {
		var parts = [ 'point1: ' + this._segment1._point ];
		if (!this._segment1._handleOut.isZero())
			parts.push('handle1: ' + this._segment1._handleOut);
		if (!this._segment2._handleIn.isZero())
			parts.push('handle2: ' + this._segment2._handleIn);
		parts.push('point2: ' + this._segment2._point);
		return '{ ' + parts.join(', ') + ' }';
	},

statics: {
	getValues: function(segment1, segment2) {
		var p1 = segment1._point,
			h1 = segment1._handleOut,
			h2 = segment2._handleIn,
			p2 = segment2._point;
		return [
			p1._x, p1._y,
			p1._x + h1._x, p1._y + h1._y,
			p2._x + h2._x, p2._y + h2._y,
			p2._x, p2._y
		];
	},

	evaluate: function(v, t, type) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			x, y;

		if (type === 0 && (t === 0 || t === 1)) {
			x = t === 0 ? p1x : p2x;
			y = t === 0 ? p1y : p2y;
		} else {
			var cx = 3 * (c1x - p1x),
				bx = 3 * (c2x - c1x) - cx,
				ax = p2x - p1x - cx - bx,

				cy = 3 * (c1y - p1y),
				by = 3 * (c2y - c1y) - cy,
				ay = p2y - p1y - cy - by;
			if (type === 0) {
				x = ((ax * t + bx) * t + cx) * t + p1x;
				y = ((ay * t + by) * t + cy) * t + p1y;
			} else {
				var tMin = 0.00001;
				if (t < tMin && c1x == p1x && c1y == p1y
						|| t > 1 - tMin && c2x == p2x && c2y == p2y) {
					x = c2x - c1x;
					y = c2y - c1y;
				} else {
					x = (3 * ax * t + 2 * bx) * t + cx;
					y = (3 * ay * t + 2 * by) * t + cy;
				}
				if (type === 3) {
					var x2 = 6 * ax * t + 2 * bx,
						y2 = 6 * ay * t + 2 * by;
					return (x * y2 - y * x2) / Math.pow(x * x + y * y, 3 / 2);
				}
			}
		}
		return type == 2 ? new Point(y, -x) : new Point(x, y);
	},

	subdivide: function(v, t) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7];
		if (t === undefined)
			t = 0.5;
		var u = 1 - t,
			p3x = u * p1x + t * c1x, p3y = u * p1y + t * c1y,
			p4x = u * c1x + t * c2x, p4y = u * c1y + t * c2y,
			p5x = u * c2x + t * p2x, p5y = u * c2y + t * p2y,
			p6x = u * p3x + t * p4x, p6y = u * p3y + t * p4y,
			p7x = u * p4x + t * p5x, p7y = u * p4y + t * p5y,
			p8x = u * p6x + t * p7x, p8y = u * p6y + t * p7y;
		return [
			[p1x, p1y, p3x, p3y, p6x, p6y, p8x, p8y], 
			[p8x, p8y, p7x, p7y, p5x, p5y, p2x, p2y] 
		];
	},

	solveCubic: function (v, coord, val, roots) {
		var p1 = v[coord],
			c1 = v[coord + 2],
			c2 = v[coord + 4],
			p2 = v[coord + 6],
			c = 3 * (c1 - p1),
			b = 3 * (c2 - c1) - c,
			a = p2 - p1 - c - b;
		return Numerical.solveCubic(a, b, c, p1 - val, roots);
	},

	getParameterOf: function(v, x, y) {
		if (Math.abs(v[0] - x) < 0.00001
				&& Math.abs(v[1] - y) < 0.00001)
			return 0;
		if (Math.abs(v[6] - x) < 0.00001
				&& Math.abs(v[7] - y) < 0.00001)
			return 1;
		var txs = [],
			tys = [],
			sx = Curve.solveCubic(v, 0, x, txs),
			sy = Curve.solveCubic(v, 1, y, tys),
			tx, ty;
		for (var cx = 0;  sx == -1 || cx < sx;) {
			if (sx == -1 || (tx = txs[cx++]) >= 0 && tx <= 1) {
				for (var cy = 0; sy == -1 || cy < sy;) {
					if (sy == -1 || (ty = tys[cy++]) >= 0 && ty <= 1) {
						if (sx == -1) tx = ty;
						else if (sy == -1) ty = tx;
						if (Math.abs(tx - ty) < 0.00001)
							return (tx + ty) * 0.5;
					}
				}
				if (sx == -1)
					break;
			}
		}
		return null;
	},

	getPart: function(v, from, to) {
		if (from > 0)
			v = Curve.subdivide(v, from)[1]; 
		if (to < 1)
			v = Curve.subdivide(v, (to - from) / (1 - from))[0]; 
		return v;
	},

	isLinear: function(v) {
		return v[0] === v[2] && v[1] === v[3] && v[4] === v[6] && v[5] === v[7];
	},

	isFlatEnough: function(v, tolerance) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],
			ux = 3 * c1x - 2 * p1x - p2x,
			uy = 3 * c1y - 2 * p1y - p2y,
			vx = 3 * c2x - 2 * p2x - p1x,
			vy = 3 * c2y - 2 * p2y - p1y;
		return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy)
				< 10 * tolerance * tolerance;
	},

	getArea: function(v) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7];
		return (  3.0 * c1y * p1x - 1.5 * c1y * c2x
				- 1.5 * c1y * p2x - 3.0 * p1y * c1x
				- 1.5 * p1y * c2x - 0.5 * p1y * p2x
				+ 1.5 * c2y * p1x + 1.5 * c2y * c1x
				- 3.0 * c2y * p2x + 0.5 * p2y * p1x
				+ 1.5 * p2y * c1x + 3.0 * p2y * c2x) / 10;
	},

	getBounds: function(v) {
		var min = v.slice(0, 2), 
			max = min.slice(), 
			roots = [0, 0];
		for (var i = 0; i < 2; i++)
			Curve._addBounds(v[i], v[i + 2], v[i + 4], v[i + 6],
					i, 0, min, max, roots);
		return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	_getCrossings: function(v, prev, x, y, roots) {
		var count = Curve.solveCubic(v, 1, y, roots),
			crossings = 0,
			tolerance = 0.00001,
			abs = Math.abs;

		function changesOrientation(tangent) {
			return Curve.evaluate(prev, 1, 1).y
					* tangent.y > 0;
		}

		if (count === -1) {
			roots[0] = Curve.getParameterOf(v, x, y);
			count = roots[0] !== null ? 1 : 0;
		}
		for (var i = 0; i < count; i++) {
			var t = roots[i];
			if (t > -tolerance && t < 1 - tolerance) {
				var pt = Curve.evaluate(v, t, 0);
				if (x < pt.x + tolerance) {
					var tan = Curve.evaluate(v, t, 1);
					if (abs(pt.x - x) < tolerance) {
						var angle = tan.getAngle();
						if (angle > -180 && angle < 0
							&& (t > tolerance || changesOrientation(tan)))
								continue;
					} else  {
						if (abs(tan.y) < tolerance
							|| t < tolerance && !changesOrientation(tan))
								continue;
					}
					crossings++;
				}
			}
		}
		return crossings;
	},

	_addBounds: function(v0, v1, v2, v3, coord, padding, min, max, roots) {
		function add(value, padding) {
			var left = value - padding,
				right = value + padding;
			if (left < min[coord])
				min[coord] = left;
			if (right > max[coord])
				max[coord] = right;
		}
		var a = 3 * (v1 - v2) - v0 + v3,
			b = 2 * (v0 + v2) - 4 * v1,
			c = v1 - v0,
			count = Numerical.solveQuadratic(a, b, c, roots),
			tMin = 0.00001,
			tMax = 1 - tMin;
		add(v3, 0);
		for (var i = 0; i < count; i++) {
			var t = roots[i],
				u = 1 - t;
			if (tMin < t && t < tMax)
				add(u * u * u * v0
					+ 3 * u * u * t * v1
					+ 3 * u * t * t * v2
					+ t * t * t * v3,
					padding);
		}
	}
}}, Base.each(['getBounds', 'getStrokeBounds', 'getHandleBounds', 'getRoughBounds'],
	function(name) {
		this[name] = function() {
			if (!this._bounds)
				this._bounds = {};
			var bounds = this._bounds[name];
			if (!bounds) {
				bounds = this._bounds[name] = Path[name]([this._segment1,
						this._segment2], false, this._path.getStyle());
			}
			return bounds.clone();
		};
	},
{

}), Base.each(['getPoint', 'getTangent', 'getNormal', 'getCurvature'],
	function(name, index) {
		this[name + 'At'] = function(offset, isParameter) {
			var values = this.getValues();
			return Curve.evaluate(values, isParameter
					? offset : Curve.getParameterAt(values, offset, 0), index);
		};
		this[name] = function(parameter) {
			return Curve.evaluate(this.getValues(), parameter, index);
		};
	},
{
	getParameterAt: function(offset, start) {
		return Curve.getParameterAt(this.getValues(), offset,
				start !== undefined ? start : offset < 0 ? 1 : 0);
	},

	getParameterOf: function(point) {
		point = Point.read(arguments);
		return Curve.getParameterOf(this.getValues(), point.x, point.y);
	},

	getLocationAt: function(offset, isParameter) {
		if (!isParameter)
			offset = this.getParameterAt(offset);
		return new CurveLocation(this, offset);
	},

	getLocationOf: function(point) {
		point = Point.read(arguments);
		var t = this.getParameterOf(point);
		return t != null ? new CurveLocation(this, t) : null;
	},

	getNearestLocation: function(point) {
		point = Point.read(arguments);
		var values = this.getValues(),
			count = 100,
			tolerance = Numerical.TOLERANCE,
			minDist = Infinity,
			minT = 0;

		function refine(t) {
			if (t >= 0 && t <= 1) {
				var dist = point.getDistance(
						Curve.evaluate(values, t, 0), true);
				if (dist < minDist) {
					minDist = dist;
					minT = t;
					return true;
				}
			}
		}

		for (var i = 0; i <= count; i++)
			refine(i / count);

		var step = 1 / (count * 2);
		while (step > tolerance) {
			if (!refine(minT - step) && !refine(minT + step))
				step /= 2;
		}
		var pt = Curve.evaluate(values, minT, 0);
		return new CurveLocation(this, minT, pt, null, null, null,
				point.getDistance(pt));
	},

	getNearestPoint: function(point) {
		point = Point.read(arguments);
		return this.getNearestLocation(point).getPoint();
	}

}),
new function() { 

	function getLengthIntegrand(v) {
		var p1x = v[0], p1y = v[1],
			c1x = v[2], c1y = v[3],
			c2x = v[4], c2y = v[5],
			p2x = v[6], p2y = v[7],

			ax = 9 * (c1x - c2x) + 3 * (p2x - p1x),
			bx = 6 * (p1x + c2x) - 12 * c1x,
			cx = 3 * (c1x - p1x),

			ay = 9 * (c1y - c2y) + 3 * (p2y - p1y),
			by = 6 * (p1y + c2y) - 12 * c1y,
			cy = 3 * (c1y - p1y);

		return function(t) {
			var dx = (ax * t + bx) * t + cx,
				dy = (ay * t + by) * t + cy;
			return Math.sqrt(dx * dx + dy * dy);
		};
	}

	function getIterations(a, b) {
		return Math.max(2, Math.min(16, Math.ceil(Math.abs(b - a) * 32)));
	}

	return {
		statics: true,

		getLength: function(v, a, b) {
			if (a === undefined)
				a = 0;
			if (b === undefined)
				b = 1;
			if (v[0] == v[2] && v[1] == v[3] && v[6] == v[4] && v[7] == v[5]) {
				var dx = v[6] - v[0], 
					dy = v[7] - v[1]; 
				return (b - a) * Math.sqrt(dx * dx + dy * dy);
			}
			var ds = getLengthIntegrand(v);
			return Numerical.integrate(ds, a, b, getIterations(a, b));
		},

		getParameterAt: function(v, offset, start) {
			if (offset === 0)
				return start;
			var forward = offset > 0,
				a = forward ? start : 0,
				b = forward ? 1 : start,
				offset = Math.abs(offset),
				ds = getLengthIntegrand(v),
				rangeLength = Numerical.integrate(ds, a, b,
						getIterations(a, b));
			if (offset >= rangeLength)
				return forward ? b : a;
			var guess = offset / rangeLength,
				length = 0;
			function f(t) {
				var count = getIterations(start, t);
				length += start < t
						? Numerical.integrate(ds, start, t, count)
						: -Numerical.integrate(ds, t, start, count);
				start = t;
				return length - offset;
			}
			return Numerical.findRoot(f, ds,
					forward ? a + guess : b - guess, 
					a, b, 16, 0.00001);
		}
	};
}, new function() { 
	function addLocation(locations, curve1, t1, point1, curve2, t2, point2) {
		var first = locations[0],
			last = locations[locations.length - 1];
		if ((!first || !point1.equals(first._point))
				&& (!last || !point1.equals(last._point)))
			locations.push(
					new CurveLocation(curve1, t1, point1, curve2, t2, point2));
	}

	function addCurveIntersections(v1, v2, curve1, curve2, locations,
			range1, range2, recursion) {
		recursion = (recursion || 0) + 1;
		if (recursion > 20)
			return;
		range1 = range1 || [ 0, 1 ];
		range2 = range2 || [ 0, 1 ];
		var part1 = Curve.getPart(v1, range1[0], range1[1]),
			part2 = Curve.getPart(v2, range2[0], range2[1]),
			iteration = 0;
		while (iteration++ < 20) {
			var range,
				intersects1 = clipFatLine(part1, part2, range = range2.slice()),
				intersects2 = 0;
			if (intersects1 === 0)
				break;
			if (intersects1 > 0) {
				range2 = range;
				part2 = Curve.getPart(v2, range2[0], range2[1]);
				intersects2 = clipFatLine(part2, part1, range = range1.slice());
				if (intersects2 === 0)
					break;
				if (intersects1 > 0) {
					range1 = range;
					part1 = Curve.getPart(v1, range1[0], range1[1]);
				}
			}
			if (intersects1 < 0 || intersects2 < 0) {
				if (range1[1] - range1[0] > range2[1] - range2[0]) {
					var t = (range1[0] + range1[1]) / 2;
					addCurveIntersections(v1, v2, curve1, curve2, locations,
							[ range1[0], t ], range2, recursion);
					addCurveIntersections(v1, v2, curve1, curve2, locations,
							[ t, range1[1] ], range2, recursion);
					break;
				} else {
					var t = (range2[0] + range2[1]) / 2;
					addCurveIntersections(v1, v2, curve1, curve2, locations,
							range1, [ range2[0], t ], recursion);
					addCurveIntersections(v1, v2, curve1, curve2, locations,
							range1, [ t, range2[1] ], recursion);
					break;
				}
			}
			if (Math.abs(range1[1] - range1[0]) <= 0.00001 &&
				Math.abs(range2[1] - range2[0]) <= 0.00001) {
				var t1 = (range1[0] + range1[1]) / 2,
					t2 = (range2[0] + range2[1]) / 2;
				addLocation(locations,
						curve1, t1, Curve.evaluate(v1, t1, 0),
						curve2, t2, Curve.evaluate(v2, t2, 0));
				break;
			}
		}
	}

	function clipFatLine(v1, v2, range2) {
		var p0x = v1[0], p0y = v1[1], p1x = v1[2], p1y = v1[3],
			p2x = v1[4], p2y = v1[5], p3x = v1[6], p3y = v1[7],
			q0x = v2[0], q0y = v2[1], q1x = v2[2], q1y = v2[3],
			q2x = v2[4], q2y = v2[5], q3x = v2[6], q3y = v2[7],
			getSignedDistance = Line.getSignedDistance,
			d1 = getSignedDistance(p0x, p0y, p3x, p3y, p1x, p1y) || 0,
			d2 = getSignedDistance(p0x, p0y, p3x, p3y, p2x, p2y) || 0,
			factor = d1 * d2 > 0 ? 3 / 4 : 4 / 9,
			dmin = factor * Math.min(0, d1, d2),
			dmax = factor * Math.max(0, d1, d2),
			dq0 = getSignedDistance(p0x, p0y, p3x, p3y, q0x, q0y),
			dq1 = getSignedDistance(p0x, p0y, p3x, p3y, q1x, q1y),
			dq2 = getSignedDistance(p0x, p0y, p3x, p3y, q2x, q2y),
			dq3 = getSignedDistance(p0x, p0y, p3x, p3y, q3x, q3y);
		if (dmin > Math.max(dq0, dq1, dq2, dq3)
				|| dmax < Math.min(dq0, dq1, dq2, dq3))
			return 0;
		var hull = getConvexHull(dq0, dq1, dq2, dq3),
			swap;
		if (dq3 < dq0) {
			swap = dmin;
			dmin = dmax;
			dmax = swap;
		}
		var tmaxdmin = -Infinity,
			tmin = Infinity,
			tmax = -Infinity;
		for (var i = 0, l = hull.length; i < l; i++) {
			var p1 = hull[i],
				p2 = hull[(i + 1) % l];
			if (p2[1] < p1[1]) {
				swap = p2;
				p2 = p1;
				p1 = swap;
			}
			var	x1 = p1[0],
				y1 = p1[1],
				x2 = p2[0],
				y2 = p2[1];
			var inv = (y2 - y1) / (x2 - x1);
			if (dmin >= y1 && dmin <= y2) {
				var ixdx = x1 + (dmin - y1) / inv;
				if (ixdx < tmin)
					tmin = ixdx;
				if (ixdx > tmaxdmin)
					tmaxdmin = ixdx;
			}
			if (dmax >= y1 && dmax <= y2) {
				var ixdx = x1 + (dmax - y1) / inv;
				if (ixdx > tmax)
					tmax = ixdx;
				if (ixdx < tmin)
					tmin = 0;
			}
		}
		if (tmin !== Infinity && tmax !== -Infinity) {
			var min = Math.min(dmin, dmax),
				max = Math.max(dmin, dmax);
			if (dq3 > min && dq3 < max)
				tmax = 1;
			if (dq0 > min && dq0 < max)
				tmin = 0;
			if (tmaxdmin > tmax)
				tmax = 1;
			var v2tmin = range2[0],
				tdiff = range2[1] - v2tmin;
			range2[0] = v2tmin + tmin * tdiff;
			range2[1] = v2tmin + tmax * tdiff;
			if ((tdiff - (range2[1] - range2[0])) / tdiff >= 0.2)
				return 1;
		}
		if (Curve.getBounds(v1).touches(Curve.getBounds(v2)))
			return -1;
		return 0;
	}

	function getConvexHull(dq0, dq1, dq2, dq3) {
		var p0 = [ 0, dq0 ],
			p1 = [ 1 / 3, dq1 ],
			p2 = [ 2 / 3, dq2 ],
			p3 = [ 1, dq3 ],
			getSignedDistance = Line.getSignedDistance,
			dist1 = getSignedDistance(0, dq0, 1, dq3, 1 / 3, dq1),
			dist2 = getSignedDistance(0, dq0, 1, dq3, 2 / 3, dq2);
		if (dist1 * dist2 < 0) {
			return [ p0, p1, p3, p2 ];
		}
		var pmax, cross;
		if (Math.abs(dist1) > Math.abs(dist2)) {
			pmax = p1;
			cross = (dq3 - dq2 - (dq3 - dq0) / 3)
					* (2 * (dq3 - dq2) - dq3 + dq1) / 3;
		} else {
			pmax = p2;
			cross = (dq1 - dq0 + (dq0 - dq3) / 3)
					* (-2 * (dq0 - dq1) + dq0 - dq2) / 3;
		}
		return cross < 0
				? [ p0, pmax, p3 ]
				: [ p0, p1, p2, p3 ];
	}

	function addCurveLineIntersections(v1, v2, curve1, curve2, locations) {
		var flip = Curve.isLinear(v1),
			vc = flip ? v2 : v1,
			vl = flip ? v1 : v2,
			l1x = vl[0], l1y = vl[1],
			l2x = vl[6], l2y = vl[7],
			lvx = l2x - l1x,
			lvy = l2y - l1y,
			angle = Math.atan2(-lvy, lvx),
			sin = Math.sin(angle),
			cos = Math.cos(angle),
			rl2x = lvx * cos - lvy * sin,
			vcr = [];

		for(var i = 0; i < 8; i += 2) {
			var x = vc[i] - l1x,
				y = vc[i + 1] - l1y;
			vcr.push(
				x * cos - y * sin,
				y * cos + x * sin);
		}
		var roots = [],
			count = Curve.solveCubic(vcr, 1, 0, roots);
		for (var i = 0; i < count; i++) {
			var t = roots[i];
			if (t >= 0 && t <= 1) {
				var point = Curve.evaluate(vcr, t, 0);
				if (point.x  >= 0 && point.x <= rl2x)
					addLocation(locations,
							flip ? curve2 : curve1,
							t, Curve.evaluate(vc, t, 0),
							flip ? curve1 : curve2);
			}
		}
	}

	function addLineIntersection(v1, v2, curve1, curve2, locations) {
		var point = Line.intersect(
				v1[0], v1[1], v1[6], v1[7],
				v2[0], v2[1], v2[6], v2[7]);
		if (point)
			addLocation(locations, curve1, null, point, curve2);
	}

	return { statics: {
		getIntersections: function(v1, v2, curve1, curve2, locations) {
			var linear1 = Curve.isLinear(v1),
				linear2 = Curve.isLinear(v2);
			(linear1 && linear2
				? addLineIntersection
				: linear1 || linear2
					? addCurveLineIntersections
					: addCurveIntersections)(v1, v2, curve1, curve2, locations);
			return locations;
		}
	}};
});

var CurveLocation = Base.extend({
	_class: 'CurveLocation',
	initialize: function CurveLocation(curve, parameter, point, _curve2,
			_parameter2, _point2, _distance) {
		this._id = CurveLocation._id = (CurveLocation._id || 0) + 1;
		this._curve = curve;
		this._segment1 = curve._segment1;
		this._segment2 = curve._segment2;
		this._parameter = parameter;
		this._point = point;
		this._curve2 = _curve2;
		this._parameter2 = _parameter2;
		this._point2 = _point2;
		this._distance = _distance;
	},

	getSegment: function() {
		if (!this._segment) {
			var curve = this.getCurve(),
				parameter = this.getParameter();
			if (parameter === 1) {
				this._segment = curve._segment2;
			} else if (parameter === 0 || arguments[0]) {
				this._segment = curve._segment1;
			} else if (parameter == null) {
				return null;
			} else {
				this._segment = curve.getLength(0, parameter)
					< curve.getLength(parameter, 1)
						? curve._segment1
						: curve._segment2;
			}
		}
		return this._segment;
	},

	getCurve: function() {
		if (!this._curve || arguments[0]) {
			this._curve = this._segment1.getCurve();
			if (this._curve.getParameterOf(this._point) == null)
				this._curve = this._segment2.getPrevious().getCurve();
		}
		return this._curve;
	},

	getIntersection: function() {
		var intersection = this._intersection;
		if (!intersection && this._curve2) {
			var param = this._parameter2;
			this._intersection = intersection = new CurveLocation(
					this._curve2, param, this._point2 || this._point, this);
			intersection._intersection = this;
		}
		return intersection;
	},

	getPath: function() {
		var curve = this.getCurve();
		return curve && curve._path;
	},

	getIndex: function() {
		var curve = this.getCurve();
		return curve && curve.getIndex();
	},

	getOffset: function() {
		var path = this.getPath();
		return path && path._getOffset(this);
	},

	getCurveOffset: function() {
		var curve = this.getCurve(),
			parameter = this.getParameter();
		return parameter != null && curve && curve.getLength(0, parameter);
	},

	getParameter: function() {
		if ((this._parameter == null || arguments[0]) && this._point) {
			var curve = this.getCurve(arguments[0] && this._point);
			this._parameter = curve && curve.getParameterOf(this._point);
		}
		return this._parameter;
	},

	getPoint: function() {
		if ((!this._point || arguments[0]) && this._parameter != null) {
			var curve = this.getCurve();
			this._point = curve && curve.getPointAt(this._parameter, true);
		}
		return this._point;
	},

	getTangent: function() {
		var parameter = this.getParameter(),
			curve = this.getCurve();
		return parameter != null && curve && curve.getTangentAt(parameter, true);
	},

	getNormal: function() {
		var parameter = this.getParameter(),
			curve = this.getCurve();
		return parameter != null && curve && curve.getNormalAt(parameter, true);
	},

	getDistance: function() {
		return this._distance;
	},

	divide: function() {
		var curve = this.getCurve(true);
		return curve && curve.divide(this.getParameter(true), true);
	},

	split: function() {
		var curve = this.getCurve(true);
		return curve && curve.split(this.getParameter(true), true);
	},

	toString: function() {
		var parts = [],
			point = this.getPoint(),
			f = Formatter.instance;
		if (point)
			parts.push('point: ' + point);
		var index = this.getIndex();
		if (index != null)
			parts.push('index: ' + index);
		var parameter = this.getParameter();
		if (parameter != null)
			parts.push('parameter: ' + f.number(parameter));
		if (this._distance != null)
			parts.push('distance: ' + f.number(this._distance));
		return '{ ' + parts.join(', ') + ' }';
	}
});

var PathItem = Item.extend({
	_class: 'PathItem',

	initialize: function PathItem() {
	},

	getIntersections: function(path) {
		if (!this.getBounds().touches(path.getBounds()))
			return [];
		var locations = [],
			curves1 = this.getCurves(),
			curves2 = path.getCurves(),
			length2 = curves2.length,
			values2 = [];
		for (var i = 0; i < length2; i++)
			values2[i] = curves2[i].getValues();
		for (var i = 0, l = curves1.length; i < l; i++) {
			var curve1 = curves1[i],
				values1 = curve1.getValues();
			for (var j = 0; j < length2; j++)
				Curve.getIntersections(values1, values2[j], curve1, curves2[j],
						locations);
		}
		return locations;
	},

	setPathData: function(data) {

		var parts = data.match(/[a-z][^a-z]*/ig),
			coords,
			relative = false,
			control,
			current = new Point(); 

		function getCoord(index, coord, update) {
			var val = parseFloat(coords[index]);
			if (relative)
				val += current[coord];
			if (update)
				current[coord] = val;
			return val;
		}

		function getPoint(index, update) {
			return new Point(
				getCoord(index, 'x', update),
				getCoord(index + 1, 'y', update)
			);
		}

		if (this._type === 'path')
			this.removeSegments();
		else
			this.removeChildren();

		for (var i = 0, l = parts.length; i < l; i++) {
			var part = parts[i],
				cmd = part[0],
				lower = cmd.toLowerCase();
			coords = part.slice(1).trim().split(/[\s,]+|(?=[+-])/);
			relative = cmd === lower;
			var length = coords.length;
			switch (lower) {
			case 'm':
			case 'l':
				for (var j = 0; j < length; j += 2)
					this[j === 0 && lower === 'm' ? 'moveTo' : 'lineTo'](
							getPoint(j, true));
				break;
			case 'h':
			case 'v':
				var coord = lower == 'h' ? 'x' : 'y';
				for (var j = 0; j < length; j++) {
					getCoord(j, coord, true);
					this.lineTo(current);
				}
				break;
			case 'c':
				for (var j = 0; j < length; j += 6) {
					this.cubicCurveTo(
							getPoint(j),
							control = getPoint(j + 2),
							getPoint(j + 4, true));
				}
				break;
			case 's':
				for (var j = 0; j < length; j += 4) {
					this.cubicCurveTo(
							current.multiply(2).subtract(control),
							control = getPoint(j),
							getPoint(j + 2, true));
				}
				break;
			case 'q':
				for (var j = 0; j < length; j += 4) {
					this.quadraticCurveTo(
							control = getPoint(j),
							getPoint(j + 2, true));
				}
				break;
			case 't':
				for (var j = 0; j < length; j += 2) {
					this.quadraticCurveTo(
							control = current.multiply(2).subtract(control),
							getPoint(j, true));
				}
				break;
			case 'a':
				break;
			case 'z':
				this.closePath();
				break;
			}
		}
	},

	_canComposite: function() {
		return !(this.hasFill() && this.hasStroke());
	}

});

var Path = PathItem.extend({
	_class: 'Path',
	_serializeFields: {
		segments: [],
		closed: false
	},

	initialize: function Path(arg) {
		this._closed = false;
		this._segments = [];
		var segments = Array.isArray(arg)
			? typeof arg[0] === 'object'
				? arg
				: arguments
			: arg && (arg.point !== undefined && arg.size === undefined
					|| arg.x !== undefined)
				? arguments
				: null;
		this.setSegments(segments || []);
		this._initialize(!segments && arg);
	},

	clone: function(insert) {
		var copy = this._clone(new Path({
			segments: this._segments,
			insert: false
		}), insert);
		copy._closed = this._closed;
		if (this._clockwise !== undefined)
			copy._clockwise = this._clockwise;
		return copy;
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		if (flags & 4) {
			delete this._length;
			delete this._clockwise;
			if (this._curves) {
				for (var i = 0, l = this._curves.length; i < l; i++) {
					this._curves[i]._changed(5);
				}
			}
		} else if (flags & 8) {
			delete this._bounds;
		}
	},

	getSegments: function() {
		return this._segments;
	},

	setSegments: function(segments) {
		this._selectedSegmentState = 0;
		this._segments.length = 0;
		delete this._curves;
		this._add(Segment.readAll(segments));
	},

	getFirstSegment: function() {
		return this._segments[0];
	},

	getLastSegment: function() {
		return this._segments[this._segments.length - 1];
	},

	getCurves: function() {
		var curves = this._curves,
			segments = this._segments;
		if (!curves) {
			var length = this._countCurves();
			curves = this._curves = new Array(length);
			for (var i = 0; i < length; i++)
				curves[i] = new Curve(this, segments[i],
					segments[i + 1] || segments[0]);
		}
		return curves;
	},

	getFirstCurve: function() {
		return this.getCurves()[0];
	},

	getLastCurve: function() {
		var curves = this.getCurves();
		return curves[curves.length - 1];
	},

	getPathData: function() {
		var segments = this._segments,
			precision = arguments[0],
			f = Formatter.instance,
			parts = [];

		function addCurve(seg1, seg2, skipLine) {
			var point1 = seg1._point,
				point2 = seg2._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn;
			if (handle1.isZero() && handle2.isZero()) {
				if (!skipLine) {
					parts.push('L' + f.point(point2, precision));
				}
			} else {
				var end = point2.subtract(point1);
				parts.push('c' + f.point(handle1, precision)
						+ ' ' + f.point(end.add(handle2), precision)
						+ ' ' + f.point(end, precision));
			}
		}

		if (segments.length === 0)
			return '';
		parts.push('M' + f.point(segments[0]._point));
		for (var i = 0, l = segments.length  - 1; i < l; i++)
			addCurve(segments[i], segments[i + 1], false);
		if (this._closed) {
			addCurve(segments[segments.length - 1], segments[0], true);
			parts.push('z');
		}
		return parts.join('');
	},

	isClosed: function() {
		return this._closed;
	},

	setClosed: function(closed) {
		if (this._closed != (closed = !!closed)) {
			this._closed = closed;
			if (this._curves) {
				var length = this._curves.length = this._countCurves();
				if (closed)
					this._curves[length - 1] = new Curve(this,
						this._segments[length - 1], this._segments[0]);
			}
			this._changed(5);
		}
	},

	isEmpty: function() {
		return this._segments.length === 0;
	},

	isPolygon: function() {
		for (var i = 0, l = this._segments.length; i < l; i++) {
			if (!this._segments[i].isLinear())
				return false;
		}
		return true;
	},

	_applyMatrix: function(matrix) {
		var coords = new Array(6);
		for (var i = 0, l = this._segments.length; i < l; i++)
			this._segments[i]._transformCoordinates(matrix, coords, true);
		return true;
	},

	_add: function(segs, index) {
		var segments = this._segments,
			curves = this._curves,
			amount = segs.length,
			append = index == null,
			index = append ? segments.length : index,
			fullySelected = this.isFullySelected();
		for (var i = 0; i < amount; i++) {
			var segment = segs[i];
			if (segment._path)
				segment = segs[i] = segment.clone();
			segment._path = this;
			segment._index = index + i;
			if (fullySelected)
				segment._selectionState = 4;
			if (segment._selectionState)
				this._updateSelection(segment, 0, segment._selectionState);
		}
		if (append) {
			segments.push.apply(segments, segs);
		} else {
			segments.splice.apply(segments, [index, 0].concat(segs));
			for (var i = index + amount, l = segments.length; i < l; i++)
				segments[i]._index = i;
		}
		if (curves || segs._curves) {
			if (!curves)
				curves = this._curves = [];
			var from = index > 0 ? index - 1 : index,
				start = from,
				to = Math.min(from + amount, this._countCurves());
			if (segs._curves) {
				curves.splice.apply(curves, [from, 0].concat(segs._curves));
				start += segs._curves.length;
			}
			for (var i = start; i < to; i++)
				curves.splice(i, 0, new Curve(this, null, null));
			this._adjustCurves(from, to);
		}
		this._changed(5);
		return segs;
	},

	_adjustCurves: function(from, to) {
		var segments = this._segments,
			curves = this._curves,
			curve;
		for (var i = from; i < to; i++) {
			curve = curves[i];
			curve._path = this;
			curve._segment1 = segments[i];
			curve._segment2 = segments[i + 1] || segments[0];
		}
		if (curve = curves[this._closed && from === 0 ? segments.length - 1
				: from - 1])
			curve._segment2 = segments[from] || segments[0];
		if (curve = curves[to])
			curve._segment1 = segments[to];
	},

	_countCurves: function() {
		var length = this._segments.length;
		return !this._closed && length > 0 ? length - 1 : length;
	},

	add: function(segment1 ) {
		return arguments.length > 1 && typeof segment1 !== 'number'
			? this._add(Segment.readAll(arguments))
			: this._add([ Segment.read(arguments) ])[0];
	},

	insert: function(index, segment1 ) {
		return arguments.length > 2 && typeof segment1 !== 'number'
			? this._add(Segment.readAll(arguments, 1), index)
			: this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	addSegment: function() {
		return this._add([ Segment.read(arguments) ])[0];
	},

	insertSegment: function(index ) {
		return this._add([ Segment.read(arguments, 1) ], index)[0];
	},

	addSegments: function(segments) {
		return this._add(Segment.readAll(segments));
	},

	insertSegments: function(index, segments) {
		return this._add(Segment.readAll(segments), index);
	},

	removeSegment: function(index) {
		return this.removeSegments(index, index + 1)[0] || null;
	},

	removeSegments: function(from, to) {
		from = from || 0;
		to = Base.pick(to, this._segments.length);
		var segments = this._segments,
			curves = this._curves,
			count = segments.length, 
			removed = segments.splice(from, to - from),
			amount = removed.length;
		if (!amount)
			return removed;
		for (var i = 0; i < amount; i++) {
			var segment = removed[i];
			if (segment._selectionState)
				this._updateSelection(segment, segment._selectionState, 0);
			delete segment._index;
			delete segment._path;
		}
		for (var i = from, l = segments.length; i < l; i++)
			segments[i]._index = i;
		if (curves) {
			var index = from > 0 && to === count + (this._closed ? 1 : 0)
					? from - 1
					: from,
				curves = curves.splice(index, amount);
			if (arguments[2])
				removed._curves = curves.slice(1);
			this._adjustCurves(index, index);
		}
		this._changed(5);
		return removed;
	},

	isFullySelected: function() {
		return this._selected && this._selectedSegmentState
				== this._segments.length * 4;
	},

	setFullySelected: function(selected) {
		if (selected)
			this._selectSegments(true);
		this.setSelected(selected);
	},

	setSelected: function setSelected(selected) {
		if (!selected)
			this._selectSegments(false);
		setSelected.base.call(this, selected);
	},

	_selectSegments: function(selected) {
		var length = this._segments.length;
		this._selectedSegmentState = selected
				? length * 4 : 0;
		for (var i = 0; i < length; i++)
			this._segments[i]._selectionState = selected
					? 4 : 0;
	},

	_updateSelection: function(segment, oldState, newState) {
		segment._selectionState = newState;
		var total = this._selectedSegmentState += newState - oldState;
		if (total > 0)
			this.setSelected(true);
	},

	flatten: function(maxDistance) {
		var flattener = new PathFlattener(this),
			pos = 0,
			step = flattener.length / Math.ceil(flattener.length / maxDistance),
			end = flattener.length + (this._closed ? -step : step) / 2;
		var segments = [];
		while (pos <= end) {
			segments.push(new Segment(flattener.evaluate(pos, 0)));
			pos += step;
		}
		this.setSegments(segments);
	},

	simplify: function(tolerance) {
		if (this._segments.length > 2) {
			var fitter = new PathFitter(this, tolerance || 2.5);
			this.setSegments(fitter.fit());
		}
	},

	split: function(index, parameter) {
		if (parameter === null)
			return;
		if (arguments.length === 1) {
			var arg = index;
			if (typeof arg === 'number')
				arg = this.getLocationAt(arg);
			index = arg.index;
			parameter = arg.parameter;
		}
		if (parameter >= 1) {
			index++;
			parameter--;
		}
		var curves = this.getCurves();
		if (index >= 0 && index < curves.length) {
			if (parameter > 0) {
				curves[index++].divide(parameter, true);
			}
			var segs = this.removeSegments(index, this._segments.length, true),
				path;
			if (this._closed) {
				this.setClosed(false);
				path = this;
			} else if (index > 0) {
				path = this._clone(new Path().insertAbove(this, true));
			}
			path._add(segs, 0);
			this.addSegment(segs[0]);
			return path;
		}
		return null;
	},

	isClockwise: function() {
		if (this._clockwise !== undefined)
			return this._clockwise;
		return Path.isClockwise(this._segments);
	},

	setClockwise: function(clockwise) {
		if (this.isClockwise() != (clockwise = !!clockwise))
			this.reverse();
		this._clockwise = clockwise;
	},

	reverse: function() {
		this._segments.reverse();
		for (var i = 0, l = this._segments.length; i < l; i++) {
			var segment = this._segments[i];
			var handleIn = segment._handleIn;
			segment._handleIn = segment._handleOut;
			segment._handleOut = handleIn;
			segment._index = i;
		}
		delete this._curves;
		if (this._clockwise !== undefined)
			this._clockwise = !this._clockwise;
	},

	join: function(path) {
		if (path) {
			var segments = path._segments,
				last1 = this.getLastSegment(),
				last2 = path.getLastSegment();
			if (last1._point.equals(last2._point))
				path.reverse();
			var first1,
				first2 = path.getFirstSegment();
			if (last1._point.equals(first2._point)) {
				last1.setHandleOut(first2._handleOut);
				this._add(segments.slice(1));
			} else {
				first1 = this.getFirstSegment();
				if (first1._point.equals(first2._point))
					path.reverse();
				last2 = path.getLastSegment();
				if (first1._point.equals(last2._point)) {
					first1.setHandleIn(last2._handleIn);
					this._add(segments.slice(0, segments.length - 1), 0);
				} else {
					this._add(segments.slice());
				}
			}
			if (path.closed)
				this._add([segments[0]]);
			path.remove();
			first1 = this.getFirstSegment();
			last1 = this.getLastSegment();
			if (last1._point.equals(first1._point)) {
				first1.setHandleIn(last1._handleIn);
				last1.remove();
				this.setClosed(true);
			}
			this._changed(5);
			return true;
		}
		return false;
	},

	reduce: function() {
		return this;
	},

	getLength: function() {
		if (this._length == null) {
			var curves = this.getCurves();
			this._length = 0;
			for (var i = 0, l = curves.length; i < l; i++)
				this._length += curves[i].getLength();
		}
		return this._length;
	},

	getArea: function() {
		var curves = this.getCurves();
		var area = 0;
		for (var i = 0, l = curves.length; i < l; i++)
			area += curves[i].getArea();
		return area;
	},

	_getOffset: function(location) {
		var index = location && location.getIndex();
		if (index != null) {
			var curves = this.getCurves(),
				offset = 0;
			for (var i = 0; i < index; i++)
				offset += curves[i].getLength();
			var curve = curves[index];
			return offset + curve.getLength(0, location.getParameter());
		}
		return null;
	},

	getLocationOf: function(point) {
		point = Point.read(arguments);
		var curves = this.getCurves();
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getLocationOf(point);
			if (loc)
				return loc;
		}
		return null;
	},

	getLocationAt: function(offset, isParameter) {
		var curves = this.getCurves(),
			length = 0;
		if (isParameter) {
			var index = ~~offset; 
			return curves[index].getLocationAt(offset - index, true);
		}
		for (var i = 0, l = curves.length; i < l; i++) {
			var start = length,
				curve = curves[i];
			length += curve.getLength();
			if (length >= offset) {
				return curve.getLocationAt(offset - start);
			}
		}
		if (offset <= this.getLength())
			return new CurveLocation(curves[curves.length - 1], 1);
		return null;
	},

	getPointAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getPoint();
	},

	getTangentAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getTangent();
	},

	getNormalAt: function(offset, isParameter) {
		var loc = this.getLocationAt(offset, isParameter);
		return loc && loc.getNormal();
	},

	getNearestLocation: function(point) {
		point = Point.read(arguments);
		var curves = this.getCurves(),
			minDist = Infinity,
			minLoc = null;
		for (var i = 0, l = curves.length; i < l; i++) {
			var loc = curves[i].getNearestLocation(point);
			if (loc._distance < minDist) {
				minDist = loc._distance;
				minLoc = loc;
			}
		}
		return minLoc;
	},

	getNearestPoint: function(point) {
		point = Point.read(arguments);
		return this.getNearestLocation(point).getPoint();
	},

	getStyle: function() {
		var parent = this._parent;
		return (parent && parent._type === 'compound-path'
				? parent : this)._style;
	},

	_contains: function(point) {
		var closed = this._closed;
		if (!closed && !this.hasFill()
				|| !this._getBounds('getRoughBounds')._containsPoint(point))
			return false;
		var curves = this.getCurves(),
			segments = this._segments,
			crossings = 0,
			roots = new Array(3),
			last = (closed
					? curves[curves.length - 1]
					: new Curve(segments[segments.length - 1]._point,
						segments[0]._point)).getValues(),
			previous = last;
		for (var i = 0, l = curves.length; i < l; i++) {
			var vals = curves[i].getValues(),
				x = vals[0],
				y = vals[1];
			if (!(x === vals[2] && y === vals[3] && x === vals[4]
					&& y === vals[5] && x === vals[6] && y === vals[7])) {
				crossings += Curve._getCrossings(vals, previous,
						point.x, point.y, roots);
				previous = vals;
			}
		}
		if (!closed) {
			crossings += Curve._getCrossings(last, previous, point.x, point.y,
					roots);
		}
		return (crossings & 1) === 1;
	},

	_hitTest: function(point, options) {
		var style = this.getStyle(),
			segments = this._segments,
			closed = this._closed,
			tolerance = options.tolerance || 0,
			radius = 0, join, cap, miterLimit,
			that = this,
			area, loc, res;

		if (options.stroke && style.getStrokeColor()) {
			join = style.getStrokeJoin();
			cap = style.getStrokeCap();
			radius = style.getStrokeWidth() / 2 + tolerance;
			miterLimit = radius * style.getMiterLimit();
		}

		function checkPoint(seg, pt, name) {
			if (point.getDistance(pt) < tolerance)
				return new HitResult(name, that, { segment: seg, point: pt });
		}

		function checkSegmentPoints(seg, ends) {
			var pt = seg._point;
			return (ends || options.segments) && checkPoint(seg, pt, 'segment')
				|| (!ends && options.handles) && (
					checkPoint(seg, pt.add(seg._handleIn), 'handle-in') ||
					checkPoint(seg, pt.add(seg._handleOut), 'handle-out'));
		}

		function addAreaPoint(point) {
			area.push(point);
		}

		function getAreaCurve(index) {
			var p1 = area[index],
				p2 = area[(index + 1) % area.length];
			return [p1.x, p1.y, p1.x, p1.y, p2.x, p2.y, p2.x ,p2.y];
		}

		function isInArea(point) {
			var length = area.length,
				previous = getAreaCurve(length - 1),
				roots = new Array(3),
				crossings = 0;
			for (var i = 0; i < length; i++) {
				var curve = getAreaCurve(i);
				crossings += Curve._getCrossings(curve, previous,
						point.x, point.y, roots);
				previous = curve;
			}
			return (crossings & 1) === 1;
		}

		function checkSegmentStroke(segment) {
			if (join !== 'round' || cap !== 'round') {
				area = [];
				if (closed || segment._index > 0
						&& segment._index < segments.length - 1) {
					if (join !== 'round' && (segment._handleIn.isZero() 
							|| segment._handleOut.isZero()))
						Path._addSquareJoin(segment, join, radius, miterLimit,
								addAreaPoint, true);
				} else if (cap !== 'round') {
					Path._addSquareCap(segment, cap, radius, addAreaPoint, true);
				}
				if (area.length > 0)
					return isInArea(point);
			}
			return point.getDistance(segment._point) <= radius;
		}

		if (options.ends && !options.segments && !closed) {
			if (res = checkSegmentPoints(segments[0], true)
					|| checkSegmentPoints(segments[segments.length - 1], true))
				return res;
		} else if (options.segments || options.handles) {
			for (var i = 0, l = segments.length; i < l; i++) {
				if (res = checkSegmentPoints(segments[i]))
					return res;
			}
		}
		if (radius > 0) {
			loc = this.getNearestLocation(point);
			if (loc) {
				var parameter = loc.getParameter();
				if (parameter === 0 || parameter === 1) {
					if (!checkSegmentStroke(loc.getSegment()))
						loc = null;
				} else  if (loc._distance > radius) {
					loc = null;
				}
			}
			if (!loc && join === 'miter') {
				for (var i = 0, l = segments.length; i < l; i++) {
					var segment = segments[i];
					if (point.getDistance(segment._point) <= miterLimit
							&& checkSegmentStroke(segment)) {
						loc = segment.getLocation();
						break;
					}
				}
			}
		}
		return !loc && options.fill && this.hasFill() && this.contains(point)
				? new HitResult('fill', this)
				: loc
					? new HitResult('stroke', this, { location: loc })
					: null;
	}

}, new function() { 

	function drawHandles(ctx, segments, matrix, size) {
		var half = size / 2;

		function drawHandle(index) {
			var hX = coords[index],
				hY = coords[index + 1];
			if (pX != hX || pY != hY) {
				ctx.beginPath();
				ctx.moveTo(pX, pY);
				ctx.lineTo(hX, hY);
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(hX, hY, half, 0, Math.PI * 2, true);
				ctx.fill();
			}
		}

		var coords = new Array(6);
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			var state = segment._selectionState,
				selected = state & 4,
				pX = coords[0],
				pY = coords[1];
			if (selected || (state & 1))
				drawHandle(2);
			if (selected || (state & 2))
				drawHandle(4);
			ctx.save();
			ctx.beginPath();
			ctx.rect(pX - half, pY - half, size, size);
			ctx.fill();
			if (!selected) {
				ctx.beginPath();
				ctx.rect(pX - half + 1, pY - half + 1, size - 2, size - 2);
				ctx.fillStyle = '#ffffff';
				ctx.fill();
			}
			ctx.restore();
		}
	}

	function drawSegments(ctx, path, matrix) {
		var segments = path._segments,
			length = segments.length,
			coords = new Array(6),
			first = true,
			curX, curY,
			prevX, prevY,
			inX, inY,
			outX, outY;

		function drawSegment(i) {
			var segment = segments[i];
			if (matrix) {
				segment._transformCoordinates(matrix, coords, false);
				curX = coords[0];
				curY = coords[1];
			} else {
				var point = segment._point;
				curX = point._x;
				curY = point._y;
			}
			if (first) {
				ctx.moveTo(curX, curY);
				first = false;
			} else {
				if (matrix) {
					inX = coords[2];
					inY = coords[3];
				} else {
					var handle = segment._handleIn;
					inX = curX + handle._x;
					inY = curY + handle._y;
				}
				if (inX == curX && inY == curY && outX == prevX && outY == prevY) {
					ctx.lineTo(curX, curY);
				} else {
					ctx.bezierCurveTo(outX, outY, inX, inY, curX, curY);
				}
			}
			prevX = curX;
			prevY = curY;
			if (matrix) {
				outX = coords[4];
				outY = coords[5];
			} else {
				var handle = segment._handleOut;
				outX = prevX + handle._x;
				outY = prevY + handle._y;
			}
		}

		for (var i = 0; i < length; i++)
			drawSegment(i);
		if (path._closed && length > 1)
			drawSegment(0);
	}

	return {
		_draw: function(ctx, param) {
			var clip = param.clip,
				compound = param.compound;
			if (!compound)
				ctx.beginPath();

			var style = this.getStyle(),
				fillColor = style.getFillColor(),
				strokeColor = style.getStrokeColor(),
				dashArray = style.getDashArray(),
				drawDash = !paper.support.nativeDash && strokeColor
						&& dashArray && dashArray.length;

			if (fillColor || strokeColor && !drawDash || compound || clip)
				drawSegments(ctx, this);

			if (this._closed)
				ctx.closePath();

			if (!clip && !compound && (fillColor || strokeColor)) {
				this._setStyles(ctx);
				if (fillColor)
					ctx.fill();
				if (strokeColor) {
					if (drawDash) {
						ctx.beginPath();
						var flattener = new PathFlattener(this),
							from = style.getDashOffset(), to,
							i = 0;
						while (from < flattener.length) {
							to = from + dashArray[(i++) % dashArray.length];
							flattener.drawPart(ctx, from, to);
							from = to + dashArray[(i++) % dashArray.length];
						}
					}
					ctx.stroke();
				}
			}
		},

		_drawSelected: function(ctx, matrix) {
			ctx.beginPath();
			drawSegments(ctx, this, matrix);
			ctx.stroke();
			drawHandles(ctx, this._segments, matrix,
					this._project.options.handleSize || 4);
		}
	};
}, new function() { 

	function getFirstControlPoints(rhs) {
		var n = rhs.length,
			x = [], 
			tmp = [], 
			b = 2;
		x[0] = rhs[0] / b;
		for (var i = 1; i < n; i++) {
			tmp[i] = 1 / b;
			b = (i < n - 1 ? 4 : 2) - tmp[i];
			x[i] = (rhs[i] - x[i - 1]) / b;
		}
		for (var i = 1; i < n; i++) {
			x[n - i - 1] -= tmp[n - i] * x[n - i];
		}
		return x;
	}

	return {
		smooth: function() {
			var segments = this._segments,
				size = segments.length,
				n = size,
				overlap;

			if (size <= 2)
				return;

			if (this._closed) {
				overlap = Math.min(size, 4);
				n += Math.min(size, overlap) * 2;
			} else {
				overlap = 0;
			}
			var knots = [];
			for (var i = 0; i < size; i++)
				knots[i + overlap] = segments[i]._point;
			if (this._closed) {
				for (var i = 0; i < overlap; i++) {
					knots[i] = segments[i + size - overlap]._point;
					knots[i + size + overlap] = segments[i]._point;
				}
			} else {
				n--;
			}
			var rhs = [];

			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._x + 2 * knots[i + 1]._x;
			rhs[0] = knots[0]._x + 2 * knots[1]._x;
			rhs[n - 1] = 3 * knots[n - 1]._x;
			var x = getFirstControlPoints(rhs);

			for (var i = 1; i < n - 1; i++)
				rhs[i] = 4 * knots[i]._y + 2 * knots[i + 1]._y;
			rhs[0] = knots[0]._y + 2 * knots[1]._y;
			rhs[n - 1] = 3 * knots[n - 1]._y;
			var y = getFirstControlPoints(rhs);

			if (this._closed) {
				for (var i = 0, j = size; i < overlap; i++, j++) {
					var f1 = i / overlap,
						f2 = 1 - f1,
						ie = i + overlap,
						je = j + overlap;
					x[j] = x[i] * f1 + x[j] * f2;
					y[j] = y[i] * f1 + y[j] * f2;
					x[je] = x[ie] * f2 + x[je] * f1;
					y[je] = y[ie] * f2 + y[je] * f1;
				}
				n--;
			}
			var handleIn = null;
			for (var i = overlap; i <= n - overlap; i++) {
				var segment = segments[i - overlap];
				if (handleIn)
					segment.setHandleIn(handleIn.subtract(segment._point));
				if (i < n) {
					segment.setHandleOut(
							new Point(x[i], y[i]).subtract(segment._point));
					if (i < n - 1)
						handleIn = new Point(
								2 * knots[i + 1]._x - x[i + 1],
								2 * knots[i + 1]._y - y[i + 1]);
					else
						handleIn = new Point(
								(knots[n]._x + x[n - 1]) / 2,
								(knots[n]._y + y[n - 1]) / 2);
				}
			}
			if (this._closed && handleIn) {
				var segment = this._segments[0];
				segment.setHandleIn(handleIn.subtract(segment._point));
			}
		}
	};
}, new function() { 
	function getCurrentSegment(that) {
		var segments = that._segments;
		if (segments.length == 0)
			throw new Error('Use a moveTo() command first');
		return segments[segments.length - 1];
	}

	return {
		moveTo: function() {
			if (this._segments.length === 1)
				this.removeSegment(0);
			if (!this._segments.length)
				this._add([ new Segment(Point.read(arguments)) ]);
		},

		moveBy: function() {
			throw new Error('moveBy() is unsupported on Path items.');
		},

		lineTo: function() {
			this._add([ new Segment(Point.read(arguments)) ]);
		},

		cubicCurveTo: function() {
			var handle1 = Point.read(arguments),
				handle2 = Point.read(arguments),
				to = Point.read(arguments);
			var current = getCurrentSegment(this);
			current.setHandleOut(handle1.subtract(current._point));
			this._add([ new Segment(to, handle2.subtract(to)) ]);
		},

		quadraticCurveTo: function() {
			var handle = Point.read(arguments),
				to = Point.read(arguments);
			var current = getCurrentSegment(this)._point;
			this.cubicCurveTo(
				handle.add(current.subtract(handle).multiply(1 / 3)),
				handle.add(to.subtract(handle).multiply(1 / 3)),
				to
			);
		},

		curveTo: function() {
			var through = Point.read(arguments),
				to = Point.read(arguments),
				t = Base.pick(Base.read(arguments), 0.5),
				t1 = 1 - t,
				current = getCurrentSegment(this)._point,
				handle = through.subtract(current.multiply(t1 * t1))
					.subtract(to.multiply(t * t)).divide(2 * t * t1);
			if (handle.isNaN())
				throw new Error(
					'Cannot put a curve through points with parameter = ' + t);
			this.quadraticCurveTo(handle, to);
		},

		arcTo: function(to, clockwise ) {
			var current = getCurrentSegment(this),
				from = current._point,
				through,
				point = Point.read(arguments),
				next = Base.pick(Base.peek(arguments), true);
			if (typeof next === 'boolean') {
				to = point;
				clockwise = next;
				var middle = from.add(to).divide(2),
				through = middle.add(middle.subtract(from).rotate(
						clockwise ? -90 : 90));
			} else {
				through = point;
				to = Point.read(arguments);
			}
			var l1 = new Line(from.add(through).divide(2),
						through.subtract(from).rotate(90), true),
				l2 = new Line(through.add(to).divide(2),
						to.subtract(through).rotate(90), true),
				center = l1.intersect(l2, true),
				line = new Line(from, to),
				throughSide = line.getSide(through);
			if (!center) {
				if (!throughSide)
					return this.lineTo(to);
				throw new Error("Cannot put an arc through the given points: "
					+ [from, through, to]);
			}
			var vector = from.subtract(center),
				extent = vector.getDirectedAngle(to.subtract(center)),
				centerSide = line.getSide(center);
			if (centerSide == 0) {
				extent = throughSide * Math.abs(extent);
			} else if (throughSide == centerSide) {
				extent -= 360 * (extent < 0 ? -1 : 1);
			}
			var ext = Math.abs(extent),
				count =  ext >= 360 ? 4 : Math.ceil(ext / 90),
				inc = extent / count,
				half = inc * Math.PI / 360,
				z = 4 / 3 * Math.sin(half) / (1 + Math.cos(half)),
				segments = [];
			for (var i = 0; i <= count; i++) {
				var pt = i < count ? center.add(vector) : to;
				var out = i < count ? vector.rotate(90).multiply(z) : null;
				if (i == 0) {
					current.setHandleOut(out);
				} else {
					segments.push(
						new Segment(pt, vector.rotate(-90).multiply(z), out));
				}
				vector = vector.rotate(inc);
			}
			this._add(segments);
		},

		lineBy: function(vector) {
			vector = Point.read(arguments);
			var current = getCurrentSegment(this);
			this.lineTo(current._point.add(vector));
		},

		curveBy: function(throughVector, toVector, parameter) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.curveTo(current.add(throughVector), current.add(toVector),
					parameter);
		},

		arcBy: function(throughVector, toVector) {
			throughVector = Point.read(throughVector);
			toVector = Point.read(toVector);
			var current = getCurrentSegment(this)._point;
			this.arcTo(current.add(throughVector), current.add(toVector));
		},

		closePath: function() {
			var first = this.getFirstSegment(),
				last = this.getLastSegment();
			if (first._point.equals(last._point)) {
				first.setHandleIn(last._handleIn);
				last.remove();
			}
			this.setClosed(true);
		}
	};
}, {  

	_getBounds: function(getter, matrix) {
		return Path[getter](this._segments, this._closed, this.getStyle(),
				matrix);
	},

statics: {
	isClockwise: function(segments) {
		var sum = 0,
			xPre, yPre,
			add = false;
		function edge(x, y) {
			if (add)
				sum += (xPre - x) * (y + yPre);
			xPre = x;
			yPre = y;
			add = true;
		}
		for (var i = 0, l = segments.length; i < l; i++) {
			var seg1 = segments[i],
				seg2 = segments[i + 1 < l ? i + 1 : 0],
				point1 = seg1._point,
				handle1 = seg1._handleOut,
				handle2 = seg2._handleIn,
				point2 = seg2._point;
			edge(point1._x, point1._y);
			edge(point1._x + handle1._x, point1._y + handle1._y);
			edge(point2._x + handle2._x, point2._y + handle2._y);
			edge(point2._x, point2._y);
		}
		return sum > 0;
	},

	getBounds: function(segments, closed, style, matrix, strokePadding) {
		var first = segments[0];
		if (!first)
			return new Rectangle();
		var coords = new Array(6),
			prevCoords = first._transformCoordinates(matrix, new Array(6), false),
			min = prevCoords.slice(0, 2), 
			max = min.slice(), 
			roots = new Array(2);

		function processSegment(segment) {
			segment._transformCoordinates(matrix, coords, false);
			for (var i = 0; i < 2; i++) {
				Curve._addBounds(
					prevCoords[i], 
					prevCoords[i + 4], 
					coords[i + 2], 
					coords[i], 
					i, strokePadding ? strokePadding[i] : 0, min, max, roots);
			}
			var tmp = prevCoords;
			prevCoords = coords;
			coords = tmp;
		}

		for (var i = 1, l = segments.length; i < l; i++)
			processSegment(segments[i]);
		if (closed)
			processSegment(first);
		return new Rectangle(min[0], min[1], max[0] - min[0], max[1] - min[1]);
	},

	getStrokeBounds: function(segments, closed, style, matrix) {
		function getPenPadding(radius, matrix) {
			if (!matrix)
				return [radius, radius];
			var mx = matrix.shiftless(),
				hor = mx.transform(new Point(radius, 0)),
				ver = mx.transform(new Point(0, radius)),
				phi = hor.getAngleInRadians(),
				a = hor.getLength(),
				b = ver.getLength();
			var sin = Math.sin(phi),
				cos = Math.cos(phi),
				tan = Math.tan(phi),
				tx = -Math.atan(b * tan / a),
				ty = Math.atan(b / (tan * a));
			return [Math.abs(a * Math.cos(tx) * cos - b * Math.sin(tx) * sin),
					Math.abs(b * Math.sin(ty) * cos + a * Math.cos(ty) * sin)];
		}

		if (!style.getStrokeColor() || !style.getStrokeWidth())
			return Path.getBounds(segments, closed, style, matrix);
		var length = segments.length - (closed ? 0 : 1),
			radius = style.getStrokeWidth() / 2,
			padding = getPenPadding(radius, matrix),
			bounds = Path.getBounds(segments, closed, style, matrix, padding),
			join = style.getStrokeJoin(),
			cap = style.getStrokeCap(),
			miterLimit = radius * style.getMiterLimit();
		var joinBounds = new Rectangle(new Size(padding).multiply(2));

		function add(point) {
			bounds = bounds.include(matrix
				? matrix._transformPoint(point, point) : point);
		}

		function addJoin(segment, join) {
			if (join === 'round' || !segment._handleIn.isZero()
					&& !segment._handleOut.isZero()) {
				bounds = bounds.unite(joinBounds.setCenter(matrix
					? matrix._transformPoint(segment._point) : segment._point));
			} else {
				Path._addSquareJoin(segment, join, radius, miterLimit, add);
			}
		}

		function addCap(segment, cap) {
			switch (cap) {
			case 'round':
				addJoin(segment, cap);
				break;
			case 'butt':
			case 'square':
				Path._addSquareCap(segment, cap, radius, add); 
				break;
			}
		}

		for (var i = 1; i < length; i++)
			addJoin(segments[i], join);
		if (closed) {
			addJoin(segments[0], join);
		} else {
			addCap(segments[0], cap);
			addCap(segments[segments.length - 1], cap);
		}
		return bounds;
	},

	_addSquareJoin: function(segment, join, radius, miterLimit, addPoint, area) {
		var curve2 = segment.getCurve(),
			curve1 = curve2.getPrevious(),
			point = curve2.getPointAt(0, true),
			normal1 = curve1.getNormalAt(1, true),
			normal2 = curve2.getNormalAt(0, true),
			step = normal1.getDirectedAngle(normal2) < 0 ? -radius : radius;
		normal1.setLength(step);
		normal2.setLength(step);
		if (area) {
			addPoint(point);
			addPoint(point.add(normal1));
		}
		if (join === 'miter') {
			var corner = new Line(
					point.add(normal1),
					new Point(-normal1.y, normal1.x), true
				).intersect(new Line(
					point.add(normal2),
					new Point(-normal2.y, normal2.x), true
				), true);
			if (corner && point.getDistance(corner) <= miterLimit) {
				addPoint(corner);
				if (!area)
					return;
			}
		}
		if (!area)
			addPoint(point.add(normal1));
		addPoint(point.add(normal2));
	},

	_addSquareCap: function(segment, cap, radius, addPoint, area) {
		var point = segment._point,
			loc = segment.getLocation(),
			normal = loc.getNormal().normalize(radius);
		if (area) {
			addPoint(point.subtract(normal));
			addPoint(point.add(normal));
		}
		if (cap === 'square')
			point = point.add(normal.rotate(loc.getParameter() == 0 ? -90 : 90));
		addPoint(point.add(normal));
		addPoint(point.subtract(normal));
	},

	getHandleBounds: function(segments, closed, style, matrix, strokePadding,
			joinPadding) {
		var coords = new Array(6),
			x1 = Infinity,
			x2 = -x1,
			y1 = x1,
			y2 = x2;
		strokePadding = strokePadding / 2 || 0;
		joinPadding = joinPadding / 2 || 0;
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			segment._transformCoordinates(matrix, coords, false);
			for (var j = 0; j < 6; j += 2) {
				var padding = j == 0 ? joinPadding : strokePadding,
					x = coords[j],
					y = coords[j + 1],
					xn = x - padding,
					xx = x + padding,
					yn = y - padding,
					yx = y + padding;
				if (xn < x1) x1 = xn;
				if (xx > x2) x2 = xx;
				if (yn < y1) y1 = yn;
				if (yx > y2) y2 = yx;
			}
		}
		return new Rectangle(x1, y1, x2 - x1, y2 - y1);
	},

	getRoughBounds: function(segments, closed, style, matrix) {
		var strokeWidth = style.getStrokeColor() ? style.getStrokeWidth() : 0,
			joinWidth = strokeWidth;
		if (strokeWidth > 0) {
			if (style.getStrokeJoin() === 'miter')
				joinWidth = strokeWidth * style.getMiterLimit();
			if (style.getStrokeCap() === 'square')
				joinWidth = Math.max(joinWidth, strokeWidth * Math.sqrt(2));
		}
		return Path.getHandleBounds(segments, closed, style, matrix,
				strokeWidth, joinWidth);
	}
}});

Path.inject({ statics: new function() {

	function createPath(args) {
		return new Path(Base.getNamed(args));
	}

	function createRectangle() {
		var rect = Rectangle.readNamed(arguments, 'rectangle'),
			radius = Size.readNamed(arguments, 'radius', 0, 0,
					{ readNull: true }),
			bl = rect.getBottomLeft(true),
			tl = rect.getTopLeft(true),
			tr = rect.getTopRight(true),
			br = rect.getBottomRight(true),
			path = createPath(arguments);
		if (!radius || radius.isZero()) {
			path._add([
				new Segment(bl),
				new Segment(tl),
				new Segment(tr),
				new Segment(br)
			]);
		} else {
			radius = Size.min(radius, rect.getSize(true).divide(2));
			var h = radius.multiply(kappa * 2); 
			path._add([
				new Segment(bl.add(radius.width, 0), null, [-h.width, 0]),
				new Segment(bl.subtract(0, radius.height), [0, h.height], null),

				new Segment(tl.add(0, radius.height), null, [0, -h.height]),
				new Segment(tl.add(radius.width, 0), [-h.width, 0], null),

				new Segment(tr.subtract(radius.width, 0), null, [h.width, 0]),
				new Segment(tr.add(0, radius.height), [0, -h.height], null),

				new Segment(br.subtract(0, radius.height), null, [0, h.height]),
				new Segment(br.subtract(radius.width, 0), [h.width, 0], null)
			]);
		}
		path._closed = true;
		return path;
	}

	var kappa = Numerical.KAPPA / 2;

	var ellipseSegments = [
		new Segment([0, 0.5], [0, kappa ], [0, -kappa]),
		new Segment([0.5, 0], [-kappa, 0], [kappa, 0 ]),
		new Segment([1, 0.5], [0, -kappa], [0, kappa ]),
		new Segment([0.5, 1], [kappa, 0 ], [-kappa, 0])
	];

	function createEllipse() {
		var rect = Rectangle.readNamed(arguments, 'rectangle'),
			path = createPath(arguments),
			point = rect.getPoint(true),
			size = rect.getSize(true),
			segments = new Array(4);
		for (var i = 0; i < 4; i++) {
			var segment = ellipseSegments[i];
			segments[i] = new Segment(
				segment._point.multiply(size).add(point),
				segment._handleIn.multiply(size),
				segment._handleOut.multiply(size)
			);
		}
		path._add(segments);
		path._closed = true;
		return path;
	}

	return {
		Line: function() {
			return new Path(
				Point.readNamed(arguments, 'from'),
				Point.readNamed(arguments, 'to')
			).set(Base.getNamed(arguments));
		},

		Circle: function() {
			var center = Point.readNamed(arguments, 'center'),
				radius = Base.readNamed(arguments, 'radius');
			return createEllipse(new Rectangle(center.subtract(radius),
					new Size(radius * 2, radius * 2)))
					.set(Base.getNamed(arguments));
		},

		Rectangle: createRectangle,

		RoundRectangle: createRectangle,

		Ellipse: createEllipse,

		Oval: createEllipse,

		Arc: function() {
			var from = Point.readNamed(arguments, 'from'),
				through = Point.readNamed(arguments, 'through'),
				to = Point.readNamed(arguments, 'to'),
				path = createPath(arguments);
			path.moveTo(from);
			path.arcTo(through, to);
			return path;
		},

		RegularPolygon: function() {
			var center = Point.readNamed(arguments, 'center'),
				sides = Base.readNamed(arguments, 'sides'),
				radius = Base.readNamed(arguments, 'radius'),
				path = createPath(arguments),
				step = 360 / sides,
				three = !(sides % 3),
				vector = new Point(0, three ? -radius : radius),
				offset = three ? -1 : 0.5,
				segments = new Array(sides);
			for (var i = 0; i < sides; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate((i + offset) * step)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		},

		Star: function() {
			var center = Point.readNamed(arguments, 'center'),
				points = Base.readNamed(arguments, 'points') * 2,
				radius1 = Base.readNamed(arguments, 'radius1'),
				radius2 = Base.readNamed(arguments, 'radius2'),
				path = createPath(arguments),
				step = 360 / points,
				vector = new Point(0, -1),
				segments = new Array(points);
			for (var i = 0; i < points; i++) {
				segments[i] = new Segment(center.add(
					vector.rotate(step * i).multiply(i % 2 ? radius2 : radius1)));
			}
			path._add(segments);
			path._closed = true;
			return path;
		}
	};
}});

var CompoundPath = PathItem.extend({
	_class: 'CompoundPath',
	_serializeFields: {
		children: []
	},

	initialize: function CompoundPath(arg) {
		this._children = [];
		this._namedChildren = {};
		if (!this._initialize(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	insertChildren: function insertChildren(index, items, _preserve) {
		items = insertChildren.base.call(this, index, items, _preserve, 'path');
		for (var i = 0, l = !_preserve && items && items.length; i < l; i++) {
			var item = items[i];
			if (item._clockwise === undefined)
				item.setClockwise(item._index === 0);
		}
		return items;
	},

	reduce: function() {
		if (this._children.length == 1) {
			var child = this._children[0];
			child.insertAbove(this);
			this.remove();
			return child;
		}
		return this;
	},

	reverse: function() {
		var children = this._children;
		for (var i = 0, l = children.length; i < l; i++)
			children[i].reverse();
	},

	smooth: function() {
		for (var i = 0, l = this._children.length; i < l; i++)
			this._children[i].smooth();
	},

	isClockwise: function() {
		var child = this.getFirstChild();
		return child && child.isClockwise();
	},

	setClockwise: function(clockwise) {
		if (this.isClockwise() != !!clockwise)
			this.reverse();
	},

	getFirstSegment: function() {
		var first = this.getFirstChild();
		return first && first.getFirstSegment();
	},

	getLastSegment: function() {
		var last = this.getLastChild();
		return last && last.getLastSegment();
	},

	getCurves: function() {
		var children = this._children,
			curves = [];
		for (var i = 0, l = children.length; i < l; i++)
			curves = curves.concat(children[i].getCurves());
		return curves;
	},

	getFirstCurve: function() {
		var first = this.getFirstChild();
		return first && first.getFirstCurve();
	},

	getLastCurve: function() {
		var last = this.getLastChild();
		return last && last.getFirstCurve();
	},

	getArea: function() {
		var children = this._children,
			area = 0;
		for (var i = 0, l = children.length; i < l; i++)
			area += children[i].getArea();
		return area;
	},

	getPathData: function() {
		var children = this._children,
			paths = [];
		for (var i = 0, l = children.length; i < l; i++)
			paths.push(children[i].getPathData(arguments[0]));
		return paths.join(' ');
	},

	_contains: function(point) {
		var children = [];
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child.contains(point))
				children.push(child);
		}
		return (children.length & 1) == 1 && children;
	},

	_hitTest: function _hitTest(point, options) {
		var res = _hitTest.base.call(this, point,
				Base.merge(options, { fill: false }));
		if (!res && options.fill && this.hasFill()) {
			res = this._contains(point);
			res = res ? new HitResult('fill', res[0]) : null;
		}
		return res;
	},

	_draw: function(ctx, param) {
		var children = this._children,
			style = this._style;
		if (children.length === 0)
			return;
		ctx.beginPath();
		param = param.extend({ compound: true });
		for (var i = 0, l = children.length; i < l; i++)
			children[i].draw(ctx, param);
		if (!param.clip) {
			this._setStyles(ctx);
			if (style.getFillColor())
				ctx.fill();
			if (style.getStrokeColor())
				ctx.stroke();
		}
	}
}, new function() { 
	function getCurrentPath(that) {
		if (!that._children.length)
			throw new Error('Use a moveTo() command first');
		return that._children[that._children.length - 1];
	}

	var fields = {
		moveTo: function() {
			var path = new Path();
			this.addChild(path);
			path.moveTo.apply(path, arguments);
		},

		moveBy: function() {
			this.moveTo(getCurrentPath(this).getLastSegment()._point.add(
					Point.read(arguments)));
		},

		closePath: function() {
			getCurrentPath(this).closePath();
		}
	};

	Base.each(['lineTo', 'cubicCurveTo', 'quadraticCurveTo', 'curveTo',
			'arcTo', 'lineBy', 'curveBy', 'arcBy'], function(key) {
		fields[key] = function() {
			var path = getCurrentPath(this);
			path[key].apply(path, arguments);
		};
	});

	return fields;
});

var PathFlattener = Base.extend({
	initialize: function(path) {
		this.curves = []; 
		this.parts = []; 
		this.length = 0; 
		this.index = 0;

		var segments = path._segments,
			segment1 = segments[0],
			segment2,
			that = this;

		function addCurve(segment1, segment2) {
			var curve = Curve.getValues(segment1, segment2);
			that.curves.push(curve);
			that._computeParts(curve, segment1._index, 0, 1);
		}

		for (var i = 1, l = segments.length; i < l; i++) {
			segment2 = segments[i];
			addCurve(segment1, segment2);
			segment1 = segment2;
		}
		if (path._closed)
			addCurve(segment2, segments[0]);
	},

	_computeParts: function(curve, index, minT, maxT) {
		if ((maxT - minT) > 1 / 32 && !Curve.isFlatEnough(curve, 0.25)) {
			var curves = Curve.subdivide(curve);
			var halfT = (minT + maxT) / 2;
			this._computeParts(curves[0], index, minT, halfT);
			this._computeParts(curves[1], index, halfT, maxT);
		} else {
			var x = curve[6] - curve[0],
				y = curve[7] - curve[1],
				dist = Math.sqrt(x * x + y * y);
			if (dist > 0.00001) {
				this.length += dist;
				this.parts.push({
					offset: this.length,
					value: maxT,
					index: index
				});
			}
		}
	},

	getParameterAt: function(offset) {
		var i, j = this.index;
		for (;;) {
			i = j;
			if (j == 0 || this.parts[--j].offset < offset)
				break;
		}
		for (var l = this.parts.length; i < l; i++) {
			var part = this.parts[i];
			if (part.offset >= offset) {
				this.index = i;
				var prev = this.parts[i - 1];
				var prevVal = prev && prev.index == part.index ? prev.value : 0,
					prevLen = prev ? prev.offset : 0;
				return {
					value: prevVal + (part.value - prevVal)
						* (offset - prevLen) /  (part.offset - prevLen),
					index: part.index
				};
			}
		}
		var part = this.parts[this.parts.length - 1];
		return {
			value: 1,
			index: part.index
		};
	},

	evaluate: function(offset, type) {
		var param = this.getParameterAt(offset);
		return Curve.evaluate(this.curves[param.index], param.value, type);
	},

	drawPart: function(ctx, from, to) {
		from = this.getParameterAt(from);
		to = this.getParameterAt(to);
		for (var i = from.index; i <= to.index; i++) {
			var curve = Curve.getPart(this.curves[i],
					i == from.index ? from.value : 0,
					i == to.index ? to.value : 1);
			if (i == from.index)
				ctx.moveTo(curve[0], curve[1]);
			ctx.bezierCurveTo.apply(ctx, curve.slice(2));
		}
	}
});

var PathFitter = Base.extend({
	initialize: function(path, error) {
		this.points = [];
		var segments = path._segments,
			prev;
		for (var i = 0, l = segments.length; i < l; i++) {
			var point = segments[i].point.clone();
			if (!prev || !prev.equals(point)) {
				this.points.push(point);
				prev = point;
			}
		}
		this.error = error;
	},

	fit: function() {
		var points = this.points,
			length = points.length;
		this.segments = length > 0 ? [new Segment(points[0])] : [];
		if (length > 1)
			this.fitCubic(0, length - 1,
				points[1].subtract(points[0]).normalize(),
				points[length - 2].subtract(points[length - 1]).normalize());
		return this.segments;
	},

	fitCubic: function(first, last, tan1, tan2) {
		if (last - first == 1) {
			var pt1 = this.points[first],
				pt2 = this.points[last],
				dist = pt1.getDistance(pt2) / 3;
			this.addCurve([pt1, pt1.add(tan1.normalize(dist)),
					pt2.add(tan2.normalize(dist)), pt2]);
			return;
		}
		var uPrime = this.chordLengthParameterize(first, last),
			maxError = Math.max(this.error, this.error * this.error),
			split;
		for (var i = 0; i <= 4; i++) {
			var curve = this.generateBezier(first, last, uPrime, tan1, tan2);
			var max = this.findMaxError(first, last, curve, uPrime);
			if (max.error < this.error) {
				this.addCurve(curve);
				return;
			}
			split = max.index;
			if (max.error >= maxError)
				break;
			this.reparameterize(first, last, uPrime, curve);
			maxError = max.error;
		}
		var V1 = this.points[split - 1].subtract(this.points[split]),
			V2 = this.points[split].subtract(this.points[split + 1]),
			tanCenter = V1.add(V2).divide(2).normalize();
		this.fitCubic(first, split, tan1, tanCenter);
		this.fitCubic(split, last, tanCenter.negate(), tan2);
	},

	addCurve: function(curve) {
		var prev = this.segments[this.segments.length - 1];
		prev.setHandleOut(curve[1].subtract(curve[0]));
		this.segments.push(
				new Segment(curve[3], curve[2].subtract(curve[3])));
	},

	generateBezier: function(first, last, uPrime, tan1, tan2) {
		var epsilon = 1e-11,
			pt1 = this.points[first],
			pt2 = this.points[last],
			C = [[0, 0], [0, 0]],
			X = [0, 0];

		for (var i = 0, l = last - first + 1; i < l; i++) {
			var u = uPrime[i],
				t = 1 - u,
				b = 3 * u * t,
				b0 = t * t * t,
				b1 = b * t,
				b2 = b * u,
				b3 = u * u * u,
				a1 = tan1.normalize(b1),
				a2 = tan2.normalize(b2),
				tmp = this.points[first + i]
					.subtract(pt1.multiply(b0 + b1))
					.subtract(pt2.multiply(b2 + b3));
			C[0][0] += a1.dot(a1);
			C[0][1] += a1.dot(a2);
			C[1][0] = C[0][1];
			C[1][1] += a2.dot(a2);
			X[0] += a1.dot(tmp);
			X[1] += a2.dot(tmp);
		}

		var detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1],
			alpha1, alpha2;
		if (Math.abs(detC0C1) > epsilon) {
			var detC0X  = C[0][0] * X[1]    - C[1][0] * X[0],
				detXC1  = X[0]    * C[1][1] - X[1]    * C[0][1];
			alpha1 = detXC1 / detC0C1;
			alpha2 = detC0X / detC0C1;
		} else {
			var c0 = C[0][0] + C[0][1],
				c1 = C[1][0] + C[1][1];
			if (Math.abs(c0) > epsilon) {
				alpha1 = alpha2 = X[0] / c0;
			} else if (Math.abs(c1) > epsilon) {
				alpha1 = alpha2 = X[1] / c1;
			} else {
				alpha1 = alpha2 = 0;
			}
		}

		var segLength = pt2.getDistance(pt1);
		epsilon *= segLength;
		if (alpha1 < epsilon || alpha2 < epsilon) {
			alpha1 = alpha2 = segLength / 3;
		}

		return [pt1, pt1.add(tan1.normalize(alpha1)),
				pt2.add(tan2.normalize(alpha2)), pt2];
	},

	reparameterize: function(first, last, u, curve) {
		for (var i = first; i <= last; i++) {
			u[i - first] = this.findRoot(curve, this.points[i], u[i - first]);
		}
	},

	findRoot: function(curve, point, u) {
		var curve1 = [],
			curve2 = [];
		for (var i = 0; i <= 2; i++) {
			curve1[i] = curve[i + 1].subtract(curve[i]).multiply(3);
		}
		for (var i = 0; i <= 1; i++) {
			curve2[i] = curve1[i + 1].subtract(curve1[i]).multiply(2);
		}
		var pt = this.evaluate(3, curve, u),
			pt1 = this.evaluate(2, curve1, u),
			pt2 = this.evaluate(1, curve2, u),
			diff = pt.subtract(point),
			df = pt1.dot(pt1) + diff.dot(pt2);
		if (Math.abs(df) < 0.00001)
			return u;
		return u - diff.dot(pt1) / df;
	},

	evaluate: function(degree, curve, t) {
		var tmp = curve.slice();
		for (var i = 1; i <= degree; i++) {
			for (var j = 0; j <= degree - i; j++) {
				tmp[j] = tmp[j].multiply(1 - t).add(tmp[j + 1].multiply(t));
			}
		}
		return tmp[0];
	},

	chordLengthParameterize: function(first, last) {
		var u = [0];
		for (var i = first + 1; i <= last; i++) {
			u[i - first] = u[i - first - 1]
					+ this.points[i].getDistance(this.points[i - 1]);
		}
		for (var i = 1, m = last - first; i <= m; i++) {
			u[i] /= u[m];
		}
		return u;
	},

	findMaxError: function(first, last, curve, u) {
		var index = Math.floor((last - first + 1) / 2),
			maxDist = 0;
		for (var i = first + 1; i < last; i++) {
			var P = this.evaluate(3, curve, u[i - first]);
			var v = P.subtract(this.points[i]);
			var dist = v.x * v.x + v.y * v.y; 
			if (dist >= maxDist) {
				maxDist = dist;
				index = i;
			}
		}
		return {
			error: maxDist,
			index: index
		};
	}
});

PathItem.inject(new function() {

	function splitPath(intersections, collectOthers) {
		intersections.sort(function(loc1, loc2) {
			var path1 = loc1.getPath(),
				path2 = loc2.getPath();
			return path1 === path2
					? (loc1.getIndex() + loc1.getParameter())
						- (loc2.getIndex() + loc2.getParameter())
					: path1._id - path2._id;
		});
		var others = collectOthers && [];
		for (var i = intersections.length - 1; i >= 0; i--) {
			var loc = intersections[i],
				other = loc.getIntersection(),
				curve = loc.divide(),
				segment = curve && curve.getSegment1() || loc.getSegment();
			if (others)
				others.push(other);
			segment._intersection = other;
		}
		return others;
	}

	function reorientPath(path) {
		if (path instanceof CompoundPath) {
			var children = path._children,
				length = children.length,
				bounds = new Array(length),
				counters = new Array(length),
				clockwise = children[0].isClockwise();
			for (var i = 0; i < length; i++) {
				bounds[i] = children[i].getBounds();
				counters[i] = 0;
			}
			for (var i = 0; i < length; i++) {
				for (var j = 1; j < length; j++) {
					if (i !== j && bounds[i].contains(bounds[j]))
						counters[j]++;
				}
				if (i > 0 && counters[i] % 2 === 0)
					children[i].setClockwise(clockwise);
			}
		}
		return path;
	}

	function computeBoolean(path1, path2, operator, subtract) {
		path1 = reorientPath(path1.clone(false));
		path2 = reorientPath(path2.clone(false));
		var path1Clockwise = path1.isClockwise(),
			path2Clockwise = path2.isClockwise(),
			intersections = path1.getIntersections(path2);
		splitPath(splitPath(intersections, true));
		if (subtract) {
			path2.reverse();
			path2Clockwise = !path2Clockwise;
		}
		var paths = []
				.concat(path1._children || [path1])
				.concat(path2._children || [path2]),
			segments = [],
			result = new CompoundPath();
		for (var i = 0, l = paths.length; i < l; i++) {
			var path = paths[i],
				parent = path._parent,
				clockwise = path.isClockwise(),
				segs = path._segments;
			path = parent instanceof CompoundPath ? parent : path;
			for (var j = segs.length - 1; j >= 0; j--) {
				var segment = segs[j],
					midPoint = segment.getCurve().getPoint(0.5),
					insidePath1 = path !== path1 && path1.contains(midPoint)
							&& (clockwise === path1Clockwise || subtract
									|| !testOnCurve(path1, midPoint)),
					insidePath2 = path !== path2 && path2.contains(midPoint)
							&& (clockwise === path2Clockwise
									|| !testOnCurve(path2, midPoint));
				if (operator(path === path1, insidePath1, insidePath2)) {
					segment._invalid = true;
				} else {
					segments.push(segment);
				}
			}
		}
		for (var i = 0, l = segments.length; i < l; i++) {
			var segment = segments[i];
			if (segment._visited)
				continue;
			var path = new Path(),
				loc = segment._intersection,
				intersection = loc && loc.getSegment(true);
			if (segment.getPrevious()._invalid)
				segment.setHandleIn(intersection
						? intersection._handleIn
						: new Point(0, 0));
			do {
				segment._visited = true;
				if (segment._invalid && segment._intersection) {
					var inter = segment._intersection.getSegment(true);
					path.add(new Segment(segment._point, segment._handleIn,
							inter._handleOut));
					inter._visited = true;
					segment = inter;
				} else {
					path.add(segment.clone());
				}
				segment = segment.getNext();
			} while (segment && !segment._visited && segment !== intersection);
			var amount = path._segments.length;
			if (amount > 1 && (amount > 2 || !path.isPolygon())) {
				path.setClosed(true);
				result.addChild(path, true);
			} else {
				path.remove();
			}
		}
		path1.remove();
		path2.remove();
		return result.reduce();
	}

	function testOnCurve(path, point) {
		var curves = path.getCurves(),
			bounds = path.getBounds();
		if (bounds.contains(point)) {
			for (var i = 0, l = curves.length; i < l; i++) {
				var curve = curves[i];
				if (curve.getBounds().contains(point)
						&& curve.getParameterOf(point))
					return true;
			}
		}
		return false;
	}

	return {
		unite: function(path) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return isInPath1 || isInPath2;
					});
		},

		intersect: function(path) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return !(isInPath1 || isInPath2);
					});
		},

		subtract: function(path) {
			return computeBoolean(this, path,
					function(isPath1, isInPath1, isInPath2) {
						return isPath1 && isInPath2 || !isPath1 && !isInPath1;
					}, true);
		},

		exclude: function(path) {
			return new Group([this.subtract(path), path.subtract(this)]);
		},

		divide: function(path) {
			return new Group([this.subtract(path), this.intersect(path)]);
		}
	};
});

var TextItem = Item.extend({
	_class: 'TextItem',
	_boundsSelected: true,
	_serializeFields: {
		content: null
	},
	_boundsGetter: 'getBounds',

	initialize: function TextItem(arg) {
		this._content = '';
		this._lines = [];
		var hasProps = arg && Base.isPlainObject(arg)
				&& arg.x === undefined && arg.y === undefined;
		this._initialize(hasProps && arg, !hasProps && Point.read(arguments));
	},

	_clone: function _clone(copy) {
		copy.setContent(this._content);
		return _clone.base.call(this, copy);
	},

	getContent: function() {
		return this._content;
	},

	setContent: function(content) {
		this._content = '' + content;
		this._lines = this._content.split(/\r\n|\n|\r/mg);
		this._changed(69);
	},

	isEmpty: function() {
		return !this._content;
	},

	getCharacterStyle: '#getStyle',
	setCharacterStyle: '#setStyle',

	getParagraphStyle: '#getStyle',
	setParagraphStyle: '#setStyle'
});

var PointText = TextItem.extend({
	_class: 'PointText',

	initialize: function PointText() {
		TextItem.apply(this, arguments);
	},

	clone: function(insert) {
		return this._clone(new PointText({ insert: false }), insert);
	},

	getPoint: function() {
		var point = this._matrix.getTranslation();
		return new LinkedPoint(point.x, point.y, this, 'setPoint');
	},

	setPoint: function(point) {
		point = Point.read(arguments);
		this.translate(point.subtract(this._matrix.getTranslation()));
	},

	_draw: function(ctx) {
		if (!this._content)
			return;
		this._setStyles(ctx);
		var style = this._style,
			lines = this._lines,
			leading = style.getLeading();
		ctx.font = style.getFontStyle();
		ctx.textAlign = style.getJustification();
		for (var i = 0, l = lines.length; i < l; i++) {
			var line = lines[i];
			if (style.getFillColor())
				ctx.fillText(line, 0, 0);
			if (style.getStrokeColor())
				ctx.strokeText(line, 0, 0);
			ctx.translate(0, leading);
		}
	}
}, new function() {
	var measureCtx = null;

	return {
		_getBounds: function(getter, matrix) {
			if (!measureCtx)
				measureCtx = CanvasProvider.getContext(1, 1);
			var style = this._style,
				lines = this._lines,
				count = lines.length,
				justification = style.getJustification(),
				leading = style.getLeading(),
				x = 0;
			measureCtx.font = style.getFontStyle();
			var width = 0;
			for (var i = 0; i < count; i++)
				width = Math.max(width, measureCtx.measureText(lines[i]).width);
			if (justification !== 'left')
				x -= width / (justification === 'center' ? 2: 1);
			var bounds = new Rectangle(x,
						count ? - 0.75 * leading : 0,
						width, count * leading);
			return matrix ? matrix._transformBounds(bounds, bounds) : bounds;
		}
	};
});

var Color = Base.extend(new function() {

	var types = {
		gray: ['gray'],
		rgb: ['red', 'green', 'blue'],
		hsb: ['hue', 'saturation', 'brightness'],
		hsl: ['hue', 'saturation', 'lightness'],
		gradient: ['gradient', 'origin', 'destination', 'highlight']
	};

	var componentParsers = {}, 
		colorCache = {},
		colorCtx;

	function nameToRGB(name) {
		var cached = colorCache[name];
		if (!cached) {
			if (!colorCtx) {
				colorCtx = CanvasProvider.getContext(1, 1);
				colorCtx.globalCompositeOperation = 'copy';
			}
			colorCtx.fillStyle = 'rgba(0,0,0,0)';
			colorCtx.fillStyle = name;
			colorCtx.fillRect(0, 0, 1, 1);
			var data = colorCtx.getImageData(0, 0, 1, 1).data;
			cached = colorCache[name] = [
				data[0] / 255,
				data[1] / 255,
				data[2] / 255
			];
		}
		return cached.slice();
	}

	function hexToRGB(string) {
		var hex = string.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		if (hex.length >= 4) {
			var components = [0, 0, 0];
			for (var i = 0; i < 3; i++) {
				var value = hex[i + 1];
				components[i] = parseInt(value.length == 1
						? value + value : value, 16) / 255;
			}
			return components;
		}
	}

	var hsbIndices = [
		[0, 3, 1], 
		[2, 0, 1], 
		[1, 0, 3], 
		[1, 2, 0], 
		[3, 1, 0], 
		[0, 1, 2]  
	];

	var converters = {
		'rgb-hsb': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				h = delta === 0 ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60; 
			return [h, max === 0 ? 0 : delta / max, max];
		},

		'hsb-rgb': function(h, s, b) {
			var h = (h / 60) % 6, 
				i = Math.floor(h), 
				f = h - i,
				i = hsbIndices[i],
				v = [
					b,						
					b * (1 - s),			
					b * (1 - s * f),		
					b * (1 - s * (1 - f))	
				];
			return [v[i[0]], v[i[1]], v[i[2]]];
		},

		'rgb-hsl': function(r, g, b) {
			var max = Math.max(r, g, b),
				min = Math.min(r, g, b),
				delta = max - min,
				achromatic = delta === 0,
				h = achromatic ? 0
					:   ( max == r ? (g - b) / delta + (g < b ? 6 : 0)
						: max == g ? (b - r) / delta + 2
						:            (r - g) / delta + 4) * 60, 
				l = (max + min) / 2,
				s = achromatic ? 0 : l < 0.5
						? delta / (max + min)
						: delta / (2 - max - min);
			return [h, s, l];
		},

		'hsl-rgb': function(h, s, l) {
			h /= 360;
			if (s === 0)
				return [l, l, l];
			var t3s = [ h + 1 / 3, h, h - 1 / 3 ],
				t2 = l < 0.5 ? l * (1 + s) : l + s - l * s,
				t1 = 2 * l - t2,
				c = [];
			for (var i = 0; i < 3; i++) {
				var t3 = t3s[i];
				if (t3 < 0) t3 += 1;
				if (t3 > 1) t3 -= 1;
				c[i] = 6 * t3 < 1
					? t1 + (t2 - t1) * 6 * t3
					: 2 * t3 < 1
						? t2
						: 3 * t3 < 2
							? t1 + (t2 - t1) * ((2 / 3) - t3) * 6
							: t1;
			}
			return c;
		},

		'rgb-gray': function(r, g, b) {
			return [r * 0.2989 + g * 0.587 + b * 0.114];
		},

		'gray-rgb': function(g) {
			return [g, g, g];
		},

		'gray-hsb': function(g) {
			return [0, 0, g];
		},

		'gray-hsl': function(g) {
			return [0, 0, g];
		},

		'gradient-rgb': function() {
			return [];
		},

		'rgb-gradient': function() {
			return [];
		}

	};

	return Base.each(types, function(properties, type) {
		componentParsers[type] = [];
		Base.each(properties, function(name, index) {
			var part = Base.capitalize(name),
				hasOverlap = /^(hue|saturation)$/.test(name),
				parser = componentParsers[type][index] = name === 'gradient'
					? function(value) {
						var current = this._components[0];
						value = Gradient.read(
								Array.isArray(value) ? value : arguments,
								0, 0, { readNull: true });
						if (current !== value) {
							if (current)
								current._removeOwner(this);
							if (value)
								value._addOwner(this);
						}
						return value;
					}
					: name === 'hue'
						? function(value) {
							return isNaN(value) ? 0
									: ((value % 360) + 360) % 360;
						}
						: type === 'gradient'
							? function() {
								return Point.read(arguments, 0, 0, {
										readNull: name === 'highlight',
										clone: true
								});
							}
							: function(value) {
								return isNaN(value) ? 0
										: Math.min(Math.max(value, 0), 1);
							};

			this['get' + part] = function() {
				return this._type === type
					|| hasOverlap && /^hs[bl]$/.test(this._type)
						? this._components[index]
						: this._convert(type)[index];
			};

			this['set' + part] = function(value) {
				if (this._type !== type
						&& !(hasOverlap && /^hs[bl]$/.test(this._type))) {
					this._components = this._convert(type);
					this._properties = types[type];
					this._type = type;
				}
				value = parser.call(this, value);
				if (value != null) {
					this._components[index] = value;
					this._changed();
				}
			};
		}, this);
	}, {
		_class: 'Color',
		_readIndex: true,

		initialize: function Color(arg) {
			var slice = Array.prototype.slice,
				args = arguments,
				read = 0,
				parse = true,
				type,
				components,
				alpha,
				values;
			if (Array.isArray(arg)) {
				args = arg;
				arg = args[0];
			}
			var argType = arg != null && typeof arg;
			if (argType === 'string' && arg in types) {
				type = arg;
				arg = args[1];
				if (Array.isArray(arg)) {
					components = arg;
					alpha = args[2];
				} else {
					if (this.__read)
						read = 1; 
					args = slice.call(args, 1);
					argType = typeof arg;
				}
			}
			if (!components) {
				parse = !(this.__options && this.__options.dontParse);
				values = argType === 'number'
						? args
						: argType === 'object' && arg.length != null
							? arg
							: null;
				if (values) {
					if (!type)
						type = values.length >= 3
								? 'rgb'
								: 'gray';
					var length = types[type].length;
					alpha = values[length];
					if (this.__read)
						read += values === arguments
							? length + (alpha != null ? 1 : 0)
							: 1;
					if (values.length > length)
						values = slice.call(values, 0, length);
				} else if (argType === 'string') {
					components = arg.match(/^#[0-9a-f]{3,6}$/i)
							? hexToRGB(arg)
							: nameToRGB(arg);
					type = 'rgb';
				} else if (argType === 'object') {
					if (arg.constructor === Color) {
						type = arg._type;
						components = arg._components.slice();
						alpha = arg._alpha;
						if (type === 'gradient') {
							for (var i = 1, l = components.length; i < l; i++) {
								var point = components[i];
								if (point)
									components[i] = point.clone();
							}
						}
					} else if (arg.constructor === Gradient) {
						type = 'gradient';
						values = args;
					} else {
						type = 'hue' in arg
							? 'lightness' in arg
								? 'hsl'
								: 'hsb'
							: 'gradient' in arg || 'stops' in arg
									|| 'radial' in arg
								? 'gradient'
								: 'gray' in arg
									? 'gray'
									: 'rgb';
						var properties = types[type];
							parsers = parse && componentParsers[type];
						this._components = components = [];
						for (var i = 0, l = properties.length; i < l; i++) {
							var value = arg[properties[i]];
							if (value == null && i === 0 && type === 'gradient'
									&& 'stops' in arg) {
								value = {
									stops: arg.stops,
									radial: arg.radial
								};
							}
							if (parse)
								value = parsers[i].call(this, value);
							if (value != null)
								components[i] = value;
						}
						alpha = arg.alpha;
					}
				}
				if (this.__read && type)
					read = 1;
			}
			this._type = type || 'rgb';
			if (type === 'gradient')
				this._id = Color._id = (Color._id || 0) + 1;
			if (!components) {
				this._components = components = [];
				var parsers = componentParsers[this._type];
				for (var i = 0, l = parsers.length; i < l; i++) {
					var value = values && values[i];
					if (parse)
						value = parsers[i].call(this, value);
					if (value != null)
						components[i] = value;
				}
			}
			this._components = components;
			this._properties = types[this._type];
			this._alpha = alpha;
			if (this.__read)
				this.__read = read;
		},

		_serialize: function(options, dictionary) {
			var components = this.getComponents();
			return Base.serialize(
					/^(gray|rgb)$/.test(this._type)
						? components
						: [this._type].concat(components),
					options, true, dictionary);
		},

		_changed: function() {
			this._canvasStyle = null;
			if (this._owner)
				this._owner._changed(17);
		},

		clone: function() {
			return new Color(this._type, this._components.slice(), this._alpha);
		},

		_convert: function(type) {
			var converter;
			return this._type === type
					? this._components.slice()
					: (converter = converters[this._type + '-' + type])
						? converter.apply(this, this._components)
						: converters['rgb-' + type].apply(this,
							converters[this._type + '-rgb'].apply(this,
									this._components));
		},

		convert: function(type) {
			return new Color(type, this._convert(type), this._alpha);
		},

		getType: function() {
			return this._type;
		},

		setType: function(type) {
			this._components = this._convert(type);
			this._properties = types[type];
			this._type = type;
		},

		getComponents: function() {
			var components = this._components.slice();
			if (this._alpha != null)
				components.push(this._alpha);
			return components;
		},

		getAlpha: function() {
			return this._alpha != null ? this._alpha : 1;
		},

		setAlpha: function(alpha) {
			this._alpha = alpha == null ? null : Math.min(Math.max(alpha, 0), 1);
			this._changed();
		},

		hasAlpha: function() {
			return this._alpha != null;
		},

		equals: function(color) {
			if (Base.isPlainValue(color))
				color = Color.read(arguments);
			return color === this || color && this._type === color._type
					&& this._alpha === color._alpha
					&& Base.equals(this._components, color._components)
					|| false;
		},

		toString: function() {
			var properties = this._properties,
				parts = [],
				isGradient = this._type === 'gradient',
				f = Formatter.instance;
			for (var i = 0, l = properties.length; i < l; i++) {
				var value = this._components[i];
				if (value != null)
					parts.push(properties[i] + ': '
							+ (isGradient ? value : f.number(value)));
			}
			if (this._alpha != null)
				parts.push('alpha: ' + f.number(this._alpha));
			return '{ ' + parts.join(', ') + ' }';
		},

		toCSS: function(noAlpha) {
			var components = this._convert('rgb'),
				alpha = noAlpha || this._alpha == null ? 1 : this._alpha;
			components = [
				Math.round(components[0] * 255),
				Math.round(components[1] * 255),
				Math.round(components[2] * 255)
			];
			if (alpha < 1)
				components.push(alpha);
			return (components.length == 4 ? 'rgba(' : 'rgb(')
					+ components.join(',') + ')';
		},

		toCanvasStyle: function(ctx) {
			if (this._canvasStyle)
				return this._canvasStyle;
			if (this._type !== 'gradient')
				return this._canvasStyle = this.toCSS();
			var components = this._components,
				gradient = components[0],
				stops = gradient._stops,
				origin = components[1],
				destination = components[2],
				canvasGradient;
			if (gradient._radial) {
				var radius = destination.getDistance(origin),
					highlight = components[3];
				if (highlight) {
					var vector = highlight.subtract(origin);
					if (vector.getLength() > radius)
						highlight = origin.add(vector.normalize(radius - 0.1));
				}
				var start = highlight || origin;
				canvasGradient = ctx.createRadialGradient(start.x, start.y,
						0, origin.x, origin.y, radius);
			} else {
				canvasGradient = ctx.createLinearGradient(origin.x, origin.y,
						destination.x, destination.y);
			}
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i];
				canvasGradient.addColorStop(stop._rampPoint,
						stop._color.toCanvasStyle());
			}
			return this._canvasStyle = canvasGradient;
		},

		transform: function(matrix) {
			if (this._type === 'gradient') {
				var components = this._components;
				for (var i = 1, l = components.length; i < l; i++) {
					var point = components[i];
					matrix._transformPoint(point, point, true);
				}
				this._changed();
			}
		},

		statics: {
			_types: types,

			random: function() {
				var random = Math.random;
				return new Color(random(), random(), random());
			}
		}
	});
}, new function() {
	function clamp(value, hue) {
		return value < 0
				? 0
				: hue && value > 360
					? 360
					: !hue && value > 1
						? 1
						: value;
	}

	var operators = {
		add: function(a, b, hue) {
			return clamp(a + b, hue);
		},

		subtract: function(a, b, hue) {
			return clamp(a - b, hue);
		},

		multiply: function(a, b, hue) {
			return clamp(a * b, hue);
		},

		divide: function(a, b, hue) {
			return clamp(a / b, hue);
		}
	};

	return Base.each(operators, function(operator, name) {
		var options = { dontParse: /^(multiply|divide)$/.test(name) };

		this[name] = function(color) {
			color = Color.read(arguments, 0, 0, options);
			var type = this._type,
				properties = this._properties,
				components1 = this._components,
				components2 = color._convert(type);
			for (var i = 0, l = components1.length; i < l; i++)
				components2[i] = operator(components1[i], components2[i],
						properties[i] === 'hue');
			return new Color(type, components2,
					this._alpha != null
							? operator(this._alpha, color.getAlpha())
							: null);
		};
	}, {
	});
});

Base.each(Color._types, function(properties, type) {
	var ctor = this[Base.capitalize(type) + 'Color'] = function(arg) {
			var argType = arg != null && typeof arg,
				components = argType === 'object' && arg.length != null
					? arg
					: argType === 'string'
						? null
						: arguments;
			return components
					? new Color(type, components)
					: new Color(arg);
		};
	if (type.length == 3) {
		var acronym = type.toUpperCase();
		Color[acronym] = this[acronym + 'Color'] = ctor;
	}
}, Base.exports);

var Gradient = Base.extend({
	_class: 'Gradient',

	initialize: function Gradient(stops, radial) {
		this._id = Gradient._id = (Gradient._id || 0) + 1;
		if (stops && this._set(stops))
			stops = radial = null;
		if (!this._stops)
			this.setStops(stops || ['white', 'black']);
		if (this._radial == null)
			this.setRadial(typeof radial === 'string' && radial === 'radial'
					|| radial || false);
	},

	_serialize: function(options, dictionary) {
		return dictionary.add(this, function() {
			return Base.serialize([this._stops, this._radial],
					options, true, dictionary);
		});
	},

	_changed: function() {
		for (var i = 0, l = this._owners && this._owners.length; i < l; i++)
			this._owners[i]._changed();
	},

	_addOwner: function(color) {
		if (!this._owners)
			this._owners = [];
		this._owners.push(color);
	},

	_removeOwner: function(color) {
		var index = this._owners ? this._owners.indexOf(color) : -1;
		if (index != -1) {
			this._owners.splice(index, 1);
			if (this._owners.length === 0)
				delete this._owners;
		}
	},

	clone: function() {
		var stops = [];
		for (var i = 0, l = this._stops.length; i < l; i++)
			stops[i] = this._stops[i].clone();
		return new this.constructor(stops);
	},

	getStops: function() {
		return this._stops;
	},

	setStops: function(stops) {
		if (this.stops) {
			for (var i = 0, l = this._stops.length; i < l; i++)
				delete this._stops[i]._owner;
		}
		if (stops.length < 2)
			throw new Error(
					'Gradient stop list needs to contain at least two stops.');
		this._stops = GradientStop.readAll(stops, 0, false, true); 
		for (var i = 0, l = this._stops.length; i < l; i++) {
			var stop = this._stops[i];
			stop._owner = this;
			if (stop._defaultRamp)
				stop.setRampPoint(i / (l - 1));
		}
		this._changed();
	},

	getRadial: function() {
		return this._radial;
	},

	setRadial: function(radial) {
		this._radial = radial;
		this._changed();
	},

	equals: function(gradient) {
		if (gradient && gradient.constructor == this.constructor
				&& this._stops.length == gradient._stops.length) {
			for (var i = 0, l = this._stops.length; i < l; i++) {
				if (!this._stops[i].equals(gradient._stops[i]))
					return false;
			}
			return true;
		}
		return false;
	}
});

var GradientStop = Base.extend({
	_class: 'GradientStop',

	initialize: function GradientStop(arg0, arg1) {
		if (arg0) {
			var color, rampPoint;
			if (arg1 === undefined && Array.isArray(arg0)) {
				color = arg0[0];
				rampPoint = arg0[1];
			} else if (arg0.color) {
				color = arg0.color;
				rampPoint = arg0.rampPoint;
			} else {
				color = arg0;
				rampPoint = arg1;
			}
			this.setColor(color);
			this.setRampPoint(rampPoint);
		}
	},

	clone: function() {
		return new GradientStop(this._color.clone(), this._rampPoint);
	},

	_serialize: function(options, dictionary) {
		return Base.serialize([this._color, this._rampPoint], options, true, 
				dictionary);
	},

	_changed: function() {
		if (this._owner)
			this._owner._changed(17);
	},

	getRampPoint: function() {
		return this._rampPoint;
	},

	setRampPoint: function(rampPoint) {
		this._defaultRamp = rampPoint == null;
		this._rampPoint = rampPoint || 0;
		this._changed();
	},

	getColor: function() {
		return this._color;
	},

	setColor: function(color) {
		this._color = Color.read(arguments);
		if (this._color === color)
			this._color = color.clone();
		this._color._owner = this;
		this._changed();
	},

	equals: function(stop) {
		return stop === this || stop instanceof GradientStop
				&& this._color.equals(stop._color)
				&& this._rampPoint == stop._rampPoint
				|| false;
	}
});

var Style = Base.extend(new function() {
	var defaults = {
		fillColor: undefined,
		strokeColor: undefined,
		strokeWidth: 1,
		strokeCap: 'butt',
		strokeJoin: 'miter',
		miterLimit: 10,
		dashOffset: 0,
		dashArray: [],
		shadowColor: undefined,
		shadowBlur: 0,
		shadowOffset: new Point(),
		selectedColor: undefined,
		font: 'sans-serif',
		fontSize: 12,
		leading: null,
		justification: 'left'
	};

	var flags = {
		strokeWidth: 25,
		strokeCap: 25,
		strokeJoin: 25,
		miterLimit: 25,
		font: 5,
		fontSize: 5,
		leading: 5,
		justification: 5
	};

	var item = {},
		fields = {
			_defaults: defaults,
			_textDefaults: Base.merge(defaults, {
				fillColor: new Color() 
			})
		};

	Base.each(defaults, function(value, key) {
		var isColor = /Color$/.test(key),
			part = Base.capitalize(key),
			flag = flags[key],
			set = 'set' + part,
			get = 'get' + part;

		fields[set] = function(value) {
			var children = this._item && this._item._children;
			if (children && children.length > 0
					&& this._item._type !== 'compound-path') {
				for (var i = 0, l = children.length; i < l; i++)
					children[i]._style[set](value);
			} else {
				var old = this._values[key];
				if (old != value) {
					if (isColor) {
						if (old)
							delete old._owner;
						if (value && value.constructor === Color)
							value._owner = this._item;
					}
					this._values[key] = value;
					if (this._item)
						this._item._changed(flag || 17);
				}
			}
		};

		fields[get] = function() {
			var value,
				children = this._item && this._item._children;
			if (!children || children.length === 0 || arguments[0]
					|| this._item._type === 'compound-path') {
				var value = this._values[key];
				if (value === undefined) {
					value = this._defaults[key];
					if (value && value.clone)
						value = value.clone();
					this._values[key] = value;
				} else if (isColor && !(value && value.constructor === Color)) {
					this._values[key] = value = Color.read(
							[value], 0, 0, { readNull: true, clone: true });
					if (value)
						value._owner = this._item;
				}
				return value;
			}
			for (var i = 0, l = children.length; i < l; i++) {
				var childValue = children[i]._style[get]();
				if (i === 0) {
					value = childValue;
				} else if (!Base.equals(value, childValue)) {
					return undefined;
				}
			}
			return value;
		};

		item[get] = function() {
			return this._style[get]();
		};

		item[set] = function(value) {
			this._style[set](value);
		};
	});

	Item.inject(item);
	return fields;
}, {
	_class: 'Style',

	initialize: function Style(style, _item) {
		this._values = {};
		this._item = _item;
		if (_item instanceof TextItem)
			this._defaults = this._textDefaults;
		if (style)
			this.set(style);
	},

	set: function(style) {
		var isStyle = style instanceof Style,
			values = isStyle ? style._values : style;
		if (values) {
			for (var key in values) {
				if (key in this._defaults) {
					var value = values[key];
					this[key] = value && isStyle && value.clone
							? value.clone() : value;
				}
			}
		}
	},

	getLeading: function getLeading() {
		var leading = getLeading.base.call(this);
		return leading != null ? leading : this.getFontSize() * 1.2;
	},

	getFontStyle: function() {
		var size = this.getFontSize();
		return (/[a-z]/i.test(size) ? size + ' ' : size + 'px ')
				+ this.getFont();
	}

});

var DomElement = new function() {

	var special = /^(checked|value|selected|disabled)$/i,
		translated = { text: 'textContent', html: 'innerHTML' },
		unitless = { lineHeight: 1, zoom: 1, zIndex: 1, opacity: 1 };

	function create(nodes, parent) {
		var res = [];
		for (var i =  0, l = nodes && nodes.length; i < l;) {
			var el = nodes[i++];
			if (typeof el === 'string') {
				el = document.createElement(el);
			} else if (!el || !el.nodeType) {
				continue;
			}
			if (Base.isPlainObject(nodes[i]))
				DomElement.set(el, nodes[i++]);
			if (Array.isArray(nodes[i]))
				create(nodes[i++], el);
			if (parent)
				parent.appendChild(el);
			res.push(el);
		}
		return res;
	}

	return {
		create: function(nodes, parent) {
			var isArray = Array.isArray(nodes),
				res = create(isArray ? nodes : arguments, isArray ? parent : null);
			return res.length == 1 ? res[0] : res;
		},

		find: function(selector, root) {
			return (root || document).querySelector(selector);
		},

		findAll: function(selector, root) {
			return (root || document).querySelectorAll(selector);
		},

		get: function(el, key) {
			return el
				? special.test(key)
					? key === 'value' || typeof el[key] !== 'string'
						? el[key]
						: true
					: key in translated
						? el[translated[key]]
						: el.getAttribute(key)
				: null;
		},

		set: function(el, key, value) {
			if (typeof key !== 'string') {
				for (var name in key)
					if (key.hasOwnProperty(name))
						this.set(el, name, key[name]);
			} else if (!el || value === undefined) {
				return el;
			} else if (special.test(key)) {
				el[key] = value;
			} else if (key in translated) {
				el[translated[key]] = value;
			} else if (key === 'style') {
				this.setStyle(el, value);
			} else if (key === 'events') {
				DomEvent.add(el, value);
			} else {
				el.setAttribute(key, value);
			}
			return el;
		},

		getStyles: function(el) {
			var view = el && el.ownerDocument.defaultView;
			return view && view.getComputedStyle(el, '');
		},

		getStyle: function(el, key) {
			return el && el.style[key] || this.getStyles(el)[key] || null;
		},

		setStyle: function(el, key, value) {
			if (typeof key !== 'string') {
				for (var name in key)
					if (key.hasOwnProperty(name))
						this.setStyle(el, name, key[name]);
			} else {
				if (/^-?[\d\.]+$/.test(value) && !(key in unitless))
					value += 'px';
				el.style[key] = value;
			}
			return el;
		},

		hasClass: function(el, cls) {
			return new RegExp('\\s*' + cls + '\\s*').test(el.className);
		},

		addClass: function(el, cls) {
			el.className = (el.className + ' ' + cls).trim();
		},

		removeClass: function(el, cls) {
			el.className = el.className.replace(
				new RegExp('\\s*' + cls + '\\s*'), ' ').trim();
		},

		remove: function(el) {
			if (el.parentNode)
				el.parentNode.removeChild(el);
		},

		removeChildren: function(el) {
			while (el.firstChild)
				el.removeChild(el.firstChild);
		},

		getBounds: function(el, viewport) {
			var doc = el.ownerDocument,
				body = doc.body,
				html = doc.documentElement,
				rect;
			try {
				rect = el.getBoundingClientRect();
			} catch (e) {
				rect = { left: 0, top: 0, width: 0, height: 0 };
			}
			var x = rect.left - (html.clientLeft || body.clientLeft || 0),
				y = rect.top - (html.clientTop  || body.clientTop  || 0);
			if (!viewport) {
				var view = doc.defaultView;
				x += view.pageXOffset || html.scrollLeft || body.scrollLeft;
				y += view.pageYOffset || html.scrollTop || body.scrollTop;
			}
			return new Rectangle(x, y, rect.width, rect.height);
		},

		getViewportBounds: function(el) {
			var doc = el.ownerDocument,
				view = doc.defaultView,
				html = doc.documentElement;
			return new Rectangle(0, 0, 
				view.innerWidth || html.clientWidth,
				view.innerHeight || html.clientHeight
			);
		},

		getOffset: function(el, viewport) {
			return this.getBounds(el, viewport).getPoint();
		},

		getSize: function(el) {
			return this.getBounds(el, true).getSize();
		},

		isInvisible: function(el) {
			return this.getSize(el).equals(new Size(0, 0));
		},

		isInView: function(el) {
			return !this.isInvisible(el) && this.getViewportBounds(el).intersects(
					this.getBounds(el, true));
		}
	};
};

var DomEvent = {
	add: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.addEventListener) {
				el.addEventListener(type, func, false);
			} else if (el.attachEvent) {
				el.attachEvent('on' + type, func.bound = function() {
					func.call(el, window.event);
				});
			}
		}
	},

	remove: function(el, events) {
		for (var type in events) {
			var func = events[type];
			if (el.removeEventListener) {
				el.removeEventListener(type, func, false);
			} else if (el.detachEvent) {
				el.detachEvent('on' + type, func.bound);
			}
		}
	},

	getPoint: function(event) {
		var pos = event.targetTouches
				? event.targetTouches.length
					? event.targetTouches[0]
					: event.changedTouches[0]
				: event;
		return new Point(
			pos.pageX || pos.clientX + document.documentElement.scrollLeft,
			pos.pageY || pos.clientY + document.documentElement.scrollTop
		);
	},

	getTarget: function(event) {
		return event.target || event.srcElement;
	},

	getOffset: function(event, target) {
		return DomEvent.getPoint(event).subtract(DomElement.getOffset(
				target || DomEvent.getTarget(event)));
	},

	preventDefault: function(event) {
		if (event.preventDefault) {
			event.preventDefault();
		} else {
			event.returnValue = false;
		}
	},

	stopPropagation: function(event) {
		if (event.stopPropagation) {
			event.stopPropagation();
		} else {
			event.cancelBubble = true;
		}
	},

	stop: function(event) {
		DomEvent.stopPropagation(event);
		DomEvent.preventDefault(event);
	}
};

DomEvent.requestAnimationFrame = new function() {
	var part = 'equestAnimationFrame',
		request = window['r' + part] || window['webkitR' + part]
			|| window['mozR' + part] || window['oR' + part]
			|| window['msR' + part];
	if (request) {
		request(function(time) {
			if (time == null)
				request = null;
		});
	}

	var callbacks = [],
		focused = true,
		timer;

	DomEvent.add(window, {
		focus: function() {
			focused = true;
		},
		blur: function() {
			focused = false;
		}
	});

	return function(callback, element) {
		if (request)
			return request(callback, element);
		callbacks.push([callback, element]);
		if (timer)
			return;
		timer = setInterval(function() {
			for (var i = callbacks.length - 1; i >= 0; i--) {
				var entry = callbacks[i],
					func = entry[0],
					el = entry[1];
				if (!el || (PaperScope.getAttribute(el, 'keepalive') == 'true'
						|| focused) && DomElement.isInView(el)) {
					callbacks.splice(i, 1);
					func(Date.now());
				}
			}
		}, 1000 / 60);
	};
};

var View = Base.extend(Callback, {
	_class: 'View',

	initialize: function View(element) {
		this._scope = paper;
		this._project = paper.project;
		this._element = element;
		var size;
		this._id = element.getAttribute('id');
		if (this._id == null)
			element.setAttribute('id', this._id = 'view-' + View._id++);
		DomEvent.add(element, this._viewHandlers);
		if (PaperScope.hasAttribute(element, 'resize')) {
			var offset = DomElement.getOffset(element, true),
				that = this;
			size = DomElement.getViewportBounds(element)
					.getSize().subtract(offset);
			this._windowHandlers = {
				resize: function() {
					if (!DomElement.isInvisible(element))
						offset = DomElement.getOffset(element, true);
					that.setViewSize(DomElement.getViewportBounds(element)
							.getSize().subtract(offset));
				}
			};
			DomEvent.add(window, this._windowHandlers);
		} else {
			size = new Size(parseInt(element.getAttribute('width'), 10),
						parseInt(element.getAttribute('height'), 10));
			if (size.isNaN())
			  size = DomElement.getSize(element);
		}
		element.width = size.width;
		element.height = size.height;
		if (PaperScope.hasAttribute(element, 'stats')
				&& typeof Stats !== 'undefined') {
			this._stats = new Stats();
			var stats = this._stats.domElement,
				style = stats.style,
				offset = DomElement.getOffset(element);
			style.position = 'absolute';
			style.left = offset.x + 'px';
			style.top = offset.y + 'px';
			document.body.appendChild(stats);
		}
		View._views.push(this);
		View._viewsById[this._id] = this;
		this._viewSize = new LinkedSize(size.width, size.height,
				this, 'setViewSize');
		this._matrix = new Matrix();
		this._zoom = 1;
		if (!View._focused)
			View._focused = this;
		this._frameItems = {};
		this._frameItemCount = 0;
	},

	remove: function() {
		if (!this._project)
			return false;
		if (View._focused == this)
			View._focused = null;
		View._views.splice(View._views.indexOf(this), 1);
		delete View._viewsById[this._id];
		if (this._project.view == this)
			this._project.view = null;
		DomEvent.remove(this._element, this._viewHandlers);
		DomEvent.remove(window, this._windowHandlers);
		this._element = this._project = null;
		this.detach('frame');
		this._frameItems = {};
		return true;
	},

	_events: {
		onFrame: {
			install: function() {
				if (!this._requested) {
					this._animate = true;
					this._requestFrame();
				}
			},

			uninstall: function() {
				this._animate = false;
			}
		},

		onResize: {}
	},

	_animate: false,
	_time: 0,
	_count: 0,

	_requestFrame: function() {
		var that = this;
		DomEvent.requestAnimationFrame(function() {
			that._requested = false;
			if (!that._animate)
				return;
			that._requestFrame();
			that._handleFrame();
		}, this._element);
		this._requested = true;
	},

	_handleFrame: function() {
		paper = this._scope;
		var now = Date.now() / 1000,
			delta = this._before ? now - this._before : 0;
		this._before = now;
		this._handlingFrame = true;
		this.fire('frame', Base.merge({
			delta: delta,
			time: this._time += delta,
			count: this._count++
		}));
		if (this._stats)
			this._stats.update();
		this._handlingFrame = false;
		this.draw(true);
	},

	_animateItem: function(item, animate) {
		var items = this._frameItems;
		if (animate) {
			items[item._id] = {
				item: item,
				time: 0,
				count: 0
			};
			if (++this._frameItemCount === 1)
				this.attach('frame', this._handleFrameItems);
		} else {
			delete items[item._id];
			if (--this._frameItemCount === 0) {
				this.detach('frame', this._handleFrameItems);
			}
		}
	},

	_handleFrameItems: function(event) {
		for (var i in this._frameItems) {
			var entry = this._frameItems[i];
			entry.item.fire('frame', Base.merge(event, {
				time: entry.time += event.delta,
				count: entry.count++
			}));
		}
	},

	_redraw: function() {
		this._project._needsRedraw = true;
		if (this._handlingFrame)
			return;
		if (this._animate) {
			this._handleFrame();
		} else {
			this.draw();
		}
	},

	_transform: function(matrix) {
		this._matrix.concatenate(matrix);
		this._bounds = null;
		this._inverse = null;
		this._redraw();
	},

	getElement: function() {
		return this._element;
	},

	getViewSize: function() {
		return this._viewSize;
	},

	setViewSize: function(size) {
		size = Size.read(arguments);
		var delta = size.subtract(this._viewSize);
		if (delta.isZero())
			return;
		this._element.width = size.width;
		this._element.height = size.height;
		this._viewSize.set(size.width, size.height, true);
		this._bounds = null; 
		this.fire('resize', {
			size: size,
			delta: delta
		});
		this._redraw();
	},

	getBounds: function() {
		if (!this._bounds)
			this._bounds = this._getInverse()._transformBounds(
					new Rectangle(new Point(), this._viewSize));
		return this._bounds;
	},

	getSize: function() {
		return this.getBounds().getSize(arguments[0]);
	},

	getCenter: function() {
		return this.getBounds().getCenter(arguments[0]);
	},

	setCenter: function(center) {
		center = Point.read(arguments);
		this.scrollBy(center.subtract(this.getCenter()));
	},

	getZoom: function() {
		return this._zoom;
	},

	setZoom: function(zoom) {
		this._transform(new Matrix().scale(zoom / this._zoom,
			this.getCenter()));
		this._zoom = zoom;
	},

	isVisible: function() {
		return DomElement.isInView(this._element);
	},

	scrollBy: function() {
		this._transform(new Matrix().translate(Point.read(arguments).negate()));
	},

	projectToView: function() {
		return this._matrix._transformPoint(Point.read(arguments));
	},

	viewToProject: function() {
		return this._getInverse()._transformPoint(Point.read(arguments));
	},

	_getInverse: function() {
		if (!this._inverse)
			this._inverse = this._matrix.inverted();
		return this._inverse;
	}

}, {
	statics: {
		_views: [],
		_viewsById: {},
		_id: 0,

		create: function(element) {
			if (typeof element === 'string')
				element = document.getElementById(element);
			return new CanvasView(element);
		}
	}
}, new function() {
	var tool,
		prevFocus,
		tempFocus,
		dragging = false;

	function getView(event) {
		var target = DomEvent.getTarget(event);
		return target.getAttribute && View._viewsById[target.getAttribute('id')];
	}

	function viewToProject(view, event) {
		return view.viewToProject(DomEvent.getOffset(event, view._element));
	}

	function updateFocus() {
		if (!View._focused || !View._focused.isVisible()) {
			for (var i = 0, l = View._views.length; i < l; i++) {
				var view = View._views[i];
				if (view && view.isVisible()) {
					View._focused = tempFocus = view;
					break;
				}
			}
		}
	}

	function mousedown(event) {
		var view = View._focused = getView(event),
			point = viewToProject(view, event);
		dragging = true;
		if (view._onMouseDown)
			view._onMouseDown(event, point);
		if (tool = view._scope._tool)
			tool._onHandleEvent('mousedown', point, event);
		view.draw(true);
	}

	function mousemove(event) {
		var view;
		if (!dragging) {
			view = getView(event);
			if (view) {
				prevFocus = View._focused;
				View._focused = tempFocus = view;
			} else if (tempFocus && tempFocus == View._focused) {
				View._focused = prevFocus;
				updateFocus();
			}
		}
		if (!(view = view || View._focused))
			return;
		var point = event && viewToProject(view, event);
		if (view._onMouseMove)
			view._onMouseMove(event, point);
		if (tool = view._scope._tool) {
			if (tool._onHandleEvent(dragging && tool.responds('mousedrag')
					? 'mousedrag' : 'mousemove', point, event))
				DomEvent.stop(event);
		}
		view.draw(true);
	}

	function mouseup(event) {
		var view = View._focused;
		if (!view || !dragging)
			return;
		var point = viewToProject(view, event);
		curPoint = null;
		dragging = false;
		if (view._onMouseUp)
			view._onMouseUp(event, point);
		if (tool && tool._onHandleEvent('mouseup', point, event))
			DomEvent.stop(event);
		view.draw(true);
	}

	function selectstart(event) {
		if (dragging)
			DomEvent.stop(event);
	}

	DomEvent.add(document, {
		mousemove: mousemove,
		mouseup: mouseup,
		touchmove: mousemove,
		touchend: mouseup,
		selectstart: selectstart,
		scroll: updateFocus
	});

	DomEvent.add(window, {
		load: updateFocus
	});

	return {
		_viewHandlers: {
			mousedown: mousedown,
			touchstart: mousedown,
			selectstart: selectstart
		},

		statics: {
			updateFocus: updateFocus
		}
	};
});

var CanvasView = View.extend({
	_class: 'CanvasView',

	initialize: function CanvasView(canvas) {
		if (!(canvas instanceof HTMLCanvasElement)) {
			var size = Size.read(arguments, 1);
			if (size.isZero())
				size = new Size(1024, 768);
			canvas = CanvasProvider.getCanvas(size);
		}
		this._context = canvas.getContext('2d');
		this._eventCounters = {};
		View.call(this, canvas);
	},

	draw: function(checkRedraw) {
		if (checkRedraw && !this._project._needsRedraw)
			return false;
		var ctx = this._context,
			size = this._viewSize;
		ctx.clearRect(0, 0, size._width + 1, size._height + 1);
		this._project.draw(ctx, this._matrix);
		this._project._needsRedraw = false;
		return true;
	}
}, new function() { 

	var downPoint,
		lastPoint,
		overPoint,
		downItem,
		lastItem,
		overItem,
		hasDrag,
		doubleClick,
		clickTime;

	function callEvent(type, event, point, target, lastPoint, bubble) {
		var item = target,
			mouseEvent;
		while (item) {
			if (item.responds(type)) {
				if (!mouseEvent)
					mouseEvent = new MouseEvent(type, event, point, target,
							lastPoint ? point.subtract(lastPoint) : null);
				if (item.fire(type, mouseEvent)
						&& (!bubble || mouseEvent._stopped))
					return false;
			}
			item = item.getParent();
		}
		return true;
	}

	function handleEvent(view, type, event, point, lastPoint) {
		if (view._eventCounters[type]) {
			var project = view._project,
				hit = project.hitTest(point, {
					tolerance: project.options.hitTolerance || 0,
					fill: true,
					stroke: true
				}),
				item = hit && hit.item;
			if (item) {
				if (type === 'mousemove' && item != overItem)
					lastPoint = point;
				if (type !== 'mousemove' || !hasDrag)
					callEvent(type, event, point, item, lastPoint);
				return item;
			}
		}
	}

	return {
		_onMouseDown: function(event, point) {
			var item = handleEvent(this, 'mousedown', event, point);
			doubleClick = lastItem == item && (Date.now() - clickTime < 300);
			downItem = lastItem = item;
			downPoint = lastPoint = overPoint = point;
			hasDrag = downItem && downItem.responds('mousedrag');
		},

		_onMouseUp: function(event, point) {
			var item = handleEvent(this, 'mouseup', event, point);
			if (hasDrag) {
				if (lastPoint && !lastPoint.equals(point))
					callEvent('mousedrag', event, point, downItem, lastPoint);
				if (item != downItem) {
					overPoint = point;
					callEvent('mousemove', event, point, item, overPoint);
				}
			}
			if (item === downItem) {
				clickTime = Date.now();
				if (!doubleClick
						|| callEvent('doubleclick', event, downPoint, item))
					callEvent('click', event, downPoint, item);
				doubleClick = false;
			}
			downItem = null;
			hasDrag = false;
		},

		_onMouseMove: function(event, point) {
			if (downItem)
				callEvent('mousedrag', event, point, downItem, lastPoint);
			var item = handleEvent(this, 'mousemove', event, point, overPoint);
			lastPoint = overPoint = point;
			if (item !== overItem) {
				callEvent('mouseleave', event, point, overItem);
				overItem = item;
				callEvent('mouseenter', event, point, item);
			}
		}
	};
});

var Event = Base.extend({
	_class: 'Event',

	initialize: function Event(event) {
		this.event = event;
	},

	preventDefault: function() {
		this._prevented = true;
		DomEvent.preventDefault(this.event);
	},

	stopPropagation: function() {
		this._stopped = true;
		DomEvent.stopPropagation(this.event);
	},

	stop: function() {
		this.stopPropagation();
		this.preventDefault();
	},

	getModifiers: function() {
		return Key.modifiers;
	}
});

var KeyEvent = Event.extend({
	_class: 'KeyEvent',

	initialize: function KeyEvent(down, key, character, event) {
		Event.call(this, event);
		this.type = down ? 'keydown' : 'keyup';
		this.key = key;
		this.character = character;
	},

	toString: function() {
		return "{ type: '" + this.type
				+ "', key: '" + this.key
				+ "', character: '" + this.character
				+ "', modifiers: " + this.getModifiers()
				+ " }";
	}
});

var Key = new function() {

	var keys = {
		8: 'backspace',
		9: 'tab',
		13: 'enter',
		16: 'shift',
		17: 'control',
		18: 'option',
		19: 'pause',
		20: 'caps-lock',
		27: 'escape',
		32: 'space',
		35: 'end',
		36: 'home',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		46: 'delete',
		91: 'command',
		93: 'command', 
		224: 'command'  
	},

	modifiers = Base.merge({
		shift: false,
		control: false,
		option: false,
		command: false,
		capsLock: false,
		space: false
	}),

	charCodeMap = {}, 
	keyMap = {}, 
	downCode; 

	function handleKey(down, keyCode, charCode, event) {
		var character = String.fromCharCode(charCode),
			key = keys[keyCode] || character.toLowerCase(),
			type = down ? 'keydown' : 'keyup',
			view = View._focused,
			scope = view && view.isVisible() && view._scope,
			tool = scope && scope._tool;
		keyMap[key] = down;
		if (tool && tool.responds(type)) {
			tool.fire(type, new KeyEvent(down, key, character, event));
			if (view)
				view.draw(true);
		}
	}

	DomEvent.add(document, {
		keydown: function(event) {
			var code = event.which || event.keyCode;
			var key = keys[code], name;
			if (key) {
				if ((name = Base.camelize(key)) in modifiers)
					modifiers[name] = true;
				charCodeMap[code] = 0;
				handleKey(true, code, null, event);
			} else {
				downCode = code;
			}
		},

		keypress: function(event) {
			if (downCode != null) {
				var code = event.which || event.keyCode;
				charCodeMap[downCode] = code;
				handleKey(true, downCode, code, event);
				downCode = null;
			}
		},

		keyup: function(event) {
			var code = event.which || event.keyCode,
				key = keys[code], name;
			if (key && (name = Base.camelize(key)) in modifiers)
				modifiers[name] = false;
			if (charCodeMap[code] != null) {
				handleKey(false, code, charCodeMap[code], event);
				delete charCodeMap[code];
			}
		}
	});

	return {
		modifiers: modifiers,

		isDown: function(key) {
			return !!keyMap[key];
		}
	};
};

var MouseEvent = Event.extend({
	_class: 'MouseEvent',

	initialize: function MouseEvent(type, event, point, target, delta) {
		Event.call(this, event);
		this.type = type;
		this.point = point;
		this.target = target;
		this.delta = delta;
	},

	toString: function() {
		return "{ type: '" + this.type
				+ "', point: " + this.point
				+ ', target: ' + this.target
				+ (this.delta ? ', delta: ' + this.delta : '')
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});

 Base.extend(Callback, {
	_class: 'Palette',
	_events: [ 'onChange' ],

	initialize: function Palette(title, components, values) {
		var parent = DomElement.find('.palettejs-panel')
			|| DomElement.find('body').appendChild(
				DomElement.create('div', { 'class': 'palettejs-panel' }));
		this._element = parent.appendChild(
			DomElement.create('table', { 'class': 'palettejs-pane' })),
		this._title = title;
		if (!values)
			values = {};
		for (var name in (this._components = components)) {
			var component = components[name];
			if (!(component instanceof Component)) {
				if (component.value == null)
					component.value = values[name];
				component.name = name;
				component = components[name] = new Component(component);
			}
			this._element.appendChild(component._element);
			component._palette = this;
			if (values[name] === undefined)
				values[name] = component.value;
		}
		this._values = Base.each(values, function(value, name) {
			var component = components[name];
			if (component) {
				Base.define(values, name, {
					enumerable: true,
					configurable: true,
					get: function() {
						return component._value;
					},
					set: function(val) {
						component.setValue(val);
					}
				});
			}
		});
		if (window.paper)
			paper.palettes.push(this);
	},

	reset: function() {
		for (var i in this._components)
			this._components[i].reset();
	},

	remove: function() {
		DomElement.remove(this._element);
	}
});

var Component = Base.extend(Callback, {
	_class: 'Component',
	_events: [ 'onChange', 'onClick' ],

	_types: {
		'boolean': {
			type: 'checkbox',
			value: 'checked'
		},

		string: {
			type: 'text'
		},

		number: {
			type: 'number',
			number: true
		},

		button: {
			type: 'button'
		},

		text: {
			tag: 'div',
			value: 'text'
		},

		slider: {
			type: 'range',
			number: true
		},

		list: {
			tag: 'select',

			options: function() {
				DomElement.removeChildren(this._inputItem);
				DomElement.create(Base.each(this._options, function(option) {
					this.push('option', { value: option, text: option });
				}, []), this._inputItem);
			}
		}
	},

	initialize: function Component(obj) {
		this._type = obj.type in this._types
			? obj.type
			: 'options' in obj
				? 'list'
				: 'onClick' in obj
					? 'button'
					: typeof obj.value;
		this._info = this._types[this._type] || { type: this._type };
		var that = this,
			fireChange = false;
		this._inputItem = DomElement.create(this._info.tag || 'input', {
			type: this._info.type,
			events: {
				change: function() {
					that.setValue(
						DomElement.get(this, that._info.value || 'value'));
					if (fireChange) {
						that._palette.fire('change', that, that.name, that._value);
						that.fire('change', that._value);
					}
				},
				click: function() {
					that.fire('click');
				}
			}
		});
		this._element = DomElement.create('tr', [
			this._labelItem = DomElement.create('td'),
			'td', [this._inputItem]
		]);
		Base.each(obj, function(value, key) {
			this[key] = value;
		}, this);
		this._defaultValue = this._value;
		fireChange = true;
	},

	getType: function() {
		return this._type;
	},

	getLabel: function() {
		return this._label;
	},

	setLabel: function(label) {
		this._label = label;
		DomElement.set(this._labelItem, 'text', label + ':');
	},

	getOptions: function() {
		return this._options;
	},

	setOptions: function(options) {
		this._options = options;
		if (this._info.options)
			this._info.options.call(this);
	},

	getValue: function() {
		return this._value;
	},

	setValue: function(value) {
		var key = this._info.value || 'value';
		DomElement.set(this._inputItem, key, value);
		value = DomElement.get(this._inputItem, key);
		this._value = this._info.number ? parseFloat(value, 10) : value;
	},

	getRange: function() {
		return [parseFloat(DomElement.get(this._inputItem, 'min')),
				parseFloat(DomElement.get(this._inputItem, 'max'))];
	},

	setRange: function(min, max) {
		var range = Array.isArray(min) ? min : [min, max];
		DomElement.set(this._inputItem, { min: range[0], max: range[1] });
	},

	getMin: function() {
		return this.getRange()[0];
	},

	setMin: function(min) {
		this.setRange(min, this.getMax());
	},

	getMax: function() {
		return this.getRange()[1];
	},

	setMax: function(max) {
		this.setRange(this.getMin(), max);
	},

	getStep: function() {
		return parseFloat(DomElement.get(this._inputItem, 'step'));
	},

	setStep: function(step) {
		DomElement.set(this._inputItem, 'step', step);
	},

	reset: function() {
		this.setValue(this._defaultValue);
	}
});

var ToolEvent = Event.extend({
	_class: 'ToolEvent',
	_item: null,

	initialize: function ToolEvent(tool, type, event) {
		this.tool = tool;
		this.type = type;
		this.event = event;
	},

	_choosePoint: function(point, toolPoint) {
		return point ? point : toolPoint ? toolPoint.clone() : null;
	},

	getPoint: function() {
		return this._choosePoint(this._point, this.tool._point);
	},

	setPoint: function(point) {
		this._point = point;
	},

	getLastPoint: function() {
		return this._choosePoint(this._lastPoint, this.tool._lastPoint);
	},

	setLastPoint: function(lastPoint) {
		this._lastPoint = lastPoint;
	},

	getDownPoint: function() {
		return this._choosePoint(this._downPoint, this.tool._downPoint);
	},

	setDownPoint: function(downPoint) {
		this._downPoint = downPoint;
	},

	getMiddlePoint: function() {
		if (!this._middlePoint && this.tool._lastPoint) {
			return this.tool._point.add(this.tool._lastPoint).divide(2);
		}
		return this._middlePoint;
	},

	setMiddlePoint: function(middlePoint) {
		this._middlePoint = middlePoint;
	},

	getDelta: function() {
		return !this._delta && this.tool._lastPoint
		 		? this.tool._point.subtract(this.tool._lastPoint)
				: this._delta;
	},

	setDelta: function(delta) {
		this._delta = delta;
	},

	getCount: function() {
		return /^mouse(down|up)$/.test(this.type)
				? this.tool._downCount
				: this.tool._count;
	},

	setCount: function(count) {
		this.tool[/^mouse(down|up)$/.test(this.type) ? 'downCount' : 'count']
			= count;
	},

	getItem: function() {
		if (!this._item) {
			var result = this.tool._scope.project.hitTest(this.getPoint());
			if (result) {
				var item = result.item,
					parent = item._parent;
				while (/^(group|compound-path)$/.test(parent._type)) {
					item = parent;
					parent = parent._parent;
				}
				this._item = item;
			}
		}
		return this._item;
	},
	setItem: function(item) {
		this._item = item;
	},

	toString: function() {
		return '{ type: ' + this.type
				+ ', point: ' + this.getPoint()
				+ ', count: ' + this.getCount()
				+ ', modifiers: ' + this.getModifiers()
				+ ' }';
	}
});

var Tool = PaperScopeItem.extend({
	_class: 'Tool',
	_list: 'tools',
	_reference: '_tool', 
	_events: [ 'onActivate', 'onDeactivate', 'onEditOptions',
			'onMouseDown', 'onMouseUp', 'onMouseDrag', 'onMouseMove',
			'onKeyDown', 'onKeyUp' ],

	initialize: function Tool(props) {
		PaperScopeItem.call(this);
		this._firstMove = true;
		this._count = 0;
		this._downCount = 0;
		this._set(props);
	},

	getMinDistance: function() {
		return this._minDistance;
	},

	setMinDistance: function(minDistance) {
		this._minDistance = minDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._minDistance > this._maxDistance) {
			this._maxDistance = this._minDistance;
		}
	},

	getMaxDistance: function() {
		return this._maxDistance;
	},

	setMaxDistance: function(maxDistance) {
		this._maxDistance = maxDistance;
		if (this._minDistance != null && this._maxDistance != null
				&& this._maxDistance < this._minDistance) {
			this._minDistance = maxDistance;
		}
	},

	getFixedDistance: function() {
		return this._minDistance == this._maxDistance
			? this._minDistance : null;
	},

	setFixedDistance: function(distance) {
		this._minDistance = distance;
		this._maxDistance = distance;
	},

	_updateEvent: function(type, point, minDistance, maxDistance, start,
			needsChange, matchMaxDistance) {
		if (!start) {
			if (minDistance != null || maxDistance != null) {
				var minDist = minDistance != null ? minDistance : 0,
					vector = point.subtract(this._point),
					distance = vector.getLength();
				if (distance < minDist)
					return false;
				var maxDist = maxDistance != null ? maxDistance : 0;
				if (maxDist != 0) {
					if (distance > maxDist) {
						point = this._point.add(vector.normalize(maxDist));
					} else if (matchMaxDistance) {
						return false;
					}
				}
			}
			if (needsChange && point.equals(this._point))
				return false;
		}
		this._lastPoint = start && type == 'mousemove' ? point : this._point;
		this._point = point;
		switch (type) {
		case 'mousedown':
			this._lastPoint = this._downPoint;
			this._downPoint = this._point;
			this._downCount++;
			break;
		case 'mouseup':
			this._lastPoint = this._downPoint;
			break;
		}
		this._count = start ? 0 : this._count + 1;
		return true;
	},

	_fireEvent: function(type, event) {
		var sets = paper.project._removeSets;
		if (sets) {
			if (type === 'mouseup')
				sets.mousedrag = null;
			var set = sets[type];
			if (set) {
				for (var id in set) {
					var item = set[id];
					for (var key in sets) {
						var other = sets[key];
						if (other && other != set)
							delete other[item._id];
					}
					item.remove();
				}
				sets[type] = null;
			}
		}
		return this.responds(type)
				&& this.fire(type, new ToolEvent(this, type, event));
	},

	_onHandleEvent: function(type, point, event) {
		paper = this._scope;
		var called = false;
		switch (type) {
		case 'mousedown':
			this._updateEvent(type, point, null, null, true, false, false);
			called = this._fireEvent(type, event);
			break;
		case 'mousedrag':
			var needsChange = false,
				matchMaxDistance = false;
			while (this._updateEvent(type, point, this.minDistance,
					this.maxDistance, false, needsChange, matchMaxDistance)) {
				called = this._fireEvent(type, event) || called;
				needsChange = true;
				matchMaxDistance = true;
			}
			break;
		case 'mouseup':
			if (!point.equals(this._point)
					&& this._updateEvent('mousedrag', point, this.minDistance,
							this.maxDistance, false, false, false)) {
				called = this._fireEvent('mousedrag', event);
			}
			this._updateEvent(type, point, null, this.maxDistance, false,
					false, false);
			called = this._fireEvent(type, event) || called;
			this._updateEvent(type, point, null, null, true, false, false);
			this._firstMove = true;
			break;
		case 'mousemove':
			while (this._updateEvent(type, point, this.minDistance,
					this.maxDistance, this._firstMove, true, false)) {
				called = this._fireEvent(type, event) || called;
				this._firstMove = false;
			}
			break;
		}
		return called;
	}

});

var CanvasProvider = {
	canvases: [],

	getCanvas: function(width, height) {
		var size = height === undefined ? width : new Size(width, height),
			canvas,
			init = true;
		if (this.canvases.length) {
			canvas = this.canvases.pop();
		} else {
			canvas = document.createElement('canvas');

		}
		var ctx = canvas.getContext('2d');
		ctx.save();
		if (canvas.width === size.width && canvas.height === size.height) {
			if (init)
				ctx.clearRect(0, 0, size.width + 1, size.height + 1);
		} else {
			canvas.width = size.width;
			canvas.height = size.height;
		}
		return canvas;
	},

	getContext: function(width, height) {
		return this.getCanvas(width, height).getContext('2d');
	},

	release: function(obj) {
		var canvas = obj.canvas ? obj.canvas : obj;
		canvas.getContext('2d').restore();
		this.canvases.push(canvas);
	}
};

var BlendMode = new function() {
	var min = Math.min,
		max = Math.max,
		abs = Math.abs,
		sr, sg, sb, sa, 
		br, bg, bb, ba, 
		dr, dg, db;     

	function getLum(r, g, b) {
		return 0.2989 * r + 0.587 * g + 0.114 * b;
	}

	function setLum(r, g, b, l) {
		var d = l - getLum(r, g, b);
		dr = r + d;
		dg = g + d;
		db = b + d;
		var l = getLum(dr, dg, db),
			mn = min(dr, dg, db),
			mx = max(dr, dg, db);
		if (mn < 0) {
			var lmn = l - mn;
			dr = l + (dr - l) * l / lmn;
			dg = l + (dg - l) * l / lmn;
			db = l + (db - l) * l / lmn;
		}
		if (mx > 255) {
			var ln = 255 - l,
				mxl = mx - l;
			dr = l + (dr - l) * ln / mxl;
			dg = l + (dg - l) * ln / mxl;
			db = l + (db - l) * ln / mxl;
		}
	}

	function getSat(r, g, b) {
		return max(r, g, b) - min(r, g, b);
	}

	function setSat(r, g, b, s) {
		var col = [r, g, b],
			mx = max(r, g, b), 
			mn = min(r, g, b), 
			md; 
		mn = mn === r ? 0 : mn === g ? 1 : 2;
		mx = mx === r ? 0 : mx === g ? 1 : 2;
		md = min(mn, mx) === 0 ? max(mn, mx) === 1 ? 2 : 1 : 0;
		if (col[mx] > col[mn]) {
			col[md] = (col[md] - col[mn]) * s / (col[mx] - col[mn]);
			col[mx] = s;
		} else {
			col[md] = col[mx] = 0;
		}
		col[mn] = 0;
		dr = col[0];
		dg = col[1];
		db = col[2];
	}

	var modes = {
		multiply: function() {
			dr = br * sr / 255;
			dg = bg * sg / 255;
			db = bb * sb / 255;
		},

		screen: function() {
			dr = br + sr - (br * sr / 255);
			dg = bg + sg - (bg * sg / 255);
			db = bb + sb - (bb * sb / 255);
		},

		overlay: function() {
			dr = br < 128 ? 2 * br * sr / 255 : 255 - 2 * (255 - br) * (255 - sr) / 255;
			dg = bg < 128 ? 2 * bg * sg / 255 : 255 - 2 * (255 - bg) * (255 - sg) / 255;
			db = bb < 128 ? 2 * bb * sb / 255 : 255 - 2 * (255 - bb) * (255 - sb) / 255;
		},

		'soft-light': function() {
			var t = sr * br / 255;
			dr = t + br * (255 - (255 - br) * (255 - sr) / 255 - t) / 255;
			t = sg * bg / 255;
			dg = t + bg * (255 - (255 - bg) * (255 - sg) / 255 - t) / 255;
			t = sb * bb / 255;
			db = t + bb * (255 - (255 - bb) * (255 - sb) / 255 - t) / 255;
		},

		'hard-light': function() {
			dr = sr < 128 ? 2 * sr * br / 255 : 255 - 2 * (255 - sr) * (255 - br) / 255;
			dg = sg < 128 ? 2 * sg * bg / 255 : 255 - 2 * (255 - sg) * (255 - bg) / 255;
			db = sb < 128 ? 2 * sb * bb / 255 : 255 - 2 * (255 - sb) * (255 - bb) / 255;
		},

		'color-dodge': function() {
			dr = br === 0 ? 0 : sr === 255 ? 255 : min(255, 255 * br / (255 - sr));
			dg = bg === 0 ? 0 : sg === 255 ? 255 : min(255, 255 * bg / (255 - sg));
			db = bb === 0 ? 0 : sb === 255 ? 255 : min(255, 255 * bb / (255 - sb));
		},

		'color-burn': function() {
			dr = br === 255 ? 255 : sr === 0 ? 0 : max(0, 255 - (255 - br) * 255 / sr);
			dg = bg === 255 ? 255 : sg === 0 ? 0 : max(0, 255 - (255 - bg) * 255 / sg);
			db = bb === 255 ? 255 : sb === 0 ? 0 : max(0, 255 - (255 - bb) * 255 / sb);
		},

		darken: function() {
			dr = br < sr ? br : sr;
			dg = bg < sg ? bg : sg;
			db = bb < sb ? bb : sb;
		},

		lighten: function() {
			dr = br > sr ? br : sr;
			dg = bg > sg ? bg : sg;
			db = bb > sb ? bb : sb;
		},

		difference: function() {
			dr = br - sr;
			if (dr < 0)
				dr = -dr;
			dg = bg - sg;
			if (dg < 0)
				dg = -dg;
			db = bb - sb;
			if (db < 0)
				db = -db;
		},

		exclusion: function() {
			dr = br + sr * (255 - br - br) / 255;
			dg = bg + sg * (255 - bg - bg) / 255;
			db = bb + sb * (255 - bb - bb) / 255;
		},

		hue: function() {
			setSat(sr, sg, sb, getSat(br, bg, bb));
			setLum(dr, dg, db, getLum(br, bg, bb));
		},

		saturation: function() {
			setSat(br, bg, bb, getSat(sr, sg, sb));
			setLum(dr, dg, db, getLum(br, bg, bb));
		},

		luminosity: function() {
			setLum(br, bg, bb, getLum(sr, sg, sb));
		},

		color: function() {
			setLum(sr, sg, sb, getLum(br, bg, bb));
		},

		add: function() {
			dr = min(br + sr, 255);
			dg = min(bg + sg, 255);
			db = min(bb + sb, 255);
		},

		subtract: function() {
			dr = max(br - sr, 0);
			dg = max(bg - sg, 0);
			db = max(bb - sb, 0);
		},

		average: function() {
			dr = (br + sr) / 2;
			dg = (bg + sg) / 2;
			db = (bb + sb) / 2;
		},

		negation: function() {
			dr = 255 - abs(255 - sr - br);
			dg = 255 - abs(255 - sg - bg);
			db = 255 - abs(255 - sb - bb);
		}
	};

	var nativeModes = this.nativeModes = Base.each([
		'source-over', 'source-in', 'source-out', 'source-atop',
		'destination-over', 'destination-in', 'destination-out',
		'destination-atop', 'lighter', 'darker', 'copy', 'xor'
	], function(mode) {
		this[mode] = true;
	}, {});

	var ctx = CanvasProvider.getContext(1, 1);
	Base.each(modes, function(func, mode) {
		ctx.save();
		var darken = mode === 'darken',
			ok = false;
		ctx.fillStyle = darken ? '#300' : '#a00';
		ctx.fillRect(0, 0, 1, 1);
		ctx.globalCompositeOperation = mode;
		if (ctx.globalCompositeOperation === mode) {
			ctx.fillStyle = darken ? '#a00' : '#300';
			ctx.fillRect(0, 0, 1, 1);
			ok = ctx.getImageData(0, 0, 1, 1).data[0] !== (darken ? 170 : 51);
		}
		nativeModes[mode] = ok; 
		ctx.restore();
	});
	CanvasProvider.release(ctx);

	this.process = function(mode, srcContext, dstContext, alpha, offset) {
		var srcCanvas = srcContext.canvas,
			normal = mode === 'normal';
		if (normal || nativeModes[mode]) {
			dstContext.save();
			dstContext.setTransform(1, 0, 0, 1, 0, 0);
			dstContext.globalAlpha = alpha;
			if (!normal)
				dstContext.globalCompositeOperation = mode;
			dstContext.drawImage(srcCanvas, offset.x, offset.y);
			dstContext.restore();	
		} else {
			var process = modes[mode];
			if (!process)
				return;
			var dstData = dstContext.getImageData(offset.x, offset.y,
					srcCanvas.width, srcCanvas.height),
				dst  = dstData.data,
				src  = srcContext.getImageData(0, 0,
					srcCanvas.width, srcCanvas.height).data;
			for (var i = 0, l = dst.length; i < l; i += 4) {
				sr = src[i];
				br = dst[i];
				sg = src[i + 1];
				bg = dst[i + 1];
				sb = src[i + 2];
				bb = dst[i + 2];
				sa = src[i + 3];
				ba = dst[i + 3];
				process();
				var a1 = sa * alpha / 255,
					a2 = 1 - a1;
				dst[i] = a1 * dr + a2 * br;
				dst[i + 1] = a1 * dg + a2 * bg;
				dst[i + 2] = a1 * db + a2 * bb;
				dst[i + 3] = sa * alpha + a2 * ba;
			}
			dstContext.putImageData(dstData, offset.x, offset.y);
		}
	};
};

var SVGStyles = Base.each({
	fillColor: ['fill', 'color'],
	strokeColor: ['stroke', 'color'],
	strokeWidth: ['stroke-width', 'number'],
	strokeCap: ['stroke-linecap', 'string'],
	strokeJoin: ['stroke-linejoin', 'string'],
	miterLimit: ['stroke-miterlimit', 'number'],
	dashArray: ['stroke-dasharray', 'array'],
	dashOffset: ['stroke-dashoffset', 'number'],
	font: ['font-family', 'string'],
	fontSize: ['font-size', 'number'],
	justification: ['text-anchor', 'lookup', {
		left: 'start',
		center: 'middle',
		right: 'end'
	}],
	opacity: ['opacity', 'number'],
	blendMode: ['mix-blend-mode', 'string']
}, function(entry, key) {
	var part = Base.capitalize(key),
		lookup = entry[2];
	this[key] = {
		type: entry[1],
		property: key,
		attribute: entry[0],
		toSVG: lookup,
		fromSVG: lookup && Base.each(lookup, function(value, name) {
			this[value] = name;
		}, {}),
		get: 'get' + part,
		set: 'set' + part
	};
}, {});

var SVGNamespaces = {
	href: 'http://www.w3.org/1999/xlink',
	xlink: 'http://www.w3.org/2000/xmlns'
};

new function() {
	var formatter;

	function setAttributes(node, attrs) {
		for (var key in attrs) {
			var val = attrs[key],
				namespace = SVGNamespaces[key];
			if (typeof val === 'number')
				val = formatter.number(val);
			if (namespace) {
				node.setAttributeNS(namespace, key, val);
			} else {
				node.setAttribute(key, val);
			}
		}
		return node;
	}

	function createElement(tag, attrs) {
		return setAttributes(
			document.createElementNS('http://www.w3.org/2000/svg', tag), attrs);
	}

	function getDistance(segments, index1, index2) {
		return segments[index1]._point.getDistance(segments[index2]._point);
	}

	function getTransform(item, coordinates) {
		var matrix = item._matrix,
			trans = matrix.getTranslation(),
			attrs = {};
		if (coordinates) {
			matrix = matrix.shiftless();
			var point = matrix._inverseTransform(trans);
			attrs.x = point.x;
			attrs.y = point.y;
			trans = null;
		}
		if (matrix.isIdentity())
			return attrs;
		var decomposed = matrix.decompose();
		if (decomposed && !decomposed.shearing) {
			var parts = [],
				angle = decomposed.rotation,
				scale = decomposed.scaling;
			if (trans && !trans.isZero())
				parts.push('translate(' + formatter.point(trans) + ')');
			if (!Numerical.isZero(scale.x - 1) || !Numerical.isZero(scale.y - 1))
				parts.push('scale(' + formatter.point(scale) +')');
			if (angle)
				parts.push('rotate(' + formatter.number(angle) + ')');
			attrs.transform = parts.join(' ');
		} else {
			attrs.transform = 'matrix(' + matrix.getValues().join(',') + ')';
		}
		return attrs;
	}

	function determineAngle(path, segments, type, center) {
		var topCenter = type === 'rect'
				? segments[1]._point.add(segments[2]._point).divide(2)
				: type === 'roundrect'
				? segments[3]._point.add(segments[4]._point).divide(2)
				: type === 'circle' || type === 'ellipse'
				? segments[1]._point
				: null;
		var angle = topCenter && topCenter.subtract(center).getAngle() + 90;
		return Numerical.isZero(angle || 0) ? 0 : angle;
	}

	function determineType(path, segments) {
		function isColinear(i, j) {
			var seg1 = segments[i],
				seg2 = seg1.getNext(),
				seg3 = segments[j],
				seg4 = seg3.getNext();
			return seg1._handleOut.isZero() && seg2._handleIn.isZero()
					&& seg3._handleOut.isZero() && seg4._handleIn.isZero()
					&& seg2._point.subtract(seg1._point).isColinear(
						seg4._point.subtract(seg3._point));
		}

		function isArc(i) {
			var segment = segments[i],
				next = segment.getNext(),
				handle1 = segment._handleOut,
				handle2 = next._handleIn,
				kappa = Numerical.KAPPA;
			if (handle1.isOrthogonal(handle2)) {
				var from = segment._point,
					to = next._point,
					corner = new Line(from, handle1, true).intersect(
							new Line(to, handle2, true), true);
				return corner && Numerical.isZero(handle1.getLength() /
						corner.subtract(from).getLength() - kappa)
					&& Numerical.isZero(handle2.getLength() /
						corner.subtract(to).getLength() - kappa);
			}
		}

		if (path.isPolygon()) {
			return  segments.length === 4 && path._closed
					&& isColinear(0, 2) && isColinear(1, 3)
					? 'rect'
					: segments.length === 0
						? 'empty'
						: segments.length >= 3
							? path._closed ? 'polygon' : 'polyline'
							: 'line';
		} else if (path._closed) {
			if (segments.length === 8
					&& isArc(0) && isArc(2) && isArc(4) && isArc(6)
					&& isColinear(1, 5) && isColinear(3, 7)) {
				return 'roundrect';
			} else if (segments.length === 4
					&& isArc(0) && isArc(1) && isArc(2) && isArc(3)) {
				return Numerical.isZero(getDistance(segments, 0, 2)
						- getDistance(segments, 1, 3))
						? 'circle'
						: 'ellipse';
			} 
		}
		return 'path';
	}

	function exportGroup(item) {
		var attrs = getTransform(item),
			children = item._children;
		var node = createElement('g', attrs);
		for (var i = 0, l = children.length; i < l; i++) {
			var child = children[i];
			var childNode = exportSVG(child);
			if (childNode) {
				if (child.isClipMask()) {
					var clip = createElement('clipPath');
					clip.appendChild(childNode);
					setDefinition(child, clip, 'clip');
					setAttributes(node, {
						'clip-path': 'url(#' + clip.id + ')'
					});
				} else {
					node.appendChild(childNode);
				}
			}
		}
		return node;
	}

	function exportRaster(item) {
		var attrs = getTransform(item, true),
			size = item.getSize();
		attrs.x -= size.width / 2;
		attrs.y -= size.height / 2;
		attrs.width = size.width;
		attrs.height = size.height;
		attrs.href = item.toDataURL();
		return createElement('image', attrs);
	}

	function exportPath(item) {
		var segments = item._segments,
			center = item.getPosition(true),
			type = determineType(item, segments),
			angle = determineAngle(item, segments, type, center),
			attrs;
		switch (type) {
		case 'empty':
			return null;
		case 'path':
			var data = item.getPathData();
			attrs = data && { d: data };
			break;
		case 'polyline':
		case 'polygon':
			var parts = [];
			for(i = 0, l = segments.length; i < l; i++)
				parts.push(formatter.point(segments[i]._point));
			attrs = {
				points: parts.join(' ')
			};
			break;
		case 'rect':
			var width = getDistance(segments, 0, 3),
				height = getDistance(segments, 0, 1),
				point = segments[1]._point.rotate(-angle, center);
			attrs = {
				x: point.x,
				y: point.y,
				width: width,
				height: height
			};
			break;
		case 'roundrect':
			type = 'rect';
			var width = getDistance(segments, 1, 6),
				height = getDistance(segments, 0, 3),
				rx = (width - getDistance(segments, 0, 7)) / 2,
				ry = (height - getDistance(segments, 1, 2)) / 2,
				left = segments[3]._point, 
				right = segments[4]._point, 
				point = left.subtract(right.subtract(left).normalize(rx))
						.rotate(-angle, center);
			attrs = {
				x: point.x,
				y: point.y,
				width: width,
				height: height,
				rx: rx,
				ry: ry
			};
			break;
		case'line':
			var first = segments[0]._point,
				last = segments[segments.length - 1]._point;
			attrs = {
				x1: first.x,
				y1: first.y,
				x2: last.x,
				y2: last.y
			};
			break;
		case 'circle':
			var radius = getDistance(segments, 0, 2) / 2;
			attrs = {
				cx: center.x,
				cy: center.y,
				r: radius
			};
			break;
		case 'ellipse':
			var rx = getDistance(segments, 2, 0) / 2,
				ry = getDistance(segments, 3, 1) / 2;
			attrs = {
				cx: center.x,
				cy: center.y,
				rx: rx,
				ry: ry
			};
			break;
		}
		if (angle) {
			attrs.transform = 'rotate(' + formatter.number(angle) + ','
					+ formatter.point(center) + ')';
			item._gradientMatrix = new Matrix().rotate(-angle, center);
		}
		return createElement(type, attrs);
	}

	function exportCompoundPath(item) {
		var attrs = getTransform(item, true);
		var data = item.getPathData();
		if (data)
			attrs.d = data;
		return createElement('path', attrs);
	}

	function exportPlacedSymbol(item) {
		var attrs = getTransform(item, true),
			symbol = item.getSymbol(),
			symbolNode = getDefinition(symbol, 'symbol');
			definition = symbol.getDefinition(),
			bounds = definition.getBounds();
		if (!symbolNode) {
			symbolNode = createElement('symbol', {
				viewBox: formatter.rectangle(bounds)
			});
			symbolNode.appendChild(exportSVG(definition));
			setDefinition(symbol, symbolNode, 'symbol');
		}
		attrs.href = '#' + symbolNode.id;
		attrs.x += bounds.x;
		attrs.y += bounds.y;
		attrs.width = formatter.number(bounds.width);
		attrs.height = formatter.number(bounds.height);
		return createElement('use', attrs);
	}

	function exportGradient(color, item) {
		var gradientNode = getDefinition(color, 'color');
		if (!gradientNode) {
			var gradient = color.getGradient(),
				radial = gradient._radial,
				matrix = item._gradientMatrix,
				origin = color.getOrigin().transform(matrix),
				destination = color.getDestination().transform(matrix),
				attrs;
			if (radial) {
				attrs = {
					cx: origin.x,
					cy: origin.y,
					r: origin.getDistance(destination)
				};
				var highlight = color.getHighlight();
				if (highlight) {
					highlight = highlight.transform(matrix);
					attrs.fx = highlight.x;
					attrs.fy = highlight.y;
				}
			} else {
				attrs = {
					x1: origin.x,
					y1: origin.y,
					x2: destination.x,
					y2: destination.y
				};
			}
			attrs.gradientUnits = 'userSpaceOnUse';
			gradientNode = createElement(
					(radial ? 'radial' : 'linear') + 'Gradient', attrs);
			var stops = gradient._stops;
			for (var i = 0, l = stops.length; i < l; i++) {
				var stop = stops[i],
					stopColor = stop._color,
					alpha = stopColor.getAlpha();
				attrs = {
					offset: stop._rampPoint,
					'stop-color': stopColor.toCSS(true)
				};
				if (alpha < 1)
					attrs['stop-opacity'] = alpha;
				gradientNode.appendChild(createElement('stop', attrs));
			}
			setDefinition(color, gradientNode, 'color');
		}
		return 'url(#' + gradientNode.id + ')';
	}

	function exportText(item) {
		var node = createElement('text', getTransform(item, true));
		node.textContent = item._content;
		return node;
	}

	var exporters = {
		group: exportGroup,
		layer: exportGroup,
		raster: exportRaster,
		path: exportPath,
		'compound-path': exportCompoundPath,
		'placed-symbol': exportPlacedSymbol,
		'point-text': exportText
	};

	function applyStyle(item, node) {
		var attrs = {},
			parent = item.getParent();

		if (item._name != null)
			attrs.id = item._name;

		Base.each(SVGStyles, function(entry) {
			var get = entry.get,
				type = entry.type,
				value = item[get]();
			if (!parent || !Base.equals(parent[get](), value)) {
				if (type === 'color' && value != null) {
					var alpha = value.getAlpha();
					if (alpha < 1)
						attrs[entry.attribute + '-opacity'] = alpha;
				}
				attrs[entry.attribute] = value == null
					? 'none'
					: type === 'number'
						? formatter.number(value)
						: type === 'color'
							? value.gradient
								? exportGradient(value, item)
								: value.toCSS(true)
							: type === 'array'
								? value.join(',')
								: type === 'lookup'
									? entry.toSVG[value]
									: value;
			}
		});

		if (attrs.opacity === 1)
			delete attrs.opacity;

		if (item._visibility != null && !item._visibility)
			attrs.visibility = 'hidden';

		delete item._gradientMatrix; 
		return setAttributes(node, attrs);
	}

	var definitions;
	function getDefinition(item, type) {
		if (!definitions)
			definitions = { ids: {}, svgs: {} };
		return item && definitions.svgs[type + '-' + item._id];
	}

	function setDefinition(item, node, type) {
		if (!definitions)
			getDefinition();
		var id = definitions.ids[type] = (definitions.ids[type] || 0) + 1;
		node.id = type + '-' + id;
		definitions.svgs[type + '-' + item._id] = node;
	}

	function exportDefinitions(node, options) {
		if (!definitions)
			return node;
		var svg = node.nodeName.toLowerCase() === 'svg' && node,
			defs = null;
		for (var i in definitions.svgs) {
			if (!defs) {
				if (!svg) {
					svg = createElement('svg');
					svg.appendChild(node);
				}
				defs = svg.insertBefore(createElement('defs'), svg.firstChild);
			}
			defs.appendChild(definitions.svgs[i]);
		}
		definitions = null;
		return options && options.asString
				? new XMLSerializer().serializeToString(svg)
				: svg;
	}

	function exportSVG(item) {
		var exporter = exporters[item._type],
			node = exporter && exporter(item, item._type);
		if (node && item._data)
			node.setAttribute('data-paper-data', JSON.stringify(item._data));
		return node && applyStyle(item, node);
	}

	function setOptions(options) {
		formatter = options && options.precision
				? new Formatter(options.precision)
				: Formatter.instance;
	}

	Item.inject({
		exportSVG: function(options) {
			setOptions(options);
			return exportDefinitions(exportSVG(this), options);
		}
	});

	Project.inject({
		exportSVG: function(options) {
			setOptions(options);
			var layers = this.layers,
				size = this.view.getSize(),
				node = createElement('svg', {
					x: 0,
					y: 0,
					width: size.width,
					height: size.height,
					version: '1.1',
					xmlns: 'http://www.w3.org/2000/svg',
					'xmlns:xlink': 'http://www.w3.org/1999/xlink'
				});
			for (var i = 0, l = layers.length; i < l; i++)
				node.appendChild(exportSVG(layers[i]));
			return exportDefinitions(node, options);
		}
	});
};

new function() {

	function getValue(node, name, isString, allowNull) {
		var namespace = SVGNamespaces[name],
			value = namespace
				? node.getAttributeNS(namespace, name)
				: node.getAttribute(name);
		if (value === 'null')
			value = null;
		return value == null
				? allowNull
					? null
					: isString
						? ''
						: 0
				: isString
					? value
					: parseFloat(value);
	}

	function getPoint(node, x, y, allowNull) {
		x = getValue(node, x, false, allowNull);
		y = getValue(node, y, false, allowNull);
		return allowNull && x == null && y == null ? null
				: new Point(x || 0, y || 0);
	}

	function getSize(node, w, h, allowNull) {
		w = getValue(node, w, false, allowNull);
		h = getValue(node, h, false, allowNull);
		return allowNull && w == null && h == null ? null
				: new Size(w || 0, h || 0);
	}

	function convertValue(value, type, lookup) {
		return value === 'none'
				? null
				: type === 'number'
					? parseFloat(value)
					: type === 'array'
						? value ? value.split(/[\s,]+/g).map(parseFloat) : []
						: type === 'color'
							? getDefinition(value) || value
							: type === 'lookup'
								? lookup[value]
								: value;
	}

	function importGroup(node, type) {
		var nodes = node.childNodes,
			clip = type === 'clippath',
			item = clip ? new CompoundPath() : new Group(),
			project = item._project,
			currentStyle = project._currentStyle,
			children = [];
		if (!clip) {
			item._transformContent = false;
			item = applyAttributes(item, node);
			project._currentStyle = item._style.clone();
		}
		for (var i = 0, l = nodes.length; i < l; i++) {
			var childNode = nodes[i],
				child;
			if (childNode.nodeType == 1 && (child = importSVG(childNode))) {
				if (clip && child instanceof CompoundPath) {
					children.push.apply(children, child.removeChildren());
					child.remove();
				} else if (!(child instanceof Symbol)) {
					children.push(child);
				}
			}
		}
		item.addChildren(children);
		if (clip)
			item = applyAttributes(item.reduce(), node);
		project._currentStyle = currentStyle;
		if (clip || type === 'defs') {
			item.remove();
			item = null;
		}
		return item;
	}

	function importPoly(node, type) {
		var path = new Path(),
			points = node.points;
		path.moveTo(points.getItem(0));
		for (var i = 1, l = points.numberOfItems; i < l; i++)
			path.lineTo(points.getItem(i));
		if (type === 'polygon')
			path.closePath();
		return path;
	}

	function importPath(node) {
		var data = node.getAttribute('d'),
			path = data.match(/m/gi).length > 1
					? new CompoundPath()
					: new Path();
		path.setPathData(data);
		return path;
	}

	function importGradient(node, type) {
		var nodes = node.childNodes,
			stops = [];
		for (var i = 0, l = nodes.length; i < l; i++) {
			var child = nodes[i];
			if (child.nodeType == 1)
				stops.push(applyAttributes(new GradientStop(), child));
		}
		var isRadial = type === 'radialgradient',
			gradient = new Gradient(stops, isRadial),
			origin, destination, highlight;
		if (isRadial) {
			origin = getPoint(node, 'cx', 'cy');
			destination = origin.add(getValue(node, 'r'), 0);
			highlight = getPoint(node, 'fx', 'fy', true);
		} else {
			origin = getPoint(node, 'x1', 'y1');
			destination = getPoint(node, 'x2', 'y2');
		}
		applyAttributes(
			new Color(gradient, origin, destination, highlight), node);
		return null;
	}

	var importers = {
		g: importGroup,
		svg: importGroup,
		clippath: importGroup,
		polygon: importPoly,
		polyline: importPoly,
		path: importPath,
		lineargradient: importGradient,
		radialgradient: importGradient,

		image: function (node) {
			var raster = new Raster(getValue(node, 'href', true));
			raster.attach('load', function() {
				var size = getSize(node, 'width', 'height');
				this.setSize(size);
				this.translate(getPoint(node, 'x', 'y').add(size.divide(2)));
			});
			return raster;
		},

		symbol: function(node, type) {
			return new Symbol(importGroup(node, type), true);
		},

		defs: importGroup,

		use: function(node) {
			var id = (getValue(node, 'href', true) || '').substring(1),
				definition = definitions[id],
				point = getPoint(node, 'x', 'y');
			return definition
					? definition instanceof Symbol
						? definition.place(point)
						: definition.clone().translate(point)
					: null;
		},

		circle: function(node) {
			return new Path.Circle(getPoint(node, 'cx', 'cy'),
					getValue(node, 'r'));
		},

		ellipse: function(node) {
			var center = getPoint(node, 'cx', 'cy'),
				radius = getSize(node, 'rx', 'ry');
			return new Path.Ellipse(new Rectangle(center.subtract(radius),
					center.add(radius)));
		},

		rect: function(node) {
			var point = getPoint(node, 'x', 'y'),
				size = getSize(node, 'width', 'height'),
				radius = getSize(node, 'rx', 'ry');
			return new Path.Rectangle(new Rectangle(point, size), radius);
		},

		line: function(node) {
			return new Path.Line(getPoint(node, 'x1', 'y1'),
					getPoint(node, 'x2', 'y2'));
		},

		text: function(node) {
			var text = new PointText(getPoint(node, 'x', 'y', false)
					.add(getPoint(node, 'dx', 'dy', false)));
			text.setContent(node.textContent.trim() || '');
			return text;
		}
	};

	function applyTransform(item, value, name, node) {
		var transforms = (node.getAttribute(name) || '').split(/\)\s*/g),
			matrix = new Matrix();
		for (var i = 0, l = transforms.length; i < l; i++) {
			var transform = transforms[i];
			if (!transform)
				break;
			var parts = transform.split('('),
				command = parts[0],
				v = parts[1].split(/[\s,]+/g);
			for (var j = 0, m = v.length; j < m; j++)
				v[j] = parseFloat(v[j]);
			switch (command) {
			case 'matrix':
				matrix.concatenate(
						new Matrix(v[0], v[2], v[1], v[3], v[4], v[5]));
				break;
			case 'rotate':
				matrix.rotate(v[0], v[1], v[2]);
				break;
			case 'translate':
				matrix.translate(v[0], v[1]);
				break;
			case 'scale':
				matrix.scale(v);
				break;
			case 'skewX':
			case 'skewY':
				var value = Math.tan(v[0] * Math.PI / 180),
					isX = command == 'skewX';
				matrix.shear(isX ? value : 0, isX ? 0 : value);
				break;
			}
		}
		item.transform(matrix);
	}

	function applyOpacity(item, value, name) {
		var color = item[name === 'fill-opacity' ? 'getFillColor'
				: 'getStrokeColor']();
		if (color)
			color.setAlpha(parseFloat(value));
	}

	var attributes = Base.merge(Base.each(SVGStyles, function(entry) {
		this[entry.attribute] = function(item, value) {
			item[entry.set](
					convertValue(value, entry.type, entry.fromSVG));
		};
	}, {}), {
		id: function(item, value) {
			definitions[value] = item;
			if (item.setName)
				item.setName(value);
		},

		'clip-path': function(item, value) {
			var clip = getDefinition(value);
			if (clip) {
				clip = clip.clone();
				clip.setClipMask(true);
				if (item instanceof Group) {
					item.insertChild(0, clip);
				} else {
					return new Group(clip, item);
				}
			}
		},

		gradientTransform: applyTransform,
		transform: applyTransform,

		'fill-opacity': applyOpacity,
		'stroke-opacity': applyOpacity,

		visibility: function(item, value) {
			item.setVisible(value === 'visible');
		},

		'stop-color': function(item, value) {
			if (item.setColor)
				item.setColor(value);
		},

		'stop-opacity': function(item, value) {
			if (item._color)
				item._color.setAlpha(parseFloat(value));
		},

		offset: function(item, value) {
			var percentage = value.match(/(.*)%$/);
			item.setRampPoint(percentage
					? percentage[1] / 100
					: parseFloat(value));
		},

		viewBox: function(item, value, name, node, styles) {
			var rect = new Rectangle(convertValue(value, 'array')),
				size = getSize(node, 'width', 'height', true);
			if (item instanceof Group) {
				var scale = size ? rect.getSize().divide(size) : 1,
					matrix = new Matrix().translate(rect.getPoint()).scale(scale);
				item.transform(matrix.inverted());
			} else if (item instanceof Symbol) {
				if (size)
					rect.setSize(size);
				var clip = getAttribute(node, 'overflow', styles) != 'visible',
					group = item._definition;
				if (clip && !rect.contains(group.getBounds())) {
					clip = new Path.Rectangle(rect).transform(group._matrix);
					clip.setClipMask(true);
					group.addChild(clip);
				}
			}
		}
	});

	function getAttribute(node, name, styles) {
		var attr = node.attributes[name],
			value = attr && attr.value;
		if (!value) {
			var style = Base.camelize(name);
			value = node.style[style];
			if (!value && styles.node[style] !== styles.parent[style])
				value = styles.node[style];
		}
		return !value
				? undefined
				: value === 'none'
					? null
					: value;
	}

	function applyAttributes(item, node) {
		var styles = {
			node: DomElement.getStyles(node) || {},
			parent: DomElement.getStyles(node.parentNode) || {}
		};
		Base.each(attributes, function(apply, name) {
			var value = getAttribute(node, name, styles);
			if (value !== undefined)
				item = Base.pick(apply(item, value, name, node, styles), item);
		});
		return item;
	}

	var definitions = {};
	function getDefinition(value) {
		var match = value && value.match(/\((?:#|)([^)']+)/);
		return match && definitions[match[1]];
	}

	function importSVG(node, clearDefs) {
		if (typeof node === 'string')
			node = new DOMParser().parseFromString(node, 'image/svg+xml');
		var type = node.nodeName.toLowerCase(),
			importer = importers[type],
			item = importer && importer(node, type),
			data = node.getAttribute('data-paper-data');
		if (item && !(item instanceof Group))
			item = applyAttributes(item, node);
		if (item && data)
			item._data = JSON.parse(data);
		if (clearDefs)
			definitions = {};
		return item;
	}

	Item.inject({
		importSVG: function(node) {
			return this.addChild(importSVG(node, true));
		}
	});

	Project.inject({
		importSVG: function(node) {
			this.activate();
			return importSVG(node, true);
		}
	});
};

paper = new (PaperScope.inject(Base.merge(Base.exports, {
	enumerable: true,
	Base: Base,
	Numerical: Numerical,
	DomElement: DomElement,
	DomEvent: DomEvent,
	Key: Key
})))();

if (typeof define === 'function' && define.amd)
	define(paper);

return paper;
};

paper.PaperScope.prototype.PaperScript = (function(root) {
	var Base = paper.Base,
		PaperScope = paper.PaperScope,
		exports, define,
		scope = this;
!function(e,r){return"object"==typeof exports&&"object"==typeof module?r(exports):"function"==typeof define&&define.amd?define(["exports"],r):(r(e.acorn||(e.acorn={})),void 0)}(this,function(e){function r(e){fr=e||{};for(var r in hr)Object.prototype.hasOwnProperty.call(fr,r)||(fr[r]=hr[r]);mr=fr.sourceFile||null}function t(e,r){var t=vr(pr,e);r+=" ("+t.line+":"+t.column+")";var n=new SyntaxError(r);throw n.pos=e,n.loc=t,n.raisedAt=br,n}function n(e){function r(e){if(1==e.length)return t+="return str === "+JSON.stringify(e[0])+";";t+="switch(str){";for(var r=0;r<e.length;++r)t+="case "+JSON.stringify(e[r])+":";t+="return true}return false;"}e=e.split(" ");var t="",n=[];e:for(var a=0;a<e.length;++a){for(var o=0;o<n.length;++o)if(n[o][0].length==e[a].length){n[o].push(e[a]);continue e}n.push([e[a]])}if(n.length>3){n.sort(function(e,r){return r.length-e.length}),t+="switch(str.length){";for(var a=0;a<n.length;++a){var i=n[a];t+="case "+i[0].length+":",r(i)}t+="}"}else r(e);return new Function("str",t)}function a(){this.line=Ar,this.column=br-Sr}function o(){Ar=1,br=Sr=0,Er=!0,u()}function i(e,r){gr=br,fr.locations&&(kr=new a),wr=e,u(),Cr=r,Er=e.beforeExpr}function s(){var e=fr.onComment&&fr.locations&&new a,r=br,n=pr.indexOf("*/",br+=2);if(-1===n&&t(br-2,"Unterminated comment"),br=n+2,fr.locations){Kt.lastIndex=r;for(var o;(o=Kt.exec(pr))&&o.index<br;)++Ar,Sr=o.index+o[0].length}fr.onComment&&fr.onComment(!0,pr.slice(r+2,n),r,br,e,fr.locations&&new a)}function c(){for(var e=br,r=fr.onComment&&fr.locations&&new a,t=pr.charCodeAt(br+=2);dr>br&&10!==t&&13!==t&&8232!==t&&8329!==t;)++br,t=pr.charCodeAt(br);fr.onComment&&fr.onComment(!1,pr.slice(e+2,br),e,br,r,fr.locations&&new a)}function u(){for(;dr>br;){var e=pr.charCodeAt(br);if(32===e)++br;else if(13===e){++br;var r=pr.charCodeAt(br);10===r&&++br,fr.locations&&(++Ar,Sr=br)}else if(10===e)++br,++Ar,Sr=br;else if(14>e&&e>8)++br;else if(47===e){var r=pr.charCodeAt(br+1);if(42===r)s();else{if(47!==r)break;c()}}else if(160===e)++br;else{if(!(e>=5760&&Jt.test(String.fromCharCode(e))))break;++br}}}function l(){var e=pr.charCodeAt(br+1);return e>=48&&57>=e?E(!0):(++br,i(xt))}function f(){var e=pr.charCodeAt(br+1);return Er?(++br,k()):61===e?x(Et,2):x(wt,1)}function p(){var e=pr.charCodeAt(br+1);return 61===e?x(Et,2):x(Ft,1)}function d(e){var r=pr.charCodeAt(br+1);return r===e?x(124===e?Lt:Ut,2):61===r?x(Et,2):x(124===e?Rt:Vt,1)}function m(){var e=pr.charCodeAt(br+1);return 61===e?x(Et,2):x(Tt,1)}function h(e){var r=pr.charCodeAt(br+1);return r===e?x(St,2):61===r?x(Et,2):x(At,1)}function v(e){var r=pr.charCodeAt(br+1),t=1;return r===e?(t=62===e&&62===pr.charCodeAt(br+2)?3:2,61===pr.charCodeAt(br+t)?x(Et,t+1):x(jt,t)):(61===r&&(t=61===pr.charCodeAt(br+2)?3:2),x(Ot,t))}function b(e){var r=pr.charCodeAt(br+1);return 61===r?x(qt,61===pr.charCodeAt(br+2)?3:2):x(61===e?Ct:It,1)}function y(e){switch(e){case 46:return l();case 40:return++br,i(ht);case 41:return++br,i(vt);case 59:return++br,i(yt);case 44:return++br,i(bt);case 91:return++br,i(ft);case 93:return++br,i(pt);case 123:return++br,i(dt);case 125:return++br,i(mt);case 58:return++br,i(gt);case 63:return++br,i(kt);case 48:var r=pr.charCodeAt(br+1);if(120===r||88===r)return C();case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return E(!1);case 34:case 39:return A(e);case 47:return f(e);case 37:case 42:return p();case 124:case 38:return d(e);case 94:return m();case 43:case 45:return h(e);case 60:case 62:return v(e);case 61:case 33:return b(e);case 126:return x(It,1)}return!1}function g(e){if(e?br=yr+1:yr=br,fr.locations&&(xr=new a),e)return k();if(br>=dr)return i(Br);var r=pr.charCodeAt(br);if(Qt(r)||92===r)return L();var n=y(r);if(n===!1){var o=String.fromCharCode(r);if("\\"===o||$t.test(o))return L();t(br,"Unexpected character '"+o+"'")}return n}function x(e,r){var t=pr.slice(br,br+r);br+=r,i(e,t)}function k(){for(var e,r,n="",a=br;;){br>=dr&&t(a,"Unterminated regular expression");var o=pr.charAt(br);if(Gt.test(o)&&t(a,"Unterminated regular expression"),e)e=!1;else{if("["===o)r=!0;else if("]"===o&&r)r=!1;else if("/"===o&&!r)break;e="\\"===o}++br}var n=pr.slice(a,br);++br;var s=I();return s&&!/^[gmsiy]*$/.test(s)&&t(a,"Invalid regexp flag"),i(jr,new RegExp(n,s))}function w(e,r){for(var t=br,n=0,a=0,o=null==r?1/0:r;o>a;++a){var i,s=pr.charCodeAt(br);if(i=s>=97?s-97+10:s>=65?s-65+10:s>=48&&57>=s?s-48:1/0,i>=e)break;++br,n=n*e+i}return br===t||null!=r&&br-t!==r?null:n}function C(){br+=2;var e=w(16);return null==e&&t(yr+2,"Expected hexadecimal number"),Qt(pr.charCodeAt(br))&&t(br,"Identifier directly after number"),i(Or,e)}function E(e){var r=br,n=!1,a=48===pr.charCodeAt(br);e||null!==w(10)||t(r,"Invalid number"),46===pr.charCodeAt(br)&&(++br,w(10),n=!0);var o=pr.charCodeAt(br);(69===o||101===o)&&(o=pr.charCodeAt(++br),(43===o||45===o)&&++br,null===w(10)&&t(r,"Invalid number"),n=!0),Qt(pr.charCodeAt(br))&&t(br,"Identifier directly after number");var s,c=pr.slice(r,br);return n?s=parseFloat(c):a&&1!==c.length?/[89]/.test(c)||Vr?t(r,"Invalid number"):s=parseInt(c,8):s=parseInt(c,10),i(Or,s)}function A(e){br++;for(var r="";;){br>=dr&&t(yr,"Unterminated string constant");var n=pr.charCodeAt(br);if(n===e)return++br,i(Fr,r);if(92===n){n=pr.charCodeAt(++br);var a=/^[0-7]+/.exec(pr.slice(br,br+3));for(a&&(a=a[0]);a&&parseInt(a,8)>255;)a=a.slice(0,a.length-1);if("0"===a&&(a=null),++br,a)Vr&&t(br-2,"Octal literal in strict mode"),r+=String.fromCharCode(parseInt(a,8)),br+=a.length-1;else switch(n){case 110:r+="\n";break;case 114:r+="\r";break;case 120:r+=String.fromCharCode(S(2));break;case 117:r+=String.fromCharCode(S(4));break;case 85:r+=String.fromCharCode(S(8));break;case 116:r+="	";break;case 98:r+="\b";break;case 118:r+="";break;case 102:r+="\f";break;case 48:r+="\0";break;case 13:10===pr.charCodeAt(br)&&++br;case 10:fr.locations&&(Sr=br,++Ar);break;default:r+=String.fromCharCode(n)}}else(13===n||10===n||8232===n||8329===n)&&t(yr,"Unterminated string constant"),r+=String.fromCharCode(n),++br}}function S(e){var r=w(16,e);return null===r&&t(yr,"Bad character escape sequence"),r}function I(){Bt=!1;for(var e,r=!0,n=br;;){var a=pr.charCodeAt(br);if(Yt(a))Bt&&(e+=pr.charAt(br)),++br;else{if(92!==a)break;Bt||(e=pr.slice(n,br)),Bt=!0,117!=pr.charCodeAt(++br)&&t(br,"Expecting Unicode escape sequence \\uXXXX"),++br;var o=S(4),i=String.fromCharCode(o);i||t(br-1,"Invalid Unicode escape"),(r?Qt(o):Yt(o))||t(br-4,"Invalid Unicode escape"),e+=i}r=!1}return Bt?e:pr.slice(n,br)}function L(){var e=I(),r=Dr;return Bt||(Wt(e)?r=lt[e]:(fr.forbidReserved&&(3===fr.ecmaVersion?Mt:zt)(e)||Vr&&Xt(e))&&t(yr,"The keyword '"+e+"' is reserved")),i(r,e)}function U(){Ir=yr,Lr=gr,Ur=kr,g()}function R(e){for(Vr=e,br=Lr;Sr>br;)Sr=pr.lastIndexOf("\n",Sr-2)+1,--Ar;u(),g()}function T(){this.type=null,this.start=yr,this.end=null}function V(){this.start=xr,this.end=null,null!==mr&&(this.source=mr)}function q(){var e=new T;return fr.locations&&(e.loc=new V),fr.ranges&&(e.range=[yr,0]),e}function O(e){var r=new T;return r.start=e.start,fr.locations&&(r.loc=new V,r.loc.start=e.loc.start),fr.ranges&&(r.range=[e.range[0],0]),r}function j(e,r){return e.type=r,e.end=Lr,fr.locations&&(e.loc.end=Ur),fr.ranges&&(e.range[1]=Lr),e}function F(e){return fr.ecmaVersion>=5&&"ExpressionStatement"===e.type&&"Literal"===e.expression.type&&"use strict"===e.expression.value}function D(e){return wr===e?(U(),!0):void 0}function B(){return!fr.strictSemicolons&&(wr===Br||wr===mt||Gt.test(pr.slice(Lr,yr)))}function M(){D(yt)||B()||X()}function z(e){wr===e?U():X()}function X(){t(yr,"Unexpected token")}function N(e){"Identifier"!==e.type&&"MemberExpression"!==e.type&&t(e.start,"Assigning to rvalue"),Vr&&"Identifier"===e.type&&Nt(e.name)&&t(e.start,"Assigning to "+e.name+" in strict mode")}function W(e){Ir=Lr=br,fr.locations&&(Ur=new a),Rr=Vr=null,Tr=[],g();var r=e||q(),t=!0;for(e||(r.body=[]);wr!==Br;){var n=J();r.body.push(n),t&&F(n)&&R(!0),t=!1}return j(r,"Program")}function J(){wr===wt&&g(!0);var e=wr,r=q();switch(e){case Mr:case Nr:U();var n=e===Mr;D(yt)||B()?r.label=null:wr!==Dr?X():(r.label=lr(),M());for(var a=0;a<Tr.length;++a){var o=Tr[a];if(null==r.label||o.name===r.label.name){if(null!=o.kind&&(n||"loop"===o.kind))break;if(r.label&&n)break}}return a===Tr.length&&t(r.start,"Unsyntactic "+e.keyword),j(r,n?"BreakStatement":"ContinueStatement");case Wr:return U(),M(),j(r,"DebuggerStatement");case Pr:return U(),Tr.push(Zt),r.body=J(),Tr.pop(),z(tt),r.test=P(),M(),j(r,"DoWhileStatement");case _r:if(U(),Tr.push(Zt),z(ht),wr===yt)return $(r,null);if(wr===rt){var i=q();return U(),G(i,!0),1===i.declarations.length&&D(ut)?_(r,i):$(r,i)}var i=K(!1,!0);return D(ut)?(N(i),_(r,i)):$(r,i);case Gr:return U(),cr(r,!0);case Kr:return U(),r.test=P(),r.consequent=J(),r.alternate=D(Hr)?J():null,j(r,"IfStatement");case Qr:return Rr||t(yr,"'return' outside of function"),U(),D(yt)||B()?r.argument=null:(r.argument=K(),M()),j(r,"ReturnStatement");case Yr:U(),r.discriminant=P(),r.cases=[],z(dt),Tr.push(en);for(var s,c;wr!=mt;)if(wr===zr||wr===Jr){var u=wr===zr;s&&j(s,"SwitchCase"),r.cases.push(s=q()),s.consequent=[],U(),u?s.test=K():(c&&t(Ir,"Multiple default clauses"),c=!0,s.test=null),z(gt)}else s||X(),s.consequent.push(J());return s&&j(s,"SwitchCase"),U(),Tr.pop(),j(r,"SwitchStatement");case Zr:return U(),Gt.test(pr.slice(Lr,yr))&&t(Lr,"Illegal newline after throw"),r.argument=K(),M(),j(r,"ThrowStatement");case et:if(U(),r.block=H(),r.handler=null,wr===Xr){var l=q();U(),z(ht),l.param=lr(),Vr&&Nt(l.param.name)&&t(l.param.start,"Binding "+l.param.name+" in strict mode"),z(vt),l.guard=null,l.body=H(),r.handler=j(l,"CatchClause")}return r.guardedHandlers=qr,r.finalizer=D($r)?H():null,r.handler||r.finalizer||t(r.start,"Missing catch or finally clause"),j(r,"TryStatement");case rt:return U(),r=G(r),M(),r;case tt:return U(),r.test=P(),Tr.push(Zt),r.body=J(),Tr.pop(),j(r,"WhileStatement");case nt:return Vr&&t(yr,"'with' in strict mode"),U(),r.object=P(),r.body=J(),j(r,"WithStatement");case dt:return H();case yt:return U(),j(r,"EmptyStatement");default:var f=Cr,p=K();if(e===Dr&&"Identifier"===p.type&&D(gt)){for(var a=0;a<Tr.length;++a)Tr[a].name===f&&t(p.start,"Label '"+f+"' is already declared");var d=wr.isLoop?"loop":wr===Yr?"switch":null;return Tr.push({name:f,kind:d}),r.body=J(),Tr.pop(),r.label=p,j(r,"LabeledStatement")}return r.expression=p,M(),j(r,"ExpressionStatement")}}function P(){z(ht);var e=K();return z(vt),e}function H(e){var r,t=q(),n=!0,a=!1;for(t.body=[],z(dt);!D(mt);){var o=J();t.body.push(o),n&&e&&F(o)&&(r=a,R(a=!0)),n=!1}return a&&!r&&R(!1),j(t,"BlockStatement")}function $(e,r){return e.init=r,z(yt),e.test=wr===yt?null:K(),z(yt),e.update=wr===vt?null:K(),z(vt),e.body=J(),Tr.pop(),j(e,"ForStatement")}function _(e,r){return e.left=r,e.right=K(),z(vt),e.body=J(),Tr.pop(),j(e,"ForInStatement")}function G(e,r){for(e.declarations=[],e.kind="var";;){var n=q();if(n.id=lr(),Vr&&Nt(n.id.name)&&t(n.id.start,"Binding "+n.id.name+" in strict mode"),n.init=D(Ct)?K(!0,r):null,e.declarations.push(j(n,"VariableDeclarator")),!D(bt))break}return j(e,"VariableDeclaration")}function K(e,r){var t=Q(r);if(!e&&wr===bt){var n=O(t);for(n.expressions=[t];D(bt);)n.expressions.push(Q(r));return j(n,"SequenceExpression")}return t}function Q(e){var r=Y(e);if(wr.isAssign){var t=O(r);return t.operator=Cr,t.left=r,U(),t.right=Q(e),N(r),j(t,"AssignmentExpression")}return r}function Y(e){var r=Z(e);if(D(kt)){var t=O(r);return t.test=r,t.consequent=K(!0),z(gt),t.alternate=K(!0,e),j(t,"ConditionalExpression")}return r}function Z(e){return er(rr(),-1,e)}function er(e,r,t){var n=wr.binop;if(null!=n&&(!t||wr!==ut)&&n>r){var a=O(e);a.left=e,a.operator=Cr,U(),a.right=er(rr(),n,t);var a=j(a,/&&|\|\|/.test(a.operator)?"LogicalExpression":"BinaryExpression");return er(a,r,t)}return e}function rr(){if(wr.prefix){var e=q(),r=wr.isUpdate;return e.operator=Cr,e.prefix=!0,U(),e.argument=rr(),r?N(e.argument):Vr&&"delete"===e.operator&&"Identifier"===e.argument.type&&t(e.start,"Deleting local variable in strict mode"),j(e,r?"UpdateExpression":"UnaryExpression")}for(var n=tr();wr.postfix&&!B();){var e=O(n);e.operator=Cr,e.prefix=!1,e.argument=n,N(n),U(),n=j(e,"UpdateExpression")}return n}function tr(){return nr(ar())}function nr(e,r){if(D(xt)){var t=O(e);return t.object=e,t.property=lr(!0),t.computed=!1,nr(j(t,"MemberExpression"),r)}if(D(ft)){var t=O(e);return t.object=e,t.property=K(),t.computed=!0,z(pt),nr(j(t,"MemberExpression"),r)}if(!r&&D(ht)){var t=O(e);return t.callee=e,t.arguments=ur(vt,!1),nr(j(t,"CallExpression"),r)}return e}function ar(){switch(wr){case ot:var e=q();return U(),j(e,"ThisExpression");case Dr:return lr();case Or:case Fr:case jr:var e=q();return e.value=Cr,e.raw=pr.slice(yr,gr),U(),j(e,"Literal");case it:case st:case ct:var e=q();return e.value=wr.atomValue,e.raw=wr.keyword,U(),j(e,"Literal");case ht:var r=xr,t=yr;U();var n=K();return n.start=t,n.end=gr,fr.locations&&(n.loc.start=r,n.loc.end=kr),fr.ranges&&(n.range=[t,gr]),z(vt),n;case ft:var e=q();return U(),e.elements=ur(pt,!0,!0),j(e,"ArrayExpression");case dt:return ir();case Gr:var e=q();return U(),cr(e,!1);case at:return or();default:X()}}function or(){var e=q();return U(),e.callee=nr(ar(),!0),e.arguments=D(ht)?ur(vt,!1):qr,j(e,"NewExpression")}function ir(){var e=q(),r=!0,n=!1;for(e.properties=[],U();!D(mt);){if(r)r=!1;else if(z(bt),fr.allowTrailingCommas&&D(mt))break;var a,o={key:sr()},i=!1;if(D(gt)?(o.value=K(!0),a=o.kind="init"):fr.ecmaVersion>=5&&"Identifier"===o.key.type&&("get"===o.key.name||"set"===o.key.name)?(i=n=!0,a=o.kind=o.key.name,o.key=sr(),wr!==ht&&X(),o.value=cr(q(),!1)):X(),"Identifier"===o.key.type&&(Vr||n))for(var s=0;s<e.properties.length;++s){var c=e.properties[s];if(c.key.name===o.key.name){var u=a==c.kind||i&&"init"===c.kind||"init"===a&&("get"===c.kind||"set"===c.kind);u&&!Vr&&"init"===a&&"init"===c.kind&&(u=!1),u&&t(o.key.start,"Redefinition of property")}}e.properties.push(o)}return j(e,"ObjectExpression")}function sr(){return wr===Or||wr===Fr?ar():lr(!0)}function cr(e,r){wr===Dr?e.id=lr():r?X():e.id=null,e.params=[];var n=!0;for(z(ht);!D(vt);)n?n=!1:z(bt),e.params.push(lr());var a=Rr,o=Tr;if(Rr=!0,Tr=[],e.body=H(!0),Rr=a,Tr=o,Vr||e.body.body.length&&F(e.body.body[0]))for(var i=e.id?-1:0;i<e.params.length;++i){var s=0>i?e.id:e.params[i];if((Xt(s.name)||Nt(s.name))&&t(s.start,"Defining '"+s.name+"' in strict mode"),i>=0)for(var c=0;i>c;++c)s.name===e.params[c].name&&t(s.start,"Argument name clash in strict mode")}return j(e,r?"FunctionDeclaration":"FunctionExpression")}function ur(e,r,t){for(var n=[],a=!0;!D(e);){if(a)a=!1;else if(z(bt),r&&fr.allowTrailingCommas&&D(e))break;t&&wr===bt?n.push(null):n.push(K(!0))}return n}function lr(e){var r=q();return r.name=wr===Dr?Cr:e&&!fr.forbidReserved&&wr.keyword||X(),U(),j(r,"Identifier")}e.version="0.3.2";var fr,pr,dr,mr;e.parse=function(e,t){return pr=String(e),dr=pr.length,r(t),o(),W(fr.program)};var hr=e.defaultOptions={ecmaVersion:5,strictSemicolons:!1,allowTrailingCommas:!0,forbidReserved:!1,locations:!1,onComment:null,ranges:!1,program:null,sourceFile:null},vr=e.getLineInfo=function(e,r){for(var t=1,n=0;;){Kt.lastIndex=n;var a=Kt.exec(e);if(!(a&&a.index<r))break;++t,n=a.index+a[0].length}return{line:t,column:r-n}};e.tokenize=function(e,t){function n(e){return g(e),a.start=yr,a.end=gr,a.startLoc=xr,a.endLoc=kr,a.type=wr,a.value=Cr,a}pr=String(e),dr=pr.length,r(t),o();var a={};return n.jumpTo=function(e,r){if(br=e,fr.locations){Ar=1,Sr=Kt.lastIndex=0;for(var t;(t=Kt.exec(pr))&&t.index<e;)++Ar,Sr=t.index+t[0].length}Er=r,u()},n};var br,yr,gr,xr,kr,wr,Cr,Er,Ar,Sr,Ir,Lr,Ur,Rr,Tr,Vr,qr=[],Or={type:"num"},jr={type:"regexp"},Fr={type:"string"},Dr={type:"name"},Br={type:"eof"},Mr={keyword:"break"},zr={keyword:"case",beforeExpr:!0},Xr={keyword:"catch"},Nr={keyword:"continue"},Wr={keyword:"debugger"},Jr={keyword:"default"},Pr={keyword:"do",isLoop:!0},Hr={keyword:"else",beforeExpr:!0},$r={keyword:"finally"},_r={keyword:"for",isLoop:!0},Gr={keyword:"function"},Kr={keyword:"if"},Qr={keyword:"return",beforeExpr:!0},Yr={keyword:"switch"},Zr={keyword:"throw",beforeExpr:!0},et={keyword:"try"},rt={keyword:"var"},tt={keyword:"while",isLoop:!0},nt={keyword:"with"},at={keyword:"new",beforeExpr:!0},ot={keyword:"this"},it={keyword:"null",atomValue:null},st={keyword:"true",atomValue:!0},ct={keyword:"false",atomValue:!1},ut={keyword:"in",binop:7,beforeExpr:!0},lt={"break":Mr,"case":zr,"catch":Xr,"continue":Nr,"debugger":Wr,"default":Jr,"do":Pr,"else":Hr,"finally":$r,"for":_r,"function":Gr,"if":Kr,"return":Qr,"switch":Yr,"throw":Zr,"try":et,"var":rt,"while":tt,"with":nt,"null":it,"true":st,"false":ct,"new":at,"in":ut,"instanceof":{keyword:"instanceof",binop:7,beforeExpr:!0},"this":ot,"typeof":{keyword:"typeof",prefix:!0,beforeExpr:!0},"void":{keyword:"void",prefix:!0,beforeExpr:!0},"delete":{keyword:"delete",prefix:!0,beforeExpr:!0}},ft={type:"[",beforeExpr:!0},pt={type:"]"},dt={type:"{",beforeExpr:!0},mt={type:"}"},ht={type:"(",beforeExpr:!0},vt={type:")"},bt={type:",",beforeExpr:!0},yt={type:";",beforeExpr:!0},gt={type:":",beforeExpr:!0},xt={type:"."},kt={type:"?",beforeExpr:!0},wt={binop:10,beforeExpr:!0},Ct={isAssign:!0,beforeExpr:!0},Et={isAssign:!0,beforeExpr:!0},At={binop:9,prefix:!0,beforeExpr:!0},St={postfix:!0,prefix:!0,isUpdate:!0},It={prefix:!0,beforeExpr:!0},Lt={binop:1,beforeExpr:!0},Ut={binop:2,beforeExpr:!0},Rt={binop:3,beforeExpr:!0},Tt={binop:4,beforeExpr:!0},Vt={binop:5,beforeExpr:!0},qt={binop:6,beforeExpr:!0},Ot={binop:7,beforeExpr:!0},jt={binop:8,beforeExpr:!0},Ft={binop:10,beforeExpr:!0};e.tokTypes={bracketL:ft,bracketR:pt,braceL:dt,braceR:mt,parenL:ht,parenR:vt,comma:bt,semi:yt,colon:gt,dot:xt,question:kt,slash:wt,eq:Ct,name:Dr,eof:Br,num:Or,regexp:jr,string:Fr};for(var Dt in lt)e.tokTypes["_"+Dt]=lt[Dt];var Bt,Mt=n("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile"),zt=n("class enum extends super const export import"),Xt=n("implements interface let package private protected public static yield"),Nt=n("eval arguments"),Wt=n("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this"),Jt=/[\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/,Pt="\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc",Ht="\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f",$t=new RegExp("["+Pt+"]"),_t=new RegExp("["+Pt+Ht+"]"),Gt=/[\n\r\u2028\u2029]/,Kt=/\r\n|[\n\r\u2028\u2029]/g,Qt=e.isIdentifierStart=function(e){return 65>e?36===e:91>e?!0:97>e?95===e:123>e?!0:e>=170&&$t.test(String.fromCharCode(e))},Yt=e.isIdentifierChar=function(e){return 48>e?36===e:58>e?!0:65>e?!1:91>e?!0:97>e?95===e:123>e?!0:e>=170&&_t.test(String.fromCharCode(e))},Zt={kind:"loop"},en={kind:"switch"}});

	var binaryOperators = {
		'+': '_add',
		'-': '_subtract',
		'*': '_multiply',
		'/': '_divide',
		'%': '_modulo',
		'==': 'equals',
		'!=': 'equals'
	};

	var unaryOperators = {
		'-': '_negate',
		'+': null
	};

	var fields = Base.each(
		'add,subtract,multiply,divide,modulo,negate'.split(','),
		function(name) {
			this['_' + name] = '#' + name;
		}, 
		{}
	);
	paper.Point.inject(fields);
	paper.Size.inject(fields);
	paper.Color.inject(fields);

	function _$_(left, operator, right) {
		var handler = binaryOperators[operator];
		if (left && left[handler]) {
			var res = left[handler](right);
			return operator === '!=' ? !res : res;
		}
		switch (operator) {
		case '+': return left + right;
		case '-': return left - right;
		case '*': return left * right;
		case '/': return left / right;
		case '%': return left % right;
		case '==': return left == right;
		case '!=': return left != right;
		}
	}

	function $_(operator, value) {
		var handler = unaryOperators[operator];
		if (handler && value && value[handler])
			return value[handler]();
		switch (operator) {
		case '+': return +value;
		case '-': return -value;
		}
	}

	function compile(code) {

		var insertions = [];

		function getOffset(offset) {
			for (var i = 0, l = insertions.length; i < l; i++) {
				var insertion = insertions[i];
				if (insertion[0] >= offset)
					break;
				offset += insertion[1];
			}
			return offset;
		}

		function getCode(node) {
			return code.substring(getOffset(node.range[0]),
					getOffset(node.range[1]));
		}

		function replaceCode(node, str) {
			var start = getOffset(node.range[0]),
				end = getOffset(node.range[1]);
			var insert = 0;
			for (var i = insertions.length - 1; i >= 0; i--) {
				if (start > insertions[i][0]) {
					insert = i + 1;
					break;
				}
			}
			insertions.splice(insert, 0, [start, str.length - end + start]);
			code = code.substring(0, start) + str + code.substring(end);
		}

		function walkAst(node) {
			if (!node || node.type === 'MemberExpression' && node.computed)
				return;
			for (var key in node) {
				if (key === 'range')
					continue;
				var value = node[key];
				if (Array.isArray(value)) {
					for (var i = 0, l = value.length; i < l; i++)
						walkAst(value[i]);
				} else if (value && typeof value === 'object') {
					walkAst(value);
				}
			}
			switch (node && node.type) {
			case 'BinaryExpression':
				if (node.operator in binaryOperators
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, '_$_(' + left + ', "' + node.operator
							+ '", ' + right + ')');
				}
				break;
			case 'AssignmentExpression':
				if (/^.=$/.test(node.operator)
						&& node.left.type !== 'Literal') {
					var left = getCode(node.left),
						right = getCode(node.right);
					replaceCode(node, left + ' = _$_(' + left + ', "'
							+ node.operator[0] + '", ' + right + ')');
				}
				break;
			case 'UpdateExpression':
				if (!node.prefix) {
					var arg = getCode(node.argument);
					replaceCode(node, arg + ' = _$_(' + arg + ', "'
							+ node.operator[0] + '", 1)');
				}
				break;
			case 'UnaryExpression':
				if (node.operator in unaryOperators
						&& node.argument.type !== 'Literal') {
					var arg = getCode(node.argument);
					replaceCode(node, '$_("' + node.operator + '", '
							+ arg + ')');
				}
				break;
			}
		}
		walkAst(scope.acorn.parse(code, { ranges: true }));
		return code;
	}

	function evaluate(code, scope) {
		paper = scope;
		var view = scope.project && scope.project.view,
			res;
		with (scope) {
			(function() {
				var onActivate, onDeactivate, onEditOptions,
					onMouseDown, onMouseUp, onMouseDrag, onMouseMove,
					onKeyDown, onKeyUp, onFrame, onResize;
				res = eval(compile(code));
				if (/on(?:Key|Mouse)(?:Up|Down|Move|Drag)/.test(code)) {
					Base.each(paper.Tool.prototype._events, function(key) {
						var value = eval(key);
						if (value) {
							scope.getTool()[key] = value;
						}
					});
				}
				if (view) {
					view.setOnResize(onResize);
					view.fire('resize', {
						size: view.size,
						delta: new Point()
					});
					view.setOnFrame(onFrame);
					view.draw();
				}
			}).call(scope);
		}
		return res;
	}

	function request(url, scope) {
		var xhr = new (window.ActiveXObject || XMLHttpRequest)(
				'Microsoft.XMLHTTP');
		xhr.open('GET', url, true);
		if (xhr.overrideMimeType)
			xhr.overrideMimeType('text/plain');
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				return evaluate(xhr.responseText, scope);
			}
		};
		return xhr.send(null);
	}

	function load() {
		var scripts = document.getElementsByTagName('script');
		for (var i = 0, l = scripts.length; i < l; i++) {
			var script = scripts[i];
			if (/^text\/(?:x-|)paperscript$/.test(script.type)
					&& !script.getAttribute('data-paper-ignore')) {
				var canvas = PaperScope.getAttribute(script, 'canvas'),
					scope = PaperScope.get(canvas)
							|| new PaperScope(script).setup(canvas);
				if (script.src) {
					request(script.src, scope);
				} else {
					evaluate(script.innerHTML, scope);
				}
				script.setAttribute('data-paper-ignore', true);
			}
		}
	}

	if (document.readyState === 'complete') {
		setTimeout(load);
	} else {
		paper.DomEvent.add(window, { load: load });
	}

	return {
		compile: compile,
		evaluate: evaluate,
		load: load
	};

})(this);

define('game/canvas/vm/Box',["durandal/app","api/datacontext","paper"],function(e){function t(e,t,o,i){var a=this;a.index=e,a.active=!1,a.cPoint=o||n,a.angle=i||0,a.prevAngle=0,a.scale=1,a.prevScale=1,a.isCircle=!1,a.isButton=!1,a._guiRect=null,a._guiText=null,a._guiElem=null,a.pathModel=a.wordModel=a.hasData=null,this.updateModel(t)}var o=paper,i=new o.Color(0,0),n=new o.Point(-100,-100);return t.prototype.button=function(e){this.hasData=!0,this.isButton=!0,this.isCircle=!1,this.pathModel=e},t.prototype.hideIfEmpty=function(){this.hasData||(this._guiRect.visible=!1)},t.prototype.showIfEmpty=function(){this.hasData||(this._guiRect.visible=!0)},t.prototype.updateModel=function(e){void 0!==e&&null!=e&&(this.pathModel=e,this.wordModel=e.getWordAt(this.index),this.hasData=null!=this.wordModel,this.isCircle=0==e.nWords,this.show())},t.prototype.show=function(){this.hasData?(this.active=!1,null!=this._guiRect&&(this._guiRect.remove(),this._guiRect=null),this.isButton?null==this._guiElem?this.createBtn():this.updateBtn():(this.prevAngle=0,null==this._guiElem?this.createElem():this.updateElem())):(null!=this._guiElem&&(this._guiElem.remove(),this._guiElem=null),null==this._guiRect?this.createRect():this.updateRect()),this.createText("")},t.prototype.width=function(){return this.hasData?this._guiElem.outerWidth():this.isCircle?t.options.circle.radius:2*t.options.rect.size.x},t.prototype.updateBtn=function(){var e={left:this.cPoint.x-t.pathOptions.container.left-this._guiElem.outerWidth()/2,top:this.cPoint.y-t.pathOptions.container.top-this._guiElem.outerHeight()/2};this.scale*=.6;var o=this._guiElem.find(".button");t.options.animate?(o.stop(),this._guiElem.stop(),this._guiElem.transition(e),o.transition({scale:this.scale},500,"ease")):(this._guiElem.css(e),o.transition({scale:this.scale,rotate:this.angle+"deg"}))},t.prototype.createBtn=function(){var e=$("<div/>",{"class":"confirm-box"}),o=this,i=this.pathModel.cw?" cw":"";e.append($("<div/>",{"class":"button",title:"Done!"}).append($("<div/>",{"class":"tooltip"+i,text:"Click me when you are done!"}))),e.css({left:this.pathModel.canvas.cPoint.x-t.pathOptions.container.left,top:this.pathModel.canvas.cPoint.y-t.pathOptions.container.top,zIndex:2}),e.appendTo("#tiles"),e.find(".button").one("click",this,function(){t.options.animate=!0,o.pathModel.phrase._complete(!0),o.pathModel.phrase.words.valueHasMutated(),t.options.animate=!1}).transition({rotateY:"360deg"},500,"ease"),this.width=function(){return e.outerWidth()/2},null!=this._guiElem&&this._guiElem.remove(),this._guiElem=e,this.updateBtn()},t.prototype.updateElem=function(){this.pathModel.phrase.complete()&&(this._guiElem.addClass("placed"),this._guiElem.off("click")),this._guiElem.text(this.wordModel.lemma);var e={left:this.cPoint.x-t.pathOptions.container.left-this._guiElem.outerWidth()/2,top:this.cPoint.y-t.pathOptions.container.top-this._guiElem.outerHeight()/2,rotate:this.angle+"deg"};t.options.animate?(e.scale=this.scale,this._guiElem.stop(),this._guiElem.transition(e,500,"ease")):(this._guiElem.css(e),this._guiElem.transition({scale:this.scale}))},t.prototype.createElem=function(){var e=$("<div/>",{"class":"magnet",text:this.wordModel.lemma});this.wordModel.isRelated&&e.addClass("related"),e.css({left:this.pathModel.canvas.cPoint.x-t.pathOptions.container.left,top:this.pathModel.canvas.cPoint.y-t.pathOptions.container.top,zIndex:2}),e.appendTo("#tiles"),e.one("click",this,function(e){e.data.pathModel.phrase.complete()||e.data.pathModel.removeWordAt(e.data.index)}),null!=this._guiElem&&this._guiElem.remove(),this._guiElem=e,this.updateElem()},t.prototype.updateRect=function(){var e=this._guiRect;e.rotate(this.angle-this.prevAngle),e.scale(this.scale-this.prevScale+1),e.position=this.cPoint,this.prevAngle=this.angle,this.prevScale=this.scale},t.prototype.createRect=function(){var e;this.isCircle?(e=new o.Path.Circle(this.cPoint,t.options.circle.radius),e.style=t.options.circle.style):(e=new o.Path.Rectangle(this.cPoint.subtract(t.options.rect.size),this.cPoint.add(t.options.rect.size)),e.style=t.options.rect.style),e.data=this,null!=this._guiRect&&this._guiRect.remove(),this._guiRect=e,this.updateRect()},t.prototype.enter=function(e){return this.hasData||null==e?null:(this.active=!0,this.isCircle?this._guiRect.style=t.options.circle.activeStyle:(this.wordModel=e,clearInterval(this._hoverHandler),this._hoverHandler=setTimeout(function(o){o._guiRect.style=t.options.rect.activeStyle,o._guiText.content=e.lemma,o._guiText.visible=!0},1,this)),this)},t.prototype.leave=function(){!this.hasData&&this.active&&(this.active=!1,this.isCircle?this._guiRect.style=t.options.circle.style:(clearInterval(this._hoverHandler),this._hoverHandler=setTimeout(function(e){e._guiRect.style=t.options.rect.style,e._guiText.visible=!1},1,this)))},t.prototype.drop=function(){this.active&&!this.hasData&&null!=this.wordModel&&(this.pathModel.addWord(this.wordModel,this.index)||e.woz.dialog.show("alert","It's not your turn!"))},t.prototype.put=function(e){if(!this.hasData&&null!=e.obsWords()){var t=this.pathModel.nWords,o=e.obsWords();if(o.length==t)for(var i=0;i<o.length;i++)this.pathModel.addWord(o[i],i+1)}},t.prototype.createText=function(){var e=new o.PointText({point:this.cPoint,content:"-",style:t.options.textStyle,visible:!1});return e.position.y+=5,e.rotate(this.angle,this.cPoint),e.characterStyle.fontStyle="bold",e.sendToBack(),this._guiText&&this._guiText.remove(),this._guiText=e},t.prototype._clear=function(){this._guiRect&&this._guiRect.remove(),this._guiElem&&this._guiElem.remove(),this._guiText&&this._guiText.remove(),this._guiElem=null,this._guiRect=null,this._guiText=null},t.prototype.remove=function(){this._clear()},t.options={animate:!1,rect:{style:{strokeColor:"#CBB28F",strokeWidth:1,fillColor:i,shadowColor:i},activeStyle:{strokeWidth:2,shadowColor:"#CBB28F",shadowBlur:5,shadowOffset:new o.Point(0,0)},size:new o.Point(30,15)},circle:{radius:8,margin:16,width:23,style:{fillColor:"#CBB28F",shadowBlur:0,strokeWidth:0},activeStyle:{strokeWidth:2,strokeColor:"#CBB28F",shadowBlur:20,shadowColor:"#CBB28F",shadowOffset:new o.Point(0,0)}},textStyle:{fillColor:"grey",justification:"center",fontSize:14,font:"CopseRegular"}},t});
define('game/canvas/vm/Path',["durandal/app","api/datacontext","game/canvas/vm/Box","paper"],function(e,t,o){function i(e,t){n=e,this._displayItems=[],this._trash=[],this.pathModel=t}var n=paper,a=t.activeWord,r=t.activeWords,s=new n.Color(0,0),l=null;return a.subscribe(function(e){null==e&&null!=l&&l.drop()}),i.prototype.enter=function(){if(null!=r()){var e=r(),t=this.pathModel;if(e.length!=t.nWords)return;for(var o=0;o<t.guiBoxes.length;o++)t.guiBoxes[o].enter(e[o])}},i.prototype.leave=function(){if(null!=r()){var e=r(),t=this.pathModel;if(e.length!=t.nWords)return;for(var o=0;o<t.guiBoxes.length;o++)t.guiBoxes[o].leave()}},i.prototype.put=function(){if(null!=r()){var t=r(),o=this.pathModel;if(t.length!=o.nWords)return t.length>o.nWords?e.woz.dialog.show("alert","too many words"):e.woz.dialog.show("alert","need more words"),void 0;for(var i=0;i<o.guiBoxes.length;i++)o.addWord(t[i],i)}},i.prototype.events={boxHoverEvents:{mouseenter:function(){l=this.data.enter(a()),this.data.pathModel.canvas.enter()},mouseleave:function(){this.data.leave(),this.data.pathModel.canvas.leave()},mousedown:function(){this.data.pathModel.canvas.put()}}},i.prototype.setup=function(){console.log("%cPath Setup","background: orange; color: white",this.pathModel.id);var e=this.pathModel,t=e.nWords;if(0==e.nWords&&(t=6),e.guiBoxes&&e.guiBoxes.length==t)for(var i=0;t>i;i++){var n=e.guiBoxes[i];n.updateModel(e)}else{e.guiBoxes=[];for(var i=0;t>i;i++){var n=new o(i,e);e.guiBoxes.push(n),this._displayItems.push(n)}}},i.prototype.show=function(){console.log("%cPath","background: orange; color: white",this.pathModel.id+" is being drawn");var e=this.pathModel,t=e.nWords;this._cleanCycle();var o=i.getDesiredLength(e.guiBoxes);path=i.getBestArc(e.startTile.center,e.endTile.center,o,e.cw,t),this.cPoint=i.cPoint;for(var a=path.length-o,r=(path.length-2*(i.options.tileMargin+i.options.tileRadius),i.options.tileRadius+i.options.tileMargin),s=r,l=0;t>l;l++){var c=e.guiBoxes[l],u=c.width()/2+i.options.rectMargin+a/(2*t);s+=u;var d=path.getPointAt(s),p=path.getTangentAt(s),h=this.createHoverArea(path,s,c.width()+2*i.options.rectMargin+a/t);h.data=c,s+=u,c.cPoint=d,c.angle=p.angle,c.scale=a>=0?1:path.length/o,c.show(),i.options.debug&&(h.strokeColor="lightgreen")}i.options.debug?this._trash.push(path):path.remove(),n.view.draw()},i.prototype.createHoverArea=function(e,t,o){var a=t-o/2,r=e.getPointAt(a),l=e.getNormalAt(a).normalize(i.options.hoverMargin),c=t+o/2,u=e.getPointAt(c),d=e.getNormalAt(c).normalize(i.options.hoverMargin),p=new n.Path(r.add(l),r.subtract(l),u.subtract(d),u.add(d));return p.closePath(),p.fillColor=s,p.on(this.events.boxHoverEvents),this._trash.push(p),p},i.prototype._cleanCycle=function(){this._removeAll(this._trash),this._trash=[],i.options.debug&&i._clear()},i.prototype._removeAll=function(e){if(null!=e)for(var t=0;t<e.length;t++)try{e[t].remove()}catch(o){}},i.prototype.remove=function(){this._removeAll(this._trash),this._removeAll(this._displayItems)},i.scope=paper,i._trash=[],i.getBestArc=function(e,t,o,n,a,r){var s=i.scope,l=t.subtract(e).length,c=i.options.minArc*(a/2),u=i.options.maxArc*(a/3),d=new s.Path.Line(e,t),p=d.getPointAt(d.length/2),h=d.getNormalAt(d.length/2);d.remove(),i.cPoint=p,l>550&&(u*=550/l,c=i.options.minArc*(a/4)),u>150&&(u=150),d=new s.Path.Line(p.subtract(h.normalize(-c*(n?1:-1))),p.subtract(h.normalize(-u*(n?1:-1))));var g,f=0,m=d.length,v=1e4,w=d.length/2;r=r||10;for(var y=0;r>y;y++,w/=2){var _=d.getPointAt((f+m)/2),b=new s.Path.Arc(e,_,t);Math.abs(b.length-o)<v?(g&&g.remove(),v=Math.abs(b.length-o),g=b):b.remove(),b.length>o?m-=w:f+=w}if(i.options.debug){var k=new s.Path.Circle(p,5);k.fillColor="orange",d.strokeColor="orange",d.strokeWidth=2,g.strokeColor="grey"}else d.remove();return g},i.getDesiredLength=function(e,t){for(var o=2*(i.options.tileMargin+i.options.tileRadius),n=0;n<(t||e.length);n++)o+=e[n].width()+2*i.options.rectMargin;return o},i._clear=function(){for(var e=0;e<i._trash.length;e++){var t=i._trash[e];t.remove()}i._trash=[]},i.options={tileRadius:80,tileMargin:5,hoverMargin:60,rectMargin:10,minArc:33,maxArc:99,debug:0,container:null},i.Box=o,i.Box.pathOptions=i.options,i});
define('game/canvas/vm/confirm-box',["./Path","./Box"],function(e){var t=paper,o=function(e){this._trash=[],this.hide=function(){for(var e=0;e<this._trash.length;e++)this._trash[e].remove()},t=e};return o.prototype.events={mouseenter:function(){this.style={shadowColor:"#b8b0a3",shadowBlur:3,shadowOffset:new t.Point(0,0)}},mouseleave:function(){this.style={shadowBlur:0}},mousedown:function(){}},o.prototype.show=function(e){this.hide(),this.showDoneCenter(e)},o.prototype.showBox=function(o,i){for(var n,a=0;a<i.length&&i[a].hasData;a++)n=i[a];var r=n.cPoint.add(o.getNormalAt(o.length/2).normalize(-60)).add([50,0]),s=this.createDoneContainer(),l=this.createDoneButton(new t.Point(0,0));s.position=r,l.position=r.add([0,15]);var c=new t.PointText({point:r.add([0,-15]),content:"Are you done?"});c.style=e.Box.options.textStyle,c.fontSize=12,c.fillColor="black",this._trash.push(c)},o.prototype.createDoneContainer=function(){var e=new t.Point(60,40),o=new t.Path.Rectangle(e.negate(),e);return this._trash.push(o),o.style={fillColor:"white",strokeColor:"#e8e0d3",shadowColor:"#b8b0a3",shadowBlur:5,shadowOffset:new t.Point(1,1)},o.bringToFront(),o},o.prototype.showDoneCenter=function(e){var t=50,o=e.length/2,i=e.getNormalAt(o).normalize(t),n=e.getPointAt(o).add(i),a=this.createDoneButton(n);a.rotate(e.getTangentAt(o).angle,n),this._trash.push(a)},o.prototype.createDoneButton=function(o){var i=new t.Group,n=new t.Point(30,15),a=new t.Path.Rectangle(o.subtract(n),o.add(n));a.strokeColor="#e8e0d3",a.fillColor="orange",a.strokeWidth=2;var r=new t.PointText({point:o,content:"Done"});return r.style=e.Box.options.textStyle,r.fillColor="white",r.position.y+=4,r.characterStyle.fontStyle="bold",i.addChild(a),a=a.clone(),i.addChild(a),i.addChild(r),a.fillColor=new t.Color(0,0),a.bringToFront(),a.on(this.events),this._trash.push(i),i},o});
define('game/canvas/vm/DynamicPath',["api/datacontext","./Box","./Path","./confirm-box","paper"],function(e,t,o){function i(e,t){var o=this;this.pathModel=t,this.activeWord=null,this.events={mouseenter:function(){if(null!=a()){for(var e=o.pathModel.guiBoxes,t=a(),i=0;i<e.length;i++)e[i].enter(t);s=o,o.activeWord=t}},mouseleave:function(){if(s==o){for(var e=o.pathModel.guiBoxes,t=0;t<e.length;t++)e[t].leave();s=null,o.activeWord=null}}},this.events.mousedown=function(e){null!=o.activeWord&&(o.pathModel.addWord(o.activeWord),o.events.mouseleave(e))},this.drop=function(){o.events.mousedown()},this.draw=this.show}var n=paper,a=e.activeWord;e.activeWords,new n.Color(0,0);var s=null;return a.subscribe(function(e){null==e&&null!=s&&s.drop()}),i.prototype=new o,i.prototype.constructor=i,i.prototype.show=function(){console.log("%cDynamic Path","background: orange; color: white",this.pathModel.id+" is being drawn");var e=this.pathModel,i=6,a=e.phrase.words().length>=3&&!e.phrase.complete();if(a){void 0==this.confirmBox&&(this.confirmBox=new t(-1,null),this.confirmBox.button(e),this.confirmBox.show());for(var s=0;i>s;s++){var r=e.guiBoxes[s];if(!r.hasData)break}e.guiBoxes.splice(s,0,this.confirmBox),i++}else this.confirmBox&&(this.confirmBox.remove(),this.confirmBox=void 0);e.phrase.complete()===!0?(i=e.phrase.words().length,this._hideCircles()):this._showCircles(),this._cleanCycle();var l=o.getDesiredLength(e.guiBoxes,i),c=o.getBestArc(e.startTile.center,e.endTile.center,l,e.cw,3*i/2);this.cPoint=o.cPoint;var u=c.length-l,d=(c.length-2*(o.options.tileMargin+o.options.tileRadius),o.options.tileRadius+o.options.tileMargin),p=d,h=new n.Path;h.add(e.startTile.center);for(var s=0;i>s;s++){var r=e.guiBoxes[s],g=r.width()/2+o.options.rectMargin+u/(2*i);p+=g;var f=c.getPointAt(p),m=c.getNormalAt(p).normalize(o.options.hoverMargin/2);h.add(f.subtract(m)),h.insert(0,f.add(m)),p+=g,r.cPoint=f,r.angle=m.angle+90,r.scale=u>=0?1:c.length/l,r.show()}if(h.on(this.events),h.fillColor=new n.Color(0,0),h.add(e.endTile.center),h.closePath(),this._trash.push(h),a){for(var s=0;i>s;s++){var r=e.guiBoxes[s];if(r.isButton)break}e.guiBoxes.splice(s,1)}o.options.debug?(h.strokeColor="lightgreen",this._trash.push(c)):c.remove(),n.view.draw()},i.prototype._hideCircles=function(){for(var e=0;e<this.pathModel.guiBoxes.length;e++)this.pathModel.guiBoxes[e].hideIfEmpty()},i.prototype._showCircles=function(){for(var e=0;e<this.pathModel.guiBoxes.length;e++)this.pathModel.guiBoxes[e].showIfEmpty()},i});
define('game/canvas/paths',["api/datacontext","game/canvas/vm/Path","game/canvas/vm/DynamicPath","paper"],function(e,t,n){function o(){function n(e,n){var o=new c.Point;return o.x=t.options.container.width*e+t.options.container.left,o.y=t.options.container.height*n+t.options.container.top,o}paths=e.paths(),t.options.container={width:$("#tiles").width(),height:$("#tiles").height(),left:$("#tiles").offset().left,top:$("#tiles").offset().top};for(var o=0;o<paths.length;o++){var a=paths[o];a.startTile.center=n(a.startTile.x,a.startTile.y),a.endTile.center=n(a.endTile.x,a.endTile.y)}}function a(e){var t={w:$(e).width(),h:$(e).height()};paper.pathsCSize.w!=t.w||paper.pathsCSize.h!=t.h?(paper.pathsCSize=t,console.log("resized occurred"),s(e)):console.log("resized ignored")}function i(n){return t.scope=c=paper,c.setup(n),paper.pathsCSize={w:$(n).width(),h:$(n).height()},$(window).resize(function(){clearTimeout(l),l=setTimeout(a,d,n)}),o(),e.paths.subscribe(function(e){for(var t=0;t<e.length;t++){var n=e[t];void 0===n.canvasSub&&(n.canvas=r(n),n.canvasSub=n.phrase.words.subscribe(function(){o(),this.canvas.setup(),this.canvas.show()},n),n.phrase.words.valueHasMutated(),u.push(n.canvas))}}),e.paths.valueHasMutated(),c}function r(e){return 0===e.nWords?new n(c,e):new t(c,e)}function s(e){var t=e.getContext("2d");t.canvas.width=$(e).width(),t.canvas.height=$(e).height(),o();for(var n=0;n<u.length;n++){var a=u[n];a.show()}paper.view.draw()}var c=paper;e.activeWord,e.activeWords,new c.Color(0,0);var l=null,d=100,u=[];return{setup:i,redraw:s}});
define('game/canvas',["api/datacontext","paper","game/canvas/paths"],function(e,t,o){function n(e){var t=e.getContext("2d");t.canvas.width=$(e).width(),t.canvas.height=$(e).height(),o.setup&&o.setup(e)}return{compositionComplete:function(e){n(e)}}});
define('game/canvas/selection',["durandal/app","api/datacontext","paper","jquery"],function(e,t,n,o){function a(){r()}function i(){r()}function r(){var n,a=new l.Tool,i=[];a.fixedDistance=32,a.onMouseDown=function(e){n=new l.Path,n.add(e.point),n.strokeColor="red",i=[]},a.onMouseDrag=function(e){n.add(e.point)},a.onMouseUp=function(){if(0!=n.length){n.closePath();var a=c(n,d());if(a.length<3)console.log("Too few words!");else if(a.length>9)console.log("Too many words!"),e.woz.dialog.show("alert","Too many words!");else{a=s(a),t.activeWords(a),o("body").animate({scrollTop:0},"slow");for(var i=0;i<a.length;i++)console.log(a[i].lemma)}n.remove()}},addStarAt=function(e){star=new l.Raster("star"),star.position=e,star.rotate(Math.floor(360*Math.random())),star.scale(.4+.6*Math.random()),star.removeOnUp()}}function s(e){function t(e){upper=e[0],slightY=0;for(var t=1;t<e.length;t++){var n=e[t],o=upper.y-n.y;o-slightY>.06?(upper.x-n.x>.06,upper=n,slightY=0):o>0&&(slightY+=o)}return e.splice(e.indexOf(upper),1),upper}function n(e,t){return e.x-t.x}var o=[];for(e.sort(n);e.length;)o.push(t(e));return o}function c(e,t){return ko.utils.arrayFilter(t,function(t){var n=t.$el.offset().left+t.$el.innerWidth()/2,o=t.$el.offset().top+t.$el.innerHeight()/2;return e.contains(n,o)})}var l=paper,d=t.unplayedWords;return{draw:r,setup:a,redraw:i,setScope:function(e){l=e}}});
define('text!game/game.html',[],function () { return '<div>   \r\n    <img id="star" src="images/core/stardust/star.png" style="display: none;" />    \r\n\r\n    <div id="game-main" style="padding-top:0px">\r\n        <!--ko compose: { model: \'game/canvas\', mode: \'inline\' }--><canvas></canvas><!--/ko-->\r\n        <!--ko compose: \'game/tiles\'--><!--/ko-->\r\n        <hr />\r\n        <!--ko compose: \'game/words\'--><!--/ko-->\r\n        <div class="logo-absolute">\r\n            <div class="logo-fixed-size">\r\n                <div class="logo-wrapper">\r\n                    <div class="logo"></div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div id="game-players" data-bind="compose: \'game/players\'"></div>\r\n\r\n    <div id="menu" data-bind="visible: !loading()">\r\n        <div class="palette" id="palette-left">\r\n            <div class="icons action-icons">\r\n                <div class="icon actions-icon" id="swap-words" data-bind="click: swap, css: { disabled: !allowSwap() }"></div>\r\n            </div>\r\n        </div>\r\n\r\n        <div class="palette" id="palette-right">\r\n            <div class="icons normal-icons">\r\n                <div class="icon normal-icon" id="end-game" data-bind="click: resign, css: {disabled: !allowResign()}"></div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});

define('game/game',["durandal/app","api/datacontext","const/DIALOGS"],function(e,t,o){var n=ko.observable(0);t.loading.subscribe(function(o){o===!0?e.loading(!1):o===!1&&n(t.player.tickets.swap)});var i=[],a=function(){for(var e=0;e<i.length;e++)i[e]&&i[e].dispose();i=[]},r=function(){a(),e.woz.dialog.close("confirm"),e.woz.dialog.close("slipper"),t.mode("");for(var o=t.selectedWords(),n=0;n<o.length;n++)o[n].isSelected(!1);t.player.tickets.swap++};return{loadingStatus:t.loadingStatus,loading:t.loading,player:t.player,allowSwap:ko.computed(function(){return t.player.active()&&n()>0}),allowResign:ko.computed(function(){return!t.gameOver()}),activate:function(){e.loading(!0),e.woz.dialog.show("loading"),t.load(t.playerCount)},binding:function(){return{cacheViews:!1}},compositionComplete:function(){$("#menu").appendTo("body");var e=$(window).innerHeight();$("#palette-right, #palette-left").each(function(t,o){var n=$(o);n.css("top",(e-n.outerHeight())/2)}),$.support.touch&&$("#workspace").touchPunch()},swap:function(){if(t.player.active()){if("swap"==t.mode())$("#swap-words").removeClass("cancel"),r();else if(t.player.tickets.swap-->0){e.woz.dialog.show("slipper",o.SWAP_WORDS),t.mode("swap"),$("body").animate({scrollTop:1e3},"slow"),$("#swap-words").addClass("cancel");var a=!1,s=t.selectedWords.subscribe(function(o){o.length>0&&!a?(a=!0,e.woz.dialog.show("confirm").then(function(o){if($("#swap-words").removeClass("cancel"),"cancel"==o)r();else{var i={username:t.player.username,gameID:t.gameID,words:ko.utils.arrayMap(t.selectedWords(),function(e){return e.id})};t.loadingStatus("Swapping words"),t.loading(!0),e.trigger("slipper:close"),e.trigger("server:game:swap-words",i,function(e){e.success?(t.mode(""),t.loading(!1)):(t.player.tickets.swap++,n(t.player.tickets.swap))})}s.dispose()})):o.length<=0&&a&&(a=!1,e.woz.dialog.close("confirm"))});i.push(s)}else e.woz.dialog.show("alert",{content:"You can only swap words once in each turn",delay:3e3});n(t.player.tickets.swap)}},resign:function(){t.gameOver()||e.woz.dialog.show("confirm",{content:"Are you sure you want to resign?",modal:!0,doneText:"YES",cancelText:"NO"}).then(function(o){"cancel"!=o&&e.trigger("server:game:resign",{username:t.player.username,gameID:t.gameID})})},detached:function(){}}});
define('text!game/players.html',[],function () { return '<div id="game-players">\r\n    <div id="players" data-bind="foreach: players">\r\n        <div class="player">\r\n            <div class="decoration">\r\n                <div class="score">\r\n                    <p data-bind="text: score"></p>\r\n                </div>\r\n            </div>\r\n            <div class="name">\r\n                <p data-bind="text: username"></p>\r\n            </div>\r\n        </div>        \r\n    </div>\r\n</div>\r\n';});

define('game/players',["api/datacontext"],function(e){return{players:e.players}});
define('text!game/tiles.html',[],function () { return '<div id="gameboard">\r\n    <div id="tiles-max">\r\n        <div id="tiles-aspect">\r\n            <div id="tiles">\r\n                <div class="container" data-bind="foreach: { data: tiles, afterRender: afterRender }">\r\n                    <div class="tile" data-bind="css: { active: active() }, click: $root.toggleTile">\r\n                        <div class="mask" data-bind="style: { backgroundImage: \'url(\\\'\' + imageName + \'\\\')\' }">\r\n                            <div class="instruction">\r\n                                <span data-bind="text: instruction"></span>\r\n                                <div class="info" data-bind="text: info"></div>\r\n                            </div>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class="ui-overlay" data-bind="fadeVisible: disabled"></div>\r\n</div>\r\n';});

define('game/tiles',["api/datacontext","jquery","knockout","api/draggable"],function(e,t,o){function n(){for(var e=t(window).scrollTop(),o=15,n=0;n<a.length;n++){var i=a[n],r=i.data("top")||i.offset().top-parseInt(i.css("margin-top"));e>r&&!i.data("top")?"fixed"!=i.css("position")&&(i.css({position:"fixed",left:i.offset().left,top:o}),i.data("parent",i.parent()),i.data("top",r),i.appendTo("body")):r>=e&&"fixed"==i.css("position")&&(i.css({position:"",left:"",top:""}),i.appendTo(i.data("parent")),i.data("top",0))}}function i(){for(var e=0;e<r.length;e++){var o=r[e].$el,i=r[e].tile;o.css({left:100*i.x+"%",top:100*i.y+"%"}),a.push(t(".instruction",o))}r=[],t(window).scroll(n)}({l:0,r:window.innerWidth-100,t:100,b:.75*window.innerHeight-100});var a=[],r=[];return{tiles:e.tiles,disabled:o.computed(function(){return"swap"==e.mode()}),activate:function(){},binding:function(){return{cacheViews:!1}},compositionComplete:function(){},toggleTile:function(){this.active(1^this.active())},afterRender:function(e,o){var n=t(e).filter(".tile:first");0==r.length&&setTimeout(i,100),r.push({$el:n,tile:o})},detached:function(){}}});
define('text!game/words.html',[],function () { return '<div id="workspace">    \r\n    <!--ko foreach: {data:words, afterRender: afterRender}--><div class="magnet" data-bind="css: { related: isRelated, selected: isSelected }"><span data-bind="text: lemma"></span><div class="points" data-bind="text: points"></div></div><!--/ko-->\r\n</div>';});

define('game/words',["api/datacontext","jquery","api/draggable"],function(e,t){({l:0,r:window.innerWidth,t:0,b:window.innerHeight/2});var o=e.unplayedWords,n=[],i=function(){function e(){n.length&&n.pop().call(this,e)}n=n.sort(function(){return.5-Math.random()}),setTimeout(e,75),setTimeout(e,200),setTimeout(e,280)};return{words:o,binding:function(){return{cacheViews:!1}},bindingComplete:function(){},detached:function(e){t(".magnet",e).each(function(e,o){t(o).data("draggable").dispose()})},afterRender:function(o,a){var r=t(o);void 0===a.originalX&&(a.originalX=a.x),void 0===a.originalY&&(a.originalY=a.y),a.x=a.originalX,a.y=a.originalY,r.css({left:100*a.x+"%",top:100*a.y+"%"}).transition({rotate:a.angle+"deg"}),r.data("immovable",e.words.immovable),r.draggable({withinEl:r.parent(),dragStart:function(){"swap"==e.mode()?a.isSelected(1^a.isSelected()):(e.activeWord(a),r.css({rotate:"0deg"}))},dropped:function(t,o){e.activeWord(null),a.x=o.hasMoved?o.left/100:a.x,a.y=o.hasMoved?o.top/100:a.y}}).hide(),0==n.length&&setTimeout(i,100),n.push(function(e){return r.show(200,e)}),a.$el=r}}});
define('text!home/index.html',[],function () { return '<div id="title" class="screen">\r\n    <div class="logo-wrapper">\r\n        <div class="logo"></div>    \r\n    </div>\r\n    <div id="player-buttons">\r\n        <div class="player-button" id="one-player-button" data-bind="click: playSolo">\r\n            <div class="inner">ONE PLAYER</div>\r\n        </div>\r\n        <div class="player-button" id="two-player-button" data-bind="click: playMulti">\r\n            <div class="inner">TWO PLAYERS</div>\r\n        </div>\r\n    </div>\r\n</div>\r\n<div data-bind="compose: { transition: \'slidedown\', el: \'.popup-dialog\', cacheViews: true, model: model }"></div>\r\n';});

define('home/index',["plugins/router","durandal/app","api/datacontext"],function(e,t,o){var n=ko.observable("account/login"),i=t.on("account:view:change").then(function(e){n(e)}),a=t.on("account:login").then(function(e){e.success&&n("")});return{model:n,binding:function(){return{cacheViews:!1}},detached:function(){i.off(),a.off()},playSolo:function(){o.playerCount=1,e.navigate("game")},playMulti:function(){o.playerCount=2,e.navigate("game")}}});
/*!
 * jQuery Transit - CSS3 transitions and transformations
 * (c) 2011-2012 Rico Sta. Cruz <rico@ricostacruz.com>
 * MIT Licensed.
 *
 * http://ricostacruz.com/jquery.transit
 * http://github.com/rstacruz/jquery.transit
 */

(function($) {
  $.transit = {
    version: "0.9.9",

    // Map of $.css() keys to values for 'transitionProperty'.
    // See https://developer.mozilla.org/en/CSS/CSS_transitions#Properties_that_can_be_animated
    propertyMap: {
      marginLeft    : 'margin',
      marginRight   : 'margin',
      marginBottom  : 'margin',
      marginTop     : 'margin',
      paddingLeft   : 'padding',
      paddingRight  : 'padding',
      paddingBottom : 'padding',
      paddingTop    : 'padding'
    },

    // Will simply transition "instantly" if false
    enabled: true,

    // Set this to false if you don't want to use the transition end property.
    useTransitionEnd: false
  };

  var div = document.createElement('div');
  var support = {};

  // Helper function to get the proper vendor property name.
  // (`transition` => `WebkitTransition`)
  function getVendorPropertyName(prop) {
    // Handle unprefixed versions (FF16+, for example)
    if (prop in div.style) return prop;

    var prefixes = ['Moz', 'Webkit', 'O', 'ms'];
    var prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

    if (prop in div.style) { return prop; }

    for (var i=0; i<prefixes.length; ++i) {
      var vendorProp = prefixes[i] + prop_;
      if (vendorProp in div.style) { return vendorProp; }
    }
  }

  // Helper function to check if transform3D is supported.
  // Should return true for Webkits and Firefox 10+.
  function checkTransform3dSupport() {
    div.style[support.transform] = '';
    div.style[support.transform] = 'rotateY(90deg)';
    return div.style[support.transform] !== '';
  }

  var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

  // Check for the browser's transitions support.
  support.transition      = getVendorPropertyName('transition');
  support.transitionDelay = getVendorPropertyName('transitionDelay');
  support.transform       = getVendorPropertyName('transform');
  support.transformOrigin = getVendorPropertyName('transformOrigin');
  support.filter          = getVendorPropertyName('Filter');
  support.transform3d     = checkTransform3dSupport();

  var eventNames = {
    'transition':       'transitionEnd',
    'MozTransition':    'transitionend',
    'OTransition':      'oTransitionEnd',
    'WebkitTransition': 'webkitTransitionEnd',
    'msTransition':     'MSTransitionEnd'
  };

  // Detect the 'transitionend' event needed.
  var transitionEnd = support.transitionEnd = eventNames[support.transition] || null;

  // Populate jQuery's `$.support` with the vendor prefixes we know.
  // As per [jQuery's cssHooks documentation](http://api.jquery.com/jQuery.cssHooks/),
  // we set $.support.transition to a string of the actual property name used.
  for (var key in support) {
    if (support.hasOwnProperty(key) && typeof $.support[key] === 'undefined') {
      $.support[key] = support[key];
    }
  }

  // Avoid memory leak in IE.
  div = null;

  // ## $.cssEase
  // List of easing aliases that you can use with `$.fn.transition`.
  $.cssEase = {
    '_default':       'ease',
    'in':             'ease-in',
    'out':            'ease-out',
    'in-out':         'ease-in-out',
    'snap':           'cubic-bezier(0,1,.5,1)',
    // Penner equations
    'easeOutCubic':   'cubic-bezier(.215,.61,.355,1)',
    'easeInOutCubic': 'cubic-bezier(.645,.045,.355,1)',
    'easeInCirc':     'cubic-bezier(.6,.04,.98,.335)',
    'easeOutCirc':    'cubic-bezier(.075,.82,.165,1)',
    'easeInOutCirc':  'cubic-bezier(.785,.135,.15,.86)',
    'easeInExpo':     'cubic-bezier(.95,.05,.795,.035)',
    'easeOutExpo':    'cubic-bezier(.19,1,.22,1)',
    'easeInOutExpo':  'cubic-bezier(1,0,0,1)',
    'easeInQuad':     'cubic-bezier(.55,.085,.68,.53)',
    'easeOutQuad':    'cubic-bezier(.25,.46,.45,.94)',
    'easeInOutQuad':  'cubic-bezier(.455,.03,.515,.955)',
    'easeInQuart':    'cubic-bezier(.895,.03,.685,.22)',
    'easeOutQuart':   'cubic-bezier(.165,.84,.44,1)',
    'easeInOutQuart': 'cubic-bezier(.77,0,.175,1)',
    'easeInQuint':    'cubic-bezier(.755,.05,.855,.06)',
    'easeOutQuint':   'cubic-bezier(.23,1,.32,1)',
    'easeInOutQuint': 'cubic-bezier(.86,0,.07,1)',
    'easeInSine':     'cubic-bezier(.47,0,.745,.715)',
    'easeOutSine':    'cubic-bezier(.39,.575,.565,1)',
    'easeInOutSine':  'cubic-bezier(.445,.05,.55,.95)',
    'easeInBack':     'cubic-bezier(.6,-.28,.735,.045)',
    'easeOutBack':    'cubic-bezier(.175, .885,.32,1.275)',
    'easeInOutBack':  'cubic-bezier(.68,-.55,.265,1.55)'
  };

  // ## 'transform' CSS hook
  // Allows you to use the `transform` property in CSS.
  //
  //     $("#hello").css({ transform: "rotate(90deg)" });
  //
  //     $("#hello").css('transform');
  //     //=> { rotate: '90deg' }
  //
  $.cssHooks['transit:transform'] = {
    // The getter returns a `Transform` object.
    get: function(elem) {
      return $(elem).data('transform') || new Transform();
    },

    // The setter accepts a `Transform` object or a string.
    set: function(elem, v) {
      var value = v;

      if (!(value instanceof Transform)) {
        value = new Transform(value);
      }

      // We've seen the 3D version of Scale() not work in Chrome when the
      // element being scaled extends outside of the viewport.  Thus, we're
      // forcing Chrome to not use the 3d transforms as well.  Not sure if
      // translate is affectede, but not risking it.  Detection code from
      // http://davidwalsh.name/detecting-google-chrome-javascript
      if (support.transform === 'WebkitTransform' && !isChrome) {
        elem.style[support.transform] = value.toString(true);
      } else {
        elem.style[support.transform] = value.toString();
      }

      $(elem).data('transform', value);
    }
  };

  // Add a CSS hook for `.css({ transform: '...' })`.
  // In jQuery 1.8+, this will intentionally override the default `transform`
  // CSS hook so it'll play well with Transit. (see issue #62)
  $.cssHooks.transform = {
    set: $.cssHooks['transit:transform'].set
  };

  // ## 'filter' CSS hook
  // Allows you to use the `filter` property in CSS.
  //
  //     $("#hello").css({ filter: 'blur(10px)' });
  //
  $.cssHooks.filter = {
    get: function(elem) {
      return elem.style[support.filter];
    },
    set: function(elem, value) {
      elem.style[support.filter] = value;
    }
  };

  // jQuery 1.8+ supports prefix-free transitions, so these polyfills will not
  // be necessary.
  if ($.fn.jquery < "1.8") {
    // ## 'transformOrigin' CSS hook
    // Allows the use for `transformOrigin` to define where scaling and rotation
    // is pivoted.
    //
    //     $("#hello").css({ transformOrigin: '0 0' });
    //
    $.cssHooks.transformOrigin = {
      get: function(elem) {
        return elem.style[support.transformOrigin];
      },
      set: function(elem, value) {
        elem.style[support.transformOrigin] = value;
      }
    };

    // ## 'transition' CSS hook
    // Allows you to use the `transition` property in CSS.
    //
    //     $("#hello").css({ transition: 'all 0 ease 0' });
    //
    $.cssHooks.transition = {
      get: function(elem) {
        return elem.style[support.transition];
      },
      set: function(elem, value) {
        elem.style[support.transition] = value;
      }
    };
  }

  // ## Other CSS hooks
  // Allows you to rotate, scale and translate.
  registerCssHook('scale');
  registerCssHook('translate');
  registerCssHook('rotate');
  registerCssHook('rotateX');
  registerCssHook('rotateY');
  registerCssHook('rotate3d');
  registerCssHook('perspective');
  registerCssHook('skewX');
  registerCssHook('skewY');
  registerCssHook('x', true);
  registerCssHook('y', true);

  // ## Transform class
  // This is the main class of a transformation property that powers
  // `$.fn.css({ transform: '...' })`.
  //
  // This is, in essence, a dictionary object with key/values as `-transform`
  // properties.
  //
  //     var t = new Transform("rotate(90) scale(4)");
  //
  //     t.rotate             //=> "90deg"
  //     t.scale              //=> "4,4"
  //
  // Setters are accounted for.
  //
  //     t.set('rotate', 4)
  //     t.rotate             //=> "4deg"
  //
  // Convert it to a CSS string using the `toString()` and `toString(true)` (for WebKit)
  // functions.
  //
  //     t.toString()         //=> "rotate(90deg) scale(4,4)"
  //     t.toString(true)     //=> "rotate(90deg) scale3d(4,4,0)" (WebKit version)
  //
  function Transform(str) {
    if (typeof str === 'string') { this.parse(str); }
    return this;
  }

  Transform.prototype = {
    // ### setFromString()
    // Sets a property from a string.
    //
    //     t.setFromString('scale', '2,4');
    //     // Same as set('scale', '2', '4');
    //
    setFromString: function(prop, val) {
      var args =
        (typeof val === 'string')  ? val.split(',') :
        (val.constructor === Array) ? val :
        [ val ];

      args.unshift(prop);

      Transform.prototype.set.apply(this, args);
    },

    // ### set()
    // Sets a property.
    //
    //     t.set('scale', 2, 4);
    //
    set: function(prop) {
      var args = Array.prototype.slice.apply(arguments, [1]);
      if (this.setter[prop]) {
        this.setter[prop].apply(this, args);
      } else {
        this[prop] = args.join(',');
      }
    },

    get: function(prop) {
      if (this.getter[prop]) {
        return this.getter[prop].apply(this);
      } else {
        return this[prop] || 0;
      }
    },

    setter: {
      // ### rotate
      //
      //     .css({ rotate: 30 })
      //     .css({ rotate: "30" })
      //     .css({ rotate: "30deg" })
      //     .css({ rotate: "30deg" })
      //
      rotate: function(theta) {
        this.rotate = unit(theta, 'deg');
      },

      rotateX: function(theta) {
        this.rotateX = unit(theta, 'deg');
      },

      rotateY: function(theta) {
        this.rotateY = unit(theta, 'deg');
      },

      // ### scale
      //
      //     .css({ scale: 9 })      //=> "scale(9,9)"
      //     .css({ scale: '3,2' })  //=> "scale(3,2)"
      //
      scale: function(x, y) {
        if (y === undefined) { y = x; }
        this.scale = x + "," + y;
      },

      // ### skewX + skewY
      skewX: function(x) {
        this.skewX = unit(x, 'deg');
      },

      skewY: function(y) {
        this.skewY = unit(y, 'deg');
      },

      // ### perspectvie
      perspective: function(dist) {
        this.perspective = unit(dist, 'px');
      },

      // ### x / y
      // Translations. Notice how this keeps the other value.
      //
      //     .css({ x: 4 })       //=> "translate(4px, 0)"
      //     .css({ y: 10 })      //=> "translate(4px, 10px)"
      //
      x: function(x) {
        this.set('translate', x, null);
      },

      y: function(y) {
        this.set('translate', null, y);
      },

      // ### translate
      // Notice how this keeps the other value.
      //
      //     .css({ translate: '2, 5' })    //=> "translate(2px, 5px)"
      //
      translate: function(x, y) {
        if (this._translateX === undefined) { this._translateX = 0; }
        if (this._translateY === undefined) { this._translateY = 0; }

        if (x !== null && x !== undefined) { this._translateX = unit(x, 'px'); }
        if (y !== null && y !== undefined) { this._translateY = unit(y, 'px'); }

        this.translate = this._translateX + "," + this._translateY;
      }
    },

    getter: {
      x: function() {
        return this._translateX || 0;
      },

      y: function() {
        return this._translateY || 0;
      },

      scale: function() {
        var s = (this.scale || "1,1").split(',');
        if (s[0]) { s[0] = parseFloat(s[0]); }
        if (s[1]) { s[1] = parseFloat(s[1]); }

        // "2.5,2.5" => 2.5
        // "2.5,1" => [2.5,1]
        return (s[0] === s[1]) ? s[0] : s;
      },

      rotate3d: function() {
        var s = (this.rotate3d || "0,0,0,0deg").split(',');
        for (var i=0; i<=3; ++i) {
          if (s[i]) { s[i] = parseFloat(s[i]); }
        }
        if (s[3]) { s[3] = unit(s[3], 'deg'); }

        return s;
      }
    },

    // ### parse()
    // Parses from a string. Called on constructor.
    parse: function(str) {
      var self = this;
      str.replace(/([a-zA-Z0-9]+)\((.*?)\)/g, function(x, prop, val) {
        self.setFromString(prop, val);
      });
    },

    // ### toString()
    // Converts to a `transition` CSS property string. If `use3d` is given,
    // it converts to a `-webkit-transition` CSS property string instead.
    toString: function(use3d) {
      var re = [];

      for (var i in this) {
        if (this.hasOwnProperty(i)) {
          // Don't use 3D transformations if the browser can't support it.
          if ((!support.transform3d) && (
            (i === 'rotateX') ||
            (i === 'rotateY') ||
            (i === 'perspective') ||
            (i === 'transformOrigin'))) { continue; }

          if (i[0] !== '_') {
            if (use3d && (i === 'scale')) {
              re.push(i + "3d(" + this[i] + ",1)");
            } else if (use3d && (i === 'translate')) {
              re.push(i + "3d(" + this[i] + ",0)");
            } else {
              re.push(i + "(" + this[i] + ")");
            }
          }
        }
      }

      return re.join(" ");
    }
  };

  function callOrQueue(self, queue, fn) {
    if (queue === true) {
      self.queue(fn);
    } else if (queue) {
      self.queue(queue, fn);
    } else {
      fn();
    }
  }

  // ### getProperties(dict)
  // Returns properties (for `transition-property`) for dictionary `props`. The
  // value of `props` is what you would expect in `$.css(...)`.
  function getProperties(props) {
    var re = [];

    $.each(props, function(key) {
      key = $.camelCase(key); // Convert "text-align" => "textAlign"
      key = $.transit.propertyMap[key] || $.cssProps[key] || key;
      key = uncamel(key); // Convert back to dasherized

      // Get vendor specify propertie
      if (support[key])
        key = uncamel(support[key]);

      if ($.inArray(key, re) === -1) { re.push(key); }
    });

    return re;
  }

  // ### getTransition()
  // Returns the transition string to be used for the `transition` CSS property.
  //
  // Example:
  //
  //     getTransition({ opacity: 1, rotate: 30 }, 500, 'ease');
  //     //=> 'opacity 500ms ease, -webkit-transform 500ms ease'
  //
  function getTransition(properties, duration, easing, delay) {
    // Get the CSS properties needed.
    var props = getProperties(properties);

    // Account for aliases (`in` => `ease-in`).
    if ($.cssEase[easing]) { easing = $.cssEase[easing]; }

    // Build the duration/easing/delay attributes for it.
    var attribs = '' + toMS(duration) + ' ' + easing;
    if (parseInt(delay, 10) > 0) { attribs += ' ' + toMS(delay); }

    // For more properties, add them this way:
    // "margin 200ms ease, padding 200ms ease, ..."
    var transitions = [];
    $.each(props, function(i, name) {
      transitions.push(name + ' ' + attribs);
    });

    return transitions.join(', ');
  }

  // ## $.fn.transition
  // Works like $.fn.animate(), but uses CSS transitions.
  //
  //     $("...").transition({ opacity: 0.1, scale: 0.3 });
  //
  //     // Specific duration
  //     $("...").transition({ opacity: 0.1, scale: 0.3 }, 500);
  //
  //     // With duration and easing
  //     $("...").transition({ opacity: 0.1, scale: 0.3 }, 500, 'in');
  //
  //     // With callback
  //     $("...").transition({ opacity: 0.1, scale: 0.3 }, function() { ... });
  //
  //     // With everything
  //     $("...").transition({ opacity: 0.1, scale: 0.3 }, 500, 'in', function() { ... });
  //
  //     // Alternate syntax
  //     $("...").transition({
  //       opacity: 0.1,
  //       duration: 200,
  //       delay: 40,
  //       easing: 'in',
  //       complete: function() { /* ... */ }
  //      });
  //
  $.fn.transition = $.fn.transit = function(properties, duration, easing, callback) {
    var self  = this;
    var delay = 0;
    var queue = true;

    var theseProperties = jQuery.extend(true, {}, properties);

    // Account for `.transition(properties, callback)`.
    if (typeof duration === 'function') {
      callback = duration;
      duration = undefined;
    }

    // Account for `.transition(properties, options)`.
    if (typeof duration === 'object') {
      easing = duration.easing;
      delay = duration.delay || 0;
      queue = duration.queue || true;
      callback = duration.complete;
      duration = duration.duration;
    }

    // Account for `.transition(properties, duration, callback)`.
    if (typeof easing === 'function') {
      callback = easing;
      easing = undefined;
    }

    // Alternate syntax.
    if (typeof theseProperties.easing !== 'undefined') {
      easing = theseProperties.easing;
      delete theseProperties.easing;
    }

    if (typeof theseProperties.duration !== 'undefined') {
      duration = theseProperties.duration;
      delete theseProperties.duration;
    }

    if (typeof theseProperties.complete !== 'undefined') {
      callback = theseProperties.complete;
      delete theseProperties.complete;
    }

    if (typeof theseProperties.queue !== 'undefined') {
      queue = theseProperties.queue;
      delete theseProperties.queue;
    }

    if (typeof theseProperties.delay !== 'undefined') {
      delay = theseProperties.delay;
      delete theseProperties.delay;
    }

    // Set defaults. (`400` duration, `ease` easing)
    if (typeof duration === 'undefined') { duration = $.fx.speeds._default; }
    if (typeof easing === 'undefined')   { easing = $.cssEase._default; }

    duration = toMS(duration);

    // Build the `transition` property.
    var transitionValue = getTransition(theseProperties, duration, easing, delay);

    // Compute delay until callback.
    // If this becomes 0, don't bother setting the transition property.
    var work = $.transit.enabled && support.transition;
    var i = work ? (parseInt(duration, 10) + parseInt(delay, 10)) : 0;

    // If there's nothing to do...
    if (i === 0) {
      var fn = function(next) {
        self.css(theseProperties);
        if (callback) { callback.apply(self); }
        if (next) { next(); }
      };

      callOrQueue(self, queue, fn);
      return self;
    }

    // Save the old transitions of each element so we can restore it later.
    var oldTransitions = {};

    var run = function(nextCall) {
      var bound = false;

      // Prepare the callback.
      var cb = function() {
        if (bound) { self.unbind(transitionEnd, cb); }

        if (i > 0) {
          self.each(function() {
            this.style[support.transition] = (oldTransitions[this] || null);
          });
        }

        if (typeof callback === 'function') { callback.apply(self); }
        if (typeof nextCall === 'function') { nextCall(); }
      };

      if ((i > 0) && (transitionEnd) && ($.transit.useTransitionEnd)) {
        // Use the 'transitionend' event if it's available.
        bound = true;
        self.bind(transitionEnd, cb);
      } else {
        // Fallback to timers if the 'transitionend' event isn't supported.
        window.setTimeout(cb, i);
      }

      // Apply transitions.
      self.each(function() {
        if (i > 0) {
          this.style[support.transition] = transitionValue;
        }
        $(this).css(properties);
      });
    };

    // Defer running. This allows the browser to paint any pending CSS it hasn't
    // painted yet before doing the transitions.
    var deferredRun = function(next) {
        this.offsetWidth; // force a repaint
        run(next);
    };

    // Use jQuery's fx queue.
    callOrQueue(self, queue, deferredRun);

    // Chainability.
    return this;
  };

  function registerCssHook(prop, isPixels) {
    // For certain properties, the 'px' should not be implied.
    if (!isPixels) { $.cssNumber[prop] = true; }

    $.transit.propertyMap[prop] = support.transform;

    $.cssHooks[prop] = {
      get: function(elem) {
        var t = $(elem).css('transit:transform');
        return t.get(prop);
      },

      set: function(elem, value) {
        var t = $(elem).css('transit:transform');
        t.setFromString(prop, value);

        $(elem).css({ 'transit:transform': t });
      }
    };

  }

  // ### uncamel(str)
  // Converts a camelcase string to a dasherized string.
  // (`marginLeft` => `margin-left`)
  function uncamel(str) {
    return str.replace(/([A-Z])/g, function(letter) { return '-' + letter.toLowerCase(); });
  }

  // ### unit(number, unit)
  // Ensures that number `number` has a unit. If no unit is found, assume the
  // default is `unit`.
  //
  //     unit(2, 'px')          //=> "2px"
  //     unit("30deg", 'rad')   //=> "30deg"
  //
  function unit(i, units) {
    if ((typeof i === "string") && (!i.match(/^[\-0-9\.]+$/))) {
      return i;
    } else {
      return "" + i + units;
    }
  }

  // ### toMS(duration)
  // Converts given `duration` to a millisecond string.
  //
  // toMS('fast') => $.fx.speeds[i] => "200ms"
  // toMS('normal') //=> $.fx.speeds._default => "400ms"
  // toMS(10) //=> '10ms'
  // toMS('100ms') //=> '100ms'  
  //
  function toMS(duration) {
    var i = duration;

    // Allow string durations like 'fast' and 'slow', without overriding numeric values.
    if (typeof i === 'string' && (!i.match(/^[\-0-9\.]+/))) { i = $.fx.speeds[i] || $.fx.speeds._default; }

    return unit(i, 'ms');
  }

  // Export some functions for testable-ness.
  $.transit.getTransitionValue = getTransition;
})(jQuery);

define("../lib/jquery.transit", function(){});

/*!
 * jQuery UI Touch Punch 0.2.2
 *
 * Copyright 2011, Dave Furfero
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Depends:
 *  jquery.ui.widget.js
 *  jquery.ui.mouse.js
 */
(function ($) {
  // Detect touch support
  $.support.touch = 'ontouchend' in document;

  // Ignore browsers without touch support
  if (!$.support.touch) {
    return;
  }  

  var mouseProto = {}, touchHandled;

  /**
   * Simulate a mouse event based on a corresponding touch event
   * @param {Object} event A touch event
   * @param {String} simulatedType The corresponding mouse event
   */
  function simulateMouseEvent(event, simulatedType) {

    // Ignore multi-touch events
    if (event.originalEvent.touches.length > 1) {
      //event.originalEvent.touches.length == 3
      return;
    }
    event.preventDefault();

    var touch = event.originalEvent.changedTouches[0],
        simulatedEvent = document.createEvent('MouseEvents');

    // Initialize the simulated mouse event using the touch event's coordinates
    simulatedEvent.initMouseEvent(
      simulatedType,    // type
      true,             // bubbles                    
      true,             // cancelable                 
      window,           // view                       
      1,                // detail                     
      touch.screenX,    // screenX                    
      touch.screenY,    // screenY                    
      touch.clientX,    // clientX                    
      touch.clientY,    // clientY                    
      false,            // ctrlKey                    
      false,            // altKey                     
      false,            // shiftKey                   
      false,            // metaKey                    
      0,                // button                     
      null              // relatedTarget              
    );

    // Dispatch the simulated event to the target element
    event.target.dispatchEvent(simulatedEvent);
  }

  /**
   * Handle the jQuery UI widget's touchstart events
   * @param {Object} event The widget element's touchstart event
   */
  mouseProto._touchStart = function (event) {
    var self = this;

    // Ignore the event if another widget is already being handled
    if (touchHandled) return;
    touchHandled = true;

    // Track movement to determine if interaction was a click
    self._touchMoved = false;

    // Simulate the mouseover event
    simulateMouseEvent(event, 'mouseover');

    // Simulate the mousemove event
    //simulateMouseEvent(event, 'mousemove');

    // Simulate the mousedown event
    simulateMouseEvent(event, 'mousedown');
  };

  /**
   * Handle the jQuery UI widget's touchmove events
   * @param {Object} event The document's touchmove event
   */
  mouseProto._touchMove = function (event) {

    // Ignore event if not handled
    if (!touchHandled) {
      return;
    }

    // Interaction was not a click
    this._touchMoved = true;

    // Simulate the mousemove event
    simulateMouseEvent(event, 'mousemove');
  };

  /**
   * Handle the jQuery UI widget's touchend events
   * @param {Object} event The document's touchend event
   */  
  mouseProto._touchEnd = function (event) {
    // Ignore event if not handled
    if (!touchHandled) {
      return;
    }

    // Simulate the mouseup event
    simulateMouseEvent(event, 'mouseup');

    // Simulate the mouseout event
    simulateMouseEvent(event, 'mouseout');

    // If the touch interaction did not move, it should trigger a click
    if (!this._touchMoved) {

      // Simulate the click event
      simulateMouseEvent(event, 'click');
    }

    // Unset the flag to allow other widgets to inherit the touch event
    touchHandled = false;
  };

  /**
   * A duck punch of the $.ui.mouse _mouseInit method to support touch events.
   * This method extends the widget with bound touch event handlers that
   * translate touch events to mouse events and pass them to the widget's
   * original mouse event handling methods.
   */
  mouseProto.touchInit = function (element) {

    var self = this;
    
    // Delegate the touch handlers to the widget's element
    element
      .bind('touchstart', $.proxy(self, '_touchStart'))
      .bind('touchcancel', $.proxy(self, '_touchEnd'))
      .bind('touchmove', $.proxy(self, '_touchMove'))
      .bind('touchend', $.proxy(self, '_touchEnd'));
  };
  
  $.fn.touchPunch = function () {
    return this.each(function () {
      mouseProto.touchInit($(this));
    });
  }


  //mouseProto.touchInit($(window));
    
})(jQuery);
define("../lib/jquery.touch-punch", function(){});

/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(v,p){var d={},u=d.lib={},r=function(){},f=u.Base={extend:function(a){r.prototype=this;var b=new r;a&&b.mixIn(a);b.hasOwnProperty("init")||(b.init=function(){b.$super.init.apply(this,arguments)});b.init.prototype=b;b.$super=this;return b},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var b in a)a.hasOwnProperty(b)&&(this[b]=a[b]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
s=u.WordArray=f.extend({init:function(a,b){a=this.words=a||[];this.sigBytes=b!=p?b:4*a.length},toString:function(a){return(a||y).stringify(this)},concat:function(a){var b=this.words,c=a.words,j=this.sigBytes;a=a.sigBytes;this.clamp();if(j%4)for(var n=0;n<a;n++)b[j+n>>>2]|=(c[n>>>2]>>>24-8*(n%4)&255)<<24-8*((j+n)%4);else if(65535<c.length)for(n=0;n<a;n+=4)b[j+n>>>2]=c[n>>>2];else b.push.apply(b,c);this.sigBytes+=a;return this},clamp:function(){var a=this.words,b=this.sigBytes;a[b>>>2]&=4294967295<<
32-8*(b%4);a.length=v.ceil(b/4)},clone:function(){var a=f.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var b=[],c=0;c<a;c+=4)b.push(4294967296*v.random()|0);return new s.init(b,a)}}),x=d.enc={},y=x.Hex={stringify:function(a){var b=a.words;a=a.sigBytes;for(var c=[],j=0;j<a;j++){var n=b[j>>>2]>>>24-8*(j%4)&255;c.push((n>>>4).toString(16));c.push((n&15).toString(16))}return c.join("")},parse:function(a){for(var b=a.length,c=[],j=0;j<b;j+=2)c[j>>>3]|=parseInt(a.substr(j,
2),16)<<24-4*(j%8);return new s.init(c,b/2)}},e=x.Latin1={stringify:function(a){var b=a.words;a=a.sigBytes;for(var c=[],j=0;j<a;j++)c.push(String.fromCharCode(b[j>>>2]>>>24-8*(j%4)&255));return c.join("")},parse:function(a){for(var b=a.length,c=[],j=0;j<b;j++)c[j>>>2]|=(a.charCodeAt(j)&255)<<24-8*(j%4);return new s.init(c,b)}},q=x.Utf8={stringify:function(a){try{return decodeURIComponent(escape(e.stringify(a)))}catch(b){throw Error("Malformed UTF-8 data");}},parse:function(a){return e.parse(unescape(encodeURIComponent(a)))}},
t=u.BufferedBlockAlgorithm=f.extend({reset:function(){this._data=new s.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=q.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var b=this._data,c=b.words,j=b.sigBytes,n=this.blockSize,e=j/(4*n),e=a?v.ceil(e):v.max((e|0)-this._minBufferSize,0);a=e*n;j=v.min(4*a,j);if(a){for(var f=0;f<a;f+=n)this._doProcessBlock(c,f);f=c.splice(0,a);b.sigBytes-=j}return new s.init(f,j)},clone:function(){var a=f.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});u.Hasher=t.extend({cfg:f.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){t.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(b,c){return(new a.init(c)).finalize(b)}},_createHmacHelper:function(a){return function(b,c){return(new w.HMAC.init(a,
c)).finalize(b)}}});var w=d.algo={};return d}(Math);
(function(v){var p=CryptoJS,d=p.lib,u=d.Base,r=d.WordArray,p=p.x64={};p.Word=u.extend({init:function(f,s){this.high=f;this.low=s}});p.WordArray=u.extend({init:function(f,s){f=this.words=f||[];this.sigBytes=s!=v?s:8*f.length},toX32:function(){for(var f=this.words,s=f.length,d=[],p=0;p<s;p++){var e=f[p];d.push(e.high);d.push(e.low)}return r.create(d,this.sigBytes)},clone:function(){for(var f=u.clone.call(this),d=f.words=this.words.slice(0),p=d.length,r=0;r<p;r++)d[r]=d[r].clone();return f}})})();
(function(v){for(var p=CryptoJS,d=p.lib,u=d.WordArray,r=d.Hasher,f=p.x64.Word,d=p.algo,s=[],x=[],y=[],e=1,q=0,t=0;24>t;t++){s[e+5*q]=(t+1)*(t+2)/2%64;var w=(2*e+3*q)%5,e=q%5,q=w}for(e=0;5>e;e++)for(q=0;5>q;q++)x[e+5*q]=q+5*((2*e+3*q)%5);e=1;for(q=0;24>q;q++){for(var a=w=t=0;7>a;a++){if(e&1){var b=(1<<a)-1;32>b?w^=1<<b:t^=1<<b-32}e=e&128?e<<1^113:e<<1}y[q]=f.create(t,w)}for(var c=[],e=0;25>e;e++)c[e]=f.create();d=d.SHA3=r.extend({cfg:r.cfg.extend({outputLength:512}),_doReset:function(){for(var a=this._state=
[],b=0;25>b;b++)a[b]=new f.init;this.blockSize=(1600-2*this.cfg.outputLength)/32},_doProcessBlock:function(a,b){for(var e=this._state,f=this.blockSize/2,h=0;h<f;h++){var l=a[b+2*h],m=a[b+2*h+1],l=(l<<8|l>>>24)&16711935|(l<<24|l>>>8)&4278255360,m=(m<<8|m>>>24)&16711935|(m<<24|m>>>8)&4278255360,g=e[h];g.high^=m;g.low^=l}for(f=0;24>f;f++){for(h=0;5>h;h++){for(var d=l=0,k=0;5>k;k++)g=e[h+5*k],l^=g.high,d^=g.low;g=c[h];g.high=l;g.low=d}for(h=0;5>h;h++){g=c[(h+4)%5];l=c[(h+1)%5];m=l.high;k=l.low;l=g.high^
(m<<1|k>>>31);d=g.low^(k<<1|m>>>31);for(k=0;5>k;k++)g=e[h+5*k],g.high^=l,g.low^=d}for(m=1;25>m;m++)g=e[m],h=g.high,g=g.low,k=s[m],32>k?(l=h<<k|g>>>32-k,d=g<<k|h>>>32-k):(l=g<<k-32|h>>>64-k,d=h<<k-32|g>>>64-k),g=c[x[m]],g.high=l,g.low=d;g=c[0];h=e[0];g.high=h.high;g.low=h.low;for(h=0;5>h;h++)for(k=0;5>k;k++)m=h+5*k,g=e[m],l=c[m],m=c[(h+1)%5+5*k],d=c[(h+2)%5+5*k],g.high=l.high^~m.high&d.high,g.low=l.low^~m.low&d.low;g=e[0];h=y[f];g.high^=h.high;g.low^=h.low}},_doFinalize:function(){var a=this._data,
b=a.words,c=8*a.sigBytes,e=32*this.blockSize;b[c>>>5]|=1<<24-c%32;b[(v.ceil((c+1)/e)*e>>>5)-1]|=128;a.sigBytes=4*b.length;this._process();for(var a=this._state,b=this.cfg.outputLength/8,c=b/8,e=[],h=0;h<c;h++){var d=a[h],f=d.high,d=d.low,f=(f<<8|f>>>24)&16711935|(f<<24|f>>>8)&4278255360,d=(d<<8|d>>>24)&16711935|(d<<24|d>>>8)&4278255360;e.push(d);e.push(f)}return new u.init(e,b)},clone:function(){for(var a=r.clone.call(this),b=a._state=this._state.slice(0),c=0;25>c;c++)b[c]=b[c].clone();return a}});
p.SHA3=r._createHelper(d);p.HmacSHA3=r._createHmacHelper(d)})(Math);

define("../lib/crypto.sha3", function(){});

requirejs.config({paths:{text:"../lib/requirejs-text/text",durandal:"../lib/durandal/",plugins:"../lib/durandal/plugins",transitions:"../lib/durandal/transitions",paper:"../lib/paper/paper",socket:"../lib/socket.io","crypto.sha3":"../lib/crypto.sha3","transitions/slidedown":"api/transitions/slidedown"},urlArgs:"t"+(new Date).getTime()}),define("jquery",[],function(){return jQuery}),define("knockout",ko),define('main',["durandal/system","durandal/app","durandal/viewLocator","api/server","api/datacontext","dialogs/_dialog","../lib/jquery.transit","../lib/jquery.touch-punch","../lib/crypto.sha3"],function(t,e,n,i,r,o){t.debug(!0),e.title="Words Of Oz",e.configurePlugins({router:!0,dialog:!0,http:!0}),e._loading=ko.observable(!1),e.loading=ko.computed({read:function(){return e._loading()||r.loading()===!0},write:function(t){e._loading(t)},owner:this}),e.woz={dialog:o},e.start().then(function(){n.useConvention(),e.setRoot("shell",null,"app")}),window.app=e});
define('text!shell.html',[],function () { return '<div>\r\n    <div class="loader pull-right" data-bind="css: { active: loading }">\r\n        <i class="icon-spinner icon-2x icon-spin"></i>\r\n    </div>\r\n    \r\n    <!--ko router: { transition: \'entrance\', cacheViews: true }--><!--/ko-->    \r\n</div>';});

define('shell',["plugins/router","durandal/app"],function(t,e){return{router:t,loading:ko.computed(function(){return t.isNavigating()||e.loading()}),activate:function(){return window.router=t,t.map([{route:["","home"],moduleId:"home/index",title:"Start",nav:!0},{route:"not-found",moduleId:"error/not-found",title:"Error 404: Not Found",nav:!0},{route:"game",moduleId:"game/game",title:"Play",nav:!0,hash:"#game"},{route:"account",moduleId:"account/index",title:"Account Settings",nav:!0,hash:"#account"}]).buildNavigationModel().mapUnknownRoutes("home/index","not-found").activate()}}});
define('plugins/dialog',["durandal/system","durandal/app","durandal/composition","durandal/activator","durandal/viewEngine","jquery","knockout"],function(t,e,n,i,r,o,a){function s(e){return t.defer(function(n){t.isString(e)?t.acquire(e).then(function(e){n.resolve(t.resolveObject(e))}).fail(function(n){t.error("Failed to load dialog module ("+e+"). Details: "+n.message)}):n.resolve(e)}).promise()}var c,u={},l=0,h=function(t,e,n){this.message=t,this.title=e||h.defaultTitle,this.options=n||h.defaultOptions};return h.prototype.selectOption=function(t){c.close(this,t)},h.prototype.getView=function(){return r.processMarkup(h.defaultViewMarkup)},h.setViewUrl=function(t){delete h.prototype.getView,h.prototype.viewUrl=t},h.defaultTitle=e.title||"Application",h.defaultOptions=["Ok"],h.defaultViewMarkup=['<div data-view="plugins/messageBox" class="messageBox">','<div class="modal-header">','<h3 data-bind="text: title"></h3>',"</div>",'<div class="modal-body">','<p class="message" data-bind="text: message"></p>',"</div>",'<div class="modal-footer" data-bind="foreach: options">','<button class="btn" data-bind="click: function () { $parent.selectOption($data); }, text: $data, css: { \'btn-primary\': $index() == 0, autofocus: $index() == 0 }"></button>',"</div>","</div>"].join("\n"),c={MessageBox:h,currentZIndex:1050,getNextZIndex:function(){return++this.currentZIndex},isOpen:function(){return l>0},getContext:function(t){return u[t||"default"]},addContext:function(t,e){e.name=t,u[t]=e;var n="show"+t.substr(0,1).toUpperCase()+t.substr(1);this[n]=function(e,n){return this.show(e,n,t)}},createCompositionSettings:function(t,e){var n={model:t,activate:!1};return e.attached&&(n.attached=e.attached),e.compositionComplete&&(n.compositionComplete=e.compositionComplete),n},getDialog:function(t){return t?t.__dialog__:void 0},close:function(t){var e=this.getDialog(t);if(e){var n=Array.prototype.slice.call(arguments,1);e.close.apply(e,n)}},show:function(e,r,o){var a=this,c=u[o||"default"];return t.defer(function(t){s(e).then(function(e){var o=i.create();o.activateItem(e,r).then(function(i){if(i){var r=e.__dialog__={owner:e,context:c,activator:o,close:function(){var n=arguments;o.deactivateItem(e,!0).then(function(i){i&&(l--,c.removeHost(r),delete e.__dialog__,0==n.length?t.resolve():1==n.length?t.resolve(n[0]):t.resolve.apply(t,n))})}};r.settings=a.createCompositionSettings(e,c),c.addHost(r),l++,n.compose(r.host,r.settings)}else t.resolve(!1)})})}).promise()},showMessage:function(e,n,i){return t.isString(this.MessageBox)?c.show(this.MessageBox,[e,n||h.defaultTitle,i||h.defaultOptions]):c.show(new this.MessageBox(e,n,i))},install:function(t){e.showDialog=function(t,e,n){return c.show(t,e,n)},e.showMessage=function(t,e,n){return c.showMessage(t,e,n)},t.messageBox&&(c.MessageBox=t.messageBox),t.messageBoxView&&(c.MessageBox.prototype.getView=function(){return t.messageBoxView})}},c.addContext("default",{blockoutOpacity:.2,removeDelay:200,addHost:function(t){var e=o("body"),n=o('<div class="modalBlockout"></div>').css({"z-index":c.getNextZIndex(),opacity:this.blockoutOpacity}).appendTo(e),i=o('<div class="modalHost"></div>').css({"z-index":c.getNextZIndex()}).appendTo(e);if(t.host=i.get(0),t.blockout=n.get(0),!c.isOpen()){t.oldBodyMarginRight=e.css("margin-right"),t.oldInlineMarginRight=e.get(0).style.marginRight;var r=o("html"),a=e.outerWidth(!0),s=r.scrollTop();o("html").css("overflow-y","hidden");var u=o("body").outerWidth(!0);e.css("margin-right",u-a+parseInt(t.oldBodyMarginRight)+"px"),r.scrollTop(s)}},removeHost:function(t){if(o(t.host).css("opacity",0),o(t.blockout).css("opacity",0),setTimeout(function(){a.removeNode(t.host),a.removeNode(t.blockout)},this.removeDelay),!c.isOpen()){var e=o("html"),n=e.scrollTop();e.css("overflow-y","").scrollTop(n),t.oldInlineMarginRight?o("body").css("margin-right",t.oldBodyMarginRight):o("body").css("margin-right","")}},compositionComplete:function(t,e,n){var i=o(t),r=i.width(),a=i.height(),s=c.getDialog(n.model);i.css({"margin-top":(-a/2).toString()+"px","margin-left":(-r/2).toString()+"px"}),o(s.host).css("opacity",1),o(t).hasClass("autoclose")&&o(s.blockout).click(function(){s.close()}),o(".autofocus",t).each(function(){o(this).focus()})}}),c});
define('plugins/http',["jquery","knockout"],function(t,e){return{callbackParam:"callback",get:function(e,n){return t.ajax(e,{data:n})},jsonp:function(e,n,i){return-1==e.indexOf("=?")&&(i=i||this.callbackParam,e+=-1==e.indexOf("?")?"?":"&",e+=i+"=?"),t.ajax({url:e,dataType:"jsonp",data:n})},post:function(n,i){return t.ajax({url:n,data:e.toJSON(i),type:"POST",contentType:"application/json",dataType:"json"})}}});
define('plugins/observable',["durandal/system","durandal/binder","knockout"],function(t,e,n){function i(t){var e=t[0];return"_"===e||"$"===e}function r(e){if(!e||t.isElement(e)||e.ko===n||e.jquery)return!1;var i=h.call(e);return-1==d.indexOf(i)&&!(e===!0||e===!1)}function o(t,e){var n=t.__observable__,i=!0;if(!n||!n.__full__){n=n||(t.__observable__={}),n.__full__=!0,f.forEach(function(n){t[n]=function(){i=!1;var t=m[n].apply(e,arguments);return i=!0,t}}),p.forEach(function(n){t[n]=function(){i&&e.valueWillMutate();var r=v[n].apply(t,arguments);return i&&e.valueHasMutated(),r}}),g.forEach(function(n){t[n]=function(){for(var r=0,o=arguments.length;o>r;r++)a(arguments[r]);i&&e.valueWillMutate();var s=v[n].apply(t,arguments);return i&&e.valueHasMutated(),s}}),t.splice=function(){for(var n=2,r=arguments.length;r>n;n++)a(arguments[n]);i&&e.valueWillMutate();var o=v.splice.apply(t,arguments);return i&&e.valueHasMutated(),o};for(var r=0,o=t.length;o>r;r++)a(t[r])}}function a(e){var a,s;if(r(e)&&(a=e.__observable__,!a||!a.__full__)){if(a=a||(e.__observable__={}),a.__full__=!0,t.isArray(e)){var u=n.observableArray(e);o(e,u)}else for(var l in e)i(l)||a[l]||(s=e[l],t.isFunction(s)||c(e,l,s));_&&t.log("Converted",e)}}function s(t,e,n){var i;t(e),i=t.peek(),n?i.destroyAll||(i||(i=[],t(i)),o(i,t)):a(i)}function c(e,i,r){var c,u,l=e.__observable__||(e.__observable__={});if(void 0===r&&(r=e[i]),t.isArray(r))c=n.observableArray(r),o(r,c),u=!0;else if("function"==typeof r){if(!n.isObservable(r))return null;c=r}else t.isPromise(r)?(c=n.observable(),r.then(function(e){if(t.isArray(e)){var i=n.observableArray(e);o(e,i),e=i}c(e)})):(c=n.observable(r),a(r));return Object.defineProperty(e,i,{configurable:!0,enumerable:!0,get:c,set:n.isWriteableObservable(c)?function(e){e&&t.isPromise(e)?e.then(function(e){s(c,e,t.isArray(e))}):s(c,e,u)}:void 0}),l[i]=c,c}function u(e,n,i){var r,o=this,a={owner:e,deferEvaluation:!0};return"function"==typeof i?a.read=i:("value"in i&&t.error('For ko.defineProperty, you must not specify a "value" for the property. You must provide a "get" function.'),"function"!=typeof i.get&&t.error('For ko.defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".'),a.read=i.get,a.write=i.set),r=o.computed(a),e[n]=r,c(e,n,r)}var l,h=Object.prototype.toString,d=["[object Function]","[object String]","[object Boolean]","[object Number]","[object Date]","[object RegExp]"],f=["remove","removeAll","destroy","destroyAll","replace"],p=["pop","reverse","sort","shift","splice"],g=["push","unshift"],v=Array.prototype,m=n.observableArray.fn,_=!1;return l=function(t,e){var i,r,o;return t?(i=t.__observable__,i&&(r=i[e])?r:(o=t[e],n.isObservable(o)?o:c(t,e,o))):null},l.defineProperty=u,l.convertProperty=c,l.convertObject=a,l.install=function(t){var n=e.binding;e.binding=function(t,e,i){i.applyBindings&&!i.skipConversion&&a(t),n(t,e)},_=t.logConversion},l});
define('plugins/serializer',["durandal/system"],function(t){return{typeAttribute:"type",space:void 0,replacer:function(t,e){if(t){var n=t[0];if("_"===n||"$"===n)return void 0}return e},serialize:function(e,n){return n=void 0===n?{}:n,(t.isString(n)||t.isNumber(n))&&(n={space:n}),JSON.stringify(e,n.replacer||this.replacer,n.space||this.space)},getTypeId:function(t){return t?t[this.typeAttribute]:void 0},typeMap:{},registerType:function(){var e=arguments[0];if(1==arguments.length){var n=e[this.typeAttribute]||t.getModuleId(e);this.typeMap[n]=e}else this.typeMap[e]=arguments[1]},reviver:function(t,e,n,i){var r=n(e);if(r){var o=i(r);if(o)return o.fromJSON?o.fromJSON(e):new o(e)}return e},deserialize:function(t,e){var n=this;e=e||{};var i=e.getTypeId||function(t){return n.getTypeId(t)},r=e.getConstructor||function(t){return n.typeMap[t]},o=e.reviver||function(t,e){return n.reviver(t,e,i,r)};return JSON.parse(t,o)}}});
define('plugins/widget',["durandal/system","durandal/composition","jquery","knockout"],function(t,e,n,i){function r(t,n){var r=i.utils.domData.get(t,c);r||(r={parts:e.cloneNodes(i.virtualElements.childNodes(t))},i.virtualElements.emptyNode(t),i.utils.domData.set(t,c,r)),n.parts=r.parts}var o={},a={},s=["model","view","kind"],c="durandal-widget-data",u={getSettings:function(e){var n=i.utils.unwrapObservable(e())||{};if(t.isString(n))return{kind:n};for(var r in n)n[r]=-1!=i.utils.arrayIndexOf(s,r)?i.utils.unwrapObservable(n[r]):n[r];return n},registerKind:function(t){i.bindingHandlers[t]={init:function(){return{controlsDescendantBindings:!0}},update:function(e,n,i,o,a){var s=u.getSettings(n);s.kind=t,r(e,s),u.create(e,s,a,!0)}},i.virtualElements.allowedBindings[t]=!0},mapKind:function(t,e,n){e&&(a[t]=e),n&&(o[t]=n)},mapKindToModuleId:function(t){return o[t]||u.convertKindToModulePath(t)},convertKindToModulePath:function(t){return"widgets/"+t+"/viewmodel"},mapKindToViewId:function(t){return a[t]||u.convertKindToViewPath(t)},convertKindToViewPath:function(t){return"widgets/"+t+"/view"},createCompositionSettings:function(t,e){return e.model||(e.model=this.mapKindToModuleId(e.kind)),e.view||(e.view=this.mapKindToViewId(e.kind)),e.preserveContext=!0,e.activate=!0,e.activationData=e,e.mode="templated",e},create:function(t,n,i,r){r||(n=u.getSettings(function(){return n},t));var o=u.createCompositionSettings(t,n);e.compose(t,o,i)},install:function(t){if(t.bindingName=t.bindingName||"widget",t.kinds)for(var e=t.kinds,n=0;n<e.length;n++)u.registerKind(e[n]);i.bindingHandlers[t.bindingName]={init:function(){return{controlsDescendantBindings:!0}},update:function(t,e,n,i,o){var a=u.getSettings(e);r(t,a),u.create(t,a,o,!0)}},i.virtualElements.allowedBindings[t.bindingName]=!0}};return u});
define('transitions/entrance',["durandal/system","durandal/composition","jquery"],function(t,e,n){var i=100,r={marginRight:0,marginLeft:0,opacity:1},o={marginLeft:"",marginRight:"",opacity:"",display:""},a=function(e){return t.defer(function(t){function a(){t.resolve()}function s(){e.keepScrollPosition||n(document).scrollTop(0)}function c(){s(),e.triggerAttach();var t={marginLeft:l?"0":"20px",marginRight:l?"0":"-20px",opacity:0,display:"block"},i=n(e.child);i.css(t),i.animate(r,u,"swing",function(){i.css(o),a()})}if(e.child){var u=e.duration||500,l=!!e.fadeOnly;e.activeView?n(e.activeView).fadeOut(i,c):c()}else n(e.activeView).fadeOut(i,a)}).promise()};return a});
require(["main"]);
}());