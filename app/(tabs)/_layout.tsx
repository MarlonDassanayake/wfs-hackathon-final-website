import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const NAV_BG     = '#080C10'; // near-black — darker than BG (#0D1117)
const NAV_BORDER = '#1C2128';
const GREEN      = '#00E676';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GREEN,
        tabBarInactiveTintColor: '#4A5568',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: NAV_BG,
          borderTopColor: NAV_BORDER,
          borderTopWidth: 1,
          ...Platform.select({
            ios: {
              position: 'absolute',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
            },
            android: {
              elevation: 16,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
          marginBottom: 2,
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="newspaper.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio Hedge',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="briefcase.fill" color={color} />,
          tabBarLabelStyle: {
            fontSize: 8,
            fontWeight: '700',
            letterSpacing: 0.3,
            marginBottom: 2,
          },
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="info.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
