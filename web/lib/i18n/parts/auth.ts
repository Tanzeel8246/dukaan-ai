/** i18n part: auth — en + ur dictionaries (identical key sets enforced by types).
 *  Login / sign-up form copy and friendly Firebase error messages. Raw
 *  Firebase messages are never shown — AuthForm maps error codes to the
 *  auth.err.* keys below. */
export const enAuth = {
  "auth.eyebrow": "Dukaan AI Account",
  "auth.loginTitle": "Welcome back",
  "auth.signupTitle": "Create your shop account",
  "auth.loginSub": "Log in to see your shop's live inventory, sales and forecasts.",
  "auth.signupSub":
    "Sign up to run your shop on Dukaan AI — your data stays private to your account.",
  "auth.demoNote":
    "Accounts are not enabled on this demo deployment. The shop data you see is bundled sample data — no login needed.",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.emailPlaceholder": "you@example.com",
  "auth.passwordPlaceholder": "••••••••",
  "auth.wait": "Please wait…",
  "auth.submitLogin": "Log in",
  "auth.submitSignup": "Create account",
  "auth.newHere": "New to Dukaan AI?",
  "auth.createAccountLink": "Create an account",
  "auth.haveAccount": "Already have an account?",
  "auth.loginLink": "Log in",
  "auth.err.invalidEmail": "That email address looks invalid.",
  "auth.err.invalidCredential": "Email or password is incorrect.",
  "auth.err.emailInUse": "An account with this email already exists — try logging in.",
  "auth.err.weakPassword": "Password must be at least 6 characters.",
  "auth.err.tooMany": "Too many attempts — wait a moment and try again.",
  "auth.err.network": "Network error — check your connection.",
  "auth.err.generic": "Something went wrong. Please try again.",
} as const;

export const urAuth: Record<keyof typeof enAuth, string> = {
  "auth.eyebrow": "Dukaan AI اکاؤنٹ",
  "auth.loginTitle": "خوش آمدید",
  "auth.signupTitle": "اپنی دکان کا اکاؤنٹ بنائیں",
  "auth.loginSub": "اپنی دکان کا اسٹاک، فروخت اور پیش گوئی دیکھنے کے لیے لاگ اِن کریں۔",
  "auth.signupSub":
    "Dukaan AI پر اپنی دکان چلانے کے لیے سائن اپ کریں — آپ کا ڈیٹا صرف آپ کے اکاؤنٹ تک محفوظ رہے گا۔",
  "auth.demoNote":
    "اس ڈیمو پر اکاؤنٹ سسٹم فعال نہیں ہے۔ آپ جو دکان کا ڈیٹا دیکھ رہے ہیں وہ نمونہ ڈیٹا ہے — لاگ اِن کی ضرورت نہیں۔",
  "auth.email": "ای میل",
  "auth.password": "پاس ورڈ",
  "auth.emailPlaceholder": "you@example.com",
  "auth.passwordPlaceholder": "••••••••",
  "auth.wait": "براہ کرم انتظار کریں…",
  "auth.submitLogin": "لاگ اِن",
  "auth.submitSignup": "اکاؤنٹ بنائیں",
  "auth.newHere": "Dukaan AI پر نئے ہیں؟",
  "auth.createAccountLink": "اکاؤنٹ بنائیں",
  "auth.haveAccount": "پہلے سے اکاؤنٹ موجود ہے؟",
  "auth.loginLink": "لاگ اِن",
  "auth.err.invalidEmail": "یہ ای میل درست نہیں لگتی۔",
  "auth.err.invalidCredential": "ای میل یا پاس ورڈ غلط ہے۔",
  "auth.err.emailInUse": "اس ای میل سے اکاؤنٹ پہلے سے موجود ہے — لاگ اِن کر کے دیکھیں۔",
  "auth.err.weakPassword": "پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔",
  "auth.err.tooMany": "بہت زیادہ کوششیں ہو گئی ہیں — تھوڑی دیر بعد دوبارہ کوشش کریں۔",
  "auth.err.network": "نیٹ ورک کا مسئلہ ہے — اپنا کنکشن چیک کریں۔",
  "auth.err.generic": "کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔",
};
