import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type SheetAction = {
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

/** Native action sheet on iOS, plain alert elsewhere. */
export function showActions(title: string, actions: SheetAction[]) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((action) => action.label), 'Zrušit'],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex: actions.findIndex((action) => action.destructive),
      },
      (index) => actions[index]?.onPress(),
    );
    return;
  }

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
