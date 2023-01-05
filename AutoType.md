## Requirements

Auto-Type is available for all desktop platforms.

On Linux, xdotool installation is required: `sudo apt-get install xdotool`.

## Supported

### Modifiers

`+` → shift

`%` → alt

`^` → cmd on Mac, ctrl on Windows and Linux

`^^` → ctrl on all OS

### Keys

`{TAB}` `{ENTER}`=`~` `{SPACE}`
`{UP}` `{DOWN}` `{LEFT}` `{RIGHT}` `{HOME}` `{END}` `{PGUP}` `{PGDN}`
`{INSERT}`=`{INS}` `{DELETE}`=`{DEL}` `{BACKSPACE}`=`{BS}`=`{BKSP}` `{ESC}`
`{WIN}`=`{LWIN}` `{RWIN}` `{F1}`..`{F16}`
`{ADD}` `{SUBTRACT}` `{MULTIPLY}` `{DIVIDE}` `{NUMPAD0}`..`{NUMPAD9}`
`{+}` `{%}` `{^}` `{~}` `{(}` `{)}` `{[}` `{]}` `{{}` `{}}`

### Substitutions

`{TITLE}` `{USERNAME}` `{URL}` `{PASSWORD}` `{NOTES}` `{GROUP}`
`{TOTP}` `{S:Custom Field Name}`
`{DT_SIMPLE}` `{DT_YEAR}` `{DT_MONTH}` `{DT_DAY}` `{DT_HOUR}` `{DT_MINUTE}` `{DT_SECOND}`
`{DT_UTC_SIMPLE}` `{DT_UTC_YEAR}` `{DT_UTC_MONTH}` `{DT_UTC_DAY}` `{DT_UTC_HOUR}` `{DT_UTC_MINUTE}` `{DT_UTC_SECOND}`

### Commands

`{DELAY X}` `{CLEARFIELD}` `{VKEY X}`

### Combinations

`+(abc)` → ABC (abc with shift)
`{a 3}` → aaa
`^^({TAB} +{TAB})` → ctrl-tab ctrl-shift-tab

## Not supported

`{CAPSLOCK}` `{NUMLOCK}` `{SCROLLLOCK}` `{APPS}` `{HELP}` `{PRTSC}` `{BREAK}`
`{DELAY=X}`
`{VKEY-NX *}` `{VKEY-EX *}`
`{REF:*}` `{T-REPLACE-RX:*}` `{T-CONV:*}`
`{BASE}` `{BASE:*}` `{URL:*}`
`{%ENVVAR%}` `{ENV_DIRSEP}` `{ENV_PROGRAMFILES_X86}` `{APPDIR}`
`{INTERNETEXPLORER}` `{FIREFOX}` `{OPERA}` `{GOOGLECHROME}` `{SAFARI}`
`{PICKCHARS}` `{PICKCHARS:*}` `{NEWPASSWORD}` `{NEWPASSWORD:*}` `{PASSWORD_ENC}` `{BEEP *}`
`{HMACOTP}`
`{APPACTIVATE WindowTitle}`
`{GROUP_PATH}` `{GROUP_NOTES}` `{DB_PATH}` `{DB_DIR}` `{DB_NAME}` `{DB_BASENAME}` `{DB_EXT}`
