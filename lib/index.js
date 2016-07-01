const fs = require("fs");

const System = require("./plugins.js");
const Loader = require("./loader.js");
const failures = require("./failures.js");

const TennuPlugins = function (systemname, context) {
    const system = System(context);
    const loader = Loader(system, fs, require, systemname);

    return {
        use: loader.use,
        initialize: system.initialize,
        isInitializable: system.isInitializable,
        hasRole: system.hasRole,
        hasPlugin: system.hasPlugin,
        getPlugin: system.pluginExportsOf,
        getRole: system.roleExportsOf,
        addHook: system.addInitializationHook,
        addInstanceHook: system.addInstanceHook,
        addStaticHook: system.addStaticHook,
        failures: failures
    };
};

module.exports = TennuPlugins;