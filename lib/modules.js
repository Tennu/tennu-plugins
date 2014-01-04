const errors = require('./errors.js');
const Registry = require('./registry.js');

const ModuleSystem = function (context) {
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

    function isInitializable(Module) {
        if (Module.requires) {
            if (!Module.requires.every(function (dependency) {
                return loaded.has(dependency);
            })) {
                return false;
            }
        }

        if (Module.requiresRoles) {
            if (!Module.requiresRoles.every(function (role) {
                return roles.has(role);
            })) {
                return false;
            }  
        }

        if (modules.has(Module.name)) {
            return false;
        }

        if (Module.role && roles.has(Module.role)) {
            return false;
        }

        return true;
    }

    function initialize (Module) {
        if (!isInitializable(Module)) {
            throw new (errors.ModuleInitializationError)('Reason unknown (unimplemented)', Module);
        }

        // Create the actual module.
        const instance = Module.init(context, dependencies(Module));

        // Make exports property an object if it doesn't exist.
        if (!instance.hasOwnProperty('exports')) {
            instance.exports = {};
        }

        // Apply hooks.
        hooks.forEach(function (hook, fn) {
            if (instance.hasOwnProperty(hook)) {
                fn(instance[hook]);
            }
        });

        modules.set(Module.name, instance);

        if (Module.role) {
            roles.set(Module.role, instance);
        }
    }

    function dependencies (Module) {
        var res = {};

        if (Module.requires) {
            Module.requires.forEach(function (dependency) {
                res[dependency] = modules.get(dependency).exports;
            });
        }

        if (Module.requiresRoles) {
            Module.requiresRoles.forEach(function (role) {
                res[dependency] = roles.get(role).exports;
            });
        }

        return res;
    }

    const isLoaded = modules.has.bind(modules);

    return {
        initialize: initialize,
        isLoaded: isLoaded,
        loadedNames: modules.keys.bind(modules),
        addHook: addHook
    };
}

module.exports = ModuleSystem;