var path = require('path');
var here = path.resolve(__dirname, __filename);
var root = path.resolve('/');
var exists = require('fs').existsSync;

module.exports = function Modules (subscriber, context) {
    var exports = {};
    var loaded = [];
    var loading = [];

    // Takes a module name, and goes up the directory chain from where
    // this file is located, checking for existance of modules, first in
    // ./tennu_modules/%name%, and then in ./node_modules/tennu-%name%.
    function require (name) {
        if (isLoaded(name)) { return exports[name]; }
        var there = here;

        while (there !== root) {
            there = path.resolve(there, '../');

            if (exists(path.resolve(there, 'tennu_modules', name))) {
                load(require(path.resolve(there, './tennu_modules', name)), name);
                return exports[name];
            }

            if (exists(path.resolve(there, 'node_modules', 'tennu-' + name))) {
                load(require(path.resolve(there, 'node_modules', 'tennu-' + name)), name);
                return exports[name];
            }
        }

        throw new Error("Failed to require Nark module " + name);
    }

    function initialize (Module, name) {
        // Create the actual module.
        var module = new Module(context);

        // Make sure the module has imports and exports objects.
        module.exports = module.exports || {};
        module.imports = {};

        if (module.dependencies) {
            loadDependencies(module.dependencies, module.imports, name);
        }

        // Listen to Handler Events
        Object.keys(module.handlers).forEach(function (event) {
            var listener = module.handlers[event];
            subscriber.on(event, listener);
        });
    }

    function loadDependencies(deps, imports, name) {
        deps.forEach(function (dep) {
            try {
                imports[dep] = require(dep);
            } catch (e) {
                throw new Error("Failed to find Nark Module dependency " + dep + " for " + name);
            }
        });
    }

    function load (Module, name) {
        // No recursive dependencies on modules allowed.
        if (loading.indexOf(name) !== -1) {
            throw new Error("Recursive dependencies with module " + name);
        }
        loading.push(name);

        initialize(Module, name);

        exports[module.name] = module.exports;
        loading.pop();
        loaded.push(module.name);
    }

    function isLoaded (name) {
        return loaded.indexOf(name) !== -1;
    }

    function loadedModules () {
        var exports_copy = {};
        Object.keys(exports).forEach(function (name) {
            modules[name] = exports[name];
        });
        return exports_copy;
    }

    function loadedModuleNames () {
        return loaded.slice();
    }

    return {
        require : require,
        load: load,
        isLoaded : isLoaded,
        loadedModules : loadedModules,
        loadedModuleNames : loadedModuleNames
    };
};