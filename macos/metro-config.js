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

/**
 * Resolve one specifier for the `macos` platform.
 *
 * Metro's own `macos` resolution already does the right thing almost always:
 * `Foo.macos.js`, then `Foo.native.js`, then the shared `Foo.js`. A package that
 * ships `Foo.ios`, `Foo.android` *and* `Foo.js` means the shared file for every
 * other platform, macOS included -- expo-router's `toolbar/native.tsx` is
 * exactly that, and taking its `.ios` sibling instead drags in iOS-only native
 * modules that are not linked here.
 *
 * Falling back to iOS is still needed twice:
 *
 *   - Nothing resolves at all, because the module exists only as `Foo.ios.js`
 *     and `Foo.android.js`. ReactDevToolsSettingsManager is one of about twenty.
 *   - The shared file *is* the importer. `Platform.js` re-exports `./Platform`
 *     and expects a platform-suffixed sibling to answer; with no
 *     `Platform.macos.js` it resolves to itself, and `Platform.OS` comes out
 *     undefined by way of a require cycle.
 *
 * So: take Metro's answer unless it is unusable, and only then ask for iOS.
 */
function resolveMacOS(context, moduleName, platform, next) {
  const resolve = next ?? ((ctx, name, plat) => ctx.resolveRequest(ctx, name, plat));

  if (platform !== 'macos') {
    return resolve(context, moduleName, platform);
  }

  const attempt = candidate => {
    try {
      return resolve(context, moduleName, candidate);
    } catch (error) {
      return error;
    }
  };

  const macos = attempt('macos');
  if (!(macos instanceof Error)) {
    const resolvedToImporter =
      typeof macos.filePath === 'string' && macos.filePath === context.originModulePath;
    if (!resolvedToImporter) {
      return macos;
    }
  }

  const ios = attempt('ios');
  if (!(ios instanceof Error)) {
    return ios;
  }

  // Report the macOS failure: it names the platform that was asked for.
  throw macos instanceof Error ? macos : ios;
}

/**
 * A Metro config fragment that teaches the resolver about macOS.
 *
 * Pass the config you are extending. If it already has a `resolveRequest` --
 * `@expo/metro-config` installs a substantial one -- this *wraps* it rather
 * than replacing it, because `context.resolveRequest` inside a custom resolver
 * is Metro's default resolver, not whatever was configured before. Assigning
 * over it silently drops the other resolver's behaviour.
 *
 * Sets nothing else, so an app keeps full control of transformer, serializer
 * and watch folders.
 *
 *   const config = getDefaultConfig(__dirname);
 *   module.exports = mergeConfig(config, getMacOSConfig(config));
 */
function getMacOSConfig(baseConfig) {
  const upstream = baseConfig?.resolver?.resolveRequest;

  return {
    resolver: {
      platforms: ['macos', 'ios', 'android', 'native'],
      resolveRequest: (context, moduleName, platform) =>
        resolveMacOS(context, moduleName, platform, upstream),
    },
  };
}

module.exports = {getMacOSConfig, resolveMacOS};
