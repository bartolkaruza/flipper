/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

const [s, ns] = process.hrtime();
let launchStartTime = s * 1e3 + ns / 1e6;

const {app, BrowserWindow, ipcMain, Notification} = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const fixPath = require('fix-path');
const {exec} = require('child_process');
const compilePlugins = require('./compilePlugins.js');
const setup = require('./setup');
const delegateToLauncher = require('./launcher');
const expandTilde = require('expand-tilde');
const yargs = require('yargs');

// Adds system PATH folders to process.env.PATH for MacOS production bundles.
fixPath();

// disable electron security warnings: https://github.com/electron/electron/blob/master/docs/tutorial/security.md#security-native-capabilities-and-your-responsibility
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

if (process.platform === 'darwin') {
  // If we are running on macOS and the app is called Flipper, we add a comment
  // with the old name, to make it findable via Spotlight using its old name.
  const APP_NAME = 'Flipper.app';
  const i = process.execPath.indexOf(`/${APP_NAME}/`);
  if (i > -1) {
    exec(
      `osascript -e 'on run {f, c}' -e 'tell app "Finder" to set comment of (POSIX file f as alias) to c' -e end "${process.execPath.substr(
        0,
        i,
      )}/${APP_NAME}" "sonar"`,
    );
  }
}

const argv = yargs
  .usage('$0 [args]')
  .option('file', {
    describe: 'Define a file to open on startup.',
    type: 'string',
  })
  .option('url', {
    describe: 'Define a flipper:// URL to open on startup.',
    type: 'string',
  })
  .option('updater', {
    default: true,
    describe: 'Toggle the built-in update mechanism.',
    type: 'boolean',
  })
  .option('launcher', {
    default: true,
    describe: 'Toggle delegating to the update launcher on startup.',
    type: 'boolean',
  })
  .option('launcher-msg', {
    describe:
      '[Internal] Used to provide a user message from the launcher to the user.',
    type: 'string',
  })
  .version(global.__VERSION__)
  .help()
  .parse(process.argv.slice(1));

const {config, configPath, flipperDir} = setup(argv);

const pluginPaths = config.pluginPaths
  .concat(
    path.join(configPath, '..', 'thirdparty'),
    path.join(__dirname, '..', 'src', 'plugins'),
    path.join(__dirname, '..', 'src', 'fb', 'plugins'),
  )
  .map(expandTilde)
  .filter(fs.existsSync);

process.env.CONFIG = JSON.stringify({
  ...config,
  pluginPaths,
});

// possible reference to main app window
let win;
let appReady = false;
let pluginsCompiled = false;
let deeplinkURL = argv.url;
let filePath = argv.file;

// tracking
setInterval(() => {
  if (win && win.isFocused()) {
    win.webContents.send('trackUsage');
  }
}, 60 * 1000);

compilePlugins(
  () => {
    if (win) {
      win.reload();
    }
  },
  pluginPaths,
  path.join(flipperDir, 'plugins'),
).then(dynamicPlugins => {
  process.env.PLUGINS = JSON.stringify(dynamicPlugins);
  pluginsCompiled = true;
  tryCreateWindow();
});

// check if we already have an instance of this app open
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.focus();
    }
  });

  // Create myWindow, load the rest of the app, etc...
  app.on('ready', () => {});
}

// quit app once all windows are closed
app.on('window-all-closed', () => {
  appReady = false;
  app.quit();
});

app.on('will-finish-launching', () => {
  // Protocol handler for osx
  app.on('open-url', function(event, url) {
    event.preventDefault();
    deeplinkURL = url;
    argv.url = url;
    if (win) {
      win.webContents.send('flipper-protocol-handler', deeplinkURL);
    }
  });
  app.on('open-file', (event, path) => {
    // When flipper app is running, and someone double clicks the import file, `componentDidMount` will not be called again and windows object will exist in that case. That's why calling `win.webContents.send('open-flipper-file', filePath);` again.
    event.preventDefault();
    filePath = path;
    argv.file = path;
    if (win) {
      win.webContents.send('open-flipper-file', filePath);
      filePath = null;
    }
  });
});

