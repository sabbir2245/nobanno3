import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '@/constants/theme';

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.darkGreen,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { backgroundColor: Colors.white, borderTopColor: Colors.border, height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="cart" options={{
        title: 'Cart',
        tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
      }} />
      <Tabs.Screen name="orders" options={{
        title: 'Orders',
        tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
      }} />
      <Tabs.Screen name="account" options={{
        title: 'My Account',
        tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
      }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
    </Tabs>
  );
}
