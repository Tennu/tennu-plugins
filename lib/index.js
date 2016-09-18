const fs = require("fs");

const System = require("./plugins.js");
const Loader = require("./loader.js");
const failures = require("./failures.js");

const TennuPluginSystem = function (systemname, context) {
    const system = System(context);
    const loader = Loader(system, fs, require, systemname);

    return {
        use: loader.use,

        // Deprecated(Havvy): Use install instead.
        initialize: system.install,

        // Deprecated(Havvy): Use isInstallable instead.
        isInitializable: system.isInstallable,
        
        install: system.install,
        isInstallable: system.isInstallable,
        hasRole: system.hasRole,
        hasPlugin: system.hasPlugin,
        getPlugin: system.pluginExportsOf,
        getRole: system.roleExportsOf,
        addHook: system.addInstanceHook,
        addInstanceHook: system.addInstanceHook,
        addStaticHook: system.addStaticHook,
        failures: failures
    };
};

TennuPluginSystem.failures = failures;

module.exports = TennuPluginSystem;