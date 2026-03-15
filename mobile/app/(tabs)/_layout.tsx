import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../locales';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color }) => <Ionicons size={24} name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('navigation.issues'),
          tabBarIcon: ({ color }) => <Ionicons size={24} name="alert-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: t('navigation.reservations'),
          tabBarIcon: ({ color }) => <Ionicons size={24} name="calendar-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t('navigation.payments'),
          tabBarIcon: ({ color }) => <Ionicons size={24} name="wallet-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('navigation.notifications'),
          tabBarIcon: ({ color }) => <Ionicons size={24} name="notifications-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
