// One report in full: photo, details, upvote, and the status timeline.
// Admins also get the control that moves the report to its next status.

import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {Image, KeyboardAvoidingView, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';

import { api, ApiError, errorMessage, photoUrl } from '@/src/api';
import { useAuth } from '@/src/auth';
import { StatusChip, STATUS_LABEL } from '@/src/components/StatusChip';
import { StatusTimeline } from '@/src/components/StatusTimeline';
import { Button, Card, EmptyState, Field, Icon, IconButton, Loading, Notice, Screen, Txt } from '@/src/components/ui';
import { UpvoteButton, upvoteBlockReason } from '@/src/components/UpvoteButton';
import { dateTime, plural, timeAgo } from '@/src/format';
import { radius, space, useTheme } from '@/src/theme';
import { useToast } from '@/src/toast';
import { Issue, IssueDetail, NEXT_STATUS } from '@/src/types';

const REFRESH_MS = 10000;

const IMPACT_TEXT = {
  Low: 'Low impact: a nuisance, but people can work around it',
  Medium: 'Medium impact: it gets in the way of classes or study',
  High: 'High impact: unsafe, or it stops classes from running',
};

export default function IssueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { c } = useTheme();
  const { show } = useToast();

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setIssue(await api<IssueDetail>(`/issues/${id}`));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 400)) setMissing(true);
      else setError(errorMessage(err));
    }
  }, [id]);

  // Re-read while the screen is open, so the reporter sees a status change within seconds.
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [load])
  );

  if (!user) return <Redirect href="/login" />;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const header = (
    <View style={styles.header}>
      <IconButton name="arrow-left" label="Back" onPress={goBack} />
      <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
        {issue ? `Report #${issue.id}` : 'Report'}
      </Txt>
    </View>
  );

  if (missing) {
    return (
      <Screen edges={['top', 'bottom']}>
        {header}
        <EmptyState icon="map-marker-outline" title="This report does not exist" body="It may have been removed, or the link is wrong." action={<Button label="Go to all issues" small onPress={() => router.replace('/')} style={{ marginTop: space.sm }} />} />
      </Screen>
    );
  }

  if (!issue) {
    return (
      <Screen edges={['top', 'bottom']}>
        {header}
        {error ? (
          <View style={{ padding: space.lg, gap: space.md }}>
            <Notice text={error} />
            <Button label="Try again" variant="outline" onPress={load} />
          </View>
        ) : (
          <Loading />
        )}
      </Screen>
    );
  }

  const isAdmin = user.role === 'admin';
  const next = NEXT_STATUS[issue.status];
  const photo = photoUrl(issue.photo_url);
  const blocked = upvoteBlockReason(issue, user.role);

  const advance = async () => {
    if (!next) return;
    setSaving(true);
    try {
      await api(`/admin/issues/${issue.id}/status`, { method: 'PATCH', body: { status: next, note: note.trim() || undefined } });
      setNote('');
      await load();
      show({ kind: 'info', title: `Marked as ${STATUS_LABEL[next].toLowerCase()}`, body: 'The reporter has been rewarded and can see the update.' });
    } catch (err) {
      show({ kind: 'error', title: errorMessage(err) });
      load();
    } finally {
      setSaving(false);
    }
  };

  const pullToRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Keep the history we already have when the upvote button hands back a fresh issue.
  const onUpvoteChange = (updated: Issue) => setIssue((current) => (current ? { ...current, ...updated } : current));

  return (
    <Screen edges={['top', 'bottom']}>
      {header}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={pullToRefresh} tintColor={c.inkSoft} colors={[c.ink]} />}>
          {error ? <Notice text={error} /> : null}

          {photo ? (
            <Pressable onPress={() => setPhotoOpen(true)} accessibilityRole="imagebutton" accessibilityLabel="Photo of the problem. Open full screen.">
              <Image source={{ uri: photo }} style={[styles.photo, { backgroundColor: c.surfaceAlt }]} resizeMode="cover" />
            </Pressable>
          ) : null}

          <View style={{ gap: space.sm }}>
            <View style={styles.categoryLine}>
              <Icon name={issue.category.icon} size={17} color={c.inkSoft} />
              <Txt variant="small" tone="soft">
                {issue.category.name}
              </Txt>
            </View>
            <Txt variant="title" accessibilityRole="header">
              {issue.title}
            </Txt>
            <StatusChip status={issue.status} large />
          </View>

          <Card style={{ gap: space.md }}>
            <Fact icon="map-marker-outline" label="Where">
              <Txt variant="bodyBold">
                {issue.building}
                {issue.room ? `, room ${issue.room}` : ''}
              </Txt>
              {issue.location_note ? <Txt tone="soft">{issue.location_note}</Txt> : null}
            </Fact>
            <Fact icon="text-box-outline" label="What is wrong">
              <Txt>{issue.description}</Txt>
            </Fact>
            <Fact icon="alert-circle-outline" label="Impact">
              <Txt>{IMPACT_TEXT[issue.impact]}</Txt>
            </Fact>
            <Fact icon="account-outline" label="Reported by">
              <Txt>
                {issue.isMine ? 'You' : issue.reporter.name}, {timeAgo(issue.created_at)}
              </Txt>
              <Txt variant="small" tone="faint">
                {dateTime(issue.created_at)}
              </Txt>
            </Fact>
          </Card>

          <Card style={{ gap: space.md }}>
            <View style={styles.voteLine}>
              <Txt variant="display">{issue.upvotes}</Txt>
              <Txt tone="soft" style={{ flex: 1 }}>
                {issue.upvotes === 1 ? 'student is' : 'students are'} also affected by this
              </Txt>
            </View>
            {isAdmin || issue.isMine ? null : <UpvoteButton issue={issue} onChange={onUpvoteChange} variant="wide" />}
            {blocked && !isAdmin ? (
              <Txt variant="small" tone="faint">
                {blocked}
              </Txt>
            ) : !isAdmin ? (
              <Txt variant="small" tone="faint">
                {issue.hasUpvoted ? 'Tap again to withdraw your upvote.' : 'One upvote per student. It moves this report up the list.'}
              </Txt>
            ) : (
              <Txt variant="small" tone="faint">
                {plural(issue.upvotes, 'upvote')} from students. More upvotes means more people are affected.
              </Txt>
            )}
          </Card>

          <View style={{ gap: space.md }}>
            <Txt variant="heading" accessibilityRole="header">
              Progress
            </Txt>
            <Card>
              <StatusTimeline history={issue.history} current={issue.status} />
            </Card>
            {isAdmin ? null : (
              <Txt variant="small" tone="faint">
                Campus staff decide who fixes it and update the status here.
              </Txt>
            )}
          </View>

          {isAdmin ? (
            <Card style={{ gap: space.md, borderColor: c.ink, borderWidth: 1.5 }}>
              <View>
                <Txt variant="heading" accessibilityRole="header">
                  Update status
                </Txt>
                <Txt variant="small" tone="soft">
                  {next ? `Status now: ${STATUS_LABEL[issue.status]}. Next step: ${STATUS_LABEL[next]}. Steps cannot be skipped.` : 'This report is resolved. Nothing more to do.'}
                </Txt>
              </View>
              {next ? (
                <>
                  <Field
                    label="Note for students (optional)"
                    value={note}
                    onChangeText={setNote}
                    placeholder="For example: technician booked for Thursday"
                    maxLength={200}
                    multiline
                    style={{ minHeight: 64 }}
                  />
                  <Button label={`Mark as ${STATUS_LABEL[next].toLowerCase()}`} icon="arrow-right" onPress={advance} loading={saving} />
                </>
              ) : null}
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={photoOpen} transparent animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
        <View style={styles.viewer}>
          {photo ? <Image source={{ uri: photo }} style={{ flex: 1, width: '100%' }} resizeMode="contain" /> : null}
          <View style={styles.viewerClose}>
            <IconButton name="close" label="Close photo" color="#FFFFFF" onPress={() => setPhotoOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Fact({ icon, label, children }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={20} color={c.inkSoft} />
      <View style={{ flex: 1, gap: 1 }}>
        <Txt variant="micro" tone="faint">
          {label}
        </Txt>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs, minHeight: 52 },
  content: { padding: space.lg, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.lg },
  photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.lg },
  categoryLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fact: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  voteLine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  viewerClose: { position: 'absolute', top: 40, right: 12 },
});