app.on('ready', () => {
  // If we delegate to the launcher, shut down this instance of the app.
  delegateToLauncher(argv).then(hasLauncherInvoked => {
    if (hasLauncherInvoked) {
      app.quit();
      return;
    }
    appReady = true;
    app.commandLine.appendSwitch('scroll-bounce');
    tryCreateWindow();
    // if in development install the react devtools extension
    if (process.env.NODE_ENV === 'development') {
      const {
        default: installExtension,
        REACT_DEVELOPER_TOOLS,
        REDUX_DEVTOOLS,
      } = require('electron-devtools-installer');
      installExtension(REACT_DEVELOPER_TOOLS.id);
      installExtension(REDUX_DEVTOOLS.id);
    }
  });
});

ipcMain.on('componentDidMount', event => {
  if (deeplinkURL) {
    win.webContents.send('flipper-protocol-handler', deeplinkURL);
    deeplinkURL = null;
  }
  if (filePath) {
    // When flipper app is not running, the windows object might not exist in the callback of `open-file`, but after ``componentDidMount` it will definitely exist.
    win.webContents.send('open-flipper-file', filePath);
    filePath = null;
  }
});

ipcMain.on('getLaunchTime', event => {
  if (launchStartTime) {
    event.sender.send('getLaunchTime', launchStartTime);
    // set launchTime to null to only report it once, to prevents reporting wrong
    // launch times for example after reloading the renderer process
    launchStartTime = null;
  }
});

ipcMain.on(
  'sendNotification',
  (e, {payload, pluginNotification, closeAfter}) => {
    // notifications can only be sent when app is ready
    if (appReady) {
      const n = new Notification(payload);

      // Forwarding notification events to renderer process
      // https://electronjs.org/docs/api/notification#instance-events
      ['show', 'click', 'close', 'reply', 'action'].forEach(eventName => {
        n.on(eventName, (event, ...args) => {
          e.sender.send(
            'notificationEvent',
            eventName,
            pluginNotification,
            ...args,
          );
        });
      });
      n.show();

      if (closeAfter) {
        setTimeout(() => {
          n.close();
        }, closeAfter);
      }
    }
  },
);

// Define custom protocol handler. Deep linking works on packaged versions of the application!
app.setAsDefaultProtocolClient('flipper');

function tryCreateWindow() {
  if (appReady && pluginsCompiled) {
    win = new BrowserWindow({
      show: false,
      title: 'Flipper',
      width: config.lastWindowPosition.width || 1400,
      height: config.lastWindowPosition.height || 1000,
      minWidth: 800,
      minHeight: 600,
      center: true,
      backgroundThrottling: false,
      titleBarStyle: 'hiddenInset',
      vibrancy: 'sidebar',
      webPreferences: {
        webSecurity: false,
        scrollBounce: true,
        experimentalFeatures: true,
        nodeIntegration: true,
        webviewTag: true,
      },
    });
    win.once('ready-to-show', () => win.show());
    win.once('close', ({sender}) => {
      if (process.env.NODE_ENV === 'development') {
        // Removes as a default protocol for debug builds. Because even when the
        // production application is installed, and one tries to deeplink through
        // browser, it still looks for the debug one and tries to open electron
        app.removeAsDefaultProtocolClient('flipper');
      }
      const [x, y] = sender.getPosition();
      const [width, height] = sender.getSize();
      // save window position and size
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          ...config,
          lastWindowPosition: {
            x,
            y,
            width,
            height,
          },
        }),
      );
    });
    if (config.lastWindowPosition.x && config.lastWindowPosition.y) {
      win.setPosition(config.lastWindowPosition.x, config.lastWindowPosition.y);
    }
    const entryUrl =
      process.env.ELECTRON_URL ||
      url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true,
      });
    win.loadURL(entryUrl);
  }
}
