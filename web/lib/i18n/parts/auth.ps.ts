/** i18n part: auth — Pashto (پښتو) DRAFT dictionary (Phase H design §4.1).
 *  Machine-drafted once at build time; every key's review state lives in
 *  ../review-manifest.json. A draft is a starting point for a named human
 *  reviewer — never finished copy, never runtime translation. */
import type { enAuth } from "./auth";

export const psAuth: Record<keyof typeof enAuth, string> = {
  "auth.eyebrow": "Dukaan AI حساب",
  "auth.loginTitle": "ښه راغلاست",
  "auth.signupTitle": "د خپلې هټۍ حساب جوړ کړئ",
  "auth.loginSub": "د خپلې هټۍ ژوندی موجودي، پلور او وړاندوینې لیدلو لپاره ننوځئ.",
  "auth.signupSub": "په Dukaan AI کې خپله هټۍ چلولو لپاره نوم لیکنه وکړئ — ستاسو معلومات یوازې ستاسو حساب ته خصوصي پاتې کېږي.",
  "auth.demoNote": "په دې ډیمو کې حسابونه فعال نه دي. د هټۍ معلومات چې تاسو یې ګورئ، بنډل شوي نمونه معلومات دي — ننوتل پکار نه دي.",
  "auth.email": "برېښنالیک",
  "auth.password": "پټنوم",
  "auth.emailPlaceholder": "you@example.com",
  "auth.passwordPlaceholder": "••••••••",
  "auth.wait": "مهرباني وکړئ انتظار وکړئ…",
  "auth.submitLogin": "ننوتل",
  "auth.submitSignup": "حساب جوړ کړئ",
  "auth.newHere": "په Dukaan AI کې نوي یاست؟",
  "auth.createAccountLink": "حساب جوړ کړئ",
  "auth.haveAccount": "مخکې له مخکې حساب لرئ؟",
  "auth.loginLink": "ننوتل",
  "auth.err.invalidEmail": "دا برېښنالیک پته سمه نه ښکاري.",
  "auth.err.invalidCredential": "برېښنالیک یا پټنوم ناسم دی.",
  "auth.err.emailInUse": "په دې برېښنالیک یو حساب مخکې شته — د ننوتلو هڅه وکړئ.",
  "auth.err.weakPassword": "پټنوم باید لږ تر لږه 6 توري وي.",
  "auth.err.tooMany": "ډېرې هڅې وشوې — لږ انتظار وکړئ او بیا هڅه وکړئ.",
  "auth.err.network": "د شبکې تېروتنه — خپله اړیکه وګورئ.",
  "auth.err.generic": "یو څه غلط شو. مهرباني وکړئ بیا هڅه وکړئ.",
};
