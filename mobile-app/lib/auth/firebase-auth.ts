import { 
  signInWithPhoneNumber, 
  PhoneAuthProvider,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  User as FirebaseUser,
  ConfirmationResult,
  ApplicationVerifier,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification as firebaseSendEmailVerification,
  reload
} from 'firebase/auth';

// Add global type declaration for test phone number
declare global {
  var __TEST_PHONE_NUMBER: string | undefined;
}
// Import Google Sign-In conditionally to handle Expo Go limitations
let GoogleSignin: any;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (error) {
  console.warn('Google Sign-In not available in Expo Go');
  GoogleSignin = null;
}
// Import Apple Authentication conditionally
let AppleAuthentication: any;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch (error) {
  console.warn('Apple Authentication not available');
  AppleAuthentication = null;
}
import { Platform } from 'react-native';
import { auth, isFirebaseConfigured } from '../firebase-config';

// Types
export interface PhoneAuthResult {
  verificationId: string;
  confirmationResult?: ConfirmationResult;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

class FirebaseAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private isAvailable: boolean = false;

  constructor() {
    this.isAvailable = isFirebaseConfigured() && !!auth;
    if (this.isAvailable) {
      this.initializeGoogleSignIn();
    } else {
      console.warn('Firebase not properly configured. Authentication features may be limited.');
    }
  }

  private checkAvailability(): void {
    if (!this.isAvailable) {
      throw new Error('Firebase is not properly configured. Please set up your Firebase project.');
    }
  }

