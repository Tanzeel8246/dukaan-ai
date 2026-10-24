/// Firebase options for project `dukan-8246`.
///
/// PLACEHOLDERS ONLY in the repo — the web's standing discipline
/// (web/lib/firebase.ts reads config the same way). The REAL values
/// are injected by CI from repository secrets when the owner
/// registers the Android + Windows apps in the Firebase console
/// (Phase F design §1.3/§7.3):
///   - Android: package `com.codehubb.dukaanai`
///   - Windows: registered as a web-config app (Flutter Windows uses
///     web-style FirebaseOptions; there is no google-services.json
///     for Windows)
/// With placeholders the app COMPILES and runs its local suites, but
/// cannot reach the live backend — by design, never by accident.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.windows:
        return windows;
      default:
        return android;
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'PLACEHOLDER-ANDROID-API-KEY',
    appId: '1:000000000000:android:PLACEHOLDER',
    messagingSenderId: '000000000000',
    projectId: 'dukan-8246',
    storageBucket: 'dukan-8246.firebasestorage.app',
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: 'PLACEHOLDER-WEB-API-KEY',
    appId: '1:000000000000:web:PLACEHOLDER',
    messagingSenderId: '000000000000',
    projectId: 'dukan-8246',
    authDomain: 'dukan-8246.firebaseapp.com',
    storageBucket: 'dukan-8246.firebasestorage.app',
  );

  static const FirebaseOptions web = windows;
}
