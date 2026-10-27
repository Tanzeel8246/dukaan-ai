/// Firebase options for project `dukan-8246`.
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
    apiKey: 'AIzaSyAbRGP7Vx3NBWadUQaeC4g9ROzrpmVrL7M',
    appId: '1:367593529864:android:66f0d7f4dfedf0d85227bd',
    messagingSenderId: '367593529864',
    projectId: 'dukan-8246',
    storageBucket: 'dukan-8246.firebasestorage.app',
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: 'AIzaSyAbRGP7Vx3NBWadUQaeC4g9ROzrpmVrL7M',
    appId: '1:367593529864:web:66f0d7f4dfedf0d85227bd',
    messagingSenderId: '367593529864',
    projectId: 'dukan-8246',
    authDomain: 'dukan-8246.firebaseapp.com',
    storageBucket: 'dukan-8246.firebasestorage.app',
  );

  static const FirebaseOptions web = windows;
}
