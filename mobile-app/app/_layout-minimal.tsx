import { Stack } from 'expo-router';

export default function MinimalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="test-minimal" />
    </Stack>
  );
}