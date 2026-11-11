// The language button (a globe with the current language code) and the
// sheet that lists every language by its own name.

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, PressableScale, Txt } from '@/src/components/ui';
import { haptics } from '@/src/haptics';
import { LANGUAGES, useI18n } from '@/src/i18n';
import { radius, space, useTheme } from '@/src/theme';

export function LanguageSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, setLang, t } = useI18n();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={[styles.sheet, { backgroundColor: c.solid, borderColor: c.lineStrong, paddingBottom: insets.bottom + space.lg }]}>
        <View style={[styles.grabber, { backgroundColor: c.lineStrong }]} />
        <Txt variant="title" accessibilityRole="header">
          {t('common.chooseLanguage')}
        </Txt>
        <Txt variant="small" tone="soft">
          {t('common.languageNote')}
        </Txt>
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: space.xs, paddingTop: space.sm }}>
          {LANGUAGES.map((l) => {
            const selected = l.code === lang;
            return (
              <PressableScale
                key={l.code}
                feedback="select"
                onPress={() => {
                  setLang(l.code);
                  haptics.success();
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${l.name}, ${l.english}`}
                style={[styles.row, { backgroundColor: selected ? c.tag : c.surface, borderColor: selected ? c.tag : c.line }]}>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyBold" color={selected ? c.tagInk : c.ink}>
                    {l.name}
                  </Txt>
                  <Txt variant="small" color={selected ? c.tagInk : c.inkSoft}>
                    {l.english}
                  </Txt>
                </View>
                {selected ? <Icon name="check-circle" size={22} color={c.tagInk} /> : null}
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function LanguageButton() {
  const { lang, t } = useI18n();
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PressableScale
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t('common.language')}: ${LANGUAGES.find((l) => l.code === lang)?.name}`}
        style={[styles.pill, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name="translate" size={17} />
        <Txt variant="small" style={{ textTransform: 'uppercase' }}>
          {lang}
        </Txt>
      </PressableScale>
      <LanguageSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: space.lg, gap: space.xs },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.md, minHeight: 56 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill, borderWidth: 1 },
});
