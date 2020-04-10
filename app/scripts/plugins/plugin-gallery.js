import kdbxweb from 'kdbxweb';
import { Events } from 'framework/events';
import { SettingsStore } from 'comp/settings/settings-store';
import { Links } from 'const/links';
import { SignatureVerifier } from 'util/data/signature-verifier';
import { Logger } from 'util/logger';

const PluginGallery = {
    logger: new Logger('plugin-gallery'),

    gallery: null,
    loading: false,
    loadError: null,

    loadPlugins() {
    },

    verifySignature(gallery) {
        const dataToVerify = JSON.stringify(gallery, null, 2).replace(gallery.signature, '');
        return SignatureVerifier.verify(
            kdbxweb.ByteUtils.stringToBytes(dataToVerify),
            gallery.signature
        )
            .then(isValid => {
                if (isValid) {
                    return gallery;
                }
                this.logger.error('JSON signature invalid');
            })
            .catch(e => {
                this.logger.error('Error verifying plugins signature', e);
            });
    },

    getCachedGallery() {
        const ts = this.logger.ts();
        return SettingsStore.load('plugin-gallery').then(data => {
            if (data) {
                return this.verifySignature(data).then(gallery => {
                    this.logger.debug(`Loaded cached plugin gallery`, this.logger.ts(ts));
                    return gallery;
                });
            }
        });
    },

    saveGallery(data) {
        SettingsStore.save('plugin-gallery', data);
    }
};

export { PluginGallery };
