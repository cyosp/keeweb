import { Events } from 'framework/events';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { RuntimeDataModel } from 'models/runtime-data-model';
import { Logger } from 'util/logger';
import { StorageOAuthListener } from 'storage/storage-oauth-listener';
import { UrlFormat } from 'util/formatting/url-format';
import { Launcher } from 'comp/launcher';
import { omitEmpty } from 'util/fn';
import { Timeouts } from 'const/timeouts';
import { Features } from 'util/features';
import { createOAuthSession } from 'storage/pkce';

const MaxRequestRetries = 3;

class StorageBase {
    name = null;
    icon = null;
    iconSvg = null;
    enabled = false;
    system = false;
    uipos = null;

    logger = null;
    appSettings = AppSettingsModel;
    runtimeData = RuntimeDataModel;

    init() {
        if (!this.name) {
            throw 'Failed to init provider: no name';
        }
        if (!this.system) {
            const enabled = this.appSettings[this.name];
            if (typeof enabled === 'boolean') {
                this.enabled = enabled;
            }
        }
        this.logger = new Logger('storage-' + this.name);
        return this;
    }

    setEnabled(enabled) {
        if (!enabled) {
            this.logout();
        }
        this.enabled = enabled;
    }

    get loggedIn() {
        return !!this.runtimeData[this.name + 'OAuthToken'];
    }

    logout() {}

    _xhr(config) {
        this.logger.info('HTTP request', config.method || 'GET', config.url);
        if (config.data) {
            if (!config.dataType) {
                config.dataType = 'application/octet-stream';
            }
            config.headers = {
                ...config.headers,
                'Content-Type': config.dataType
            };
        }
        if (this._oauthToken && !config.skipAuth) {
            config.headers = {
                ...config.headers,
                'Authorization': 'Bearer ' + this._oauthToken.accessToken
            };
        }
        this._httpRequest(config, response => {
            this.logger.info('HTTP response', response.status);
            const statuses = config.statuses || [200];
            if (statuses.indexOf(response.status) >= 0) {
                return config.success && config.success(response.response, response);
            }
            if (response.status === 401 && this._oauthToken) {
                this._oauthGetNewToken(err => {
                    if (err) {
                        return config.error && config.error('unauthorized', response);
                    } else {
                        config.tryNum = (config.tryNum || 0) + 1;
                        if (config.tryNum >= MaxRequestRetries) {
                            this.logger.info(
                                'Too many authorize attempts, fail request',
                                config.url
                            );
                            return config.error && config.error('unauthorized', response);
                        }
                        this.logger.info('Repeat request, try #' + config.tryNum, config.url);
                        this._xhr(config);
                    }
                });
            } else {
                return config.error && config.error('http status ' + response.status, response);
            }
        });
    }

    _httpRequest(config, onLoad) {
        const httpRequest = Features.isDesktop ? this._httpRequestLauncher : this._httpRequestWeb;
        httpRequest.call(this, config, onLoad);
    }

    _httpRequestWeb(config, onLoad) {
        const xhr = new XMLHttpRequest();
        if (config.responseType) {
            xhr.responseType = config.responseType;
        }
        xhr.addEventListener('load', () => {
            onLoad({
                status: xhr.status,
                response: xhr.response,
                getResponseHeader: name => xhr.getResponseHeader(name)
            });
        });
        xhr.addEventListener('error', () => {
            return config.error && config.error('network error', xhr);
        });
        xhr.addEventListener('timeout', () => {
            return config.error && config.error('timeout', xhr);
        });
        xhr.open(config.method || 'GET', config.url);
        if (config.headers) {
            for (const [key, value] of Object.entries(config.headers)) {
                xhr.setRequestHeader(key, value);
            }
        }
        let data = config.data;
        if (data) {
            if (!config.dataIsMultipart) {
                data = [data];
            }
            data = new Blob(data, { type: config.dataType });
        }
        xhr.send(data);
    }

