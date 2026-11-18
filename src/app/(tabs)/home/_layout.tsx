import { IosTabStack } from '@/components/ios-tab-stack';

export default function HomeLayout() {
  // The screen draws its own header (date above the title), like the App Store "Today" tab.
  return <IosTabStack title="Přehled" headerShown={false} />;
}
