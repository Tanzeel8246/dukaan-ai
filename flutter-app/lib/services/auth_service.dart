import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

/// Dukaan AI — Firebase Auth (email/password), mirroring the web app.
///
/// Firebase stays OPTIONAL: when google-services.json /
/// GoogleService-Info.plist are absent, [firebaseReady] is false and the
/// app runs in offline demo mode on sqflite — no login wall. When Firebase
/// IS configured, the app requires sign-in and cloud sync is scoped to
/// `users/{uid}/…`, exactly like the web app and the Firestore rules.
class AuthService {
  static bool _ready = false;

  static bool get firebaseReady => _ready;

  /// Initialise Firebase once at startup. Never throws.
  static Future<void> init() async {
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
      _ready = true;
    } catch (_) {
      // No Firebase config on this build — offline demo mode.
      _ready = false;
    }
  }

  static User? get currentUser =>
      _ready ? FirebaseAuth.instance.currentUser : null;

  static Stream<User?> authChanges() =>
      FirebaseAuth.instance.authStateChanges();

  /// Returns null on success, or a friendly error message.
  static Future<String?> signIn(String email, String password) async {
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      return null;
    } on FirebaseAuthException catch (e) {
      return friendlyError(e);
    } catch (_) {
      return 'Something went wrong. Please try again.';
    }
  }

  /// Returns null on success, or a friendly error message.
  static Future<String?> signUp(String email, String password) async {
    try {
      await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      return null;
    } on FirebaseAuthException catch (e) {
      return friendlyError(e);
    } catch (_) {
      return 'Something went wrong. Please try again.';
    }
  }

  static Future<void> signOut() async {
    if (!_ready) return;
    try {
      await FirebaseAuth.instance.signOut();
    } catch (_) {
      /* already signed out */
    }
  }

  static String friendlyError(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-email':
        return 'That email address looks invalid.';
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        return 'Email or password is incorrect.';
      case 'email-already-in-use':
        return 'An account with this email already exists — try signing in.';
      case 'weak-password':
        return 'Password must be at least 6 characters.';
      case 'network-request-failed':
        return 'Network error — check your connection.';
      default:
        return e.message ?? 'Authentication failed. Please try again.';
    }
  }
}
