This is the Modules subsystem of the Tennu IRC Framework for Node.

This module creates a module systems that handles loading, dependencies, and roles.

The main features of this module system are:

* Loading of dependencies
* Initialization of modules
* Module roles, where modules of that role expose a common interface.
* Module hooks, where modules can hook into each loading module.

Multiple examples use (Tennu)[https://github.com/Tennu/tennu], since this
module system module was designed for it.

## Installation

```
npm install tennu-modules
```

## Initialization of Module System

```javascript
require('tennu-modules')(name: string, context: any, logger: Logger)
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
    role: string?,
    requires: [string]?,
    requiresRoles: [string]?
}
```

The init function must return an object. This object is known as the module instance.

Modules are named by their filename. For example, a module at
tennu_modules/time.js is named 'time', assuming the module system is for Tennu.

The following is the minimally viable module:

```javascript
{
    init: function () {
        return {};
    }
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
    }
}

// Module B
{
    init: function (context, imports) {
        console.log(imports['B'].exists);
        return {
            exports: {}
        };
    },
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
    }
}

// Module 'time'
{
    init: function (client, imports) {
        // ... initialization code.

        return {
            // ... other properties
            help: "Stuff about time."
        }
    }
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
modules.use(names: [String]).

The module system will then locate and load the modules in a way
that all dependencies are properly met.

This module can throw various errors. The constructors for these errors can be
found on the exports object of this module.

1. NoSuchModule - When a module cannot be found. Has properties 'paths'
and 'name' for the paths searched and the name of the module respectively.
2. UnmetDependency - A derivative of NoSuchModule, thrown for modules that
depend on modules that are not loaded nor listed in the passed in array.
3. UnmetRole - A derivative of UnmetDependency, but for roles.
4. CyclicDependency - When there are modules that depend on each other.
5. ModuleInitialzationError - Wraps any errors thrown by a module's init method.
6. TypeError - When the module doesn't have an init function.
7. HookAlreadyExists - When multiple modules both try to define the same hook.

## Old Stuff

This stuff is old, and has to be rewritten for Tennu Modules 2.0.0.

#### require(name: string): object throws Error

Starting from one directory higher than this module, recursively checks
tennu_modules for a node module named '%name%' and then node_modules/tennu-%name%.

If the module cannot be found, an error will be thrown.

##### Example

For this examples, presume that this module system is located at
/home/you/node/yourbot/node_modules/tennu/node_modules/tennu-modules/index.js.

Tennu loads with the default modules, and calls it's module system's require
method for the server module:  require('sever'). It checks for modules in the
following places before finding it:

```
/home/you/node/yourbot/node_modules/tennu/node_modules/tennu-modules/tennu_modules/server
/home/you/node/yourbot/node_modules/tennu/node_modules/tennu-modules/node_modules/tennu-server
/home/you/node/yourbot/node_modules/tennu/node_modules/tennu_modules/server
/home/you/node/yourbot/node_modules/tennu/node_modules/node_modules/tennu-server
/home/you/node/yourbot/node_modules/tennu/tennu_modules/server
```

Since it is located at that location, it finds it there, and then calls
the Module System's load method on it.

#### load(moduleCtor: function, name: String): null throws Error

This is an internal method. You probably will not need to use it.

Loads the module by passing the module constructor the context object and
expecting a Module object in return.

#### isLoaded(name: String): boolean

Returns true if the module is loaded, and can be required() for its exports
object without needing to load() it.

#### loadedModules(): {"name": object}

Returns an object of module name to module exports. Does not update if new
modules are loaded.

#### loadedModuleNames(): [string]

Returns the list of currently loaded modules. Does not update if new modules
are loaded.