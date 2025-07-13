import { Stack } from 'expo-router';

export default function ClubsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="[username]" 
        options={{ 
          headerBackTitle: 'Back',
          presentation: 'modal' 
        }} 
      />
    </Stack>
  );
}