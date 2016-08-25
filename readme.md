[![Build Status](https://travis-ci.org/Tennu/tennu-plugins.png?branch=master)](https://travis-ci.org/Tennu/tennu-plugins)

This is the Plugins subsystem of the Tennu IRC Bot Framework for Node.

This module is a plugin system that handles loading, dependencies, and
cross-plugin hooks.

The main facets of this plugin system are:

* Loading of dependencies
* Initialization of plugins
* Plugin roles, where plugins of that role expose a common interface.
* Plugin hooks, where plugins can hook into each initializing plugin.

While this plugin system was designed for [Tennu](https://github.com/Tennu/tennu),
you can repurpose this system for your own plugin architecture framework.

## When do I want to use this?

Use this if you want to create a plugin based framework in Node.js with a common
context for the plugins (e.g. IRC for Tennu).

If you are using a framework that uses this, it's useful to read the sections
on PluginFactorys, Plugins, Hooks, and Exports.

## Installation

This plugin system targets Node.js v4.x to v6.x, and probably works on later
versions of Node.js.

```
npm install tennu-plugins
```

## Creating a Plugin System

```javascript
require("tennu-plugins")(systemname: string, context: any)
```

The systemname is the name of the plugin system, 
and declares the directory names the plugin loader's `use` method
will look for plugins in. See `PluginLoader#use/1` for more.

The context is the first argument passed the plugin initialization functions.

For example, in Tennu, the IRC `client` is passed to each plugin
and plugins are stored in `tennu_plugins` directories. It is initialized as
follows.

```javascript
const plugins = require("tennu-plugins")("tennu", client)
```

## Initialization and Loading of Plugins

A plugin system comes with two ways to initialize a plugin,
`PluginSystem#initialize/1` and `PluginSystem#use/2`.

`initialize/1` takes a PluginFactory while `use` takes an array of strings and
a path that the system uses to locate and then load PluginFactorys.

These functions are described in more detail later on in this document.

```javascript
const channelsPluginFactory = require("./tennu-plugins/channels");
plugins.initialize(channelsPluginFactory).ok();

## What's a PluginFactory?

A PluginFactory is an object that describes how to create a Plugin. It contains
*static* properties that don't change. PluginFactorys have the following
properties.

```javascript
{
    init: Fn(context, imports) -> Plugin,
    name: string
    role: RoleName?,
    requires: [string]?,
    requiresRoles: [RoleName]?,
    // Other properties depending on static hooks
    // See the section on Hooks below for how those work.
}
```

The name is there so that other plugins can reference the plugin the factory
creates. This also means that each plugin must have a unique name, so you cannot
have multiple instances of the same plugin.

The init function must return a Plugin. All properties on a Plugin are actually
optional, so a plugin could just be an empty object. The context parameter is
the context passed in during the creation of the plugin system. The imports
parameter is discussed later.

The following is the minimally viable PluginFactory:

```javascript
{
    name: "bare",
    init (_context, _imports) {
        return {};
    }
}
```

The `requires` and `requiresRoles` properties take a list of plugin names or
roles that the plugin requires to be loaded to function properly.

## What's a Plugin?

At it's most simple, a plugin is an object that exports properties or defines
hooks. A Plugin has the following structure.

```javascript
{
    hooks: Object<Fn(String, Any)>?,
    staticHooks: Object<Fn(String, Any)>?,
    exports: Any?,
    // Other properties depending on instance hooks
    // See the section on Hooks below for how those work.
}

Plugins are created in the `init` function of the PluginFactory, and as such,
have access to the `context` which is basically a free dependency chosen by
the creator of the plugin system. They also have access to imported plugins.

The plugin instance can export values for other plugins to use. To do so, these
values must be located on the exports property.

The plugin instance can also hook into plugins that require it. To do so, the
properties to hook onto must be defined on the hooks property.

## Cross-Plugin Interaction

Plugins have two main ways of interacting with each other. The first way, called
`direct dependencies`, allows plugins to export values that are later imported
by other plugins.

The second way, called `hooks`, allows a plugin to define
new properties for PluginFactorys and Plugins that have their values passed
back into the defining plugin.

### Direct Dependencies

The exports property is given to plugins that depend on your plugin through
the init function. For example, let's say we have two plugins, A and B.
Plugin B depends on Plugin A. Plugin A exports a property `exists: true`.
Plugin B loads plugin A and then logs A's `exist` property to the console.

```javascript

const pluginSystem = require("tennu-plugins")({}, "example");

const PluginA = {
    name: "A",
    init: function (_context, _imports) {
        return {
            exports: {exists: true}
        };
    }
}

const PluginB = {
    name: "B"
    requires: ["A"],
    init: function (_context, {B}) {
        console.log(B.exists);
        return {
            exports: {}
        };
    },
}

pluginSystem.initialize(PluginA);
pluginSystem.initialize(PluginB);
// console will log "true" here.
```

This is very similar to how Node.js's module system works, except object based
instead of file based.

### Hooks

At times, a plugin will want to extend the functionality of PluginFactorys and
Plugin objects by defining new properties for these objects. Hooks allow for
plugins to do so.

A hook is a function that is given the plugin's name and the value on the
hook's property.

A plugin defines a hook by creating an object on either its `hooks` or
`staticHooks` properties where the key is the property to hook into and the
value is a function that takes two parameters, the first being the name of the
plugin and the second the value that plugin provides for that property. The
plugin defining the hook can do whatever it wants with that value. For
Plugin hooks, use `hooks` and for PluginFactory hooks, use `staticHooks`.

For example, Tennu has a help plugin that hooks into the `'help'` property.
So, let's say there's a time plugin that wants to use this hook.

The time plugin puts `"help"` in the dependencies list, and adds a `help`
property to the plugin instance with the help message.

```javascript

// Plugin "help"
{
    name: "help",
    init (client, imports) {
        // ... initialization code.

        return {
            // ... other properties
            hooks: {
                help (pluginName, helpobj) {
                    // Does stuff with helpobj
                }
            }
        };
    }
}

// Plugin "time"
{
    name: "time",
    init: function (client, imports) {
        // ... initialization code.

        return {
            // ... other properties
            help: "Stuff about time."
        }
    }
}
```

Note: In this example, the plugin name and hook name are the same.
This is not a requirement. You can name your hooks whatever you want. You can
also have multiple hooks.

#### Global Hooks

The creator of the plugin system can add hooks that apply to all plugins.

Global hooks should be added before loading any plugins.

To do so, use one of the following functions:

* `addHook(hook: String, fn: Fn(String, Any)) -> Result<(), InstanceHookAlreadyExistsFailure>`
* `addStaticHook(hook: String, fn: Fn(String, Any)) -> Result<(), StaticHookAlreadyExistsFailure>`

For example, Tennu used to add a 'handlers' global hook.

```javascript
var plugins = require("tennu-plugins")("tennu", client);
plugins.addHook("handlers", function (pluginName, handlers) {
   client.on(handlers); 
});
```

Nowadays, Tennu uses a plugin for this behaviour.

## Loading Plugins

```javascript
var plugins = require("tennu-plugins")("tennu", client);
var builtins = ["server", "actions", "help", "user", "channel"];
plugins.use(builtins, __);
```

Create a list of plugins that you want to use, and then pass them to
plugins.use(names: [String], path: String).

The plugin system will then [locate](#Locating%20Plugins) and load the plugins
in an order such that all dependencies are properly met.

This function returns a `Result<undefined, UseFailure>`. A UseFailure is a
[Failure](#Failure Handling) with one of the following failure types:

* UnmetDependency
* NoSuchPlugin
* NoSuchRole (Not yet used)
* CyclicicDependency (Not yet used)
* PluginInitializationError
* RegistryKeyAlreadySet
* HookAlreadyExists

## Locating Plugins

The second parameter to `use()` is a path. The plugin system will look for the following
places for your plugin:

* %**path**%/%**systemname**%_plugins/%**pluginname**%.js
* %**path**%/%**systemname**%_plugins/%**pluginname**%/index.js
* %**path**%/node_plugins/%**systemname**%-%**pluginname**%/

If it cannot find the plugin there, it will then go up the parent directory, and repeat,
until it either finds the plugin or is at the root.

If the plugin cannot be found, a NoSuchPlugin failure will be returned.

For example, say you want the plugin "config" for "tennu" starting from "/projects/tennu".
The plugin locator will look at the following places until it finds it.

* /projects/tennu/tennu_plugins/config.js
* /projects/tennu/tennu_plugins/config/index.js
* /projects/tennu/node_plugins/tennu-config/
* /projects/tennu_plugins/config.js
* /projects/tennu_plugins/config/index.js
* /projects/node_plugins/tennu-config/
* /tennu_plugins/config.js
* /tennu_plugins/config/index.js
* /node_modules/tennu-config/

## Initializing Plugins

<TODO>

## Full PluginSystem API

These are the method signatures that a PluginSystem has.

* addHook(name: string, hook: Fn(String, Any)) -> Result<undefined, InstanceHookAlreadyEixstsFailure>
* addInstanceHook(name: string, hook: Fn(String, Any) -> Result<undefined, InstanceHookAlreadyExistsFailure>
* addStaticHook(name: string, hook: Fn(String, Any)) -> Result<undefined, StaticHookAlreadyExistsFailure>
* isInitializable(plugin: Plugin): InitializationValidation
* initialize(plugin: Plugin): Result<undefined, InitializeFailure>
* use(plugins: [String]: Result<undefined, UseFailure)
* hasPlugin(name: string): boolean
* hasRole(name: string): boolean
* getPlugin(name: string): Result<exports, NoSuchPluginFailure>
* getRole(name: string): Result<exports, NoSuchRoleFailure>

## Failure Handling

Any function that has a failure condition returns a `Result` from
[`r-result`](https://github.com/havvy/r-result).

The failure type can be determined by checking the `failureType` property of
the object. This property contains a symbol accessible from the failures
property of this module. For example, the `InstanceHookAlreadySet` symbol can
be found at `require("tennu-plugins").failures.InstanceHookAlreadySet`.

The failure also has a `message` property describing the issue

Failures may also have other properties, depending on what failure type it is.

The following subsections are the types of failures.

### CannotInitialize

Returned by `initialize` and `use`.

Returned when trying to initialize a plugin, but after looking at it's factory
object, it was determined not to be possible. The system will not have
initialized any plugins if it returns this failure.

The reason for why it cannot be initialized is on the `validationFailure`
property.

The PluginFactory is on the `pluginFactory` property.

### PluginNotAnObject

Returned by `initalize` and `use`.

Returned when the `init` function of a PluginFactory returns something that is
not an object.

You should consider the plugin system to be in an indeterminate state at this
point, since the `init` function for a plugin was ran, but it was not fully
initialized.

### InstanceHookAlreadySet

Returned by `initialize`, `use`, `addHook` and `addInstanceHook`.

Returned when trying to set an instance hook after calling the `init` function
on the plugin, and the plugin system already has that hook registered to another
plugin.

You should consider the plugin system to be in an indeterminate state at this
point, since the `init` function for a plugin was ran, but it was not fully
initialized.

The name of the hook is stored on the `hook` property.

To solve this, figure out which plugin has the hook installed already, and
change one of the plugins to use a different hook.

Ideally, no two plugins would ever share the same instance hook (without sharing
the same role) though, since that makes them incompatible, both with each other,
but also any plugin that depends on the other.

### StaticHookAlreadySet

Returned by `initialize`, `use`, and `addStaticeHook`.

Same as `InstanceHookAlreadySet`, but for static hooks.


//    NoSuchPlugin: Symbol("NoSuchPlugin"),
//    UnmetDependency: Symbol("UnmetDependency"),
//    InconsistentlyNamedPlugin: Symbol("InconsistentlyNamedPlugin"),
//    CyclicicDependency: Symbol("CyclicicDependency"),