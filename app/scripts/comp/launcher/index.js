
let Launcher;

if (window.electron) {
    Launcher = require('./launcher-electron').Launcher;
}

export { Launcher };
