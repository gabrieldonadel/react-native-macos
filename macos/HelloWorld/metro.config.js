/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const reactNativeRoot = path.resolve(__dirname, '../../packages/react-native');

const appNodeModules = path.resolve(__dirname, 'node_modules');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  resolver: {
    platforms: ['macos', 'ios', 'android', 'native'],

    /**
     * Resolve `macos` as an extension chain: `.macos.js` -> `.ios.js` -> `.js`.
     *
     * Metro resolves one platform per request, so under `platform: 'macos'` the
     * candidate list is `Foo.macos.js`, `Foo.native.js`, `Foo.js`. That breaks
     * two ways on this fork:
     *
     *   - Modules that exist only as `Foo.ios.js` / `Foo.android.js` are not
     *     found at all (ReactDevToolsSettingsManager is one).
     *   - `Platform.js` re-exports `./Platform` and expects the platform suffix
     *     to win. With no `Platform.macos.js` it resolves to itself and Metro
     *     reports a require cycle, leaving the export undefined.
     *
     * So: prefer a genuinely macOS-specific file when one exists, otherwise use
     * the iOS resolution, which already handles `.native.js` and unsuffixed
     * files. iOS is the right fallback -- macOS shares its Apple-platform
     * module surface.
     *
     * react-native-macos instead adds ~22 `.macos.js` files to the upstream
     * tree. Keeping it in the resolver keeps those files out of the fork.
     *
     * This belongs in @react-native/metro-config so apps inherit it rather than
     * each copying it. It lives here until the fork ships its own preset.
     */
    resolveRequest: (context, moduleName, platform) => {
      if (platform !== 'macos') {
        return context.resolveRequest(context, moduleName, platform);
      }

      const tryResolve = p => {
        try {
          return context.resolveRequest(context, moduleName, p);
        } catch (error) {
          return error;
        }
      };

      const macosResult = tryResolve('macos');
      // Only a file that actually carries the `.macos.` suffix counts as a
      // macOS override. Anything else is the shared file, which iOS resolution
      // would reach too -- and which may itself be the re-export that needs a
      // suffixed sibling.
      if (
        macosResult != null &&
        !(macosResult instanceof Error) &&
        typeof macosResult.filePath === 'string' &&
        /\.macos\.[^.]+$/.test(macosResult.filePath)
      ) {
        return macosResult;
      }

      const iosResult = tryResolve('ios');
      if (!(iosResult instanceof Error)) {
        return iosResult;
      }
      if (macosResult instanceof Error) {
        throw macosResult;
      }
      return macosResult;
    },

    // react-native is a path dependency here, so its own `require('react')`
    // resolves upward from packages/react-native and misses the app's copy.
    // Redirecting keeps exactly one React in the graph, which React requires.
    extraNodeModules: new Proxy(
      {'react-native': reactNativeRoot},
      {
        get(target, name) {
          if (name in target) {
            return target[name];
          }
          return path.join(appNodeModules, String(name));
        },
        has(target, name) {
          return true;
        },
      },
    ),
  },
  watchFolders: [reactNativeRoot, appNodeModules],
});
