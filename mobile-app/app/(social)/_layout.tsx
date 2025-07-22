import { Stack } from 'expo-router';

export default function SocialLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="chat/[userId]" />
      <Stack.Screen name="group/[groupId]" />
      <Stack.Screen name="event-chat/[eventId]" />
      <Stack.Screen name="new-message" />
      <Stack.Screen name="new-group" />
    </Stack>
  );
}