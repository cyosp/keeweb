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
