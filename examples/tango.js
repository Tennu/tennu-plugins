// Plugin that implements the "dancer" role.
module.exports = {
    name: "tango",
    role: "dancer",
    init: function () {
        return {
            exports: {
                dance: function () { return "does the Tango"; }
            }
        };
    }
};