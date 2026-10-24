/** i18n part: ai — Pashto (پښتو) DRAFT dictionary (Phase H design §4.1).
 *  Machine-drafted once at build time; every key's review state lives in
 *  ../review-manifest.json. A draft is a starting point for a named human
 *  reviewer — never finished copy, never runtime translation. */
import type { enAi } from "./ai";

export const psAi: Record<keyof typeof enAi, string> = {
  "ai.title": "د AI مرستیال",
  "ai.eyebrow": "اردو · English",
  "ai.subtitle": "په اردو یا انګلیسي کې وپوښتئ — هر ځواب ستاسو د هټۍ له معلوماتو څخه ژوندی شمېرل کېږي. لاندې پیل ټکي وازمایئ.",
  "ai.loading": "مرستیال راویښېږي…",
  "ai.placeholder": "د خپلې هټۍ په اړه هر څه وپوښتئ…",
  "ai.inputLabel": "له AI مرستیال څخه وپوښتئ",
  "ai.send": "ولېږئ",
  "ai.sendLabel": "پیغام ولېږئ",
  "ai.typing": "مرستیال لیکي",
  "ai.chatLabel": "له Dukaan AI سره خبرې اترې",
  "ai.error": "بخښنه غواړم، د ځواب ورکولو پر مهال ستونزه رامنځته شوه. مهرباني وکړئ بیا هڅه وکړئ.",
  "ai.note": "ځوابونه ستاسو د هټۍ په معلوماتو ولاړ دي. په ژوندۍ کارونه کې د Gemini پر بنسټ مرستیال (د /api/chat له لارې) لومړی ځواب ورکوي؛ په وسیله کې دننه انجن نور هر څه سمبالوي — نه کیلي پکار ده، نه شبکه، هېڅ ستونزه نشته.",
};
