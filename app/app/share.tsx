// "Get Campus Fix on any phone": a QR code anyone can scan to open the app
// in their phone's browser and add it to the home screen. The link is the
// laptop's public link while "npm run share" is running.

import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { api, currentBaseUrl } from '@/src/api';
import { Button, Card, Icon, IconButton, Notice, Screen, Txt } from '@/src/components/ui';
import { haptics } from '@/src/haptics';
import { useT } from '@/src/i18n';
import { radius, space, useTheme } from '@/src/theme';

type Info = { url: string; isPublic: boolean; getPage: string };

export default function ShareScreen() {
  const t = useT();
  const { c } = useTheme();
  const [info, setInfo] = useState<Info | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let next: Info | null = null;
      // Opened from the shared link itself: that link is the one to pass on.
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.protocol === 'https:') {
        const origin = window.location.origin;
        next = { url: origin, isPublic: true, getPage: `${origin}/get` };
      } else {
        try {
          next = await api<Info>('/share-info');
        } catch {
          next = null;
        }
      }
      setInfo(next);
      const base = currentBaseUrl();
      if (next && base) {
        try {
          const res = await fetch(`${base}/qr.svg?text=${encodeURIComponent(next.url)}`);
          if (res.ok) setQr(await res.text());
        } catch {
          // the link text is still shown
        }
      }
    })();
  }, []);

  const send = () => {
    if (!info) return;
    haptics.tap();
    Share.share({ message: `Campus Fix: ${info.url}`, url: info.url }).catch(() => {});
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ animation: 'slide_from_bottom' }} />
      <View style={styles.header}>
        <IconButton name="close" label={t('common.close')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} glass />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: space.xs }}>
          <Txt variant="title" accessibilityRole="header">
            {t('share.title')}
          </Txt>
          <Txt tone="soft">{t('share.body')}</Txt>
        </View>

        <View style={styles.qrCard} accessibilityRole="image" accessibilityLabel={info ? `QR code: ${info.url}` : 'QR code'} testID="share-qr">
          {qr ? <SvgXml xml={qr} width="100%" height="100%" /> : <ActivityIndicator color="#0A0A0B" />}
        </View>
        {info ? (
          <Txt variant="small" tone="soft" style={{ textAlign: 'center' }} selectable testID="share-url">
            {info.url}
          </Txt>
        ) : null}
        {info && !info.isPublic ? <Notice tone="info" text={t('share.offline')} /> : null}

        <View style={{ gap: space.sm }}>
          <Button label={t('share.send')} icon="share-variant" onPress={send} disabled={!info} />
          <Button label={t('share.page')} icon="qrcode" variant="outline" onPress={() => info && Linking.openURL(info.getPage)} disabled={!info} />
        </View>

        <Card style={{ gap: space.md }}>
          <Step icon="apple" text={t('share.iphone')} />
          <Step icon="android" text={t('share.android')} />
          <Step icon="web" text={t('share.other')} />
        </Card>
      </ScrollView>
    </Screen>
  );

  function Step({ icon, text }: { icon: string; text: string }) {
    return (
      <View style={styles.step}>
        <View style={[styles.stepIcon, { backgroundColor: c.surfaceAlt }]}>
          <Icon name={icon} size={20} />
        </View>
        <Txt style={{ flex: 1 }}>{text}</Txt>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space.md, paddingTop: space.xs },
  content: { padding: space.lg, paddingTop: 0, gap: space.lg, width: '100%', maxWidth: 520, alignSelf: 'center' },
  qrCard: { alignSelf: 'center', width: 260, height: 260, padding: 16, borderRadius: radius.lg, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
