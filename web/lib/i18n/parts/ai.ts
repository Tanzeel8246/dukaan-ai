/** i18n part: ai — en + ur dictionaries (identical key sets enforced by types). */
export const enAi = {
  "ai.title": "AI Assistant",
  "ai.eyebrow": "Urdu · English",
  "ai.subtitle":
    "Ask in Urdu or English — every answer is computed live from your shop's data. Try the starters below.",
  "ai.loading": "Waking up the assistant…",
  "ai.placeholder": "Ask anything about your shop…",
  "ai.inputLabel": "Ask the AI assistant",
  "ai.send": "Send",
  "ai.sendLabel": "Send message",
  "ai.typing": "Assistant is typing",
  "ai.chatLabel": "Conversation with Dukaan AI",
  "ai.error": "Sorry, something went wrong while answering. Please try again.",
  "ai.note":
    "Answers are grounded in your shop data. On the live deployment a Gemini-powered assistant (via /api/chat) answers first; the on-device intent engine covers everything else — no key, no network, no problem.",
} as const;
export const urAi: Record<keyof typeof enAi, string> = {
  "ai.title": "اے آئی معاون",
  "ai.eyebrow": "اردو · انگریزی",
  "ai.subtitle":
    "اردو یا انگریزی میں پوچھیں — ہر جواب آپ کی دکان کے ڈیٹا سے براہِ راست شمار ہوتا ہے۔ نیچے دیے گئے سوالات آزمائیں۔",
  "ai.loading": "معاون جاگ رہا ہے…",
  "ai.placeholder": "اپنی دکان کے بارے میں کچھ بھی پوچھیں…",
  "ai.inputLabel": "اے آئی معاون سے پوچھیں",
  "ai.send": "بھجیں",
  "ai.sendLabel": "پیغام بھیجیں",
  "ai.typing": "معاون لکھ رہا ہے",
  "ai.chatLabel": "دکان اے آئی سے گفتگو",
  "ai.error": "معذرت، جواب دیتے ہوئے مسئلہ ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔",
  "ai.note":
    "جوابات آپ کی دکان کے ڈیٹا پر مبنی ہوتے ہیں۔ لائیو تعیناتی پر Gemini سے چلنے والا معاون (/api/chat کے ذریعے) پہلے جواب دیتا ہے؛ باقی سب کچھ ڈیوائس پر موجود انٹینٹ انجن سنبھالتا ہے — نہ کلید درکار، نہ نیٹ ورک، کوئی مسئلہ نہیں۔",
};
