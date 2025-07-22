# Getting SHA-1 Fingerprint for Android

## For Development (Debug Certificate):
```bash
# On macOS/Linux:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# On Windows:
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## For Production (Release Certificate):
```bash
# Generate a new keystore (if you don't have one):
keytool -genkey -v -keystore local-clubhouse-release-key.keystore -alias local-clubhouse -keyalg RSA -keysize 2048 -validity 10000

# Get SHA-1 from your release keystore:
keytool -list -v -keystore local-clubhouse-release-key.keystore -alias local-clubhouse
```

## For Expo Development Build:
```bash
# Get the Expo development certificate fingerprint:
expo credentials:manager -p android
```

Look for the SHA1 fingerprint in the output and copy it to Firebase Console.