import React from 'react';
import { View, Text } from 'react-native';

export default function TestMinimal() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 24, color: 'black' }}>App Works!</Text>
    </View>
  );
}