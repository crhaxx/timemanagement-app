import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { SymbolIcon, type AppIconName } from '@/components/symbol-icon';
import { IconBadge, PressableScale } from '@/components/ui';
import { colors } from '@/constants/colors';

type Option = {
  icon: AppIconName;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function AddSheet({
  visible,
  onClose,
  options,
}: {
  visible: boolean;
  onClose: () => void;
  options: Option[];
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {(dismiss) => (
        <>
          <Text style={styles.heading}>Přidat</Text>
          <View style={styles.list}>
            {options.map((option) => (
              <PressableScale
                key={option.title}
                accessibilityRole="button"
                pressedScale={0.98}
                onPress={() => dismiss(() => {
                  onClose();
                  option.onPress();
                })}
                style={styles.option}>
                <IconBadge name={option.icon} color={option.color} size={44} />
                <View style={styles.texts}>
                  <Text style={styles.title}>{option.title}</Text>
                  <Text style={styles.subtitle}>{option.subtitle}</Text>
                </View>
                <SymbolIcon name="chevronRight" color={colors.tertiary} size={14} weight="semibold" />
              </PressableScale>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => dismiss()} style={styles.cancel}>
            <Text style={styles.cancelText}>Zavřít</Text>
          </Pressable>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: colors.background,
  },
  texts: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.secondary,
    fontSize: 14,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    color: colors.secondary,
    fontSize: 16,
  },
});
