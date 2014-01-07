const format = require('util').format;

const errors = require('./errors.js');
const Registry = require('./registry.js');

const ModuleSystem = function (context) {
    const modules = Registry();
    const roles = Registry();
    const hooks = Registry();

    function addHook (hook, fn) {
        if (typeof fn !== 'function') {
            throw new TypeError("Hook function argument is not a function.");
        }

        try {
            hooks.set(hook, fn);
        } catch (e) {
            if (e instanceof errors.RegistryKeyAlreadySet) {
                throw new (errors.HookAlreadyExists)(e.message, hook);
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
                throw new (errors.RoleAlreadyExists)(e.message, role);
            } else {
                throw e;
            }
        }
    }

    function isInitializable(Module) {
        if (typeof Module !== 'object') {
            return false;
        }

        if (Module.requires) {
            if (!Module.requires.every(function (dependency) {
                return modules.has(dependency);
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

        if (!Module.name || modules.has(Module.name)) {
            return false;
        }

        if (Module.role && roles.has(Module.role)) {
            return false;
        }

        return true;
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
                res[role] = roles.get(role).exports;
            });
        }

        return res;
    }

    const isLoaded = modules.has.bind(modules);

    function initialize (Module) {
        if (!isInitializable(Module)) {
            throw new (errors.ModuleInitializationError)('Reason unknown (unimplemented)', Module);
        }

        // Create instance.
        const instance = Module.init(context, dependencies(Module));

        // Add hooks.
        if (instance.hooks) {
            Object.keys(instance.hooks).forEach(function (hook) {
                var fn = instance.hooks[hook];
                addHook(hook, fn);
            });
        }

        // Apply hooks.
        hooks.forEach(function (hook, fn) {
            if (instance.hasOwnProperty(hook)) {
                fn(Module.name, instance[hook]);
            }
        });

        // Register instance.
        modules.set(Module.name, instance);
        if (Module.role) {
            roles.set(Module.role, instance);
        }
    }

    function moduleExports (name) {
        if (modules.has(name)) {
            return modules.get(name).exports;
        };

        return undefined;
    }

    function roleExports (name) {
        if (roles.has(name)) {
            return roles.get(name).exports;
        };

        return undefined;
    }

    return {
        initialize: initialize,
        isInitializable: isInitializable,
        hasModule: modules.has,
        hasRole: roles.has,
        moduleExports: moduleExports,
        roleExports: roleExports,
        loadedNames: modules.keys,
        addHook: addHook,
    };
}

module.exports = ModuleSystem;