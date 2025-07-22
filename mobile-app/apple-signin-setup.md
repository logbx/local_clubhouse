# Apple Sign-In Setup Guide for Local Clubhouse

## Prerequisites:
- Apple Developer Account ($99/year)
- Access to Apple Developer Console
- Your app's Bundle ID: `com.localclubhouse.app`

## Step 1: Enable Sign In with Apple Capability

1. Go to [Apple Developer Console](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → Find your app (`com.localclubhouse.app`)
4. Enable **Sign In with Apple** capability
5. Click **Save**

## Step 2: Create Sign In with Apple Key

1. In Apple Developer Console, go to **Keys**
2. Click the **+** button to create a new key
3. Name it: "Local Clubhouse Sign In"
4. Enable **Sign In with Apple**
5. Click **Configure** next to Sign In with Apple
6. Select your app's Bundle ID (`com.localclubhouse.app`)
7. Click **Save** → **Continue** → **Register**
8. **Download the key file** (you can only download it once!)
9. Note the **Key ID** shown on the screen

## Step 3: Configure in Firebase Console

1. In Firebase Console → Authentication → Sign-in method → Apple
2. Enable Apple Sign-In
3. Fill in:
   - **Team ID**: Found in Apple Developer Console → Membership
   - **Key ID**: From Step 2 above
   - **Private Key**: Contents of the .p8 file you downloaded

## Step 4: Update Expo Configuration

In your `app.json`, ensure you have:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.localclubhouse.app",
      "usesAppleSignIn": true
    }
  }
}
```

## Step 5: Configure for Web (Optional)

If you want Apple Sign-In on web:

1. Create a **Service ID** in Apple Developer Console:
   - Go to Identifiers → Click **+**
   - Select **Services IDs** → Continue
   - Identifier: `com.localclubhouse.app.signin`
   - Description: "Local Clubhouse Sign In"
   - Enable **Sign In with Apple**

2. Configure the Service ID:
   - Click **Configure** next to Sign In with Apple
   - Primary App ID: Select your app
   - Website URLs:
     - Domain: `local-clubhouse.firebaseapp.com`
     - Return URL: `https://local-clubhouse.firebaseapp.com/__/auth/handler`
   - Click **Save**

3. Add the Service ID to Firebase Console

## Step 6: Domain Verification (for Web)

1. Download the verification file from Apple
2. Upload it to: `https://local-clubhouse.firebaseapp.com/.well-known/apple-developer-domain-association`
3. Apple will verify domain ownership

## Testing Notes:

- **Expo Go**: Apple Sign-In is NOT available
- **Development Build**: Required for testing
- **iOS Simulator**: Works with development build
- **Physical Device**: Best for production testing

## Common Issues:

1. **"Sign in with Apple isn't available"**: Need development build, not Expo Go
2. **"Invalid client"**: Check Team ID and Key ID in Firebase
3. **"Domain not verified"**: Complete domain verification for web support