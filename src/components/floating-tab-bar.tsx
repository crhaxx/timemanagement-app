import { BlurView } from 'expo-blur';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SymbolIcon, type AppIconName } from '@/components/symbol-icon';
import { colors } from '@/constants/colors';
import { haptic } from '@/lib/haptics';

const TABS: Record<string, { label: string; icon: AppIconName }> = {
  home: { label: 'Přehled', icon: 'home' },
  tasks: { label: 'Úkoly', icon: 'tasks' },
  goals: { label: 'Cíle', icon: 'goal' },
  routines: { label: 'Rutiny', icon: 'routine' },
  journal: { label: 'Deník', icon: 'journal' },
};

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  emitter: {
    emit: (event: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }) => unknown;
  };
  navigateToTab: (routeKey: string) => void;
};

const BAR_HEIGHT = 64;
const INNER_PADDING = 6;
const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

/** Space scroll content needs at the bottom so nothing hides under the floating bar. */
export const TAB_BAR_CLEARANCE = BAR_HEIGHT + 44;

function GlassBackground() {
  if (LIQUID_GLASS) {
    return <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />;
  }
  return (
    <>
      <BlurView intensity={70} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.frost]} pointerEvents="none" />
    </>
  );
}

export function FloatingTabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((route) => TABS[route.name]);
  const [innerWidth, setInnerWidth] = useState(0);
  const itemWidth = routes.length > 0 ? innerWidth / routes.length : 0;

  const activeIndex = Math.max(
    0,
    routes.findIndex((route) => route.key === state.routes[state.index]?.key),
  );
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withSpring(activeIndex * itemWidth, { damping: 20, stiffness: 240, mass: 0.8 });
  }, [activeIndex, itemWidth, offset]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <GlassContainer spacing={12} style={styles.row}>
        <View style={[styles.shadow, styles.capsuleShadow]}>
          <View style={styles.capsule}>
            <GlassBackground />
            <View
              style={styles.items}
              onLayout={(event) => setInnerWidth(event.nativeEvent.layout.width)}>
              {itemWidth > 0 ? (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.indicator, { width: itemWidth }, indicatorStyle]}>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.98)', 'rgba(232, 242, 255, 0.92)']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.indicatorFill}
                  />
                </Animated.View>
              ) : null}
              {routes.map((route, index) => {
                const meta = TABS[route.name];
                const focused = index === activeIndex;
                const color = focused ? colors.accent : colors.secondary;

                return (
                  <Pressable
                    key={route.key}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: focused }}
                    accessibilityLabel={meta.label}
                    style={styles.item}
                    onPress={() => {
                      const event = emitter.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                      }) as { defaultPrevented?: boolean };
                      if (!focused && !event.defaultPrevented) {
                        haptic.tap();
                        navigateToTab(route.key);
                      }
                    }}
                    onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}>
                    <SymbolIcon name={meta.icon} color={color} size={22} weight={focused ? 'semibold' : 'regular'} />
                    <Text style={[styles.label, { color }]} numberOfLines={1}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </GlassContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 8 },
  }) as object,
  capsuleShadow: {
    flex: 1,
    borderRadius: BAR_HEIGHT / 2,
  },
  capsule: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderCurve: 'continuous',
    overflow: 'hidden',
    padding: INNER_PADDING,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.96)' : 'transparent',
  },
  frost: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  items: {
    flex: 1,
    flexDirection: 'row',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: (BAR_HEIGHT - INNER_PADDING * 2) / 2,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 122, 255, 0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#0A4DB8',
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      default: { elevation: 2 },
    }),
  },
  indicatorFill: {
    flex: 1,
    borderRadius: (BAR_HEIGHT - INNER_PADDING * 2) / 2,
    borderCurve: 'continuous',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
