import { router } from 'expo-router';
import React, { useState } from 'react';
import {KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View} from 'react-native';

import { errorMessage } from '@/src/api';
import { useAuth } from '@/src/auth';
import { BrandMark } from '@/src/components/Brand';
import { ServerStatus } from '@/src/components/ServerStatus';
import { Button, Card, Field, IconButton, Notice, Screen, Txt } from '@/src/components/ui';
import { space } from '@/src/theme';

const DEMO = {
  student: { email: 'alice@campus.test', password: 'Student123!' },
  admin: { email: 'admin@campus.test', password: 'Admin123!' },
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const fill = (account: { email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <BrandMark size={52} />
            <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.lg }}>
              Campus Fix
            </Txt>
            <Txt tone="soft">Spot a problem on campus, report it in a minute, and follow it until it is fixed.</Txt>
          </View>

          <View style={{ gap: space.lg }}>
            {error ? <Notice text={error} /> : null}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              placeholder="you@campus.test"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              right={
                <IconButton
                  name={showPassword ? 'eye-off' : 'eye'}
                  label={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword((on) => !on)}
                />
              }
            />
            <Button label="Log in" onPress={submit} loading={busy} />
            <Pressable onPress={() => router.push('/register')} accessibilityRole="link" hitSlop={10} style={{ alignSelf: 'center', paddingVertical: 4 }}>
              <Txt>
                New here? <Txt variant="bodyBold" style={{ textDecorationLine: 'underline' }}>Create an account</Txt>
              </Txt>
            </Pressable>
          </View>

          <Card style={{ gap: space.md }}>
            <View>
              <Txt variant="bodyBold">Demo accounts</Txt>
              <Txt variant="small" tone="soft">
                Tap one to fill in the form, then log in.
              </Txt>
            </View>
            <View style={styles.demoRow}>
              <Button label="Student" icon="account" variant="outline" small onPress={() => fill(DEMO.student)} style={{ flex: 1 }} accessibilityLabel="Fill in the demo student account" />
              <Button label="Admin" icon="shield-account" variant="outline" small onPress={() => fill(DEMO.admin)} style={{ flex: 1 }} accessibilityLabel="Fill in the demo admin account" />
            </View>
          </Card>

          <ServerStatus />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.xl, width: '100%', maxWidth: 480, alignSelf: 'center' },
  brand: { gap: space.xs },
  demoRow: { flexDirection: 'row', gap: space.md },
});
