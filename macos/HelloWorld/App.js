/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Deliberately plain: a few nested Views with backgrounds, borders and Text.
 * The point is to exercise flexbox layout, the flipped coordinate system,
 * layer-backed background colours and border drawing -- the things most likely
 * to be wrong first on AppKit.
 *
 * @format
 */

import React from 'react';
import {Text, View} from 'react-native';

export default function App() {
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>React Native</Text>
        <Text style={styles.subtitle}>running on macOS with AppKit</Text>
        <View style={styles.row}>
          <View style={[styles.swatch, {backgroundColor: '#e5484d'}]} />
          <View style={[styles.swatch, {backgroundColor: '#f5a524'}]} />
          <View style={[styles.swatch, {backgroundColor: '#30a46c'}]} />
          <View style={[styles.swatch, {backgroundColor: '#0091ff'}]} />
        </View>
        <Text style={styles.note}>
          Top-left origin, flexbox layout, layer-backed colour and borders.
        </Text>
      </View>
    </View>
  );
}

const styles = {
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11181c',
  },
  card: {
    width: 460,
    padding: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2b3a41',
    backgroundColor: '#18262c',
  },
  title: {fontSize: 30, fontWeight: '700', color: '#ffffff'},
  subtitle: {fontSize: 15, color: '#9bb0b8', marginTop: 6},
  row: {flexDirection: 'row', marginTop: 22},
  swatch: {width: 56, height: 56, borderRadius: 8, marginRight: 12},
  note: {fontSize: 12, color: '#6c8189', marginTop: 22, lineHeight: 18},
};
