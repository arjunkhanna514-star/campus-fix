import { router } from 'expo-router';
import React, { useState } from 'react';
import {KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View} from 'react-native';

import { errorMessage } from '@/src/api';
import { useAuth } from '@/src/auth';
import { Button, Field, IconButton, Notice, Screen, Txt } from '@/src/components/ui';
import { space } from '@/src/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The same rules the server checks, so mistakes show up before sending.
  const nameError = name.trim().length < 2 ? 'Enter your name.' : null;
  const emailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : 'Enter a valid email address.';
  const passwordError = password.length < 8 ? 'Use at least 8 characters.' : null;

  const submit = async () => {
    setTried(true);
    if (nameError || emailError || passwordError) return;
    setBusy(true);
    setError(null);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ marginLeft: -12 }}>
            <IconButton name="arrow-left" label="Back to log in" onPress={() => router.back()} />
          </View>
          <View style={{ gap: space.xs }}>
            <Txt variant="display" accessibilityRole="header">
              Create your account
            </Txt>
            <Txt tone="soft">Your name appears on the reports you make and on the leaderboard.</Txt>
          </View>

          <View style={{ gap: space.lg }}>
            {error ? <Notice text={error} /> : null}
            <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" returnKeyType="next" error={tried ? nameError : null} />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              error={tried ? emailError : null}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={submit}
              error={tried ? passwordError : null}
              hint="At least 8 characters."
              right={
                <IconButton
                  name={showPassword ? 'eye-off' : 'eye'}
                  label={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword((on) => !on)}
                />
              }
            />
            <Button label="Create account" onPress={submit} loading={busy} />
            <Pressable onPress={() => router.back()} accessibilityRole="link" hitSlop={10} style={{ alignSelf: 'center', paddingVertical: 4 }}>
              <Txt>
                Already have an account? <Txt variant="bodyBold" style={{ textDecorationLine: 'underline' }}>Log in</Txt>
              </Txt>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: space.xl, gap: space.xl, width: '100%', maxWidth: 480, alignSelf: 'center' },
});
