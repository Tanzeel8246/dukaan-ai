"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { IconChat, IconSend, IconSpark } from "./ui";
import { detectIntent } from "@/lib/ai-engine/intents";
import { generateReply, suggestionsFor, type AssistantReply } from "@/lib/ai-engine/responder";
import { queryLLM } from "@/lib/ai-engine/llm-adapter";
import { lowStockProducts, revenueOnDay, stockValueRetail } from "@/lib/selectors";
import {
  cashBalance,
  expenseTotal,
  expensesOnDay,
  payablesTotal,
  profitAndLoss,
  totalOutstandingCredit,
} from "@/lib/ledger";
import type { AssistantCtx } from "@/lib/ai-engine/responder";
import type { Product, Sale } from "@/lib/types";

/** Compact grounding summary of the shop's own data for the LLM route.
 *  Machine-facing prompt context (not UI) — intentionally stays English. */
function buildShopSummary(ctx: AssistantCtx): string {
  const { products, sales } = ctx;
  const low = lowStockProducts(products)
    .slice(0, 12)
    .map((p) => `${p.name} (${p.stockQty} ${p.unit} left, reorder at ${p.reorderLevel})`)
    .join("; ");
  const pl = profitAndLoss(ctx.journal);
  const lines = [
    `Products tracked: ${products.length}`,
    `Stock value at retail: PKR ${Math.round(stockValueRetail(products)).toLocaleString("en-PK")}`,
    `Revenue today: PKR ${Math.round(revenueOnDay(sales, 0)).toLocaleString("en-PK")}`,
    `Revenue yesterday: PKR ${Math.round(revenueOnDay(sales, 1)).toLocaleString("en-PK")}`,
    `Expenses today: PKR ${Math.round(expenseTotal(expensesOnDay(ctx.expenses, 0))).toLocaleString("en-PK")}`,
    `Net profit this month (journal): PKR ${Math.round(pl.net).toLocaleString("en-PK")}`,
    `Cash in hand (journal): PKR ${Math.round(cashBalance(ctx.journal)).toLocaleString("en-PK")}`,
    `Udhaar outstanding (customers owe): PKR ${Math.round(totalOutstandingCredit(ctx.credits)).toLocaleString("en-PK")}`,
    `Supplier payable (shop owes): PKR ${Math.round(payablesTotal(ctx.journal)).toLocaleString("en-PK")}`,
    `Low-stock items: ${low || "none"}`,
    `Catalogue: ${products
      .map((p) => `${p.name} — PKR ${p.salePrice}/${p.unit}, stock ${p.stockQty}`)
      .join("; ")}`,
  ];
  return lines.join("\n");
}

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
  lang: "ur" | "en";
  suggestions?: string[];
}

let msgId = 0;
const nextId = () => ++msgId;

export default function AssistantChat() {
  const store = useStore();
  const { ready, products, sales, suppliers } = store;
  const { t, lang: uiLang } = useLang();
  // The UI language drives the reply pipeline: ctx.lang makes generateReply
  // answer (and offer suggestion chips) in the interface language, whatever
  // language the question itself was typed in.
  const ctx: AssistantCtx = {
    products: store.products,
    sales: store.sales,
    suppliers: store.suppliers,
    purchases: store.purchases,
    purchaseReturns: store.purchaseReturns,
    supplierPayments: store.supplierPayments,
    credits: store.credits,
    expenses: store.expenses,
    journal: store.journal,
    lang: uiLang,
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef(false);

  useEffect(() => {
    if (!ready || askedRef.current) return;
    const detected = detectIntent("hello", products, suppliers);
    const reply: AssistantReply = generateReply(detected, ctx);
    setMessages([
      {
        id: nextId(),
        from: "bot",
        text: reply.text,
        lang: reply.lang,
        suggestions: reply.suggestions,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, uiLang]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const ask = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    askedRef.current = true;
    const detected = detectIntent(text, products, suppliers);
    const userMsg: Message = { id: nextId(), from: "user", text, lang: detected.lang };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    const pushBot = (replyText: string, suggestions?: string[]) => {
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          from: "bot",
          text: replyText,
          lang: uiLang,
          suggestions,
        },
      ]);
      setTyping(false);
    };

    const pushLocal = () => {
      try {
        const reply = generateReply(detected, ctx);
        pushBot(reply.text, reply.suggestions);
      } catch {
        pushBot(t("ai.error"));
      }
    };

    // Tier 1: live LLM (Gemini) via the server route, grounded in the
    // shop's own data. Only works on the Node deployment with a key set.
    // Tier 2: the on-device intent engine — instant and always available.
    void (async () => {
      try {
        const llmText = await queryLLM([{ role: "user", content: text }], {
          context: buildShopSummary(ctx),
        });
        if (!llmText) throw new Error("empty LLM reply");
        // Reuse the local engine's follow-up chips to keep the UX identical.
        const local = generateReply(detected, ctx);
        pushBot(llmText, local.suggestions);
      } catch {
        window.setTimeout(pushLocal, 400);
      }
    })();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  if (!ready) {
    return (
      <div className="section"><div className="container"><div className="empty">{t("ai.loading")}</div></div></div>
    );
  }

  const starters = suggestionsFor(uiLang);

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head center">
          <span className="eyebrow">{t("ai.eyebrow")}</span>
          <h1 className="h2">{t("ai.title")}</h1>
          <p className="lead">{t("ai.subtitle")}</p>
        </div>

        <div className="chat-shell">
          <div className="chips" style={{ marginBottom: 14 }}>
            {starters.map((s) => (
              <button
                type="button"
                key={s}
                className={`chip${uiLang === "ur" ? " ur" : ""}`}
                dir={uiLang === "ur" ? "rtl" : "ltr"}
                onClick={() => ask(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="chat-log" ref={logRef} role="log" aria-label={t("ai.chatLabel")}>
            {messages.map((m) =>
              m.from === "bot" ? (
                <div className="msg bot" key={m.id}>
                  <span className="avatar"><IconSpark /></span>
                  <div>
                    <div className="bubble" dir={m.lang === "ur" ? "rtl" : "ltr"}>
                      {m.lang === "ur" ? <span className="ur">{m.text}</span> : m.text}
                    </div>
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="chips" style={{ marginTop: 10 }}>
                        {m.suggestions.map((s) => (
                          <button
                            type="button"
                            key={s}
                            className={`chip${/[\u0600-\u06FF]/.test(s) ? " ur" : ""}`}
                            dir={/[\u0600-\u06FF]/.test(s) ? "rtl" : "ltr"}
                            onClick={() => ask(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="msg user" key={m.id}>
                  <span className="avatar"><IconChat /></span>
                  <div className="bubble" dir={m.lang === "ur" ? "rtl" : "ltr"}>
                    {m.lang === "ur" ? <span className="ur">{m.text}</span> : m.text}
                  </div>
                </div>
              )
            )}
            {typing && (
              <div className="msg bot">
                <span className="avatar"><IconSpark /></span>
                <div className="bubble">
                  <span className="typing" aria-label={t("ai.typing")}>
                    <span /><span /><span />
                  </span>
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-row" onSubmit={submit}>
            <div className="field">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("ai.placeholder")}
                aria-label={t("ai.inputLabel")}
                autoComplete="off"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={!input.trim() || typing} aria-label={t("ai.sendLabel")}>
              <IconSend /> {t("ai.send")}
            </button>
          </form>

          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 14, textAlign: "center" }}>
            {t("ai.note")}
          </p>
        </div>
      </div>
    </div>
  );
}
