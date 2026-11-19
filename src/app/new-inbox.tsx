import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ErrorBanner, PrimaryButton, SheetHeader, ui } from '@/components/ui';
import { colors } from '@/constants/colors';
import { INBOX_COLUMNS } from '@/lib/data';
import { haptic } from '@/lib/haptics';
import { supabase, supabaseConfigError } from '@/lib/supabase';

export default function NewInboxSheet() {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(supabaseConfigError);

  async function save() {
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Napiš nápad, ať nezůstane jen v hlavě.');
      return;
    }
    if (!supabase) {
      setError(supabaseConfigError);
      return;
    }

    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase
      .from('inbox_items')
      .insert({ content: trimmed, kind: 'idea', status: 'new' })
      .select(INBOX_COLUMNS)
      .single();
    setSaving(false);

    if (insertError) {
      haptic.error();
      setError(insertError.message);
      return;
    }

    haptic.success();
    router.back();
  }

  return (
    <View style={ui.screen}>
      <SheetHeader
        title="Nápad"
        saveLabel="Uložit"
        onCancel={() => router.back()}
        onSave={() => {
          void save();
        }}
        canSave={content.trim().length > 0}
        saving={saving}
      />
      <ScrollView
        contentContainerStyle={ui.sheetContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Nápad: …"
          placeholderTextColor={colors.muted}
          style={styles.editor}
          multiline
          autoFocus
          textAlignVertical="top"
        />
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <PrimaryButton
          title="Do schránky"
          onPress={() => {
            void save();
          }}
          disabled={content.trim().length === 0}
          loading={saving}
          color={colors.inbox}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 28,
    minHeight: 160,
    paddingHorizontal: 4,
  },
});
