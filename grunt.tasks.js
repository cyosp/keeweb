module.exports = function(grunt) {
    grunt.registerTask('build-web-app', [
        'gitinfo',
        'clean',
        'copy:html',
        'copy:favicon',
        'copy:icons',
        'copy:manifest',
        'copy:fonts',
        'webpack:app',
        'inline',
        'htmlmin',
        'string-replace:service-worker',
        'string-replace:manifest',
        'copy:dist-icons',
        'copy:dist-manifest',
        'copy:dist-config'
    ]);

    grunt.registerTask('build-desktop-app-content', [
        'copy:desktop-html',
        'copy:desktop-config',
        'copy:desktop-app-content',
        'string-replace:desktop-public-key'
    ]);

    grunt.registerTask('build-desktop-update', [
        'copy:desktop-update',
        'copy:desktop-update-helper',
        'compress:desktop-update'
    ]);

    grunt.registerTask('build-desktop-executables', [
        'electron',
        'chmod:linux-desktop-x64'
    ]);

    grunt.registerTask('build-desktop-archives', [
        'compress:linux-x64'
    ]);

    grunt.registerTask('build-desktop-dist-darwin', ['appdmg']);

    grunt.registerTask('build-desktop-dist-win32', [
        'nsis:win32-un-x64',
        'nsis:win32-un-ia32',
        'sign-exe:win32-uninst-x64',
        'sign-exe:win32-uninst-ia32',
        'nsis:win32-x64',
        'nsis:win32-ia32',
        'sign-exe:win32-installer-x64',
        'sign-exe:win32-installer-ia32',
        'copy:desktop-win32-dist-x64',
        'copy:desktop-win32-dist-ia32'
    ]);

    grunt.registerTask('build-desktop-dist-linux', [
        'deb:linux-x64'
    ]);

    grunt.registerTask('build-desktop-dist', [
        'build-desktop-dist-darwin',
        'build-desktop-dist-linux'
    ]);

    grunt.registerTask('build-desktop', [
        'gitinfo',
        'clean:desktop',
        'build-desktop-app-content',
        'build-desktop-executables',
        'build-desktop-update',
        'build-desktop-archives',
        'build-desktop-dist'
    ]);

    grunt.registerTask('build-cordova-app-content', ['string-replace:cordova-html']);

    grunt.registerTask('build-cordova', ['gitinfo', 'clean:cordova', 'build-cordova-app-content']);

    grunt.registerTask('build-test', ['webpack:test']);
};
