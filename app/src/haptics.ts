// Small vibrations that make the interface feel physical. Strength matches
// the action: a light tick for selecting, a firmer tap for changing tabs,
// and a pattern for success or errors. Browsers have no vibration, so on
// web these do nothing.

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS === 'ios' || Platform.OS === 'android';

function run(action: () => Promise<void>) {
  if (!on) return;
  action().catch(() => {
    // A phone without a vibration motor should never break the app.
  });
}

export const haptics = {
  /** Choosing a chip, a segment or a list item. */
  select: () => run(() => Haptics.selectionAsync()),
  /** Pressing a normal button. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Changing tab, upvoting, opening a sheet. */
  impact: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Points, badges, a finished action. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Something was refused. */
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
