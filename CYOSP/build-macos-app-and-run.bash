#/!bin/bash

ARCH=arm64
#MODE=dev

clear

ROOT=$(dirname $(echo $(readlink -f "$0")))/..
cd $ROOT

if [ -d tmp ]; then rm -r tmp; fi

if [ "$MODE" = "dev" ]
then
    GRUNT_PARAMETERS_WEB_APP="test"
    GRUNT_PARAMETERS_MACOS_APP="dev-desktop-darwin --skip-sign --dev-mode"
    APP_PARAMETERS="--devtools"
else
    GRUNT_PARAMETERS_WEB_APP=""
    GRUNT_PARAMETERS_MACOS_APP="--max-old-space-size=4096 desktop-darwin --skip-sign"
    APP_PARAMETERS=""
fi

set -e
$ROOT/node_modules/.bin/grunt $GRUNT_PARAMETERS_WEB_APP
$ROOT/node_modules/.bin/grunt $GRUNT_PARAMETERS_MACOS_APP
$ROOT/tmp/desktop/KeeWeb-darwin-$ARCH/KeeWeb.app/Contents/MacOS/KeeWeb $APP_PARAMETERS
