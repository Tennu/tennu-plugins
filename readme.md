[![Build Status](https://travis-ci.org/Tennu/tennu-plugins.png?branch=master)](https://travis-ci.org/Tennu/tennu-plugins)

This is the Plugins subsystem of the Tennu IRC Bot Framework for Node.

This module creates a plugin systems that handles loading, dependencies, and roles.

The main features of this plugin system are:

* Loading of dependencies
* Initialization of plugins
* Plugin roles, where plugins of that role expose a common interface.
* Plugin hooks, where plugins can hook into each initializing plugin.

Multiple examples use [Tennu](https://github.com/Tennu/tennu), since this
plugin system plugin was designed for it. You can repurpose this system
for your plugins.

## Installation

```
npm install tennu-plugins
```

## Initialization of Plugin System

```javascript
require('tennu-plugins')(systemname: string, context: any)
```

The systemname is the name of the plugin system, 
and declares the directory names the plugin loader's `use` method
will look for plugins in. See PluginLoader#Use() for more.

The context is the first argument passed the plugin initialization functions.

For example, in Tennu, where the `client` is passed to each plugin, 
and plugins are stored in `tennu_plugins`, the initialization is:

```javascript
var plugins = require('tennu-plugins')('tennu', client)
```

## What's a Plugin?

A Plugin is an object with the following properties:

```javascript
{
    init: function,
    name: string
    role: string?,
    requires: [string]?,
    requiresRoles: [string]?
}
```

The init function must return an object. This object is known as the plugin instance.

**Note:** The name must exist for initialization, but when using the use() method, 
the plugins will have their name property rewritten. As such, you don't have to worry
about the name property if you only use `use()`.

The following is the minimally viable plugin:

```javascript
{
    init: function () {
        return {};
    },
    name: 'bare'
}
```

The plugin instance can export values for other plugins to use. To do so, these
values must be located on the exports property.

The plugin instance can also hook into plugins that require it. To do so, the properties
to hook onto must be defined on the hooks property.

## Exports Property

The exports property is given to plugins that depend on your plugin through
the init function. For example, let's say we have two plugins, A and B.
Plugin B depends on Plugin A. Plugin A exports a property `exists: true`.
Plugin B loads plugin A and then logs A's `exist` property to the console.

```javascript

// Plugin A
{
    init: function () {
        return {
            exports: {exists: true}
        };
    },
    name: 'A'
}

// Plugin B
{
    init: function (context, imports) {
        console.log(imports['B'].exists);
        return {
            exports: {}
        };
    },
    name: 'B'
    requires: ['A']
}
```

## Hooks Property

Sometimes a plugin wants to do something with every plugin that uses it.
For example, Tennu has a help plugin that hooks into the `'help'` property.
So, let's say there's a time plugin that wants to use this hook.

The time plugin puts `'help'` in the dependencies list, and adds a `help`
property to the plugin instance with the help message.

This is what it looks like:

```javascript

// Plugin 'help'
{
    init: function (client, imports) {
        // ... initialization code.

        return {
            // ... other properties
            hooks: {
                help: function (pluginName, helpobj) {
                    // Does stuff with helpobj
                }
            }
        };
    },
    name: 'help'
}

// Plugin 'time'
{
    init: function (client, imports) {
        // ... initialization code.

        return {
            // ... other properties
            help: "Stuff about time."
        }
    },
    name: 'time'
}
```

Note: In this example, the plugin name and hook name are the same.
This is not a requirement. You can name your hooks whatever you want.

## Global Hooks

The creator of the plugin system can add hooks that apply to all plugins.

Global hooks should be added before loading any plugins.

To do so, use `addHook(hook: String, fn: string -> any -> void)`.

For example, Tennu adds a 'handlers' global hook.

```javascript
var plugins = require('tennu-plugins')('tennu', client, logger);
plugins.addHook('handlers', function (plugin, handlers) {
   client.on(handlers); 
});
```

## Loading Plugins

```javascript
var plugins = require('tennu-plugins')('tennu', client, logger);
var builtins = ['server', 'actions', 'help', 'user', 'channel'];
var toUse = [].concat(builtins, client.config(plugins));
plugins.use(toUse);
```

Create a list of plugins that you want to use, and then pass them to
plugins.use(names: [String], path: String).

The plugin system will then [locate](#Locate%20Plugins) and load the plugins in a way
that all dependencies are properly met.

This plugin can throw various errors. The constructors for these errors can be
found on the exports object of this plugin.

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

If the plugin cannot be found, a NoSuchPlugin error will be thrown.

## Other Functions

* hasPlugin(name: string): boolean
* hasRole(name: string): boolean
* isInitializable(plugin: Plugin): boolean
* initialize(plugin: Plugin): void
* getPlugin(name: string): exports
* getRole(name: string): exports

## Failure Handling

Any function that has a failure condition returns a `Result` from [`r-result`](https://github.com/havvy/r-result).

The failure type can be determined by checking the `failureType` property of the object.

The failure also has a message property describing the issue.

As follows are the failure types and their causes.

### "instance-hook-already-set"

Returned when trying to set an instance hook after calling the `init` function on the plugin, and the plugin system already has that hook registered to another plugin.

You should consider the plugin system to be in an indeterminate state at this point, since the `init` function for a plugin was ran, but it was not fully initialized.

The name of the hook is stored on the `hook` property.

To solve this, figure out which plugin has the hook installed already, and change one of the plugins to use a different hook.

Ideally no two plugins would ever share the same instance hook (without sharing the same role) though, since that makes them incompatible, both with each other, but also any plugin that depends on the other.

### "cannot-initialize"

Returned when trying to initialize a plugin, but after looking at it's factory object, it was determined not
to be possible.

### "static-hook-already-set"

Same as `"instance-hook-already-set"`, but for static hooks.

### "role-already-set"

Returned when 