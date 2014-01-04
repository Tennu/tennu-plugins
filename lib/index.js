const path = require('path');
const format = require('util').format;
const fs_exists = require('fs').existsSync;
const node_require = require;
const Set = require('simplesets');

const here = path.resolve(__dirname, __filename);
const root = path.resolve('/');

const exists = function (p) {
    return fs_exists(p) || fs_exists(p + ".js");
};

const errors = require('./errors.js');
const Registry = require('./registry.js');

const unary = function (fn) {
    return function (arg) {
        fn(arg);
    };
};

const zip = function () {
    const arrays = Array.prototype.slice.call(arguments);

    if (arrays.length === 0) {
        return;
    }

    const res = [];

    arrays[0].forEach(function (_element, ix) {
        res.push(arrays.map(function (array) {
            return array[ix];
        }));
    });

    return res;
};

module.exports = function ModuleSystem (name, context, logger) {
    const modules = Registry();
    const hooks = Registry();
    const roles = Registry();

    function addHook (hook, fn) {
        if (typeof fn !== 'function') {
            throw new TypeError("Hook function argument is not a function.");
        }

        try {
            hooks.set(hook, fn);
        } catch (e) {
            if (e instanceof errors.RegistryKeyAlreadySet) {
                throw errors.HookAlreadyExists(e.message, hook);
            } else {
                throw e;
            }
        }
    }

    function addRole (role, instance) {
        try {
            roles.set(role, instance);
        } catch (e) {
            if (e instanceof errors.RegistryKeyAlreadySet) {
                throw errors.RoleAlreadyExists(e.message, role);
            } else {
                throw e;
            }
        }
    }

    function use (names) {
        names = names.filter(function (name) {
            return !modules.has(name);
        });

        const paths = names.map(unary(locate));
        const Modules = zip(paths, names).map(unary(load));

        // Would be easier with sets that support both filter and difference.
        while (Modules.length !== 0) {
            var foundInitializable = false;

            for (var ix = 0; ix < Modules.length; ix++) {
                var Module = Modules[ix];

                if (isInitializable(Module)) {
                    foundInitializable = true;
                    // FIXME: Make this function.
                    initialize(Module);
                    Modules.splice(ix, 1);
                    break;
                }
            }

            if (!foundInitializable) {
                throw determineUnmetDependencyReason(Modules);
            }
        }
    }

    function isInitializable(Module) {
        if (Module.requires) {
            if (!Module.requires.every(function (dependency) {
                return loaded.has(dependency);
            })) {
                return false;
            }
        }

        if (Modules.requiresRoles) {
            if (!Module.requiresRoles.every(function (role) {
                return roles.has(role);
            })) {
                return false;
            }  
        }

        return true;
    }

    function determineUnmetDependencyReason (Modules) {
        return new (errors.UnmetDependency)('Reason unknown (unimplemented)');
    }

    function tennu_require (name) {
        debug("Requiring " + name);

        if (!isLoaded(name)) {
            debug("Module not required yet. Locating");
            const load_path = locate(name);
            load(node_require(load_path));
            debug("Module located.");
        }

        return exports[name];
    }

    function locate (name) {
        const there = here, tennu_path, node_path;

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

    function initialize (Module) {
        // FIXME
        // Create the actual module.
        const module = new Module(context);

        module.exports = module.exports || {};
    }

    function load (path, name) {
        exports[module.name] = module.exports;
        loading.pop();
        loaded.push(module.name);
    }

    const isLoaded = modules.has.bind(modules);
    const loadedModuleNames = modules.keys.bind(modules);
    const loadedModules = modules.values.bind(modules);

    return {
        use: use,
        initialize : initialize,
        isLoaded : isLoaded,
        loadedModules : loadedModules,
        loadedModuleNames : loadedModuleNames
    };
};