/** i18n part: auth — Farsi / Dari (فارسی) DRAFT dictionary (Phase H design §4.1).
 *  Machine-drafted once at build time; every key's review state lives in
 *  ../review-manifest.json. A draft is a starting point for a named human
 *  reviewer — never finished copy, never runtime translation. */
import type { enAuth } from "./auth";

export const faAuth: Record<keyof typeof enAuth, string> = {
  "auth.eyebrow": "حساب Dukaan AI",
  "auth.loginTitle": "خوش آمدید",
  "auth.signupTitle": "حساب دکان خود را بسازید",
  "auth.loginSub": "برای دیدن موجودی زنده، فروش و پیش‌بینی‌های دکان خود وارد شوید.",
  "auth.signupSub": "برای چلاندن دکان خود در Dukaan AI ثبت‌نام کنید — معلومات شما فقط برای حساب شما خصوصی می‌ماند.",
  "auth.demoNote": "حساب‌ها در این دیمو فعال نیستند. معلومات دکانی که می‌بینید معلومات نمونه‌ای بسته‌بندی شده است — ورود لازم نیست.",
  "auth.email": "ایمیل",
  "auth.password": "رمز عبور",
  "auth.emailPlaceholder": "you@example.com",
  "auth.passwordPlaceholder": "••••••••",
  "auth.wait": "لطفاً منتظر بمانید…",
  "auth.submitLogin": "وارد شوید",
  "auth.submitSignup": "حساب بسازید",
  "auth.newHere": "در Dukaan AI جدید هستید؟",
  "auth.createAccountLink": "حساب بسازید",
  "auth.haveAccount": "قبلاً حساب دارید؟",
  "auth.loginLink": "وارد شوید",
  "auth.err.invalidEmail": "این آدرس ایمیل درست معلوم نمی‌شود.",
  "auth.err.invalidCredential": "ایمیل یا رمز عبور نادرست است.",
  "auth.err.emailInUse": "حسابی با این ایمیل قبلاً وجود دارد — وارد شدن را امتحان کنید.",
  "auth.err.weakPassword": "رمز عبور باید کم از کم 6 حرف باشد.",
  "auth.err.tooMany": "کوشش‌های زیاد شد — یک لحظه منتظر بمانید و دوباره کوشش کنید.",
  "auth.err.network": "خطای شبکه — اتصال خود را بررسی کنید.",
  "auth.err.generic": "چیزی اشتباه شد. لطفاً دوباره کوشش کنید.",
};
