"use strict";

const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
const inspect = require("util").inspect;
const format = require("util").format;

const debug = Boolean(false || process.env.VERBOSE);
const logfn = debug ? console.log.bind(console) : function () {};

const RResult = require("r-result");
const Ok = RResult.Ok;
const Fail = RResult.Fail;

const PluginSystem = require("../lib/plugins");
const failures = require("../lib/failures");

const examples = require("../examples");

describe("The Plugin System", function () {
    let context, system;

    beforeEach(function () {
        context = {};
        system = PluginSystem(context);
    });

    describe("Validating Plugin Factories", function () {
        it("Ok: Bare plugin", function () {
            assert(equal(Ok(examples["bare"]), system.validatePluginFactory(examples["bare"]).debug(logfn)));
        });

        it("Failure: [NotAnObject]", function () {
            const NotAnObject = failures.validatePluginFactory.NotAnObject;

            assert(typeof NotAnObject === "symbol");

            // NOTE(Havvy): Testing non-null version.
            {
                const expectedFailure = {
                    failureType: NotAnObject,
                    message: "PluginFactory must be an object. Was given a boolean instead."
                };

                assert(equal(Fail(expectedFailure), system.validatePluginFactory(true).debug(logfn)));
            }

            // NOTE(Havvy): Testing null version.
            {
                const expectedFailure = {
                    failureType: NotAnObject,
                    message: "PluginFactory must be an object. Was given null instead."
                }

                assert(equal(Fail(expectedFailure), system.validatePluginFactory(null).debug(logfn)));
            }
        });

        it("Failure: [NameNotAString]", function () {
            const NameNotAString = failures.validatePluginFactory.NameNotAString;
            assert(typeof NameNotAString === "symbol");

            const expectedFailure = {
                failureType: NameNotAString,
                message: "PluginFactory 'name' property must be a string. Was given undefined instead."
            };

            const actualFailure = system.validatePluginFactory(examples.failures.NameNotAString)
            .debug(logfn, {colors: true})
            .fail("Plugin factory with no name considered valid.");

            assert(equal(actualFailure, expectedFailure));
        });

        it("Failure: [RequiresNotAnArray]", function () {
            const RequiresNotAnArray = failures.validatePluginFactory.RequiresNotAnArray;
            assert(typeof RequiresNotAnArray === "symbol");

            const expectedFailure = {
                failureType: RequiresNotAnArray,
                message: "PluginFactory 'requires' property must be an array of strings (the required plugins' names) or not defined when the plugin does not require other plugins. Was given an object instead."
            };

            const actualFailure = system.validatePluginFactory(examples.failures.RequiresNotAnArray)
            .debug(logfn, {colors: true})
            .fail("Plugin with malformed requires property considered valid.");

            assert(equal(actualFailure, expectedFailure));
        });

        it.skip("Failure: [RequiresRolesNotAnArray]", function () {});

        it("Failure: [RoleNotAString]", function () {
            const RoleNotAString = failures.validatePluginFactory.RoleNotAString;
            assert(typeof RoleNotAString === "symbol");

            const expectedFailure = {
                failureType: RoleNotAString,
                message: "PluginFactory 'role' property must be a string or not defined when the plugin does not declare a role. Was given a boolean instead.",
            };

            assert(equal(Fail(expectedFailure), system.validatePluginFactory(examples.failures.RoleNotAString).debug(logfn)));
        });
    });

    describe("canInstall", function () {
        describe("Failure: [PluginAlreadyInstalled] Installation of two plugins with the same name", function () {
            const PluginAlreadyInstalled = failures.canInstall.PluginAlreadyInstalled;

            beforeEach(function () {
                const result = system
                .install(examples["bare"])
                .debug(logfn)
                .ok("Couldn't install bare plugin in empty system.");
            });

            const cannotInstallReasonExpected = {
                failureType: PluginAlreadyInstalled,
                message: "A plugin with the name 'bare' has already been installed.",
            };

            it("is a symbol", function () {
                assert(typeof PluginAlreadyInstalled === "symbol");
            });

            it("via canInstall()", function () {
                const result = system.canInstall(examples["bare"]).debug(logfn, {colors: true});
                assert(equal(result, Fail(cannotInstallReasonExpected)));
            });

            it("via install()", function () {
                const result = system.install(examples["bare"]).debug(logfn, {colors: true});

                const expectedResult = Fail({
                    failureType: failures.install.CanInstallFailed,
                    message: "The plugin 'bare' cannot be installed.",
                    innerFailure: cannotInstallReasonExpected,
                    innerFailureTypes: failures.canInstall,
                    pluginFactory: examples["bare"]
                });

                assert(equal(result, expectedResult));
            });
        });

        describe("Failure: [RoleAlreadyInstalled] Installation of two plugins with the same role", function () {
            const RoleAlreadyInstalled = failures.canInstall.RoleAlreadyInstalled;

            beforeEach(function () {
                const result = system
                .install(examples["waltz"])
                .debug(logfn, {colors: true})
                .ok("Waltz was not installed correctly!");
            });

            const cannotInstallReasonExpected = {
                failureType: RoleAlreadyInstalled,
                message: "A plugin with the role 'dancer' has already been installed.",
            };

            it("is a symbol", function () {
                assert(typeof RoleAlreadyInstalled === "symbol");
            });

            it("via canInstall", function () {
                const result = system.canInstall(examples["tango"]).debug(logfn, {colors: true});

                assert(equal(result, Fail(cannotInstallReasonExpected)));
            });
        });

        describe.skip("Failure: canInstall/1 Plugin's name collides with an already loaded plugin", function () {});
        describe.skip("Failure: canInstallWith/2 Plugin's name collides with already assumed plugin's name", function () {});

        it.skip("canInstallWith/2 Plugin's single required plugin is assumed loaded", function () {});
        it.skip("Failure: canInstall/1 Plugin's single required plugin is not loaded. No other plugins loaded", function () {});
        it.skip("Failure: canInstall/1 Plugin's single required plugin is not loaded. Other plugins loaded", function () {});
        it.skip("Failure: canInstallWith/2 Plugin's single required plugin is not loaded. No other plugins loaded or assumed loaded", function () {});
        it.skip("Failure: canInstallWith/2 Plugin's single required plugin is not loaded. No other plugins loaded. Other plugins assumed loaded", function () {});
        it.skip("canInstall/1 Plugin's multiple required plugins are loaded", function () {});
        it.skip("canInstallWith/2 Plugin's multiple required plugins are all assumed loaded", function () {});
        it.skip("canInstallWith/2 Plugin's multiple required plugins are all either loaded or assumed loaded", function () {});
        it.skip("Failure: canInstall/1 Plugin's multiple required plugins where none are loaded", function () {});
        it.skip("Failure: canInstall/1 Plugin's multiple required plugins where some are loaded", function () {});
        it.skip("Failure: canInstallWith/2 Plugin's multiple required plugins where none are loaded or assumed loaded", function () {});
        it.skip("Failure: canInstallWith/2 Plugin's multiple required plugins where some are assumed loaded", function () {});

        describe("PluginFactories with roles", function () {
            it.skip("canInstallWith/2 Plugin's single required role is assumed loaded", function () {});
            it.skip("Failure: canInstall/1 Plugin's single required role is not loaded. No other plugins loaded", function () {});
            it.skip("Failure: canInstall/1 Plugin's single required role is not loaded. Other plugins loaded", function () {});
            it.skip("Failure: canInstallWith/2 Plugin's single required role is not loaded. No other plugins loaded or assumed loaded", function () {});
            it.skip("Failure: canInstallWith/2 Plugin's single required role is not loaded. No other plugins loaded. Other plugins assumed loaded", function () {});
            it.skip("canInstall/1 Plugin's multiple required roles are loaded", function () {});
            it.skip("canInstallWith/2 Plugin's multiple required roles are all assumed loaded", function () {});
            it.skip("canInstallWith/2 Plugin's multiple required roles are all either loaded or assumed loaded", function () {});
            it.skip("Failure: canInstall/1 Plugin's multiple required roles where none are loaded", function () {});
            it.skip("Failure: canInstall/1 Plugin's multiple required roles where some are loaded", function () {});
            it.skip("Failure: canInstallWith/2 Plugin's multiple required roles where none are loaded or assumed loaded", function () {});
            it.skip("Failure: canInstallWith/2 Plugin's multiple required roles where some are assumed loaded", function () {});
        });
    });

    describe("Installation", function () {
        it("of a single bare plugin", function () {
            const installationResult = system.install(examples["bare"]);
            assert(installationResult.isOk());
            assert(system.hasPlugin("bare"));
            assert(equal(system.loadedNames(), ["bare"]));
        });

        it("of multiple bare plugins", function () {
            system.install(examples["bare"]);
            system.install(examples["bare-alt-name"]);
            assert(system.hasPlugin("bare"));
            assert(system.hasPlugin("bare-alt-name"));
        });

        describe("of plugins with dependencies;", function () {
            it("Plugin's single required plugin is loaded", function () {
                const imports = {
                    name: "requires-exports-true",
                    requires: ["exports-true"],

                    init: function (context, imports) {
                        assert(imports["exports-true"] === true);
                        return {};
                    },
                };

                const exportsResult = system.install(examples["exports-true"]);
                logfn(inspect(exportsResult, {colors: true}));
                assert(exportsResult.isOk());
                const importsResult = system.install(imports);

                importsResult.mapFail((fail) => logfn(inspect()));

                assert(importsResult.isOk());
            });
        });


        describe("of plugins with role dependencies;", function () {
            it("that requires a single plugin of a specific role", function (done) {
                const role = {
                    name: "has-role",
                    role: "role",

                    init: function () {
                        return {
                            exports: true
                        };
                    }
                };

                const usesRole = {
                    name: "uses-role",
                    requiresRoles: ["role"],

                    init: function (_context, imports) {
                        assert(imports.role === true);
                        done();
                        return {};
                    }
                };

                const roleResult = system.install(role);
                assert(roleResult.isOk());
                const usesRoleResult = system.install(usesRole);
                usesRoleResult.mapFail((fail) => logfn(inspect(fail)));
                assert(usesRoleResult.isOk());
            });
        });

        it("function gets a reference to the context", function () {
            const plugin = {
                init: function (_context) {
                    assert(context === _context);
                    return {};
                },
                name: "context-test"
            };

            const result = system.install(plugin);
            assert(result.isOk());
        });

        it("of a plugin with a role", function () {
            const result = system.install(examples["waltz"]);
            if (result.isFail()) {
                logfn(inspect(result.fail()));
            }
            assert(result.isOk());
            assert(system.hasPlugin("waltz"));
            assert(system.hasRole("dancer"));
        });

        it("of a plugin with custom hooks", function (done) {
            const addsTestHook = {
                name: "adds-test-hook",

                init: function () {
                    return {
                        hooks: {
                            "test": function (name, value) {
                                assert(name === "has-test-hook");
                                assert(value === true);
                                done();
                            }
                        }
                    }
                },
            };

            system.install(addsTestHook)
            .debug(logfn, {colors: true})
            .ok("Failed to install plugin adding test hook.");

            system.install(examples["has-test-hook"])
            .debug(logfn, {colors: true})
            .ok("Failed to install has-test-hook plugin.");
        });

        it.skip("Failure: [CanInstallFailed] When plugin cannot be installed due to dependency issues.");

        it("Failure: [PluginNotAnObject] When plugin returned is not an object.", function () {
            const PluginNotAnObject = failures.install.PluginNotAnObject;
            assert(typeof PluginNotAnObject === "symbol");

            const expectedFailure = {
                failureType: PluginNotAnObject,
                message: "Plugin instance from 'PluginNotAnObject' must be an object. Init function returned `undefined`, undefined, instead.",
                pluginFactory: examples.failures.PluginNotAnObject
            };

            const actualFailure = system.install(examples.failures.PluginNotAnObject)
            .debug(logfn, {colors: true})
            .fail("Installed a plugin factory that doesn't return a plugin.");

            assert(equal(actualFailure, expectedFailure));
        });

        it.skip("Failure: [InstanceHookAlreadyExists] When plugin tries to install instance hook already installed.");
        it.skip("Failure: [StaticHookAlreadyExists] When plugin tries to install static hook already installed.");
    });

    describe("Instance Hooks", function () {
        var spy;

        beforeEach(function () {
            spy = sinon.spy();
            const result = system.addInstanceHook("test", spy);
            assert(result.isOk());
        });

        it("hooks into every loaded module", function () {
            const result = system.install(examples["has-test-hook"]);
            assert(result.isOk());
            assert(spy.calledOnce);
            assert(spy.calledWith("has-test-hook", true));
        });

        it("skips plugins not using the hook", function () {
            const result = system.install(examples["bare"]);
            assert(result.isOk());
            assert(!spy.called);
        });

        it("Failure: Adding the same hook name twice", function () {
            const result = system.addInstanceHook("test", function () {});
            assert(result.isFail());
            const fail = result.fail();
            assert(equal(fail, {
                failureType: failures.InstanceHookAlreadyExists,
                message: "Tried to set instance hook 'test', but a plugin already has that instance hook.",
                hook: "test"
            }));
        });

        it.skip("can have a symbol for the hook name", function () {});

        it.skip("having multiple hooks", function () {});

        it.skip("Error: Hook name not string or symbol", function () {});
        it.skip("Error: Hook function not a function.", function () {});
    });

    describe("Static Hooks", function () {
        var spy, setinel;

        beforeEach(function () {
            spy = sinon.spy();
            setinel = {};
            system.addStaticHook("test", spy);
        });

        it("hooks into every loaded module", function () {
            system.install({
                test: setinel,
                name: "TEST",
                init: function () {
                    assert(spy.calledOnce);
                    assert(spy.calledWith("TEST", setinel));
                    return {};
                }
            });
        });

        it("skips plugins not using the hook", function () {
            system.install({
                name: "TEST",
                init: function () {
                    assert(!spy.called);
                    return {};
                }
            });
        });

        it("Failure: [StaticHookAlreadyExists] Adding the same hook name twice", function () {
            const StaticHookAlreadyExists = failures.addStaticHook.StaticHookAlreadyExists;
            assert(typeof StaticHookAlreadyExists === "symbol");

            const leftResult = system.install({
                name: "static-left",
                init: function () {
                    return {
                        staticHooks: {
                            static: function () {}
                        }
                    };
                }
            });

            leftResult.ok("Left result should be ok.");

            const rightResult = system.install({
                name: "static-right",
                init: function () {
                    return {
                        staticHooks: {
                            static: function () {}
                        }
                    };
                }
            });

            const fail = rightResult.debug(logfn).fail("Right result should be a failure.");

            const expectedFailure = {
                failureType: StaticHookAlreadyExists,
                message: "Tried to set static hook 'static', but a plugin already has that static hook.",
                hook: "static"
            }

            assert(equal(fail, expectedFailure));
        });

        it.skip("can have a symbol for the hook name", function () {});

        it.skip("having multiple hooks", function () {});

        it.skip("Error: Hook name not string or symbol", function () {});
        it.skip("Error: Hook function not a function.", function () {});
    });

    describe("Has", function () {
        it("for plugins", function () {
            system.install({
                name: "plugin",
                init: function () { return {}; },
            });

            assert(system.hasPlugin("plugin"));
        });

        it("for roles", function () {
            system.install({
                init: function () { return {}; },
                name: "provides-role",
                role: "role"
            });

            assert(system.hasRole("role"));
        });
    });

    describe("Exports Getters", function () {
        it("for plugins", function () {
            system.install(examples["exports-true"])
            .debug(logfn, {colors: true})
            .ok("Exports true didn't install correctly.");

            const exports = system.pluginExportsOf("exports-true")
            .debug(logfn, {colors: true})
            .ok("Couldn't get exports of 'exports-true'.");

            assert(exports === true);
        });

        it("for roles", function () {
            const expectedExports = {};

            const roleWithExports = {
                name: "role-with-exports",
                role: "exports",
                init: function () {
                    return {
                        exports: expectedExports
                    }
                }
            };

            system.install(roleWithExports)
            .debug(logfn, {colors: true})
            .ok("Exports true didn't install correctly.");

            const actualExports = system.pluginExportsOf("role-with-exports")
            .debug(logfn, {colors: true})
            .ok("Couldn't get exports of 'role-with-exports'.");

            assert(actualExports === expectedExports);
        });

        it("Failure: [PluginNotInstalled] Getting exports of non-existent plugin", function () {
            const PluginNotInstalled = failures.pluginExportsOf.PluginNotInstalled;
            assert(typeof PluginNotInstalled === "symbol");

            const expectedFailure = {
                failureType: PluginNotInstalled,
                message: "Cannot get exports from 'does-not-exist'. Plugin not installed.",
                name: "does-not-exist"
            };

            const actualFailure = system.pluginExportsOf("does-not-exist")
            .debug(logfn, {colors: true})
            .fail("Got exports from non-existent plugin.");

            assert(equal(actualFailure, expectedFailure));
        });

        it("Failure: [RoleNotInstalled] Getting exports of non-existent role", function () {
            const RoleNotInstalled = failures.roleExportsOf.RoleNotInstalled;
            assert(typeof RoleNotInstalled === "symbol");

            const expectedFailure = {
                failureType: RoleNotInstalled,
                message: "Cannot get exports from role 'does-not-exist'. Role not installed.",
                name: "does-not-exist"
            };

            const actualFailure = system.roleExportsOf("does-not-exist")
            .debug(logfn, {colors: true})
            .fail("Got exports from non-existent role.");

            assert(equal(actualFailure, expectedFailure));
        });
    });
});