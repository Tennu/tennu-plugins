const format = require('util').format;

const Result = require("r-result");
const Ok = Result.Ok;
const Fail = Result.Fail;

const failures = require("./failures");
const Registry = require("./registry");

const PluginSystem = function (context) {
    const plugins = Registry();
    const roles = Registry();
    const staticHooks = Registry();
    const instanceHooks = Registry();

    function addInstanceHook (hook, fn) {
        if (typeof fn !== "function") {
            throw new TypeError("Hook's function argument is not a function.");
        }

        const setInstanceHookResult = instanceHooks.set(hook, fn);

        return setInstanceHookResult.mapFail(function (failure) {
            return {
                failureReason: failures.InstanceHookAlreadyExists,
                message: format("Tried to set instance hook '%s', but a plugin already has that instance hook.", hook),
                hook: hook
            };
        });
    }

    function addStaticHook (hook, fn) {
        if (typeof fn !== "function") {
            throw new TypeError("Hook's function argument is not a function.");
        }

        const setStaticHookResult = staticHooks.set(hook, fn)

        return setStaticHookResult.mapFail(function (failure) {
            return {
                failureReason: "static-hook-already-set",
                message: format("Tried to set static hook '%s', but a plugin already has that static hook.", hook),
                hook: hook
            };
        });
    }

    /*
    struct IsInitializableValidation {
        canInitialize: Boolean,
        reason: Option<String>,
        help: Option<String>,
        data: Option<String>
    }

    If canInitialize is `true`, no other fields will be set.

    If canInitialize is `false`, `reason` will be set. `help` may be set.

    `data` will be set if `help` is set.
    */
    // isInitializable(Plugin: PluginFactory) -> IsInitializableValidation
    function isInitializable(Plugin) {
        return isInitializableWith(Plugin, []);
    }

    // isInitializableWith(Plugin: PluginFactory, assumedPlugins: [PluginFactory]) -> IsInitializableValidation
    // Says if a plugin could be initialized if we also assumed the Plugins in the second list were also initialized.
    function isInitializableWith(Plugin, assumedPlugins) {
        if (typeof Plugin !== "object") {
            return {
                canInitialize: false,
                reason: "PluginFactory not an object.",
                help: "PluginFactory must be an object. Was given this type instead:",
                data: typeof Plugin
            };
        }

        if (Plugin.requires) {
            if (!Array.isArray(Plugin.requires)) {
                return {
                    canInitialize: false,
                    reason: "Plugin's requires property exists but is not an array."
                }
            }

            const unfulfilledRequirements = Plugin.requires.filter(function (dependency) {
                return !plugins.has(dependency) && !assumedPlugins.some(function (Plugin) {
                    return Plugin.name === dependency;
                });
            });

            if (unfulfilledRequirements.length > 0) {
                return {
                    canInitialize: false,
                    reason: "Unfulfilled required plugins.",
                    help: "Require these plugins first:",
                    data: unfulfilledRequirements.join(", ")
                }
            }
        }

        if (Plugin.requiresRoles) {
            if (!Array.isArray(Plugin.requiresRoles)) {
                return {
                    canInitialize: false,
                    reason: "Plugin's requiresRoles property exists but is not an array."
                }
            }

            const unfulfilledRoles = Plugin.requiresRoles.filter(function (dependency) {
                return !roles.has(dependency)&& !assumedPlugins.some(function (Plugin) {
                    return Plugin.role === dependency;
                });
            });

            if (unfulfilledRoles.length > 0) {
                return {
                    canInitialize: false,
                    reason: "Unfulfilled required roles.",
                    help: "Require plugins that fulfill these roles:",
                    data: unfulfilledRoles.join(", ")
                }
            }
        }

        if (!Plugin.name) {
            return {
                canInitialize: false,
                reason: "PluginFactory object must have a 'name' property."
            }
        }

        if (plugins.has(Plugin.name) || assumedPlugins.some(function (APlugin) {
            return APlugin.name === Plugin.name;
        })) {
            return {
                canInitialize: false,
                reason: "A plugin with this plugin's name has already been installed."
            }
        }

        if (Plugin.role) {
            if (roles.has(Plugin.role)) {
                return {
                    canInitialize: false,
                    reason: "A plugin with this plugin's role's name has already been installed.",
                    // Can't actually get the name of the plugin at this point
                    // without changing the system to store that map...
                }
            }

            const maybePlugin = assumedPlugins.find(function (APlugin) {
                return Plugin.role === APlugin.role;
            });

            if (maybePlugin !== undefined) {
                return {
                    canInitialize: false,
                    reason: "A plugin with this plugin's role's name has already been installed.",
                    help: "The plugin with this role is:",
                    data: maybePlugin.name
                }
            }
        }

        return {
            canInitialize: true
        };
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
        const validation = isInitializable(Plugin);
        if (!validation.canInitialize) {
            return Fail({
                failureReason: failures.CannotInitialize,
                message: "The plugin cannot be initialized. For why, check the validationFailure.",
                validationFailure: validation,
                plugin: Plugin
            });
        }

        // Apply static hooks.
        staticHooks.forEach(function (hook, fn) {
            if (Plugin.hasOwnProperty(hook)) {
                fn(Plugin.name, Plugin[hook]);
            }
        })

        // Create instance.
        const instance = Plugin.init(context, dependencies(Plugin));

        if (typeof instance !== "object") {
            return Fail({
                failureReason: "plugin-instance-not-an-object",
                message: format("Plugin instance from init function must be an object. Got `%s`, a %s, instead.", String(instance), typeof instance)
            });
        }

        // Add instance hooks.
        if (instance.hooks) {
            const addInstanceHooksResult = Object.keys(instance.hooks)
            .reduce(function (addInstanceHookResult, hook) {
                return addInstanceHookResult.andThen(function () {
                    return addInstanceHook(hook, instance.hooks[hook])
                });
            }, Ok());

            if (addInstanceHooksResult.isFail()) {
                return addInstanceHooksResult;
            }
        }


        // Add static hooks.
        if (instance.staticHooks) {
            const addStaticHooksResult = Object.keys(instance.staticHooks)
            .reduce(function (addStaticHookResult, hook) {
                return addStaticHookResult.andThen(function () {
                    return addStaticHook(hook, instance.staticHooks[hook])
                });
            }, Ok());

            if (addStaticHooksResult.isFail()) {
                return addStaticHooksResult;
            }
        }

        // Apply instance hooks.
        instanceHooks.forEach(function (hook, fn) {
            if (instance.hasOwnProperty(hook)) {
                fn(Plugin.name, instance[hook]);
            }
        });

        // Register instance.
        // These cannot return a Fail() because isInitialable would have
        // already said it wasn't actually initializable.
        plugins.set(Plugin.name, instance);
        if (Plugin.role) {
            roles.set(Plugin.role, instance);
        }

        return Ok();
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