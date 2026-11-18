import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SFSymbol, type SymbolWeight } from 'expo-symbols';

import { colors } from '@/constants/colors';

const ICONS = {
  home: { ios: 'house.fill', android: 'home', ion: 'home' },
  journal: { ios: 'book.fill', android: 'menu_book', ion: 'book' },
  goal: { ios: 'flag.fill', android: 'flag', ion: 'flag' },
  tasks: { ios: 'checklist', android: 'checklist', ion: 'list' },
  routine: { ios: 'arrow.triangle.2.circlepath', android: 'autorenew', ion: 'sync' },
  add: { ios: 'plus', android: 'add', ion: 'add' },
  arrowUp: { ios: 'arrow.up', android: 'arrow_upward', ion: 'arrow-up' },
  addCircle: { ios: 'plus.circle.fill', android: 'add_circle', ion: 'add-circle' },
  list: { ios: 'list.bullet', android: 'format_list_bulleted', ion: 'list' },
  time: { ios: 'clock.fill', android: 'schedule', ion: 'time' },
  flame: { ios: 'flame.fill', android: 'local_fire_department', ion: 'flame' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', ion: 'checkmark-circle' },
  checkmark: { ios: 'checkmark', android: 'check', ion: 'checkmark' },
  pencil: { ios: 'square.and.pencil', android: 'edit', ion: 'create-outline' },
  calendar: { ios: 'calendar', android: 'calendar_today', ion: 'calendar' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', ion: 'sparkles' },
  close: { ios: 'xmark', android: 'close', ion: 'close' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', ion: 'chevron-forward' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', ion: 'chevron-back' },
  trash: { ios: 'trash', android: 'delete', ion: 'trash-outline' },
  bell: { ios: 'bell.fill', android: 'notifications', ion: 'notifications' },
  settings: { ios: 'gearshape.fill', android: 'settings', ion: 'settings-outline' },
} as const;

export type AppIconName = keyof typeof ICONS;

export function SymbolIcon({
  name,
  color = colors.accent,
  size = 22,
  weight = 'medium',
}: {
  name: AppIconName;
  color?: string;
  size?: number;
  weight?: SymbolWeight;
}) {
  const icon = ICONS[name];

  return (
    <SymbolView
      name={{ ios: icon.ios as SFSymbol, android: icon.android, web: icon.android }}
      tintColor={color}
      size={size}
      weight={weight}
      fallback={<Ionicons name={icon.ion} size={size} color={color} />}
    />
  );
}
