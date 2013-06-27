var path = require('path');
var here = path.resolve(__dirname, __filename);
var root = path.resolve('/');
var fs_exists = require('fs').existsSync;
var exists = function (p) {
    return fs_exists(p) || fs_exists(p + ".js");
};
var debug = function (msg) {
    if (false) console.log("Modules: " + msg);
};

module.exports = function Modules (subscriber, context) {
    var exports = {};
    var loaded = [];
    var loading = [];

    function tennu_require (name) {
        debug("Requiring " + name);

        if (!isLoaded(name)) {
            debug("Module not required yet. Locating");
            var load_path = locate(name);
            load(require(load_path));
            debug("Module located.");
        }

        return exports[name];
    }

    function locate (name) {
        var there = here, tennu_path, node_path;

        while (there !== root) {
            there = path.resolve(there, '../');

            tennu_path = path.resolve(there, 'tennu_modules', name);
            debug("Searching at: " + tennu_path);
            if (exists(tennu_path)) { return tennu_path; }

            node_path = path.resolve(there, 'node_modules', 'tennu-' + name);
            debug("Searching at: " + node_path);
            if (exists(node_path)) { return node_path; }
        }

        throw new Error("Failed to require Tennu module '" + name + "'");
    }

    function initialize (Module, name) {
        // Create the actual module.
        var module = new Module(context);

        module.exports = module.exports || {};
        module.imports = {};

        if (module.dependencies) {
            loadDependencies(module.dependencies, module.imports, name);
        }

        if (module.handlers) {
            subscribeHandlers(module.handlers);
        }
    }

    function subscribeHandlers (handlers) {
        Object.keys(handlers).forEach(function (event) {
            subscriber.on(event, handlers[event]);
        });
    }

    function loadDependencies(deps, imports, name) {
        deps.forEach(function (dep) {
            try {
                imports[dep] = tennu_require(dep);
            } catch (e) {
                throw new Error("Failed to find Tennu module dependency " + dep + " for " + name);
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
        require : tennu_require,
        load: load,
        isLoaded : isLoaded,
        loadedModules : loadedModules,
        loadedModuleNames : loadedModuleNames
    };
};