import * as Haptics from 'expo-haptics';

function run(task: Promise<void>) {
  task.catch(() => {});
}

export const haptic = {
  tap: () => run(Haptics.selectionAsync()),
  light: () => run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
