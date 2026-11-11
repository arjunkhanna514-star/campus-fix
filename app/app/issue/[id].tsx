// One report in full: photos, details, upvote, status timeline and comments.
// Admins also get the control that moves the report to its next status,
// and can attach a photo of the fix when they mark it resolved.

import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { api, ApiError, errorMessage, photoUrl } from '@/src/api';
import { useAuth } from '@/src/auth';
import { StatusChip, STATUS_LABEL } from '@/src/components/StatusChip';
import { StatusTimeline } from '@/src/components/StatusTimeline';
import { Avatar, Button, Card, EmptyState, Field, Icon, IconButton, Loading, Notice, Screen, Txt } from '@/src/components/ui';
import { UpvoteButton, upvoteBlockReason } from '@/src/components/UpvoteButton';
import { blockByName } from '@/src/navigation';
import { dateTime, initials, plural, timeAgo } from '@/src/format';
import { appendPhoto, Photo, pickPhoto } from '@/src/photo';
import { fonts, radius, space, useTheme } from '@/src/theme';
import { useToast } from '@/src/toast';
import { Comment, Issue, IssueDetail, NEXT_STATUS } from '@/src/types';

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
  const [viewing, setViewing] = useState<string | null>(null); // photo shown full screen
  const [note, setNote] = useState('');
  const [fixPhoto, setFixPhoto] = useState<Photo | null>(null);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

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
        <EmptyState icon="map-marker-outline" title="This report does not exist" body="It may have been removed, or the link is wrong." action={<Button label="Go to all issues" small onPress={() => router.replace('/issues')} style={{ marginTop: space.sm }} />} />
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
  const before = photoUrl(issue.photo_url);
  const after = photoUrl(issue.history.find((entry) => entry.new_status === 'Resolved')?.photo_path ?? null);
  const blocked = upvoteBlockReason(issue, user.role);

  const advance = async () => {
    if (!next) return;
    setSaving(true);
    try {
      if (fixPhoto && next === 'Resolved') {
        // With a photo the change is sent as a form, like a new report.
        const form = new FormData();
        form.append('status', next);
        if (note.trim()) form.append('note', note.trim());
        await appendPhoto(form, fixPhoto);
        await api(`/admin/issues/${issue.id}/status`, { method: 'PATCH', form });
      } else {
        await api(`/admin/issues/${issue.id}/status`, { method: 'PATCH', body: { status: next, note: note.trim() || undefined } });
      }
      setNote('');
      setFixPhoto(null);
      await load();
      show({ kind: 'info', title: `Marked as ${STATUS_LABEL[next].toLowerCase()}`, body: 'The reporter has been rewarded and can see the update.' });
    } catch (err) {
      show({ kind: 'error', title: errorMessage(err) });
      load();
    } finally {
      setSaving(false);
    }
  };

  const chooseFixPhoto = async (source: 'camera' | 'library') => {
    const result = await pickPhoto(source);
    if (!result) return;
    if ('error' in result) show({ kind: 'error', title: result.error });
    else setFixPhoto(result.photo);
  };

  const postComment = async () => {
    const text = comment.trim();
    if (text.length < 2) {
      setCommentError('Write at least 2 characters.');
      return;
    }
    setPosting(true);
    setCommentError(null);
    try {
      const result = await api<{ comments: Comment[] }>(`/issues/${issue.id}/comments`, { method: 'POST', body: { body: text } });
      setComment('');
      setIssue((current) => (current ? { ...current, comments: result.comments } : current));
    } catch (err) {
      setCommentError(errorMessage(err));
    } finally {
      setPosting(false);
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

          {before && after ? (
            // Reported with a photo and fixed with a photo: show them side by side.
            <View style={styles.pair}>
              <PhotoTile uri={before} label="Before" onOpen={setViewing} />
              <PhotoTile uri={after} label="After the fix" onOpen={setViewing} />
            </View>
          ) : before || after ? (
            <PhotoTile uri={(before || after) as string} label={before ? undefined : 'After the fix'} onOpen={setViewing} wide />
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
              {blockByName(issue.building) ? (
                <Button
                  label="Show on map"
                  icon="map-marker-radius-outline"
                  variant="outline"
                  small
                  onPress={() => router.navigate({ pathname: '/map', params: { block: blockByName(issue.building)!.id } })}
                  style={{ alignSelf: 'flex-start', marginTop: space.sm }}
                />
              ) : null}
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

          <View style={{ gap: space.md }}>
            <Txt variant="heading" accessibilityRole="header">
              Comments{issue.comments.length ? ` (${issue.comments.length})` : ''}
            </Txt>
            <Card style={{ gap: space.lg }}>
              {issue.comments.length === 0 ? (
                <Txt tone="soft">No comments yet. Add anything that helps staff find or fix it, like when it happens or what you already tried.</Txt>
              ) : (
                issue.comments.map((item) => <CommentRow key={item.id} item={item} />)
              )}
              <View style={{ gap: space.sm }}>
                <Field
                  label={isAdmin ? 'Reply as staff' : 'Add a comment'}
                  value={comment}
                  onChangeText={(text) => {
                    setComment(text);
                    if (commentError) setCommentError(null);
                  }}
                  placeholder={isAdmin ? 'For example: parts ordered, fixing on Friday' : 'For example: it happens every morning'}
                  multiline
                  maxLength={500}
                  error={commentError}
                  style={{ minHeight: 64 }}
                />
                <Button label="Post comment" icon="send" variant="outline" small onPress={postComment} loading={posting} style={{ alignSelf: 'flex-start' }} />
              </View>
            </Card>
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
                  {next === 'Resolved' ? (
                    fixPhoto ? (
                      <View style={{ gap: space.sm }}>
                        <Txt variant="small" tone="soft">
                          Photo of the fix
                        </Txt>
                        <Image source={{ uri: fixPhoto.uri }} style={[styles.photo, { backgroundColor: c.surfaceAlt }]} resizeMode="cover" accessibilityLabel="The photo of the fix you attached" />
                        <Button label="Remove photo" icon="trash-can-outline" variant="quiet" small onPress={() => setFixPhoto(null)} style={{ alignSelf: 'flex-start' }} />
                      </View>
                    ) : (
                      <View style={{ gap: space.sm }}>
                        <Txt variant="small" tone="soft">
                          Add a photo of the fix (optional). Students see it next to their original photo.
                        </Txt>
                        <View style={styles.photoButtons}>
                          {Platform.OS === 'web' ? null : <Button label="Take a photo" icon="camera-outline" variant="outline" small onPress={() => chooseFixPhoto('camera')} style={{ flex: 1 }} />}
                          <Button label="Choose a photo" icon="image-outline" variant="outline" small onPress={() => chooseFixPhoto('library')} style={{ flex: 1 }} />
                        </View>
                      </View>
                    )
                  ) : null}
                  <Button label={`Mark as ${STATUS_LABEL[next].toLowerCase()}`} icon="arrow-right" onPress={advance} loading={saving} />
                </>
              ) : null}
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={viewing !== null} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={styles.viewer}>
          {viewing ? <Image source={{ uri: viewing }} style={{ flex: 1, width: '100%' }} resizeMode="contain" /> : null}
          <View style={styles.viewerClose}>
            <IconButton name="close" label="Close photo" color="#FFFFFF" onPress={() => setViewing(null)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function PhotoTile({ uri, label, onOpen, wide }: { uri: string; label?: string; onOpen: (uri: string) => void; wide?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onOpen(uri)}
      accessibilityRole="imagebutton"
      accessibilityLabel={`${label ?? 'Photo of the problem'}. Open full screen.`}
      style={wide ? { gap: 6 } : { flex: 1, gap: 6 }}>
      <Image source={{ uri }} style={[wide ? styles.photo : styles.half, { backgroundColor: c.surfaceAlt }]} resizeMode="cover" />
      {label ? (
        <Txt variant="small" tone="soft">
          {label}
        </Txt>
      ) : null}
    </Pressable>
  );
}

function CommentRow({ item }: { item: Comment }) {
  const staff = item.user.role === 'admin';
  return (
    <View style={styles.comment}>
      <Avatar text={staff ? 'CF' : initials(item.user.name)} size={34} highlight={staff} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="small">
          <Txt variant="small" style={{ fontFamily: fonts.bodyBold }}>
            {item.isMine ? 'You' : item.user.name}
          </Txt>
          {staff ? '  Staff' : ''}
          <Txt variant="micro" tone="faint">{`  ${timeAgo(item.created_at)}`}</Txt>
        </Txt>
        <Txt>{item.body}</Txt>
      </View>
    </View>
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
  pair: { flexDirection: 'row', gap: space.md },
  half: { width: '100%', aspectRatio: 1, borderRadius: radius.md },
  photoButtons: { flexDirection: 'row', gap: space.md },
  comment: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  categoryLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fact: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  voteLine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  viewerClose: { position: 'absolute', top: 40, right: 12 },
});
