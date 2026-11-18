import { Alert } from 'react-native';

export type SheetAction = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

/**
 * Action picker via Alert so it works above Expo Router modals.
 * ActionSheetIOS often fails to appear from a presented sheet.
 */
export function showActions(title: string, actions: SheetAction[]) {
  Alert.alert(title, undefined, [
    ...actions.map((action) => ({
      text: action.label,
      style: action.destructive ? ('destructive' as const) : ('default' as const),
      onPress: action.onPress,
    })),
    { text: 'Zrušit', style: 'cancel' as const },
  ]);
}

export function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Nechat', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
