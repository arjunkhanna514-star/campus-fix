import { router } from 'expo-router';
import React from 'react';

import { Button, EmptyState, Screen } from '@/src/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <EmptyState
        icon="map-marker-outline"
        title="This page does not exist"
        body="The link may be old, or the report may have been removed."
        action={<Button label="Go to all issues" onPress={() => router.replace('/')} style={{ marginTop: 12 }} />}
      />
    </Screen>
  );
}
