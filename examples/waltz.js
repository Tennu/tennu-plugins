// Plugin that implements the "dancer" role.
module.exports = {
    name: "waltz",
    role: "dancer",
    init: function () {
        return {
            exports: {
                dance: function () { return "does a Waltz"; }
            }
        };
    }
};