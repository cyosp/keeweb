# Keeweb CYOSP

## Configuration

### Allow to access to Keeweb settings

```bash
perl -i -pe 's/canOpenSettings": false/canOpenSettings": true/' ~/.config/KeeWeb/app-settings.json
```

### Disable external configuration

```bash
keeweb --disable-config
```

**/!\\ Keeweb will use instead embedded one /!\\**

## Build

### App

It can be built with: `grunt`.

Output HTML file is generated in `dist` folder.

### MacOS desktop packages

It can be built with: `grunt --max-old-space-size=4096 desktop-darwin --skip-sign`.

Output DMG files are generated in `dist/desktop` folder.

## Debug

To debug desktop app run:
```bash
perl -i -pe 's/("electron": "cross-env .*)"/$1 --disable-config --devtools"/' package.json
npm run dev
npm run electron
```

## Release

To release OSX desktop packages using Continuous Integration run:
```
VERSION_TAG="1.18.7.2"
git tag $VERSION_TAG
git push
git push origin $VERSION_TAG
```
