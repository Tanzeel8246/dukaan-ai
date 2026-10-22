# Dukaan AI — Firebase setup (owner steps)

The web demo works **out of the box without Firebase** (it uses the bundled
seed data in local demo mode). Follow these steps only when you want a real
shared Firestore backend — e.g. so the web app and the Flutter app read and
write the same live data.

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and sign in.
2. Click **Add project** → name it `dukaan-ai-demo` (any name works) → continue
   (Google Analytics optional) → **Create project**.

## 2. Enable Firestore

1. In the project console: **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** (we deploy our own rules next).
3. Pick the region closest to your users (`asia-south1` for Pakistan).
4. Click **Enable**.

## 3. Deploy the rules and indexes

Install the Firebase CLI once, then deploy from this `firebase/` folder:

```bash
npm install -g firebase-tools
firebase login
cd firebase
firebase use --add          # select your project
firebase deploy --only firestore
```

This uploads `firestore.rules` (signed-in users can read/write products;
sales are append-only) and `firestore.indexes.json` (composite indexes for
the forecast queries).

## 4. Register the web app and get the config

1. Project overview → **Add app** → **Web** (`</>`).
2. Nickname: `dukaan-ai-web`. (Hosting setup is **not** needed — the site
   deploys to the `dukaan-ai.codehubb.com` subdomain as static files.)
3. Copy the `firebaseConfig` values shown.

## 5. Wire the web app

```bash
cd web
cp .env.local.example .env.local
```

Paste the real values into `.env.local`:

```ini
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=….firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=….appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
```

> **Security:** `.env.local` is git-ignored. The repository only ever holds
> `YOUR_…` placeholders — never commit real credentials.

Rebuild and re-upload `web/out/` to the subdomain. The app detects the config
and switches from local demo mode to Firestore automatically.

## 6. Import the seed data

Option A — Firebase console:

1. **Firestore Database → Start collection** → collection ID `products`.
2. For a quick import, use Option B (scripted) instead — 25 products + 347
   sales are a lot to type by hand.

Option B — scripted import (Node):

```bash
cd firebase
npm init -y && npm install firebase-admin
node -e "
const admin = require('firebase-admin');
const seed = require('./seed.json');
// TODO: download a service-account key from Project settings → Service accounts
// and point GOOGLE_APPLICATION_CREDENTIALS at it, then uncomment:
// admin.initializeApp();
// const db = admin.firestore();
// const batch = db.batch();
// seed.products.forEach(p => batch.set(db.collection('products').doc(p.id), p));
// seed.sales.forEach(s => batch.set(db.collection('sales').doc(s.id), s));
// batch.commit().then(() => console.log('seeded'));
console.log('products:', seed.products.length, '| sales:', seed.sales.length);
"
```

Document shapes (from `seed.json`):

- `products/{id}`: `{ sku, name, urduName, category, unit, costPrice, salePrice, stockQty, reorderLevel, keywords[] }`
- `sales/{id}`: `{ productId, qty, unitPrice, total, dayOffset, ts }`

## 7. Enable Authentication (required by the rules)

The rules require `request.auth != null`:

1. **Build → Authentication → Get started**.
2. Enable **Email/Password** (or Google) sign-in.
3. Create at least one user for the shop owner.

## 8. Flutter app config

1. Add Android/iOS apps in the Firebase console for the Flutter package
   (`com.codehubb.dukaanai`), download `google-services.json` /
   `GoogleService-Info.plist` into `flutter-app/android/app/` and
   `flutter-app/ios/Runner/` respectively.
2. The Flutter app enables Firestore offline persistence, so it keeps working
   with no network and syncs queued writes on reconnect.

## What's fictional

Everything in `seed.json` — the 25 products, PKR prices, stock quantities and
the 14 days of sales — is invented demo data for a fictional kiryana store.
Replace it with the shop's real catalogue before any real-world use.
