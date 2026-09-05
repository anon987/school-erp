import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/core/theme/ThemeProvider";

/**
 * A lightweight tab switcher (segmented control), the mobile equivalent of
 * apps/web/src/components/Tabs.tsx -- deliberately NOT @react-navigation/material-top-tabs: that
 * pulls in react-native-tab-view + pager view for a feature this screen (one student's four
 * detail tabs) doesn't need the swipe-gesture/lazy-mount machinery for. All tab content mounts
 * together; the caller decides whether a given tab's content is fetched only once visible.
 */
export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

export function SegmentedTabs({ tabs, initialId }: { tabs: TabDef[]; initialId?: string }) {
  const { colors } = useTheme();
  const [activeId, setActiveId] = useState(initialId ?? tabs[0]?.id ?? "");
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <View style={{ gap: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveId(tab.id)}
              style={[styles.tabButton, { backgroundColor: isActive ? colors.primary : colors.secondary }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={{ color: isActive ? colors.primaryForeground : colors.secondaryForeground, fontWeight: "600", fontSize: 13 }}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View>{active?.content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
