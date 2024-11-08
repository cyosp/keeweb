#/!bin/bash

ARCH=arm64
#MODE=dev

clear

ROOT=$(dirname $(echo $(readlink -f "$0")))/..
cd $ROOT

if [ -d tmp ]; then rm -r tmp; fi

if [ "$MODE" = "dev" ]
then
    GRUNT_PARAMETERS="dev-desktop-darwin --skip-sign --dev-mode"
    APP_PARAMETERS="--devtools"
else
    GRUNT_PARAMETERS="--max-old-space-size=4096 desktop-darwin --skip-sign"
    APP_PARAMETERS=""
fi

set -e
# Build web app
# $ROOT/node_modules/.bin/grunt test
$ROOT/node_modules/.bin/grunt $GRUNT_PARAMETERS
$ROOT/tmp/desktop/KeeWeb-darwin-$ARCH/KeeWeb.app/Contents/MacOS/KeeWeb $APP_PARAMETERS
