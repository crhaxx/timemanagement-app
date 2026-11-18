import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { JournalReminderSettings } from '@/components/journal-reminder-settings';
import { SheetHeader, ui } from '@/components/ui';

export default function SettingsScreen() {
  return (
    <View style={ui.screen}>
      <SheetHeader title="Nastavení" cancelLabel="Hotovo" onCancel={() => router.back()} />
      <ScrollView
        contentContainerStyle={[ui.sheetContent, styles.content]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled">
        <JournalReminderSettings />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
  },
});
