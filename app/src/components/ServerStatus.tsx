// Shows whether the app can reach the server, and lets the user type a
// different address. This is the safety net for demos on unusual networks.

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { currentBaseUrl, findServer, saveCustomServer } from '../api';
import { space, useTheme } from '../theme';
import { Button, Field, Icon, Txt } from './ui';

export function ServerStatus() {
  const { c, status } = useTheme();
  const [url, setUrl] = useState<string | null>(currentBaseUrl());
  const [checking, setChecking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setUrl(await findServer(true));
    setChecking(false);
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const save = async () => {
    setChecking(true);
    setError(null);
    const ok = await saveCustomServer(input);
    setChecking(false);
    if (ok) {
      setUrl(currentBaseUrl());
      setEditing(false);
      setInput('');
    } else {
      setError('No Campus Fix server answered at that address.');
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.row}>
        <Icon name={url ? 'cloud-check-outline' : 'cloud-alert'} size={18} color={url ? status.Resolved.fg : c.danger} />
        <Txt variant="small" tone={url ? 'soft' : 'danger'} style={{ flex: 1 }} numberOfLines={1}>
          {checking ? 'Looking for the server' : url ? `Connected to ${url.replace(/^https?:\/\//, '')}` : 'Server not found. Is it running?'}
        </Txt>
        <Pressable onPress={url ? () => setEditing((open) => !open) : check} accessibilityRole="button" hitSlop={12}>
          <Txt variant="small" style={{ textDecorationLine: 'underline' }}>
            {url ? (editing ? 'Close' : 'Change') : 'Try again'}
          </Txt>
        </Pressable>
      </View>
      {!url && !editing ? (
        <Pressable onPress={() => setEditing(true)} accessibilityRole="button" hitSlop={8}>
          <Txt variant="small" style={{ textDecorationLine: 'underline' }}>
            Enter the server address by hand
          </Txt>
        </Pressable>
      ) : null}
      {editing ? (
        <View style={{ gap: space.sm }}>
          <Field
            label="Server address"
            value={input}
            onChangeText={setInput}
            placeholder="192.168.1.20:4000"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={error}
            hint="Leave empty to find it automatically."
          />
          <Button label="Test and save" variant="outline" small onPress={save} loading={checking} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