  private initializeGoogleSignIn() {
    if (GoogleSignin) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      });
    }
  }

  // Initialize reCAPTCHA for web
  private initializeRecaptcha(): ApplicationVerifier {
    if (Platform.OS === 'web' && !this.recaptchaVerifier) {
      this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });
    }
    return this.recaptchaVerifier as ApplicationVerifier;
  }

  // Phone Authentication
  async sendPhoneVerification(phoneNumber: string): Promise<PhoneAuthResult> {
    this.checkAvailability();
    try {
      if (Platform.OS === 'web') {
        const appVerifier = this.initializeRecaptcha();
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        return {
          verificationId: confirmationResult.verificationId,
          confirmationResult
        };
      } else {
        // For mobile platforms (React Native), we need a different approach
        // Firebase test phone numbers that work in development
        const testPhoneNumbers = ['+16505553434', '+15555555555'];
        
        if (__DEV__ && process.env.EXPO_PUBLIC_DEVELOPMENT === 'true') {
          // Check if this is a Firebase test phone number
          if (testPhoneNumbers.includes(phoneNumber)) {
            console.log('Using Firebase test phone number:', phoneNumber);
            try {
              // Try real Firebase auth for test numbers
              const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
              return {
                verificationId: confirmationResult.verificationId,
                confirmationResult
              };
            } catch (error) {
              console.warn('Firebase test number failed, falling back to mock mode:', error);
              // Fallback to mock if Firebase test fails
              const mockVerificationId = 'firebase-test-' + phoneNumber.replace(/[^0-9]/g, '');
              global.__TEST_PHONE_NUMBER = phoneNumber;
              return { verificationId: mockVerificationId };
            }
          } else {
            // In development with non-test numbers, use mock verification
            console.warn('Phone auth in development mode - using mock verification');
            
            const mockVerificationId = 'test-verification-id-' + Date.now();
            global.__TEST_PHONE_NUMBER = phoneNumber;
            
            return {
              verificationId: mockVerificationId
            };
          }
        } else {
          // In production builds, use actual Firebase phone auth
          try {
            const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
            return {
              verificationId: confirmationResult.verificationId,
              confirmationResult
            };
          } catch (error) {
            console.error('Production phone auth failed:', error);
            throw new Error('Phone authentication failed. Please check your network connection and try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error sending phone verification:', error);
      throw this.handleAuthError(error);
    }
  }

  async confirmPhoneVerification(verificationId: string, verificationCode: string): Promise<AuthUser> {
    this.checkAvailability();
    try {
      // Check if we're in development mode with test verification
      if ((verificationId.startsWith('test-verification-id-') || verificationId.startsWith('firebase-test-')) && __DEV__) {
        // For Firebase test phone numbers, use specific codes
        if (verificationId.startsWith('firebase-test-')) {
          const phoneNumber = global.__TEST_PHONE_NUMBER;
          let expectedCode = '123456'; // default
          
          if (phoneNumber === '+16505553434') expectedCode = '654321';
          if (phoneNumber === '+15555555555') expectedCode = '123456';
          
          if (verificationCode === expectedCode) {
            const mockUser: AuthUser = {
              uid: 'test-uid-' + Date.now(),
              email: null,
              phoneNumber: phoneNumber || '+1234567890',
              displayName: null,
              photoURL: null,
              emailVerified: false
            };
            console.log('Firebase test phone authentication successful:', mockUser);
            return mockUser;
          } else {
            throw new Error(`Invalid code. For ${phoneNumber}, use: ${expectedCode}`);
          }
        } else {
          // Regular test mode - accept any 6-digit code
          if (verificationCode.length === 6 && /^\d{6}$/.test(verificationCode)) {
            const mockUser: AuthUser = {
              uid: 'test-uid-' + Date.now(),
              email: null,
              phoneNumber: global.__TEST_PHONE_NUMBER || '+1234567890',
              displayName: null,
              photoURL: null,
              emailVerified: false
            };
            console.log('Mock phone authentication successful:', mockUser);
            return mockUser;
          } else {
            throw new Error('Invalid verification code format. Please enter a 6-digit code.');
          }
        }
      } else {
        // Production mode - use actual Firebase credentials
        const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
        const result = await signInWithCredential(auth, credential);
        return this.formatUser(result.user);
      }
    } catch (error) {
      console.error('Error confirming phone verification:', error);
      throw this.handleAuthError(error);
    }
  }

  // Google Sign-In
  async signInWithGoogle(): Promise<AuthUser> {
    this.checkAvailability();
    try {
      // Check if Google Sign-In is available
      if (!GoogleSignin) {
        throw new Error('Google Sign-In requires a development build. It is not available in Expo Go.');
      }
      
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const { idToken } = await GoogleSignin.signIn();
      
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, googleCredential);
      
      return this.formatUser(result.user);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw this.handleAuthError(error);
    }
  }

  // Email/Password Sign-In
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    this.checkAvailability();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return this.formatUser(result.user);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw this.handleAuthError(error);
    }
  }

  // Email/Password Registration
  async registerWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser> {
    this.checkAvailability();
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name if provided
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName });
      }
      
      return this.formatUser(result.user);
    } catch (error) {
      console.error('Error registering with email:', error);
      throw this.handleAuthError(error);
    }
  }

  // Apple Sign-In (iOS only)
  async signInWithApple(): Promise<AuthUser> {
    this.checkAvailability();
    try {
      if (Platform.OS !== 'ios') {
        throw new Error('Apple Sign-In is only available on iOS');
      }

      if (!AppleAuthentication) {
        throw new Error('Apple Authentication not available in this environment');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, nonce } = credential;
      if (!identityToken) {
        throw new Error('Apple Sign-In failed - no identity token');
      }

      const appleCredential = new OAuthProvider('apple.com').credential({
        idToken: identityToken,
        rawNonce: nonce,
      });

      const result = await signInWithCredential(auth, appleCredential);
      return this.formatUser(result.user);
    } catch (error) {
      console.error('Error signing in with Apple:', error);
      throw this.handleAuthError(error);
    }
  }

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    if (!this.isAvailable || !auth) return null;
    return auth.currentUser;
  }

  // Get ID token
  async getIdToken(): Promise<string | null> {
    if (!this.isAvailable || !auth) return null;
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }

  // Email Verification
  async sendEmailVerification(): Promise<void> {
    this.checkAvailability();
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }
      
      await firebaseSendEmailVerification(user);
      console.log('Email verification sent to:', user.email);
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw this.handleAuthError(error);
    }
  }

  // Check if email is verified
  async checkEmailVerified(): Promise<boolean> {
    this.checkAvailability();
    try {
      const user = auth.currentUser;
      if (!user) return false;
      
      // Reload user to get latest email verification status
      await reload(user);
      return user.emailVerified;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    if (!this.isAvailable || !auth) return;
    try {
      await auth.signOut();
      
      // Sign out from Google if signed in
      if (GoogleSignin && await GoogleSignin.isSignedIn()) {
        await GoogleSignin.signOut();
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw this.handleAuthError(error);
    }
  }

  // Format Firebase user to our AuthUser interface
  private formatUser(firebaseUser: FirebaseUser): AuthUser {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      phoneNumber: firebaseUser.phoneNumber,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
    };
  }

  // Handle Firebase auth errors
  private handleAuthError(error: any): Error {
    const errorCode = error.code;
    const errorMessage = error.message;

    switch (errorCode) {
      case 'auth/invalid-phone-number':
        return new Error('Invalid phone number. Please check the number and try again.');
      case 'auth/too-many-requests':
        return new Error('Too many requests. Please try again later.');
      case 'auth/invalid-verification-code':
        return new Error('Invalid verification code. Please check and try again.');
      case 'auth/code-expired':
        return new Error('Verification code has expired. Please request a new one.');
      case 'auth/account-exists-with-different-credential':
        return new Error('An account already exists with a different sign-in method.');
      case 'auth/popup-closed-by-user':
        return new Error('Sign-in was cancelled.');
      case 'auth/cancelled-popup-request':
        return new Error('Sign-in was cancelled.');
      case 'auth/user-not-found':
        return new Error('No account found with this email address.');
      case 'auth/wrong-password':
        return new Error('Incorrect password. Please try again.');
      case 'auth/email-already-in-use':
        return new Error('An account with this email already exists.');
      case 'auth/weak-password':
        return new Error('Password should be at least 6 characters long.');
      case 'auth/invalid-email':
        return new Error('Please enter a valid email address.');
      case 'auth/argument-error':
        return new Error('Phone authentication is not properly configured. Please use email authentication or contact support.');
      case 'auth/app-not-authorized':
        return new Error('This app is not authorized to use Firebase Authentication with the provided configuration.');
      case 'auth/captcha-check-failed':
        return new Error('The reCAPTCHA response token is invalid or has expired.');
      default:
        console.error('Unhandled auth error:', errorCode, errorMessage);
        return new Error(errorMessage || 'An error occurred during authentication.');
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;