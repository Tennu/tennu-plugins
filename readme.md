## tennu modules

This is the Modules subsystem of the Nark IRC Framework for Node.

This module allows for creating module systems than take module constructors,
and initialize tennu modules.

### What's a Module?

A Module is a function returned by a Module Constructor that takes a context
object. The Module has the following object structure (all properties optional):

```javascript
{
    dependencies: [string],
    imports: {
        "dependency" : object
    },
    exports: object,
    handlers: {
        "event": function
    }
}
```


#### dependencies

* A list of tennu modules required by this module.
* Any dependencies will be loaded before loading this module.
* No recursive dependencies.

#### imports

Do not prefill this property. Once the module is loaded, this will be an
object of dependency names pointing to that depency's exports object.

#### exports

* Defaults to an empty object.
* This is pretty much equivalent to a node's module `module.exports` field.

#### handlers

An object where the property names are the events to listen to and the values
are the callbacks that are listening. They are passed to the subscriber passed
to the constructor of the Module System.

If you are using the default Nark setup, then the event names that start with
a '!' are passed to the command handler and other events are passed to the
message handler. You can also have the callback listen to multiple events by
separating the events with a space.

### Constructing

```javascript
var Modules = require('tennu-modules')(subscriber, context)
```

The subscriber must have an 'on' method. The context object is passed to the
module constuctors when loading a module.

### Using

#### require(name: string): object throws Error

Starting from one directory higher than this module, recursively checks
tennu_modules for a node module named '%name%' and then node_modules/tennu-%name%.

If the module cannot be found, an error will be thrown.

##### Example

For this examples, presume that this module system is located at
/home/you/node/yourbot/node_modules/tennu/node_modules/tennu-modules/index.js.

Nark loads with the default modules, and calls it's module system's require
method for the server module:  require('sever'). It checks for modules in the
following places before finding it:

/home/you/node/yourbot/node_modules/tennu/node_modules/tennu-modules/tennu_modules/server
/home/you/node/yourbot/node_modules/tennu/node_modules/tennu-modules/node_modules/tennu-server
/home/you/node/yourbot/node_modules/tennu/node_modules/tennu_modules/server
/home/you/node/yourbot/node_modules/tennu/node_modules/node_modules/tennu-server
/home/you/node/yourbot/node_modules/tennu/tennu_modules/server

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