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
        if (!(typeof hook === "string" || typeof hook === "symbol")) {
            throw new TypeError("Hook's name must be string or symbol");
        }

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
        if (!(typeof hook === "string" || typeof hook === "symbol")) {
            throw new TypeError("Hook's name must be string or symbol")
        }

        if (typeof fn !== "function") {
            throw new TypeError("Hook's function argument is not a function.");
        }

        const setStaticHookResult = staticHooks.set(hook, fn)

        return setStaticHookResult.mapFail(function (failure) {
            return {
                failureReason: failures.StaticHookAlreadyEixsts,
                message: format("Tried to set static hook '%s', but a plugin already has that static hook.", hook),
                hook: hook
            };
        });
    }

    /*
    enum PluginInitializableValidation {
        canInitialize: Boolean,
        pluginFactory: any // but probably a PluginFactory
        reason: Option<String>,
        help: Option<String>,
    }

    If canInitialize is `true`, no other fields will be set.

    If canInitialize is `false`, `reason` will be set. `help` may be set.
    */

    // isInitializable(Plugin: any*)) -> IsInitializableValidation
    // * probably a PluginFactory
    function isInitializable(Plugin) {
        return isInitializableWith(Plugin, []);
    }

    // isInitializableWith(Plugin: PluginFactory, assumedPlugins: [PluginFactory]) -> IsInitializableValidation
    // Says if a plugin could be initialized if we also assumed the Plugins in the second list were also initialized.
    // WHY(Havvy): This function is used by `use` in loader.js because we want to know which
    //             plugins cannot be initialized due to missing dependencies that aren't in the
    //             list passed to `use`.
    function isInitializableWith(Plugin, assumedPlugins) {
        if (typeof Plugin !== "object" || Plugin === null) {
            const pluginType = typeof Plugin === "object" ? "null" : typeof Plugin;

            return {
                canInitialize: false,
                pluginFactory: Plugin,
                failureReason: failures.validation.PluginFactoryNotAnObject,
                reason: "PluginFactory not an object.",
                help: `Was given a ${pluginType} instead.`
            };
        }

        if (typeof Plugin.name !== "string") {
            return {
                canInitialize: false,
                pluginFactory: Plugin,
                failureReason: failures.validation.NameNotAString,
                reason: "PluginFactory 'name' property not a string.",
                help: `PluginFactory 'name' property is a ${typeof Plugin.name} instead.`
            }
        }

        if (plugins.has(Plugin.name) || assumedPlugins.some(function (APlugin) {
            return APlugin.name === Plugin.name;
        })) {
            return {
                canInitialize: false,
                pluginFactory: Plugin,
                failureReason: failures.validation.PluginAlreadyExists,
                reason: `A plugin with the name '${Plugin.name}' has already been installed.`
            }
        }

        if (Plugin.role) {
            if (typeof Plugin.role !== "string") {
                return {
                    canInitialize: false,
                    pluginFactory: Plugin,
                    failureReason: failures.validation.RoleNotAString,
                    reason: "PluginFactory object's 'role' property not be a string (or undefined).",
                    help: `PluginFactory 'role' property is a ${typeof Plugin.role} instead.`
                }
            }

            if (roles.has(Plugin.role)) {
                return {
                    canInitialize: false,
                    pluginFactory: Plugin,
                    failureReason: failures.validation.RoleAlreadyExists,
                    reason: `A plugin with the role '${Plugin.role}' has already been installed.`
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
                    pluginFactory: Plugin,
                    failureReason: failures.validation.RoleAlreadyExists,
                    reason: `A plugin with the role '${Plugin.role}' has already been installed.`,
                    help: `The plugin with this role is '${maybePlugin.name}'.`,
                }
            }
        }

        if (Plugin.requires) {
            if (!Array.isArray(Plugin.requires)) {
                return {
                    canInitialize: false,
                    pluginFactory: Plugin,
                    failureReason: failures.validation.RequiresNotAnArray,
                    reason: "PluginFactory object's 'requires' property is not an array (or undefined).",
                    help: `PluginFactory 'requires' property is a ${typeof Plugin.requires} instead.`,
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
                    pluginFactory: Plugin,
                    failureReason: failures.validation.HasUnfulfilledPluginDependencies,
                    reason: "Unfulfilled required plugins.",
                    help: `Please provide these plugins first: ${unfulfilledRequirements.join(", ")}`,
                    unfulfilledRequirements
                }
            }
        }

        if (Plugin.requiresRoles) {
            if (!Array.isArray(Plugin.requiresRoles)) {
                return {
                    canInitialize: false,
                    pluginFactory: Plugin,
                    failureReason: failures.validation.RequiresRolesNotAnArray,
                    reason: "PluginFactory's 'requiresRoles' property is not an array (or undefined).",
                    help: `PluginFactory 'requires' property is a ${typeof Plugin.requiresRoles} instead.`
                }
            }

            const unfulfilledRoleRequirements = Plugin.requiresRoles.filter(function (dependency) {
                return !roles.has(dependency)&& !assumedPlugins.some(function (Plugin) {
                    return Plugin.role === dependency;
                });
            });

            if (unfulfilledRoleRequirements.length > 0) {
                return {
                    canInitialize: false,
                    pluginFactory: Plugin,
                    failureReason: failures.validation.HasUnfulfilledRoleDependencies,
                    reason: "Unfulfilled required roles.",
                    help: `Please provide these roles first: ${unfulfilledRoleRequirements.join(", ")}`,
                    unfulfilledRoleRequirements
                }
            }
        }

        return {
            canInitialize: true,
            pluginFactory: Plugin
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

    function initialize(Plugin) {
        const validation = isInitializable(Plugin);
        if (validation.canInitialize) {
            return unsafeInitialize(Plugin);
        } else {
            return Fail({
                failureReason: failures.CannotInitialize,
                message: "The plugin cannot be initialized. For why, check the validationFailure.",
                validationFailure: validation,
                validationFailureTypes: failures.validation,
                pluginFactory: Plugin
            });
        }
    }

    function unsafeInitialize (Plugin) {
        // Apply static hooks.
        staticHooks.forEach(function (hook, fn) {
            if (Plugin.hasOwnProperty(hook)) {
                fn(Plugin.name, Plugin[hook]);
            }
        });

        // Create instance.
        const instance = Plugin.init(context, dependencies(Plugin));

        if (typeof instance !== "object") {
            return Fail({
                failureReason: failures.PluginNotAnObject,
                message: `Plugin instance from init function must be an object. Got ${String(instance)}, a ${typeof instance}, instead.`
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

    // TODO(Havvy): Make these return results.
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
        unsafeInitialize: unsafeInitialize,
        isInitializable: isInitializable,
        isInitializableWith: isInitializableWith,
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