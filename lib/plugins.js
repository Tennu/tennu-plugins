const format = require('util').format;

const errors = require('./errors.js');
const Registry = require('./registry.js');

const PluginSystem = function (context) {
    const plugins = Registry();
    const roles = Registry();
    const staticHooks = Registry();
    const instanceHooks = Registry();

    function addInstanceHook (hook, fn) {
        if (typeof fn !== 'function') {
            throw new TypeError("Hook function argument is not a function.");
        }

        try {
            instanceHooks.set(hook, fn);
        } catch (e) {
            if (e instanceof errors.RegistryKeyAlreadySet) {
                throw new (errors.HookAlreadyExists)(e.message, hook);
            } else {
                throw e;
            }
        }
    }

    function addStaticHook (hook, fn) {
        if (typeof fn !== 'function') {
            throw new TypeError("Hook function argument is not a function.");
        }

        try {
            staticHooks.set(hook, fn);
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

    function isInitializable(Plugin) {
        if (typeof Plugin !== 'object') {
            return false;
        }

        if (Plugin.requires) {
            if (!Plugin.requires.every(function (dependency) {
                return plugins.has(dependency);
            })) {
                return false;
            }
        }

        if (Plugin.requiresRoles) {
            if (!Plugin.requiresRoles.every(function (role) {
                return roles.has(role);
            })) {
                return false;
            }  
        }

        if (!Plugin.name || plugins.has(Plugin.name)) {
            return false;
        }

        if (Plugin.role && roles.has(Plugin.role)) {
            return false;
        }

        return true;
    }

    function dependencies (Plugin) {
        var res = {};

        if (Plugin.requires) {
            Plugin.requires.forEach(function (dependency) {
                res[dependency] = plugins.get(dependency).exports;
            });
        }

        if (Plugin.requiresRoles) {
            Plugin.requiresRoles.forEach(function (role) {
                res[role] = roles.get(role).exports;
            });
        }

        return res;
    }

    const isLoaded = plugins.has.bind(plugins);

    function initialize (Plugin) {
        if (!isInitializable(Plugin)) {
            throw new (errors.PluginInitializationError)('Reason unknown (unimplemented)', Plugin);
        }

        // Apply static hooks.
        staticHooks.forEach(function (hook, fn) {
            if (Plugin.hasOwnProperty(hook)) {
                fn(Plugin.name, Plugin[hook]);
            }
        })

        // Create instance.
        const instance = Plugin.init(context, dependencies(Plugin));

        if (typeof instance !== 'object') {
            throw new (errors.PluginInitializationError)('Plugin initializer did not return a plugin.', Plugin);
        }

        // Add instance hooks.
        if (instance.hooks) {
            Object.keys(instance.hooks).forEach(function (hook) {
                var fn = instance.hooks[hook];
                addInstanceHook(hook, fn);
            });
        }

        // Add static hooks.
        if (instance.staticHooks) {
            Object.keys(instance.staticHooks).forEach(function (hook) {
                var fn = instance.staticHooks[hook];
                addStaticHook(hook, fn);
            });
        }

        // Apply instance hooks.
        instanceHooks.forEach(function (hook, fn) {
            if (instance.hasOwnProperty(hook)) {
                fn(Plugin.name, instance[hook]);
            }
        });

        // Register instance.
        plugins.set(Plugin.name, instance);
        if (Plugin.role) {
            roles.set(Plugin.role, instance);
        }
    }

    function pluginExportsOf (name) {
        if (plugins.has(name)) {
            return plugins.get(name).exports;
        };

        return undefined;
    }

    function roleExportsOf (name) {
        if (roles.has(name)) {
            return roles.get(name).exports;
        };

        return undefined;
    }

    return {
        initialize: initialize,
        isInitializable: isInitializable,
        hasPlugin: plugins.has,
        hasRole: roles.has,
        pluginExportsOf: pluginExportsOf,
        roleExportsOf: roleExportsOf,
        loadedNames: plugins.keys,
        addInstanceHook: addInstanceHook,
        addStaticHook: addStaticHook
    };
}

module.exports = PluginSystem;