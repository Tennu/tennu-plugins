This is the Modules subsystem of the Tennu IRC Framework for Node.

This module creates a module systems that handles loading, dependencies, and roles.

The main features of this module system are:

* Loading of dependencies
* Initialization of modules
* Module roles, where modules of that role expose a common interface.
* Module hooks, where modules can hook into each loading module.

Multiple examples use [Tennu](https://github.com/Tennu/tennu), since this
module system module was designed for it.

## Installation

```
npm install tennu-modules
```

## Initialization of Module System

```javascript
require('tennu-modules')(systemname: string, context: any)
```

The name is the name of the module system, and declares the directory type it
will look for modules in.

The context is the first argument passed the module initialization functions.

For Tennu, where the `client` is passed to each module, 
and modules are stored in `tennu_modules`, the initialization is:

```javascript
var modules = require('tennu-modules')('tennu', client, logger)
```

## What's a Module?

A Module is an object with the following properties:

```javascript
{
    init: function,
    name: string
    role: string?,
    requires: [string]?,
    requiresRoles: [string]?
}
```

The init function must return an object. This object is known as the module instance.

**Note:** The name must exist for initialization. When using the use() method, the modules will
have their name property rewritten. As such, you don't have to worry about the property
if you only use `use()`.

The following is the minimally viable module:

```javascript
{
    init: function () {
        return {};
    },
    name: 'bare'
}
```

The module instance can export values for other modules to use. To do so, these
values must be located on the exports property.

The module instance can also hook into modules that require it. To do so, the properties
to hook onto must be defined on the hooks property.

## Exports Property

The exports property is given to modules that depend on your module through
the init function. For example, let's say we have two modules, A and B.
Module B depends on Module A. Module A exports a property `exists: true`.
Module B loads module A and then logs A's `exist` property to the console.

```javascript

// Module A
{
    init: function () {
        return {
            exports: {exists: true}
        };
    },
    name: 'A'
}

// Module B
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

Sometimes a module wants to do something with every module that uses it.
For example, Tennu has a help module that hooks into the `'help'` property.
So, let's say there's a time module that wants to use this hook.

The time module puts `'help'` in the dependencies list, and adds a `help`
property to the module instance with the help message.

This is what it looks like:

```javascript

// Module 'help'
{
    init: function (client, imports) {
        // ... initialization code.

        return {
            // ... other properties
            hooks: {
                help: function (moduleName, helpobj) {
                    // Does stuff with helpobj
                }
            }
        };
    },
    name: 'help'
}

// Module 'time'
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

Note: In this example, the module name and hook name are the same.
This is not a requirement. You can name your hooks whatever you want.

## Global Hooks

The creator of the module system can add hooks that apply to all modules.

Global hooks should be added before loading any modules.

To do so, use `addHook(hook: String, fn: string -> any -> void)`.

For example, Tennu adds a 'handlers' global hook.

```javascript
var modules = require('tennu-modules')('tennu', client, logger);
modules.addHook('handlers', function (module, handlers) {
   client.on(handlers); 
});
```

## Loading Modules

```javascript
var modules = require('tennu-modules')('tennu', client, logger);
var builtins = ['server', 'actions', 'help', 'user', 'channel'];
var toUse = [].concat(builtins, client.config(modules));
modules.use(toUse);
```

Create a list of modules that you want to use, and then pass them to
modules.use(names: [String], path: String).

The module system will then [locate](#Locate%20Modules) and load the modules in a way
that all dependencies are properly met.

This module can throw various errors. The constructors for these errors can be
found on the exports object of this module.

* UnmetDependency
* NoSuchModule
* NoSuchRole (Not yet used)
* CyclicicDependency (Not yet used)
* ModuleInitializationError
* RegistryKeyAlreadySet
* HookAlreadyExists

## Locating Modules

The second parameter to `use()` is a path. The module system will look for the following
places for your module:

%path%/%systemname%_modules/%modulename%.js
%path%/%systemname%_modules/%modulename%/index.js
%path%/node_modules/%systemname%-%modulename%/

If it cannot find the module there, it will then go up the parent directory, and repeat,
until it either finds the module or is at the root.

If the module cannot be found, a NoSuchModule error will be thrown.

## Other Functions

* hasModule(name: string): boolean
* hasRole(name: string): boolean
* isInitializable(module: Module): boolean
* initialize(module: Module): void