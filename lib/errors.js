// Thrown when a module cannot be loaded because another module cannot be loaded.
function UnmetDependency (message) {
    this.message = message;
    this.stack = new Error().stack;
};

UnmetDependency.prototype = Error.prototype;
UnmetDependency.prototype.constructor = UnmetDependency;

// Thrown when a module cannot be found.
function NoSuchModule (message, name, paths) {
    UnmetDependency.call(this, message);
    this.name = name;
    this.paths = paths;
};

NoSuchModule.prototype = new UnmetDependency();
NoSuchModule.prototype.constructor = NoSuchModule;

// Thrown when a module known only by its role cannot be found.
function NoSuchRole (message, role) {
    UnmetDependency.call(this, message);
    this.role = role;
};

NoSuchRole.prototype = new UnmetDependency();
NoSuchRole.prototype.constructor = NoSuchRole;

// Thrown when multiple modules depend upon each other.
function CyclicicDependency (message, names) {
    UnmetDependency.call(this, message);
    this.names = names;
};

CyclicicDependency.prototype = new UnmetDependency();
CyclicicDependency.prototype.constructor = CyclicicDependency;

// Thrown when a module cannot be initialized.
function ModuleInitializationError (message, module) {
    this.message = message;
    this.stack = new Error().stack;
    this.module = module;
};

ModuleInitializationError.prototype = Error.prototype;
ModuleInitializationError.prototype.constructor = ModuleInitializationError;

function RegistryKeyAlreadySet (message) {
    this.message = message;
    this.stack = new Error().stack;
};

RegistryKeyAlreadySet.prototype = Error.prototype;
RegistryKeyAlreadySet.prototype.constructor = RegistryKeyAlreadySet;

// Thrown when a module tries to define an already existing hook.
function HookAlreadyExists (message, hook) {
    RegistryKeyAlreadySet.call(this, message);
    this.hook = hook;
};

HookAlreadyExists.prototype = new RegistryKeyAlreadySet();
HookAlreadyExists.prototype.constructor = HookAlreadyExists;

function RoleAlreadyExists (message, role) {
    RegistryKeyAlreadySet.call(this);
    this.role = role;
};

RoleAlreadyExists.prototype = new RegistryKeyAlreadySet();
RoleAlreadyExists.prototype.constructor = RoleAlreadyExists;

module.exports = {
    UnmetDependency: UnmetDependency,
    NoSuchModule: NoSuchModule,
    NoSuchRole: NoSuchRole,
    CyclicicDependency: CyclicicDependency,
    ModuleInitializationError: ModuleInitializationError,
    RegistryKeyAlreadySet: RegistryKeyAlreadySet,
    HookAlreadyExists: HookAlreadyExists
};