// The report form. A student says what kind of problem it is, where it
// is and what is wrong, and can attach a photo. Nothing here lets the student
// choose who fixes it: that is the staff's decision.

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/src/api';
import { IssueCard } from '@/src/components/IssueCard';
import { Button, Chip, Field, Icon, Notice, Screen, Segmented, Txt } from '@/src/components/ui';
import { useSession } from '@/src/session';
import { radius, space, useTheme } from '@/src/theme';
import { useToast } from '@/src/toast';
import type { Impact, Issue } from '@/src/types';

const IMPACT_HELP: Record<Impact, string> = {
  Low: 'A nuisance, but people can work around it.',
  Medium: 'It gets in the way of classes or study.',
  High: 'Unsafe, or it stops classes from running.',
};

type Photo = { uri: string; name: string; type: string; file?: File };

export default function ReportScreen() {
  const { meta, refreshMe } = useSession();
  const { c } = useTheme();
  const { show } = useToast();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [building, setBuilding] = useState<string | null>(null);
  const [room, setRoom] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState<Impact>('Medium');
  const [photo, setPhoto] = useState<Photo | null>(null);

  const [similar, setSimilar] = useState<Issue[]>([]);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // As soon as we know the category and the building, look for open reports
  // about the same thing, so the student can upvote one instead of duplicating it.
  useEffect(() => {
    if (!categoryId || !building) {
      setSimilar([]);
      return;
    }
    let cancelled = false;
    api<Issue[]>(`/issues/similar?building=${encodeURIComponent(building)}&category_id=${categoryId}`)
      .then((list) => !cancelled && setSimilar(list))
      .catch(() => !cancelled && setSimilar([]));
    return () => {
      cancelled = true;
    };
  }, [categoryId, building]);

  // Same rules as the server, checked here first so mistakes show next to the field.
  const errors = {
    category: categoryId ? null : 'Choose the kind of problem.',
    building: building ? null : 'Choose where it is.',
    title: title.trim().length >= 4 ? null : 'Give it a short title, at least 4 characters.',
    description: description.trim().length >= 10 ? null : 'Describe the problem in at least 10 characters.',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const pick = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          show({ kind: 'error', title: 'Camera access is off', body: 'Allow the camera in your phone settings, or choose a photo instead.' });
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, name: asset.fileName || 'photo.jpg', type: asset.mimeType || 'image/jpeg', file: asset.file });
    } catch {
      show({ kind: 'error', title: 'Could not open the photo', body: 'Try again, or send the report without one.' });
    }
  };

  const reset = () => {
    setCategoryId(null);
    setBuilding(null);
    setRoom('');
    setLocationNote('');
    setTitle('');
    setDescription('');
    setImpact('Medium');
    setPhoto(null);
    setTried(false);
    setError(null);
  };

  const submit = async () => {
    setTried(true);
    if (hasErrors) {
      setError('A few details are missing. Check the fields marked in red.');
      scroll.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('category_id', String(categoryId));
      form.append('building', building as string);
      form.append('room', room.trim());
      form.append('location_note', locationNote.trim());
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('impact', impact);
      if (photo) {
        if (Platform.OS === 'web') {
          // Browsers need a real file object.
          const blob = photo.file ?? (await (await fetch(photo.uri)).blob());
          form.append('photo', blob, photo.name);
        } else {
          // React Native sends the file straight from its location on the phone.
          form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
        }
      }
      const result = await api<{ issue: Issue }>('/issues', { method: 'POST', form });
      reset();
      scroll.current?.scrollTo({ y: 0, animated: false });
      refreshMe(); // shows the points and any badge that was just earned
      router.push(`/issue/${result.issue.id}`);
    } catch (err) {
      setError(errorMessage(err));
      scroll.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setBusy(false);
    }
  };

  const replaceSimilar = (updated: Issue) => setSimilar((list) => list.map((item) => (item.id === updated.id ? updated : item)));

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.xs }}>
            <Txt variant="title" accessibilityRole="header">
              Report a problem
            </Txt>
            <Txt tone="soft">Tell staff what is wrong and where. It takes about a minute.</Txt>
          </View>

          {error ? <Notice text={error} /> : null}

          <Section title="What kind of problem is it?" error={tried ? errors.category : null}>
            <View style={styles.chips}>
              {(meta?.categories ?? []).map((category) => (
                <Chip key={category.id} label={category.name} icon={category.icon} selected={categoryId === category.id} onPress={() => setCategoryId(category.id)} />
              ))}
            </View>
          </Section>

          <Section title="Where is it?" error={tried ? errors.building : null}>
            <View style={styles.chips}>
              {(meta?.buildings ?? []).map((name) => (
                <Chip key={name} label={name} selected={building === name} onPress={() => setBuilding(name)} />
              ))}
            </View>
            <View style={styles.twoFields}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Field label="Room (optional)" value={room} onChangeText={setRoom} placeholder="D204" autoCapitalize="characters" maxLength={30} />
              </View>
              <View style={{ flex: 2, minWidth: 200 }}>
                <Field label="Exact spot (optional)" value={locationNote} onChangeText={setLocationNote} placeholder="Back row, near the window" maxLength={120} />
              </View>
            </View>
          </Section>

          {similar.length > 0 ? (
            <View style={[styles.similar, { backgroundColor: c.tagSoft }]}>
              <View style={styles.similarHead}>
                <Icon name="lightbulb-on-outline" size={20} />
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyBold">Already reported?</Txt>
                  <Txt variant="small" tone="soft">
                    {similar.length === 1 ? 'There is an open report' : `There are ${similar.length} open reports`} for this category in {building}. If one is the same problem, upvote it instead. You still earn a point, and staff see one stronger report.
                  </Txt>
                </View>
              </View>
              {similar.map((item) => (
                <IssueCard key={item.id} issue={item} onChange={replaceSimilar} />
              ))}
            </View>
          ) : null}

          <Section title="What is wrong?">
            <Field label="Short title" value={title} onChangeText={setTitle} placeholder="Projector will not switch on" maxLength={80} error={tried ? errors.title : null} />
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="What happens, since when, and anything that helps someone find it."
              multiline
              maxLength={600}
              error={tried ? errors.description : null}
              hint={`${description.length} of 600 characters`}
            />
          </Section>

          <Section title="How much does it affect people?">
            <Segmented<Impact>
              value={impact}
              onChange={setImpact}
              options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
              ]}
            />
            <Txt variant="small" tone="soft">
              {IMPACT_HELP[impact]}
            </Txt>
          </Section>

          <Section title="Add a photo (optional)">
            {photo ? (
              <View style={{ gap: space.sm }}>
                <Image source={{ uri: photo.uri }} style={[styles.preview, { backgroundColor: c.surfaceAlt }]} resizeMode="cover" accessibilityLabel="The photo you attached" />
                <Button label="Remove photo" icon="trash-can-outline" variant="quiet" small onPress={() => setPhoto(null)} style={{ alignSelf: 'flex-start' }} />
              </View>
            ) : (
              <View style={styles.photoButtons}>
                {Platform.OS === 'web' ? null : <Button label="Take a photo" icon="camera-outline" variant="outline" onPress={() => pick('camera')} style={{ flex: 1 }} />}
                <Button label="Choose a photo" icon="image-outline" variant="outline" onPress={() => pick('library')} style={{ flex: 1 }} />
              </View>
            )}
          </Section>

          <View style={{ gap: space.sm }}>
            <Button label="Send report" icon="send" onPress={submit} loading={busy} />
            <Txt variant="small" tone="faint" style={{ textAlign: 'center' }}>
              Campus staff decide who fixes it. You can follow every status change in the app.
            </Txt>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Section({ title, error, children }: { title: string; error?: string | null; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: 2 }}>
        <Txt variant="heading" accessibilityRole="header">
          {title}
        </Txt>
        {error ? (
          <Txt variant="small" tone="danger">
            {error}
          </Txt>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  twoFields: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  similar: { borderRadius: radius.lg, padding: space.md, gap: space.md },
  similarHead: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  photoButtons: { flexDirection: 'row', gap: space.md },
  preview: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.lg },
});
