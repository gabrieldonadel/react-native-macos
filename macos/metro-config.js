/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Metro resolution for the `macos` platform.
 *
 * Metro resolves one platform per request. Under `platform: 'macos'` the
 * candidate list for `./Foo` is `Foo.macos.js`, `Foo.native.js`, `Foo.js` --
 * `Foo.ios.js` is never considered. That breaks React Native two ways:
 *
 *   - Modules that exist only as `Foo.ios.js` / `Foo.android.js` are not found
 *     at all. `ReactDevToolsSettingsManager` is one of about twenty.
 *   - `Platform.js` re-exports `./Platform` and expects the platform-suffixed
 *     sibling to win. With no `Platform.macos.js` it resolves to itself, Metro
 *     reports a require cycle, and `Platform.OS` is undefined -- which surfaces
 *     much later as `Cannot read property 'OS' of undefined`.
 *
 * This resolves `macos` as an extension chain instead: `.macos.js`, then
 * `.ios.js`, then the unsuffixed file. iOS is the right fallback, because macOS
 * shares its Apple-platform module surface.
 *
 * react-native-macos solves the same problem by adding ~22 `.macos.js` files to
 * the upstream tree. Doing it in the resolver keeps them out of the fork.
 *
 * Usage:
 *
 *   const {mergeConfig} = require('@react-native/metro-config');
 *   const {getMacOSConfig} = require('react-native/macos/metro-config');
 *
 *   module.exports = mergeConfig(getDefaultConfig(__dirname), getMacOSConfig());
 *
 * @format
 */

'use strict';

const MACOS_SUFFIX = /\.macos\.[^.]+$/;

/**
 * Resolve one specifier as `.macos.*` -> iOS resolution.
 *
 * Only a file that genuinely carries the `.macos.` suffix counts as an
 * override. Anything else is the shared file, which iOS resolution reaches too
 * -- and which may itself be the re-export that needs a suffixed sibling.
 */
function resolveMacOS(context, moduleName, platform) {
  if (platform !== 'macos') {
    return context.resolveRequest(context, moduleName, platform);
  }

  const attempt = candidate => {
    try {
      return context.resolveRequest(context, moduleName, candidate);
    } catch (error) {
      return error;
    }
  };

  const macos = attempt('macos');
  if (
    macos != null &&
    !(macos instanceof Error) &&
    typeof macos.filePath === 'string' &&
    MACOS_SUFFIX.test(macos.filePath)
  ) {
    return macos;
  }

  const ios = attempt('ios');
  if (!(ios instanceof Error)) {
    return ios;
  }

  // Report the macOS failure, not the iOS one: it names the platform asked for.
  if (macos instanceof Error) {
    throw macos;
  }
  return macos;
}

/**
 * A Metro config fragment that teaches the resolver about macOS.
 *
 * Merge it over `getDefaultConfig()`. It sets nothing else, so an app keeps
 * full control of transformer, serializer and watch folders.
 */
function getMacOSConfig() {
  return {
    resolver: {
      platforms: ['macos', 'ios', 'android', 'native'],
      resolveRequest: resolveMacOS,
    },
  };
}

module.exports = {getMacOSConfig, resolveMacOS};
