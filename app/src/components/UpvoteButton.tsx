// The upvote control. It updates the number straight away (so it feels
// instant), sends the request, and puts the old number back if the server says no.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth';
import { useSession } from '../session';
import { fonts, radius, useTheme } from '../theme';
import { useToast } from '../toast';
import type { Issue } from '../types';
import { Icon } from './ui';

type Props = {
  issue: Issue;
  onChange: (issue: Issue) => void;
  variant?: 'stub' | 'wide';
};

// Why the button might be switched off, in words for the user.
export function upvoteBlockReason(issue: Issue, role: string | undefined): string | null {
  if (role === 'admin') return 'Only students upvote reports.';
  if (issue.isMine) return "This is your report. Other students' upvotes show how many people it affects.";
  if (issue.status === 'Resolved' && !issue.hasUpvoted) return 'This issue is already resolved.';
  return null;
}

export function useUpvote(issue: Issue, onChange: (issue: Issue) => void) {
  const { user } = useAuth();
  const { refreshMe } = useSession();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const blocked = upvoteBlockReason(issue, user?.role);

  const toggle = async () => {
    if (busy) return;
    if (blocked) {
      show({ kind: 'info', title: blocked, icon: 'information-outline' });
      return;
    }
    const before = issue;
    const voting = !issue.hasUpvoted;
    onChange({ ...issue, hasUpvoted: voting, upvotes: issue.upvotes + (voting ? 1 : -1) });
    setBusy(true);
    try {
      const result = await api<{ issue: Issue }>(`/issues/${issue.id}/upvote`, { method: voting ? 'POST' : 'DELETE' });
      onChange(result.issue);
      refreshMe(); // picks up the +1 and shows the reward banner
    } catch (err) {
      onChange(before);
      show({ kind: 'error', title: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return { toggle, busy, blocked };
}

export function UpvoteButton({ issue, onChange, variant = 'stub' }: Props) {
  const { c } = useTheme();
  const { toggle, blocked } = useUpvote(issue, onChange);
  const voted = issue.hasUpvoted;
  const dimmed = !!blocked && !voted;

  const label = voted
    ? `Upvoted. ${issue.upvotes} ${issue.upvotes === 1 ? 'upvote' : 'upvotes'}. Tap to withdraw.`
    : `Upvote. ${issue.upvotes} ${issue.upvotes === 1 ? 'upvote' : 'upvotes'} so far.`;

  if (variant === 'wide') {
    return (
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: voted, disabled: dimmed }}
        style={({ pressed }) => [
          styles.wide,
          { backgroundColor: voted ? c.tag : pressed ? c.surfaceAlt : c.surface, borderColor: voted ? c.tag : c.ink, opacity: dimmed ? 0.55 : 1 },
        ]}>
        <Icon name={voted ? 'arrow-up-bold' : 'arrow-up-bold-outline'} size={22} color={voted ? c.tagInk : c.ink} />
        <Text style={[styles.wideText, { color: voted ? c.tagInk : c.ink }]}>{voted ? 'You upvoted this' : "I'm affected too"}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: voted, disabled: dimmed }}
      hitSlop={4}
      style={({ pressed }) => [styles.stub, { backgroundColor: voted ? c.tag : pressed ? c.surfaceAlt : 'transparent' }]}>
      <View style={{ opacity: dimmed ? 0.45 : 1, alignItems: 'center' }}>
        <Icon name={voted ? 'arrow-up-bold' : 'arrow-up-bold-outline'} size={22} color={voted ? c.tagInk : c.ink} />
        <Text style={[styles.count, { color: voted ? c.tagInk : c.ink }]}>{issue.upvotes}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stub: { width: 60, alignSelf: 'stretch', minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: fonts.headBold, fontSize: 19, lineHeight: 22, marginTop: 1 },
  wide: { minHeight: 50, borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  wideText: { fontFamily: fonts.bodyBold, fontSize: 16 },
});