    _httpRequestLauncher(config, onLoad) {
        Launcher.resolveProxy(config.url, proxy => {
            const https = Launcher.req('https');

            const opts = Launcher.req('url').parse(config.url);

            opts.method = config.method || 'GET';
            opts.headers = {
                'User-Agent': navigator.userAgent,
                ...config.headers
            };
            opts.timeout = Timeouts.DefaultHttpRequest;

            let data;
            if (config.data) {
                if (config.dataIsMultipart) {
                    data = Buffer.concat(config.data.map(chunk => Buffer.from(chunk)));
                } else {
                    data = Buffer.from(config.data);
                }
                opts.headers['Content-Length'] = data.byteLength;
            }

            if (proxy) {
                opts.headers.Host = opts.host;
                opts.host = proxy.host;
                opts.port = proxy.port;
                opts.path = config.url;
            }

            const req = https.request(opts);

            req.on('response', res => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    this.logger.debug(
                        'HTTP response',
                        opts.method,
                        config.url,
                        res.statusCode,
                        res.headers
                    );

                    let response = Buffer.concat(chunks);
                    if (config.responseType === 'json') {
                        try {
                            response = JSON.parse(response.toString('utf8'));
                        } catch (e) {
                            return config.error && config.error('json parse error');
                        }
                    } else {
                        response = response.buffer.slice(
                            response.byteOffset,
                            response.byteOffset + response.length
                        );
                    }
                    onLoad({
                        status: res.statusCode,
                        response,
                        getResponseHeader: name => res.headers[name.toLowerCase()]
                    });
                });
            });
            req.on('error', e => {
                this.logger.error('HTTP error', opts.method, config.url, e);
                return config.error && config.error('network error', {});
            });
            req.on('timeout', () => {
                req.abort();
                return config.error && config.error('timeout', {});
            });
            if (data) {
                req.write(data);
            }
            req.end();
        });
    }

    _openPopup(url, title, width, height, extras) {
        const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : screen.left;
        const dualScreenTop = window.screenTop !== undefined ? window.screenTop : screen.top;

        const winWidth = window.innerWidth
            ? window.innerWidth
            : document.documentElement.clientWidth
            ? document.documentElement.clientWidth
            : screen.width;
        const winHeight = window.innerHeight
            ? window.innerHeight
            : document.documentElement.clientHeight
            ? document.documentElement.clientHeight
            : screen.height;

        const left = winWidth / 2 - width / 2 + dualScreenLeft;
        const top = winHeight / 2 - height / 2 + dualScreenTop;

        let settings = {
            width,
            height,
            left,
            top,
            dialog: 'yes',
            dependent: 'yes',
            scrollbars: 'yes',
            location: 'yes'
        };
        settings = Object.keys(settings)
            .map(key => key + '=' + settings[key])
            .join(',');

        return window.open(url, title, settings, extras);
    }

    _getOauthRedirectUrl() {
        let redirectUrl = window.location.href;
        redirectUrl = redirectUrl.split('?')[0];
        return redirectUrl;
    }

    _oauthAuthorize(callback) {
        if (this._tokenIsValid(this._oauthToken)) {
            return callback();
        }
        const opts = this._getOAuthConfig();
        const oldToken = this.runtimeData[this.name + 'OAuthToken'];
        if (this._tokenIsValid(oldToken)) {
            this._oauthToken = oldToken;
            return callback();
        }

        if (oldToken && oldToken.refreshToken) {
            return this._oauthExchangeRefreshToken(callback);
        }

        const session = createOAuthSession();

        let listener;
        if (Features.isDesktop) {
            listener = StorageOAuthListener.listen();
            session.redirectUri = listener.redirectUri;
        } else {
            session.redirectUri = this._getOauthRedirectUrl();
        }

        const pkceParams = opts.pkce
            ? {
                  'code_challenge': session.codeChallenge,
                  'code_challenge_method': 'S256'
              }
            : undefined;

        const url = UrlFormat.makeUrl(opts.url, {
            'client_id': opts.clientId,
            'scope': opts.scope,
            'state': session.state,
            'redirect_uri': session.redirectUri,
            'response_type': 'code',
            ...pkceParams
        });

        if (listener) {
            listener.on('ready', () => {
                Launcher.openLink(url);
                callback('browser-auth-started');
            });
            listener.on('error', err => callback(err));
            listener.on('result', result => this._oauthCodeReceived(result, session));
            return;
        }

        const popupWindow = this._openPopup(url, 'OAuth', opts.width, opts.height);
        if (!popupWindow) {
            return callback('OAuth: cannot open popup');
        }

        this.logger.debug('OAuth: popup opened');

        const popupClosed = () => {
            Events.off('popup-closed', popupClosed);
            window.removeEventListener('message', windowMessage);
            this.logger.error('OAuth error', 'popup closed');
            callback('OAuth: popup closed');
        };

        const windowMessage = e => {
            if (e.origin !== location.origin) {
                return;
            }
            if (e.data && e.data.error) {
                this.logger.error('OAuth error', e.data.error, e.data.error_description);
                callback('OAuth: ' + e.data.error);
            } else if (e.data && e.data.code) {
                Events.off('popup-closed', popupClosed);
                window.removeEventListener('message', windowMessage);
                this._oauthCodeReceived(e.data, session, callback);
            } else {
                this.logger.debug('Skipped OAuth message', e.data);
            }
        };
        Events.on('popup-closed', popupClosed);
        window.addEventListener('message', windowMessage);
    }

    _oauthProcessReturn(message) {
        const token = this._oauthMsgToToken(message);
        if (token && !token.error) {
            this._oauthToken = token;
            this.runtimeData[this.name + 'OAuthToken'] = token;
            this.logger.debug('OAuth token received');
        }
        return token;
    }

    _oauthMsgToToken(data) {
        if (!data.token_type) {
            if (data.error) {
                return { error: data.error, errorDescription: data.error_description };
            } else {
                return undefined;
            }
        }
        return omitEmpty({
            dt: Date.now() - 60 * 1000,
            tokenType: data.token_type,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            authenticationToken: data.authentication_token,
            expiresIn: +data.expires_in,
            scope: data.scope,
            userId: data.user_id
        });
    }

    _oauthGetNewToken(callback) {
        this._oauthToken.expired = true;
        this.runtimeData[this.name + 'OAuthToken'] = this._oauthToken;
        if (this._oauthToken.refreshToken) {
            this._oauthExchangeRefreshToken(callback);
        } else {
            this._oauthAuthorize(callback);
        }
    }

    _oauthRevokeToken(url, requestOptions) {
        const token = this.runtimeData[this.name + 'OAuthToken'];
        if (token) {
            if (url) {
                this._xhr({
                    url: url.replace('{token}', token.accessToken),
                    statuses: [200, 401],
                    ...requestOptions
                });
            }
            delete this.runtimeData[this.name + 'OAuthToken'];
            this._oauthToken = null;
        }
    }

    _tokenIsValid(token) {
        if (!token || token.expired) {
            return false;
        }
        if (token.dt && token.expiresIn && token.dt + token.expiresIn * 1000 < Date.now()) {
            return false;
        }
        return true;
    }

    _oauthCodeReceived(result, session, callback) {
        if (!result.state) {
            this.logger.info('OAuth result has no state');
            return callback && callback('OAuth result has no state');
        }
        if (result.state !== session.state) {
            this.logger.info('OAuth result has bad state');
            return callback && callback('OAuth result has bad state');
        }

        if (!result.code) {
            this.logger.info('OAuth result has no code');
            return callback && callback('OAuth result has no code');
        }

        this.logger.debug('OAuth code received');

        if (Features.isDesktop) {
            Launcher.showMainWindow();
        }
        const config = this._getOAuthConfig();
        const pkceParams = config.pkce ? { 'code_verifier': session.codeVerifier } : undefined;

        this._xhr({
            url: config.tokenUrl,
            method: 'POST',
            responseType: 'json',
            skipAuth: true,
            data: UrlFormat.buildFormData({
                'client_id': config.clientId,
                'client_secret': config.clientSecret,
                'grant_type': 'authorization_code',
                'code': result.code,
                'redirect_uri': session.redirectUri,
                ...pkceParams
            }),
            dataType: 'application/x-www-form-urlencoded',
            success: response => {
                this.logger.debug('OAuth code exchanged', response);
                const token = this._oauthProcessReturn(response);
                if (token && token.error) {
                    return callback && callback('OAuth code exchange error: ' + token.error);
                }
                callback && callback();
            },
            error: err => {
                this.logger.error('Error exchanging OAuth code', err);
                callback && callback('OAuth code exchange error: ' + err);
            }
        });
    }

    _oauthExchangeRefreshToken(callback) {
        this.logger.debug('Exchanging refresh token');
        const { refreshToken } = this.runtimeData[this.name + 'OAuthToken'];
        const config = this._getOAuthConfig();
        this._xhr({
            url: config.tokenUrl,
            method: 'POST',
            responseType: 'json',
            skipAuth: true,
            data: UrlFormat.buildFormData({
                'client_id': config.clientId,
                'client_secret': config.clientSecret,
                'grant_type': 'refresh_token',
                'refresh_token': refreshToken
            }),
            dataType: 'application/x-www-form-urlencoded',
            success: response => {
                this.logger.debug('Refresh token exchanged');
                this._oauthProcessReturn({
                    'refresh_token': refreshToken,
                    ...response
                });
                callback();
            },
            error: (err, xhr) => {
                if (xhr.status === 400) {
                    delete this.runtimeData[this.name + 'OAuthToken'];
                    this._oauthToken = null;
                }
                this.logger.error('Error exchanging refresh token', err);
                callback && callback('Error exchanging refresh token');
            }
        });
    }
}

export { StorageBase };
