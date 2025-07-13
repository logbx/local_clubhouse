import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class StorageService {
  private async setSecure(key: string, value: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }

  private async getSecure(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  }

  private async removeSecure(key: string) {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }

  async setTokens(accessToken: string, refreshToken: string) {
    await Promise.all([
      this.setSecure(ACCESS_TOKEN_KEY, accessToken),
      this.setSecure(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    return await this.getSecure(ACCESS_TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    return await this.getSecure(REFRESH_TOKEN_KEY);
  }

  async clearTokens() {
    await Promise.all([
      this.removeSecure(ACCESS_TOKEN_KEY),
      this.removeSecure(REFRESH_TOKEN_KEY),
    ]);
  }

  async set(key: string, value: any) {
    const stringValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    if (!value) return null;
    return JSON.parse(value);
  }

  async remove(key: string) {
    await AsyncStorage.removeItem(key);
  }
}

export const storage = new StorageService();