"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, type NewBillInput } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { usePinGate } from "./PinGate";
import PermDenied from "./PermDenied";
import { can } from "@/lib/permissions";
import {
  IconCash,
  IconClose,
  IconEdit,
  IconPlus,
  IconSearch,
  IconSend,
  IconTrash,
  ProductResultList,
  SearchClear,
  pickerKeyDown,
} from "./ui";
import { brandingDataUrls } from "@/lib/branding";
import { groupIban, validatePkIban } from "@/lib/raast";
import { fmtDate, fmtDateShort, fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { STOCK_DEDUCTION_NOTE } from "@/lib/workflow";
import { billTaxLines, computeBillTaxes, resolveTaxSlab } from "@/lib/tax";
import { billMatches, filterProducts, findProductBySku } from "@/lib/search";
import {
  challanBilledQty,
  orderBilledQty,
  remainingQty,
} from "@/lib/documents";
import {
  availabilityByProductAtWarehouse,
  defaultWarehouseId,
  effectiveWarehouseId,
  qtyAtWarehouse,
  resolveWarehouseId,
} from "@/lib/stock";
import type { I18nKey } from "@/lib/i18n";
import {
  customerLoyalty,
  loyaltyEarnQuote,
  loyaltyRedeemCapRs,
  loyaltyRedemptionQuote,
  resolveLoyaltySettings,
} from "@/lib/loyalty";
import type { Bill, BillPayment, PayMethod } from "@/lib/types";
import { AccountPicker } from "./MoneyAccounts";
import {
  ChequeFields,
  chequeDraftOf,
  chequeFormOf,
  emptyChequeForm,
  type ChequeFormState,
} from "./ChequeCapture";
import { BillPrintSheet } from "./DocPrintSheet";

interface CartLine {
  productId: string;
  qty: number;
  /**
   * Phase B (§2.4): the AGREED price carried in by a conversion
   * draft. Present ONLY on conversion-prefilled lines — the free
   * desk never sets it, so a normal cart prices from the shelf
   * exactly as before.
   */
  unitPrice?: number;
  /** The parent document line this line fulfils (conversions). */
  sourceProductId?: string;
}

interface PayRow {
  method: PayMethod;
  amount: string; // kept as text while editing; parsed on submit
  /** A2: money account id; "" = the method default. */
  accountId: string;
  /** Phase B · B5: "cheque" when this part is paid by cheque — an
   *  INSTRUMENT on the row, not a sixth method (the row's method
   *  rides as "bank"); `cheque` holds the capture fields.
   *  Phase H · H1: "points" is the second instrument — the row's
   *  method rides as "cash" and `points` holds the count typed;
   *  the part's rupee amount is the fold's quote, never typed. */
  instrument: "cheque" | "points" | null;
  cheque: ChequeFormState;
  points: string;
}

const blankPayRow = (): PayRow => ({
  method: "cash",
  amount: "",
  accountId: "",
  instrument: null,
  cheque: emptyChequeForm(),
  points: "",
});

const PAY_METHODS: PayMethod[] = ["cash", "jazzcash", "easypaisa", "bank", "credit"];
const REFUND_METHODS: Array<Exclude<PayMethod, "credit">> = [
  "cash",
  "jazzcash",
  "easypaisa",
  "bank",
];

/** Payment method labels always come from the shared common.pay.* keys. */
const PAY_KEY: Record<PayMethod, I18nKey> = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
  credit: "common.pay.credit",
};

const STATUS_BADGE: Record<Bill["status"], { cls: string; key: I18nKey }> = {
  paid: { cls: "badge green", key: "billing.status.paid" },
  held: { cls: "badge amber", key: "billing.status.held" },
  voided: { cls: "badge red", key: "billing.status.voided" },
  partially_returned: { cls: "badge amber", key: "billing.status.partially_returned" },
  returned: { cls: "badge red", key: "billing.status.returned" },
};

/** Quantities can be fractional (kg / L) — never round them away. */
function fmtQty(n: number): string {
  return Number.isInteger(n) ? fmtNum(n) : String(Math.round(n * 1000) / 1000);
}

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
}

function fmtDateTime(ts: string): string {
  return `${fmtDate(ts)} · ${fmtTime(ts)}`;
}

const isFractional = (unit: string) => unit === "kg" || unit === "L";

const rowBetween: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "3px 0",
};

export default function BillingDesk() {
  const {
    ready,
    products,
    bills,
    customers,
    taxSlabs,
    settings,
    createBill,
    holdBill,
    finalizeBill,
    discardHeldBill,
    voidBill,
    returnItems,
    returnItemsWithNote,
    addCustomer,
    addCustomerAdvance,
    saleOrders,
    deliveryChallans,
    quotations,
    billDraft,
    clearBillDraft,
    cheques,
    journal,
    warehouses,
    stockLevels,
    jobs,
    branding,
  } = useStore();
  const { role } = useAuth();
  const { requirePin } = usePinGate();
  /** A3: voiding a posted bill is owner/manager only (matrix row
   *  billingVoid); create/finalize/returns stay open to cashiers. */
  const canVoid = can(role, "billingVoid", "write");
  /** Phase B · B4 (G-2): note issuance gates on `creditDebitNotes`,
   *  not `returns` — roles with that row post desk returns through
   *  the FORMAL flow (a credit note mints with the return); roles
   *  without it keep the plain return exactly as before. */
  const canNote = can(role, "creditDebitNotes", "write");
  const { t } = useLang();
  const payLabel = (m: PayMethod) => t(PAY_KEY[m]);
  /** B5: a cheque part displays as the instrument it is (with its
   *  leaf number from the registry), never as a bank payment.
   *  H1: a points part displays as points (count + settled value),
   *  never as the cash method its row rides on. */
  const payDisplay = (p: BillPayment): string => {
    if (p.instrument === "cheque") {
      const c = p.chequeId ? cheques.find((x) => x.id === p.chequeId) : undefined;
      return `${t("chq.payOption")}${c ? ` ${c.chequeNo}` : ""} ${fmtPKR(p.amount)}`;
    }
    if (p.instrument === "points") {
      return `${t("bill.pointsPart")} ${p.loyaltyPoints ?? 0} · ${fmtPKR(p.amount)}`;
    }
    return `${payLabel(p.method)} ${fmtPKR(p.amount)}`;
  };

  /* ---------------- bill builder state ---------------- */
  const [sku, setSku] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");
  /** POS picker: the keyboard-highlighted result row. */
  const [pickIdx, setPickIdx] = useState(0);
  /** Mobile: the cart lives in a bottom sheet, opened from the
   *  sticky cart bar; on desktop this state is inert. */
  const [cartOpen, setCartOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const skuRef = useRef<HTMLInputElement | null>(null);
  /* MC Billing workflow adoption 2026-10-27 (WEB): camera scan +
   * billing-time customer advance. The camera uses the device
   * camera + BarcodeDetector when the browser offers it; without
   * a detector the preview still aims the code and the cashier
   * types it — no silent fake scan. */
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMsg, setCameraMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [advAmount, setAdvAmount] = useState("");
  const [advMethod, setAdvMethod] = useState<"cash" | "jazzcash" | "easypaisa" | "bank">("cash");
  const [advNote, setAdvNote] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [ncName, setNcName] = useState("");
  const [ncPhone, setNcPhone] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState("");
  const [payments, setPayments] = useState<PayRow[]>([blankPayRow()]);
  const [heldId, setHeldId] = useState<string | null>(null);
  /** Phase B: the source document of a conversion draft (its
   *  citation is stamped onto the bill this desk posts). B2 widens
   *  the sources beyond the order: a delivery challan or a
   *  quotation can hand the desk a draft too. */
  const [billSource, setBillSource] = useState<{
    type: "order" | "challan" | "quotation" | "job";
    id: string;
    label: string;
  } | null>(null);
  /* Phase C · C1 (§1.6): the ONE warehouse this bill's stock
   * leaves from; "" = the shop default. The pick rides the desk's
   * own billing gate (G-C1 — the cashier picks for EVERY bill even
   * though the `warehouses` matrix row grants them no view). */
  const [billWarehouseId, setBillWarehouseId] = useState("");
  const billWhId = resolveWarehouseId(warehouses, billWarehouseId || null);
  /** A product's quantity AT the bill's warehouse (resolution rule). */
  const whQty = (p: (typeof products)[number]): number =>
    qtyAtWarehouse(p, stockLevels, warehouses, billWhId);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  /* ---------------- history / detail state ---------------- */
  const [histSearch, setHistSearch] = useState("");
  const [range, setRange] = useState<"all" | "today" | "week">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thermal, setThermal] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [refundMethod, setRefundMethod] =
    useState<Exclude<PayMethod, "credit">>("cash");
  /** A2: money account the refund leaves from; "" = method default. */
  const [refundAccountId, setRefundAccountId] = useState("");
  /** B4: the reason printed on the credit note (formal flow). */
  const [returnReason, setReturnReason] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const pickable = useMemo(() => {
    const list = [...products].sort((a, b) => a.name.localeCompare(b.name));
    // lib/search: null-safe — a legacy product missing urduName/sku
    // must never throw here (it used to kill the whole page).
    return filterProducts(list, pickerSearch);
  }, [products, pickerSearch]);

  /* POS picker: results exist only while the desk is searching;
   * a click (or Enter) adds straight to the cart — no separate
   * select-then-Add step. */
  const searching = pickerSearch.trim().length > 0;
  const pickResults = useMemo(
    () => (searching ? pickable.slice(0, 12) : []),
    [pickable, searching]
  );
  const cartQtyById = useMemo(
    () => new Map(cart.map((l) => [l.productId, l.qty])),
    [cart]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((a, l) => {
        const p = byId.get(l.productId);
        return a + (p ? l.qty * (l.unitPrice ?? p.salePrice) : 0);
      }, 0),
    [cart, byId]
  );

  const discountVal = Math.max(0, parseFloat(discountValue) || 0);
  const discountAmount =
    discountType === "percent"
      ? Math.min(subtotal, Math.round((subtotal * discountVal) / 100))
      : Math.min(subtotal, discountVal);
  // A4 (design §2.7): live tax preview of the cart — the same
  // resolver + calculator the store stamps at checkout, so the desk
  // total IS the posted total. All zeros when the shop has no
  // slabs/defaults (discount mirrors discountOf in the store).
  const cartTax = useMemo(
    () =>
      computeBillTaxes(
        cart.map((l) => {
          const p = byId.get(l.productId);
          return {
            total: p ? l.qty * (l.unitPrice ?? p.salePrice) : 0,
            qty: l.qty,
            slab: p ? resolveTaxSlab(p, taxSlabs, settings, "sales") : null,
          };
        }),
        discountAmount
      ),
    [cart, byId, taxSlabs, settings, subtotal, discountAmount]
  );
  const total = cartTax.total;
  // Phase H · H1: the selected customer's derived loyalty
  // position and this cart's earn preview — folded from the
  // journal by lib/loyalty on every render, never stored. The
  // points tender quotes from the same fold the store validates
  // against, so desk and posting can only disagree when the
  // journal moved in between (and then the store refuses).
  const loyaltySt = useMemo(() => resolveLoyaltySettings(settings), [settings]);
  const loyaltyPos = useMemo(
    () =>
      customerId
        ? customerLoyalty(journal, customerId, loyaltySt, new Date().toISOString())
        : null,
    [journal, customerId, loyaltySt]
  );
  const earnQuote = useMemo(
    () =>
      customerId && total > 0
        ? loyaltyEarnQuote(journal, customerId, total, loyaltySt, new Date().toISOString())
        : null,
    [journal, customerId, total, loyaltySt]
  );
  /** One points quote for the whole bill: every points row's
   *  typed count aggregates into a single tender part. */
  const pointsQuote = useMemo(() => {
    const wanted = payments
      .filter((r) => r.instrument === "points")
      .reduce((a, r) => a + Math.max(0, Math.floor(parseFloat(r.points) || 0)), 0);
    if (!customerId || wanted <= 0) return { points: 0, rs: 0 };
    const target = heldId ? (bills.find((b) => b.id === heldId)?.total ?? total) : total;
    return loyaltyRedemptionQuote(
      journal,
      customerId,
      wanted,
      loyaltyRedeemCapRs(target, loyaltySt)
    );
  }, [payments, customerId, heldId, bills, total, journal, loyaltySt]);
  // Receipt-style grouping of the preview: exclusive slabs add on
  // top; inclusive slabs are shown as information (already inside
  // the prices), mirroring lib/tax.billTaxLines for posted bills.
  const cartTaxGroups = useMemo(() => {
    const groups = new Map<string, { name: string; rate: number; kind: "percent" | "fixed"; inclusive: boolean; amount: number }>();
    for (const l of cartTax.lines) {
      if (!l.slab || l.taxAmount <= 0) continue;
      const key = `${l.slab.id}|${l.slab.inclusive ? "in" : "ex"}`;
      const g = groups.get(key) ?? {
        name: l.slab.name,
        rate: l.slab.rate,
        kind: l.slab.kind,
        inclusive: l.slab.inclusive,
        amount: 0,
      };
      g.amount += l.taxAmount;
      groups.set(key, g);
    }
    return [...groups.values()];
  }, [cartTax]);

  const parsedPayments: BillPayment[] = useMemo(() => {
    let pointsPartEmitted = false;
    return payments
      .map((r) => {
        if (r.instrument === "points") {
          // H1: the points part's amount is the fold's quote (the
          // aggregate of every points row), emitted once — extra
          // points rows fold into it above.
          if (pointsPartEmitted) {
            return { method: "cash" as PayMethod, amount: 0, accountId: null };
          }
          pointsPartEmitted = true;
          return {
            method: "cash" as PayMethod,
            amount: pointsQuote.rs,
            accountId: null,
            instrument: "points" as const,
            loyaltyPoints: pointsQuote.points,
          };
        }
        return {
          method: r.method,
          amount: Math.max(0, parseFloat(r.amount) || 0),
          accountId:
            r.method === "credit" || r.instrument === "cheque"
              ? null
              : r.accountId || null,
          // B5: a cheque part carries its capture draft (input
          // only — the store consumes it into the registry doc).
          ...(r.instrument === "cheque"
            ? { instrument: "cheque" as const, cheque: chequeDraftOf(r.cheque) }
            : {}),
        };
      })
      .filter((p) => p.amount > 0);
  }, [payments, pointsQuote]);
  const paidSum = parsedPayments.reduce((a, p) => a + p.amount, 0);

  /* Phase C · C5 (R-C7): when this bill cites a JOB, the
   * materials already issued to it (net of returns) — listed in
   * the desk so they are never billed a second time (§5.3's
   * desk discipline, surfaced). */
  const sourceJob = useMemo(
    () =>
      billSource?.type === "job"
        ? (jobs.find((j) => j.id === billSource.id) ?? null)
        : null,
    [billSource, jobs]
  );
  const sourceJobMaterials = useMemo(() => {
    if (!sourceJob) return [];
    const net = new Map<string, { name: string; qty: number; value: number }>();
    for (const e of sourceJob.materialEvents) {
      const cur = net.get(e.productId) ?? { name: e.name, qty: 0, value: 0 };
      const sign = e.kind === "issue" ? 1 : -1;
      cur.qty += sign * e.qty;
      cur.value += sign * e.value;
      net.set(e.productId, cur);
    }
    return [...net.values()].filter((r) => r.qty > 0);
  }, [sourceJob]);
  const remaining = total - paidSum;

  const heldBills = useMemo(
    () =>
      bills
        .filter((b) => b.status === "held")
        .slice()
        .sort((a, b) => a.ts.localeCompare(b.ts)),
    [bills]
  );
  const heldBill = heldId ? bills.find((b) => b.id === heldId) ?? null : null;

  const history = useMemo(() => {
    return bills
      .filter((b) => {
        if (range === "today" && b.dayOffset !== 0) return false;
        if (range === "week" && b.dayOffset > 6) return false;
        // lib/search: null-safe — a legacy bill missing customerName/
        // customerPhone must never throw here. Fix 5: the walk-in
        // label the desk displays for a nameless bill is itself a
        // search field, so "walk-in" / "عام گاہک" finds those bills.
        return billMatches(b, histSearch, t("billing.walkInCustomer"));
      })
      .slice()
      .sort((a, b) => b.ts.localeCompare(a.ts));
  }, [bills, histSearch, range, t]);

  const selected = selectedId ? bills.find((b) => b.id === selectedId) ?? null : null;

  /* Phase B · B2 (§2.5): the derived-availability soft warning.
   * available = on-hand − promised (open orders + dispatched
   * challans, unbilled) is a REPORT: a cart line beyond it earns a
   * warning below, never a block — posting stays governed by the
   * store's on-hand validation at postBill, exactly as before.
   * When this cart IS a conversion draft, the source document's own
   * promise is added back for its lines: billing precisely what an
   * order/challan promised must not warn against itself. */
  const availabilityWarnings = useMemo(() => {
    if (cart.length === 0) return [] as string[];
    // Phase C · C1 (§1.7): the availability report is read AT the
    // bill's warehouse now — on-hand and promised are both
    // per-location figures.
    const avail = availabilityByProductAtWarehouse(
      products,
      stockLevels,
      warehouses,
      saleOrders,
      deliveryChallans,
      bills,
      billWhId
    );
    const defWhId = defaultWarehouseId(warehouses);
    const own = new Map<string, number>();
    const addOrderPromise = (orderId: string) => {
      const o = saleOrders.find((x) => x.id === orderId);
      if (!o) return;
      // The source's own promise is added back ONLY when the
      // source promises at THIS bill's warehouse — a promise held
      // at another building is not stock here.
      if (effectiveWarehouseId(o, defWhId) !== billWhId) return;
      const billed = orderBilledQty(o, bills, deliveryChallans);
      for (const l of o.lines) {
        own.set(
          l.productId,
          (own.get(l.productId) ?? 0) + remainingQty(l.qty, billed, l.productId)
        );
      }
    };
    if (billSource?.type === "order") addOrderPromise(billSource.id);
    if (billSource?.type === "challan") {
      const c = deliveryChallans.find((x) => x.id === billSource.id);
      if (c?.orderId) addOrderPromise(c.orderId);
      else if (c) {
        if (effectiveWarehouseId(c, defWhId) !== billWhId) {
          // The challan promises at another warehouse — nothing to
          // add back here.
        } else {
          const billed = challanBilledQty(c, bills);
          for (const l of c.lines) {
            own.set(
              l.productId,
              (own.get(l.productId) ?? 0) + remainingQty(l.qty, billed, l.productId)
            );
          }
        }
      }
    }
    const out: string[] = [];
    for (const l of cart) {
      const a = avail.get(l.productId);
      const p = byId.get(l.productId);
      if (!a || !p) continue;
      const effective = a.available + (own.get(l.productId) ?? 0);
      if (l.qty > effective + 1e-9) {
        out.push(
          t("billing.availWarn", {
            name: p.name,
            available: fmtQty(Math.max(0, effective)),
            promised: fmtQty(a.promised),
          })
        );
      }
    }
    return out;
  }, [cart, products, saleOrders, deliveryChallans, bills, billSource, byId, t, stockLevels, warehouses, billWhId]);

  useEffect(() => {
    setReturnQty({});
    setRefundMethod("cash");
    setRefundAccountId("");
    setConfirmVoid(false);
    setThermal(false);
  }, [selectedId]);

  /* ---------------- cart helpers ---------------- */
  const fail = (text: string) => setNotice({ ok: false, text });
  const succeed = (text: string) => setNotice({ ok: true, text });

  const addLine = (productId: string) => {
    const p = byId.get(productId);
    if (!p) return;
    const existing = cart.find((l) => l.productId === productId);
    const nextQty = (existing?.qty ?? 0) + 1;
    // C1: the desk sells from the bill's warehouse — the row's
    // quantity is the shelf it can actually reach.
    const atWh = whQty(p);
    if (atWh <= 0 || nextQty > atWh) {
      fail(
        t("billing.errOutOfStock", {
          qty: fmtQty(atWh),
          unit: fmtUnit(p.unit),
          name: p.name,
        })
      );
      return;
    }
    setNotice(null);
    setCart((prev) =>
      existing
        ? prev.map((l) => (l.productId === productId ? { ...l, qty: nextQty } : l))
        : [...prev, { productId, qty: 1 }]
    );
  };

  const onSkuEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = sku.trim().toLowerCase();
    if (!code) return;
    // lib/search: null-safe — one sku-less legacy product must not
    // make every SKU lookup throw.
    const p = findProductBySku(products, code);
    if (!p) {
      fail(t("billing.errSkuNotFound", { sku: sku.trim() }));
      return;
    }
    addLine(p.id);
    setSku("");
  };

  /* POS picker: one click / one Enter and the product is IN the
   * cart; the search clears and focus returns for the next item. */
  const addFromPicker = (productId: string) => {
    const p = byId.get(productId);
    if (!p) return;
    const cur = cartQtyById.get(productId) ?? 0;
    addLine(productId);
    if (cur < whQty(p)) {
      setPickerSearch("");
      setPickIdx(0);
    }
    searchRef.current?.focus();
  };

  const onPickerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    pickerKeyDown(e, pickResults.length, pickIdx, setPickIdx, () => {
      const p = pickResults[pickIdx] ?? pickResults[0];
      if (p && whQty(p) > 0) addFromPicker(p.id);
    });
  };

  const setLineQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, qty: Number.isNaN(qty) ? 0 : qty } : l))
    );
  };

  const bumpLine = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, qty: Math.max(0, Math.round((l.qty + delta) * 1000) / 1000) }
          : l
      )
    );
  };

  const removeLine = (productId: string) =>
    setCart((prev) => prev.filter((l) => l.productId !== productId));

  /* Phase B: consume a conversion draft handed over by the Sale
   * Orders screen — prefill the cart (agreed prices), the customer
   * and the discount, and remember the source citation so the bill
   * this desk posts cites its order. Runs once on mount; the draft
   * itself posts nothing. */
  const draftAppliedRef = useRef(false);
  useEffect(() => {
    if (draftAppliedRef.current || !billDraft) return;
    draftAppliedRef.current = true;
    setCart(
      billDraft.lines.map((l) => ({
        productId: l.productId,
        qty: l.qty,
        unitPrice: l.unitPrice,
        sourceProductId: l.sourceProductId,
      }))
    );
    setCustomerId(billDraft.customerId ?? "");
    setCustomerName(billDraft.customerName);
    setCustomerPhone(billDraft.customerPhone);
    setDiscountType(billDraft.discountType);
    setDiscountValue(billDraft.discountValue ? String(billDraft.discountValue) : "");
    // C1 (§1.6): the conversion hands the desk its document's
    // warehouse preference (order/challan); a quotation draft has
    // none (location-free) and the picker stays on the default.
    setBillWarehouseId(billDraft.warehouseId ?? "");
    setPayments([blankPayRow()]);
    setHeldId(null);
    setBillSource({
      type: billDraft.sourceType,
      id: billDraft.sourceId,
      label: billDraft.sourceLabel,
    });
    setNotice({
      ok: true,
      text: t(
        billDraft.sourceType === "challan"
          ? "challan.notice.draftReady"
          : billDraft.sourceType === "quotation"
            ? "quote.notice.draftReadyBill"
            : billDraft.sourceType === "job"
              ? "job.notice.draftReady"
              : "order.notice.draftReady",
        { number: billDraft.sourceLabel }
      ),
    });
    clearBillDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billDraft]);

  /* ---------------- customer helpers ---------------- */
  const onCustomerSelect = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
    }
  };

  const saveNewCustomer = () => {
    if (!ncName.trim()) {
      fail(t("billing.errNcName"));
      return;
    }
    const id = addCustomer({
      name: ncName.trim(),
      phone: ncPhone.trim(),
      address: "",
      note: "",
    });
    setCustomerId(id);
    setCustomerName(ncName.trim());
    setCustomerPhone(ncPhone.trim());
    setNcName("");
    setNcPhone("");
    setShowNewCustomer(false);
    succeed(t("billing.successCustomerAdded", { name: ncName.trim() }));
  };

  /* ---------------- submit helpers ---------------- */
  const resetForm = () => {
    setCart([]);
    setSku("");
    setPickIdx(0);
    setPickerSearch("");
    setCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setDiscountType("flat");
    setDiscountValue("");
    setPayments([blankPayRow()]);
    setHeldId(null);
    setBillSource(null);
    setBillWarehouseId("");
  };

  /* Live-audit fix D: leaving held mode must never leave stale
   * payment rows or the "complete held bill" state behind. Discarding
   * the bill currently loaded on the desk resets the desk with it… */
  const discardHeld = (b: Bill) => {
    discardHeldBill(b.id);
    if (heldId === b.id) resetForm();
  };

  /* …and emptying the cart of a resumed held bill detaches the desk
   * from it (the held bill itself stays in the strip, resumable):
   * payments blank and the primary action reads "complete bill"
   * again, never a stale held total. */
  useEffect(() => {
    if (heldId && cart.length === 0) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heldId, cart.length]);

  const buildInput = (pays: BillPayment[]): NewBillInput => ({
    customerId: customerId || null,
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    lines: cart.map((l) => ({
      productId: l.productId,
      qty: l.qty,
      // §2.4: only conversion-prefilled lines carry an override.
      ...(l.unitPrice != null ? { unitPrice: l.unitPrice } : {}),
      ...(l.sourceProductId ? { sourceProductId: l.sourceProductId } : {}),
    })),
    discountType,
    discountValue: discountVal,
    payments: pays,
    // C1: the bill's warehouse — the resolved pick (§1.6).
    warehouseId: billWhId,
    ...(billSource
      ? { sourceType: billSource.type, sourceId: billSource.id }
      : {}),
  });

  /** Shared cart validation for new bills; returns an error or null. */
  const validateCart = (): string | null => {
    if (cart.length === 0) return t("billing.errNoItems");
    for (const l of cart) {
      const p = byId.get(l.productId);
      if (!p) return t("billing.errItemGone");
      if (l.qty <= 0) return t("billing.errQtyZero", { name: p.name });
      // C1: validated against the bill warehouse's row, matching
      // postBill's posting validation exactly (§1.6).
      const atWh = whQty(p);
      if (l.qty > atWh)
        return t("billing.errStockFor", {
          name: p.name,
          qty: fmtQty(atWh),
          unit: fmtUnit(p.unit),
        });
    }
    return null;
  };

  const validatePayments = (against: number): string | null => {
    if (Math.abs(paidSum - against) > 1)
      return t("billing.errPayMismatch", {
        paid: fmtPKR(paidSum),
        total: fmtPKR(against),
      });
    // B5: a cheque part is only a payment once its instrument is
    // captured — the store refuses an incomplete draft as well,
    // but the desk says so in words first.
    for (const r of payments) {
      if (
        r.instrument === "cheque" &&
        (parseFloat(r.amount) || 0) > 0 &&
        !chequeDraftOf(r.cheque)
      ) {
        return t("chq.err.capture");
      }
    }
    const hasCredit = parsedPayments.some((p) => p.method === "credit");
    if (hasCredit && !customerName.trim())
      return t("billing.errCreditNeedsName");
    // H1: points belong to a named customer — a points row on a
    // walk-in bill can never quote, so say so in words here (the
    // store refuses it too).
    if (payments.some((r) => r.instrument === "points") && !customerId)
      return t("bill.pointsNeedsCustomer");
    return null;
  };

  const completeBill = () => {
    setNotice(null);
    if (heldId) {
      if (!heldBill) {
        setHeldId(null);
        fail(t("billing.errHeldGone"));
        return;
      }
      const err = validatePayments(heldBill.total);
      if (err) return fail(err);
      const ok = finalizeBill(heldId, parsedPayments);
      if (!ok) return fail(t("billing.errHeldCompleteFailed"));
      const id = heldId;
      resetForm();
      setCartOpen(false);
      setSelectedId(id);
      succeed(t("billing.successHeldCompleted", { no: heldBill.billNo }));
      return;
    }
    const cartErr = validateCart();
    if (cartErr) return fail(cartErr);
    const payErr = validatePayments(total);
    if (payErr) return fail(payErr);
    const id = createBill(buildInput(parsedPayments));
    if (!id) return fail(t("billing.errBillFailed"));
    resetForm();
    setCartOpen(false);
    setSelectedId(id);
    succeed(t("billing.successBillCompleted"));
  };

  const holdCurrent = () => {
    setNotice(null);
    const cartErr = validateCart();
    if (cartErr) return fail(cartErr);
    const id = holdBill(buildInput([]));
    if (!id) return fail(t("billing.errHoldFailed"));
    resetForm();
    succeed(t("billing.successHeld"));
  };

  /* MC Billing workflow adoption 2026-10-27 (WEB): real keyboard
   * shortcuts — F2 focuses the barcode box, Ctrl+H holds the
   * current bill. (Enter already adds the scanned code.) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "F2") {
        e.preventDefault();
        skuRef.current?.focus();
      } else if (e.key.toLowerCase() === "h" && e.ctrlKey && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        holdCurrent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, payments, customerId, customerName, customerPhone, discountType, discountValue, billWarehouseId]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setShowCamera(false);
  };
  const startCamera = async () => {
    setCameraMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 0);
      const Detector = (window as unknown as { BarcodeDetector?: new () => { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
      if (Detector) {
        const detector = new Detector();
        const tick = async () => {
          if (!streamRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current!);
            const code = codes[0]?.rawValue?.trim().toLowerCase();
            if (code) {
              const prod = findProductBySku(products, code);
              if (prod) {
                addLine(prod.id);
                setCameraMsg(`اسکین ہوا: ${prod.name}`);
                stopCamera();
                return;
              }
              setCameraMsg("بارکوڈ ملا مگر یہ آئٹم دکان میں نہیں ہے۔");
            }
          } catch {
            /* detector hiccup — keep previewing */
          }
          if (streamRef.current) setTimeout(tick, 600);
        };
        setTimeout(tick, 600);
      } else {
        setCameraMsg("اس براؤزر میں خودکار بارکوڈ پڑھنا دستیاب نہیں — کوڈ دیکھ کر نیچے بارکوڈ باکس میں لکھیں۔");
      }
    } catch {
      setCameraMsg("کیمرہ نہیں کھلا — براؤزر کی کیمرہ اجازت چیک کریں، یا بارکوڈ باکس استعمال کریں۔");
    }
  };

  const submitAdvance = () => {
    if (!customerId) {
      fail("ایڈوانس کے لیے پہلے کسٹمر منتخب کریں (نیا کسٹمر بنائیں یا فہرست سے چنیں)۔");
      return;
    }
    const amt = Math.round(parseFloat(advAmount) || 0);
    if (!(amt > 0)) {
      fail("ایڈوانس کی رقم صفر سے زیادہ ہونی چاہیے۔");
      return;
    }
    const cust = customers.find((c) => c.id === customerId);
    addCustomerAdvance({
      customerId,
      customerName: cust?.name ?? customerName,
      customerPhone: cust?.phone ?? customerPhone,
      amount: amt,
      method: advMethod,
      note: advNote.trim(),
    });
    setAdvAmount("");
    setAdvNote("");
    succeed(`ایڈوانس درج ہو گیا: ${fmtPKR(amt)} — یہ رقم unearned کھاتے میں گئی ہے، وصولیوں (receivables) میں نہیں۔`);
  };

  const resumeHeld = (bill: Bill) => {
    setNotice(null);
    setCart(
      bill.items.map((it) => ({
        productId: it.productId,
        qty: it.qty,
        // Only a CONVERSION bill's lines keep their agreed price in
        // the resumed cart (§2.4) — an ordinary held bill re-prices
        // from the shelf exactly as before Phase B.
        ...(bill.sourceType ? { unitPrice: it.unitPrice } : {}),
        ...(it.sourceProductId ? { sourceProductId: it.sourceProductId } : {}),
      }))
    );
    // Phase B: a held CONVERSION bill keeps its citation — resuming
    // it restores the source so the completed bill still cites its
    // document (finalizeBill posts the held doc, which carries it
    // too). B2: the source may be an order, a challan or a
    // quotation; the label is looked up on the citing document.
    setBillSource(
      bill.sourceType && bill.sourceId
        ? {
            type: bill.sourceType,
            id: bill.sourceId,
            label:
              (bill.sourceType === "order"
                ? saleOrders.find((o) => o.id === bill.sourceId)?.number
                : bill.sourceType === "challan"
                  ? deliveryChallans.find((c) => c.id === bill.sourceId)?.number
                  : bill.sourceType === "job"
                    ? jobs.find((j) => j.id === bill.sourceId)?.number
                    : quotations.find((q) => q.id === bill.sourceId)?.number) ??
              bill.sourceType.toUpperCase(),
          }
        : null
    );
    setCustomerId(bill.customerId ?? "");
    setCustomerName(bill.customerName);
    setCustomerPhone(bill.customerPhone);
    // C1: a held bill resumes at ITS warehouse (§1.6).
    setBillWarehouseId(bill.warehouseId ?? "");
    setDiscountType(bill.discountType);
    setDiscountValue(bill.discountValue ? String(bill.discountValue) : "");
    setPayments(
      bill.payments.length > 0
        ? bill.payments.map((p) => {
            const chq =
              p.instrument === "cheque" && p.chequeId
                ? cheques.find((x) => x.id === p.chequeId)
                : undefined;
            return {
              method: p.method,
              amount: String(p.amount),
              accountId: p.accountId ?? "",
              instrument:
                p.instrument === "cheque"
                  ? ("cheque" as const)
                  : p.instrument === "points"
                    ? ("points" as const)
                    : null,
              points:
                p.instrument === "points" ? String(p.loyaltyPoints ?? "") : "",
              cheque: chq
                ? chequeFormOf({
                    chequeNo: chq.chequeNo,
                    bankName: chq.bankName,
                    issueDateISO: chq.issueDateISO,
                    dueDateISO: chq.dueDateISO,
                  })
                : emptyChequeForm(),
            };
          })
        : [{ ...blankPayRow(), amount: String(bill.total) }]
    );
    setHeldId(bill.id);
    setCartOpen(true);
    succeed(t("billing.successResumed", { no: bill.billNo }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fillRemaining = () => {
    setPayments((prev) => {
      const cashIdx = prev.findIndex(
        (r) => r.method === "cash" && r.instrument !== "cheque" && r.instrument !== "points"
      );
      if (cashIdx === -1) {
        return [
          { ...blankPayRow(), amount: String(Math.max(0, total)) },
          ...prev,
        ];
      }
      // H1: points rows contribute their (single, aggregate)
      // quoted value once, not their (empty) amount text.
      const hasPointsRow = prev.some((r, i) => i !== cashIdx && r.instrument === "points");
      const otherSum =
        prev.reduce(
          (a, r, i) =>
            i === cashIdx || r.instrument === "points"
              ? a
              : a + (parseFloat(r.amount) || 0),
          0
        ) + (hasPointsRow ? pointsQuote.rs : 0);
      return prev.map((r, i) =>
        i === cashIdx ? { ...r, amount: String(Math.max(0, total - otherSum)) } : r
      );
    });
  };

  /* ---------------- detail actions ---------------- */
  const printBill = (thermalPrint: boolean) => {
    setThermal(thermalPrint);
    window.setTimeout(() => window.print(), 50);
  };

  const processReturn = (bill: Bill) => {
    setNotice(null);
    const lines = bill.items
      .map((it) => ({
        productId: it.productId,
        qty: Math.max(0, parseFloat(returnQty[it.productId] ?? "") || 0),
      }))
      .filter((l) => l.qty > 0);
    if (lines.length === 0) return fail(t("billing.errReturnNone"));
    for (const l of lines) {
      const it = bill.items.find((x) => x.productId === l.productId);
      if (!it) continue;
      const max = it.qty - (bill.returnedQty?.[it.productId] ?? 0);
      if (l.qty > max)
        return fail(t("billing.errReturnMax", { qty: fmtQty(max), name: it.name }));
    }
    // B4: roles that may issue notes post the FORMAL return — same
    // engine, same figures, plus the credit note in the same batch.
    if (canNote) {
      const box: { number: string | null } = { number: null };
      const ok = returnItemsWithNote(
        bill.id,
        lines,
        refundMethod,
        refundAccountId || null,
        returnReason,
        (note) => {
          box.number = note.number;
        }
      );
      if (!ok) return fail(t("billing.errReturnFailed"));
      setReturnQty({});
      setReturnReason("");
      return succeed(
        box.number
          ? t("billing.successReturnedNote", { no: bill.billNo, note: box.number })
          : t("billing.successReturned", { no: bill.billNo })
      );
    }
    const ok = returnItems(bill.id, lines, refundMethod, refundAccountId || null);
    if (!ok) return fail(t("billing.errReturnFailed"));
    setReturnQty({});
    succeed(t("billing.successReturned", { no: bill.billNo }));
  };

  const doVoid = async (bill: Bill) => {
    /* E5 (design §4.6): voiding a posted bill is a gated action —
     * the PIN challenge is a view-layer precondition; a cancelled
     * or failed challenge composes nothing. */
    if (!(await requirePin("pin.gate.actVoid"))) {
      setConfirmVoid(false);
      return;
    }
    const ok = voidBill(bill.id);
    setConfirmVoid(false);
    if (ok) succeed(t("billing.successVoided", { no: bill.billNo }));
    else fail(t("billing.errVoidFailed"));
  };

  if (!can(role, "billing", "view")) return <PermDenied />;

  if (!ready) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  const waHref = (bill: Bill): string => {
    const lines = [
      settings.shopName || "Dukaan AI",
      t("billing.wa.billLine", { no: bill.billNo, date: fmtDateTime(bill.ts) }),
      ...bill.items.map((it) =>
        t("billing.wa.itemLine", {
          name: it.name,
          qty: fmtQty(it.qty),
          amount: fmtPKR(it.total),
        })
      ),
      ...(bill.discountAmount > 0
        ? [t("billing.wa.discount", { amount: fmtPKR(bill.discountAmount) })]
        : []),
      ...billTaxLines(bill).map((g) => {
        const label = `${g.name}${g.kind === "percent" ? ` ${g.rate}%` : ""}`;
        return g.inclusive
          ? t("billing.wa.taxIncluded", { label, amount: fmtPKR(g.amount) })
          : t("billing.wa.tax", { label, amount: fmtPKR(g.amount) });
      }),
      t("billing.wa.total", { amount: fmtPKR(bill.total) }),
      /* Phase E · E3 (§1.9): one Raast line when the shop has a
       * validated IBAN on record — a customer who cannot scan
       * can still transfer. Text only: wa.me cannot attach the
       * printed bill (§12.3). */
      ...(settings.raastIban && validatePkIban(settings.raastIban).ok
        ? [
            t("billing.wa.raastLine", {
              iban: groupIban(settings.raastIban),
            }),
          ]
        : []),
      ...(bill.payments.length > 0
        ? [
            t("billing.wa.payment", {
              payments: bill.payments.map((p) => payDisplay(p)).join(", "),
            }),
          ]
        : []),
      t("billing.wa.thanks"),
    ];
    const digits = bill.customerPhone.replace(/\D/g, "");
    const intl = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
    return `https://wa.me/${intl}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("billing.eyebrow")}</span>
          <h1 className="h2">{t("billing.title")}</h1>
          <p className="lead">{t("billing.subtitle")}</p>
        </div>

        {/* MC Billing workflow adoption 2026-10-27 (WEB) — POS polish:
            keyboard shortcuts that actually work, camera scan,
            DD/MM/YYYY date, billing-time advance, own-letterhead
            receipt (the print sheet uses THIS business's branding
            from settings, never another tenant's stored image). */}
        <section className="card" aria-label="POS shortcuts and date" style={{ marginBottom: 18 }}>
          <p style={{ margin: 0 }}>
            <b>کی بورڈ شارٹ کٹس:</b> F2 = بارکوڈ باکس پر جائیں · Enter = اسکین شدہ آئٹم بل میں ڈالیں · Ctrl+H = بل ہولڈ کریں
            {" · "}آج کی تاریخ: <b>{fmtDateShort(new Date())}</b> (DD/MM/YYYY)
          </p>
          <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "0.92rem" }}>
            {STOCK_DEDUCTION_NOTE} رسید اسی دکان کے اپنے لیٹرہیڈ کے ساتھ پرنٹ ہوتی ہے۔
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => (showCamera ? stopCamera() : void startCamera())}>
              {showCamera ? "کیمرہ بند کریں" : "📷 کیمرہ اسکین"}
            </button>
          </div>
          {showCamera && (
            <div style={{ marginTop: 12 }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#000" }} />
              {cameraMsg && <p style={{ margin: "8px 0 0" }}>{cameraMsg}</p>}
              <p className="hint">کیمرہ صرف بارکوڈ پڑھنے کے لیے کھلتا ہے؛ کوئی تصویر محفوظ نہیں ہوتی۔</p>
            </div>
          )}
          {!showCamera && cameraMsg && <p style={{ margin: "8px 0 0" }}>{cameraMsg}</p>}
        </section>

        {/* MC Billing workflow adoption 2026-10-27 (WEB) — billing-time
            customer advance: its own balanced entry (Dr money /
            Cr customer_advances, unearned), separate from the bill
            itself, so a bill's own entry stays one event = one entry. */}
        <section className="card" aria-label="Customer advance at billing" style={{ marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 4px" }}>کسٹمر ایڈوانس (بلنگ کے وقت)</h3>
          <p className="hint" style={{ margin: "0 0 12px" }}>
            کسٹمر سے پیشگی رقم لیں — یہ بل کی ادائیگی نہیں ہے۔ بل کی ادائیگی وصولیاں کم کرتی ہے؛ ایڈوانس unearned کھاتے میں جاتا ہے اور کسٹمر لیجر میں الگ نظر آتا ہے۔ پرانے ایڈوانس کی تاریخ کبھی بدلی نہیں جاتی۔
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <label className="field" style={{ minWidth: 160 }}>
              <span>رقم</span>
              <input type="number" min="0" value={advAmount} onChange={(e) => setAdvAmount(e.target.value)} placeholder="0" />
            </label>
            <label className="field" style={{ minWidth: 140 }}>
              <span>طریقہ</span>
              <select value={advMethod} onChange={(e) => setAdvMethod(e.target.value as typeof advMethod)}>
                <option value="cash">کیش</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="bank">بینک</option>
              </select>
            </label>
            <label className="field" style={{ flex: "1 1 180px" }}>
              <span>نوٹ (اختیاری)</span>
              <input type="text" value={advNote} onChange={(e) => setAdvNote(e.target.value)} placeholder="کس چیز کے لیے پیشگی؟" />
            </label>
            <button type="button" className="btn btn-primary btn-sm" onClick={submitAdvance} disabled={!customerId}>
              ایڈوانس درج کریں
            </button>
          </div>
          {!customerId && <p className="hint" style={{ margin: "8px 0 0" }}>پہلے بل کے کسٹمر باکس میں کسٹمر منتخب کریں، پھر ایڈوانس درج ہو گا۔</p>}
        </section>

        {/* ================= A) Bill builder — POS two-pane =================
            LEFT: product find (SKU + instant-add search) and held
            bills. RIGHT: the sticky cart — customer, lines, totals
            and the complete action never need scrolling to reach. */}
        <div className="pos-grid">
          <div className="pos-left">
        <section className="card" aria-label={t("billing.newBillAria")} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>
            {heldBill ? t("billing.resumingHeld", { no: heldBill.billNo }) : t("billing.newBill")}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 20 }}>
            {t("billing.builderHint")}
          </p>

          <div className="form">
            {/* Phase C · C1 (§1.6): the bill's ONE warehouse — every
                line on this bill leaves from here. */}
            <div className="field">
              <label htmlFor="bill-warehouse">{t("wh.pickerLabel")}</label>
              <select
                id="bill-warehouse"
                value={billWarehouseId}
                onChange={(e) => setBillWarehouseId(e.target.value)}
              >
                {warehouses
                  .filter((w) => !w.archived)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                    </option>
                  ))}
                {warehouses.length === 0 && (
                  <option value="">{t("wh.pickerNone")}</option>
                )}
              </select>
            </div>

            <div className="field">
              <label htmlFor="bill-sku">{t("billing.skuLabel")}</label>
              <input
                id="bill-sku"
                ref={skuRef}
                type="text"
                autoFocus
                placeholder={t("billing.skuPlaceholder")}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                onKeyDown={onSkuEnter}
              />
              <div className="hint">{t("billing.skuHint")}</div>
            </div>

            <div className="field">
              <label htmlFor="bill-search">{t("billing.findProduct")}</label>
              <div className="search-box" style={{ maxWidth: "none" }}>
                <IconSearch />
                <input
                  id="bill-search"
                  ref={searchRef}
                  type="search"
                  placeholder={t("billing.searchPlaceholder")}
                  value={pickerSearch}
                  onChange={(e) => {
                    setPickerSearch(e.target.value);
                    setPickIdx(0);
                  }}
                  onKeyDown={onPickerKeyDown}
                />
                {pickerSearch && (
                  <SearchClear
                    onClear={() => {
                      setPickerSearch("");
                      setPickIdx(0);
                      searchRef.current?.focus();
                    }}
                    label={t("action.clearSearch")}
                  />
                )}
              </div>
              {searching ? (
                <div style={{ marginTop: 10 }}>
                  <ProductResultList
                    items={pickResults.map((p) => ({
                      id: p.id,
                      name: p.name,
                      meta: t("billing.lineMeta", {
                        price: fmtPKR(p.salePrice),
                        unit: fmtUnit(p.unit),
                        qty: fmtQty(whQty(p)),
                      }),
                      price: fmtPKR(p.salePrice),
                      // C3: raw materials stay sellable (§4.1) —
                      // the picker marks them, never hides them.
                      badge: p.stockClass === "raw" ? t("inv.rawBadge") : null,
                      disabled: whQty(p) <= 0,
                      inCartQty: cartQtyById.get(p.id),
                      inCartLabel: t("billing.inCart", {
                        qty: fmtQty(cartQtyById.get(p.id) ?? 0),
                      }),
                    }))}
                    activeIndex={pickIdx}
                    onPick={addFromPicker}
                    emptyText={t("billing.noResults", { query: pickerSearch.trim() })}
                    listLabel={t("billing.resultsLabel")}
                  />
                </div>
              ) : (
                <p className="pick-hint">{t("billing.resultsHint")}</p>
              )}
            </div>
          </div>
        </section>

        {/* held bills strip */}
        {heldBills.length > 0 && (
          <section className="card" aria-label={t("billing.heldAria")} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: "1.15rem", marginBottom: 14 }}>
              {t("billing.heldTitle", { count: heldBills.length })}
            </h2>
            <div style={{ display: "grid", gap: 10 }}>
              {heldBills.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                    padding: "10px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    background: "var(--bg)",
                  }}
                >
                  <b>#{b.billNo}</b>
                  <span style={{ flex: "1 1 160px" }}>
                    {b.customerName || t("billing.walkInCustomer")}
                    <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                      {" "}
                      · {fmtTime(b.ts)}
                    </span>
                  </span>
                  <b style={{ fontFamily: "var(--font-display)" }}>{fmtPKR(b.total)}</b>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => resumeHeld(b)}
                  >
                    <IconEdit /> {t("billing.resume")}
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => discardHeld(b)}
                    aria-label={t("billing.discardHeldAria", { no: b.billNo })}
                  >
                    <IconTrash />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
          </div>{/* /pos-left */}

          <aside className={"pos-cart" + (cartOpen ? " open" : "")}>
            <div className="card pos-cart-card">
              <div className="pos-cart-head">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <h2 style={{ fontSize: "1.15rem" }}>
                    {heldBill
                      ? t("billing.resumingHeld", { no: heldBill.billNo })
                      : t("billing.newBill")}
                  </h2>
                  <button
                    type="button"
                    className="icon-btn pos-cart-close"
                    onClick={() => setCartOpen(false)}
                    aria-label={t("action.close")}
                  >
                    <IconClose />
                  </button>
                </div>
              </div>
              <div className="pos-cart-scroll">
                <div className="form">

            {/* cart lines */}
            {billSource && billSource.type !== "job" && (
              <div
                className="note-box"
                role="status"
                style={{ marginBottom: 12, borderStyle: "solid", borderColor: "var(--accent)" }}
              >
                {t(
                  billSource.type === "challan"
                    ? "doc.fromChallan"
                    : billSource.type === "quotation"
                      ? "doc.fromQuotation"
                      : "doc.fromOrder",
                  { number: billSource.label }
                )}{" "}
                ·{" "}
                {t(billSource.type === "challan" ? "challan.deskNote" : "doc.agreedPrices")}
              </div>
            )}
            {/* Phase C · C5 (R-C7): billing a job — the materials
             * already issued to it, listed so the desk never
             * bills them twice (§5.3). */}
            {billSource?.type === "job" && sourceJobMaterials.length > 0 && (
              <div
                className="note-box"
                role="status"
                style={{ marginBottom: 12, borderStyle: "solid", borderColor: "var(--amber, #b45309)" }}
              >
                <strong>
                  {t("job.bill.materialsTitle", { number: billSource.label })}
                </strong>
                <div>{t("job.bill.materialsSub")}</div>
                <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                  {sourceJobMaterials.map((r) => (
                    <li key={r.name}>
                      {r.name} · {fmtQty(r.qty)} · {fmtPKR(r.value)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cart.length === 0 ? (
              <div className="empty" style={{ padding: "28px 20px" }}>
                {t("billing.cartEmpty")}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {cart.map((line, lineIdx) => {
                  const p = byId.get(line.productId);
                  if (!p) return null;
                  const lineTax = cartTax.lines[lineIdx]?.taxAmount ?? 0;
                  const lineTaxIncl = cartTax.lines[lineIdx]?.slab?.inclusive === true;
                  const step = isFractional(p.unit) ? 0.5 : 1;
                  return (
                    <div
                      key={line.productId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        flexWrap: "wrap",
                        padding: "10px 14px",
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        background: "var(--bg)",
                      }}
                    >
                      <div style={{ flex: "1 1 180px", minWidth: 140 }}>
                        <b style={{ fontSize: "0.95rem" }}>{p.name}</b>
                        {p.stockClass === "raw" && (
                          <span className="badge amber" style={{ marginInlineStart: 8 }}>
                            {t("inv.rawBadge")}
                          </span>
                        )}
                        <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                          {t("billing.lineMeta", {
                            price: fmtPKR(line.unitPrice ?? p.salePrice),
                            unit: fmtUnit(p.unit),
                            qty: fmtQty(whQty(p)),
                          })}
                        </div>
                      </div>
                      <div className="stepper">
                        <button
                          type="button"
                          onClick={() => bumpLine(line.productId, -step)}
                          aria-label={t("billing.decreaseQtyOf", { name: p.name })}
                        >
                          −
                        </button>
                        <input
                          className="val"
                          type="number"
                          step="any"
                          min={0}
                          value={line.qty || ""}
                          placeholder="0"
                          onChange={(e) => setLineQty(line.productId, parseFloat(e.target.value))}
                          aria-label={t("billing.qtyFor", { name: p.name })}
                          style={{
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            width: 64,
                            font: "inherit",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => bumpLine(line.productId, step)}
                          aria-label={t("billing.increaseQtyOf", { name: p.name })}
                        >
                          +
                        </button>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <b
                          style={{
                            fontFamily: "var(--font-display)",
                            minWidth: 96,
                            display: "block",
                          }}
                        >
                          {fmtPKR(line.qty * (line.unitPrice ?? p.salePrice))}
                        </b>
                        {lineTax > 0 && (
                          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                            {t(lineTaxIncl ? "billing.tax.lineAmountIncl" : "billing.tax.lineAmount", {
                              amount: fmtPKR(lineTax),
                            })}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => removeLine(line.productId)}
                        aria-label={t("billing.removeFromBill", { name: p.name })}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* §2.5: soft availability warning — a report, never a block */}
            {availabilityWarnings.length > 0 && (
              <div
                className="note-box"
                role="status"
                style={{
                  marginTop: 12,
                  borderStyle: "solid",
                  borderColor: "var(--amber)",
                  color: "var(--amber-text)",
                }}
              >
                {availabilityWarnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            )}

            {/* customer */}
            <div className="form-grid">
              <div className="field">
                <label htmlFor="bill-customer">{t("billing.customerSaved")}</label>
                <select
                  id="bill-customer"
                  value={customerId}
                  onChange={(e) => onCustomerSelect(e.target.value)}
                >
                  <option value="">{t("billing.walkInOption")}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` — ${c.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowNewCustomer((s) => !s)}
                >
                  <IconPlus /> {t("billing.newCustomer")}
                </button>
              </div>
            </div>
            {showNewCustomer && (
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="nc-name">{t("billing.ncName")}</label>
                  <input
                    id="nc-name"
                    value={ncName}
                    onChange={(e) => setNcName(e.target.value)}
                    placeholder={t("billing.ncNamePlaceholder")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="nc-phone">{t("billing.ncPhone")}</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      id="nc-phone"
                      value={ncPhone}
                      onChange={(e) => setNcPhone(e.target.value)}
                      placeholder={t("billing.ncPhonePlaceholder")}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-primary btn-sm" onClick={saveNewCustomer}>
                      {t("billing.addAndSelect")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="form-grid">
              <div className="field">
                <label htmlFor="bill-cust-name">{t("billing.customerName")}</label>
                <input
                  id="bill-cust-name"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerId("");
                  }}
                  placeholder={t("billing.customerNamePlaceholder")}
                />
              </div>
              <div className="field">
                <label htmlFor="bill-cust-phone">{t("billing.customerPhone")}</label>
                <input
                  id="bill-cust-phone"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setCustomerId("");
                  }}
                  placeholder={t("billing.customerPhonePlaceholder")}
                />
              </div>
            </div>

            {/* discount (the totals themselves live in the pinned
                cart foot — always visible, never scrolled to) */}
            <div className="field">
              <label htmlFor="bill-discount-type">{t("billing.discount")}</label>
              <div style={{ display: "flex", gap: 10 }}>
                <select
                  id="bill-discount-type"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "flat" | "percent")}
                  style={{ flex: "0 0 130px" }}
                >
                  <option value="flat">{t("billing.discountFlat")}</option>
                  <option value="percent">{t("billing.discountPercent")}</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  aria-label={t("billing.discountValueAria")}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* payments */}
            <div className="field">
              <label>{t("billing.payments")}</label>
              <div style={{ display: "grid", gap: 10 }}>
                {payments.map((row, i) => (
                  <div key={i} style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div className="field" style={{ flex: "0 0 170px" }}>
                        <select
                          value={
                            row.instrument === "cheque"
                              ? "cheque"
                              : row.instrument === "points"
                                ? "points"
                                : row.method
                          }
                          onChange={(e) =>
                            setPayments((prev) =>
                              prev.map((r, j) => {
                                if (j !== i) return r;
                                // B5: "cheque" is the picker's sixth
                                // choice — an instrument on the row,
                                // not a method; the row's method rides
                                // as "bank" and its account clears.
                                if (e.target.value === "cheque") {
                                  return {
                                    ...r,
                                    instrument: "cheque" as const,
                                    method: "bank" as PayMethod,
                                    accountId: "",
                                  };
                                }
                                // H1: "points" is the seventh choice
                                // — the second instrument; the row's
                                // method rides as "cash" and the
                                // amount is the fold's quote.
                                if (e.target.value === "points") {
                                  return {
                                    ...r,
                                    instrument: "points" as const,
                                    method: "cash" as PayMethod,
                                    accountId: "",
                                  };
                                }
                                return {
                                  ...r,
                                  instrument: null,
                                  method: e.target.value as PayMethod,
                                  // A2: an account belongs to one method
                                  // bucket — reset the choice on switch.
                                  accountId: "",
                                };
                              })
                            )
                          }
                          aria-label={t("billing.payMethodAria")}
                        >
                          {PAY_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {payLabel(m)}
                            </option>
                          ))}
                          <option value="cheque">{t("chq.payOption")}</option>
                          {customerId && (
                            <option value="points">{t("bill.payPoints")}</option>
                          )}
                        </select>
                      </div>
                      {row.method !== "credit" &&
                        row.instrument !== "cheque" &&
                        row.instrument !== "points" && (
                        <div style={{ flex: "0 0 170px" }}>
                          <AccountPicker
                            method={row.method}
                            value={row.accountId}
                            onChange={(accountId) =>
                              setPayments((prev) =>
                                prev.map((r, j) => (j === i ? { ...r, accountId } : r))
                              )
                            }
                          />
                        </div>
                      )}
                      <div className="field" style={{ flex: 1 }}>
                        {row.instrument === "points" ? (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={row.points}
                            onChange={(e) =>
                              setPayments((prev) =>
                                prev.map((r, j) => (j === i ? { ...r, points: e.target.value } : r))
                              )
                            }
                            placeholder={t("bill.pointsUsePh")}
                            aria-label={t("bill.pointsUsePh")}
                          />
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={row.amount}
                            onChange={(e) =>
                              setPayments((prev) =>
                                prev.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r))
                              )
                            }
                            placeholder={t("billing.payAmountPlaceholder")}
                            aria-label={t("billing.payAmountAria")}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="icon-btn danger"
                        disabled={payments.length <= 1}
                        onClick={() => setPayments((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={t("billing.removePayRowAria")}
                      >
                        <IconTrash />
                      </button>
                    </div>
                    {row.instrument === "cheque" && (
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        }}
                      >
                        <ChequeFields
                          idPrefix={`bill-chq-${i}`}
                          value={row.cheque}
                          onChange={(cheque) =>
                            setPayments((prev) =>
                              prev.map((r, j) => (j === i ? { ...r, cheque } : r))
                            )
                          }
                        />
                      </div>
                    )}
                    {row.instrument === "points" && (
                      <div className="hint">
                        {t("bill.pointsBalance")}:{" "}
                        {(loyaltyPos?.redeemablePoints ?? 0).toLocaleString()}
                        {pointsQuote.points > 0 &&
                          ` · ${pointsQuote.points.toLocaleString()} = ${fmtPKR(pointsQuote.rs)}`}{" "}
                        · {t("bill.pointsMaxNote", { cap: loyaltySt.redeemCapPct })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPayments((prev) => [...prev, blankPayRow()])}
                >
                  <IconPlus /> {t("billing.addPayment")}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={fillRemaining}>
                  {t("billing.fillCash")}
                </button>
                <b
                  style={{
                    marginLeft: "auto",
                    color:
                      Math.abs(remaining) <= 1 ? "var(--accent-text)" : "var(--danger)",
                  }}
                >
                  {t("billing.remaining", { amount: fmtPKR(remaining) })}
                </b>
              </div>
              <div className="hint">
                {t("billing.creditNote", { amount: fmtPKR(Math.max(0, remaining)) })}
              </div>
            </div>

            {/* H1: the earn preview — what this bill will grant,
                folded from the same settings + journal the store
                posts against. Walk-in bills say plainly that they
                earn nothing (design §1.4). */}
            {loyaltySt.enabled && !heldId && cart.length > 0 &&
              (customerId ? (
                earnQuote && (
                  <div className="hint">
                    {t("bill.earnPreview", { points: earnQuote.points })}
                    {loyaltyPos && loyaltyPos.tier !== "standard"
                      ? ` · ${t(`loyalty.tier.${loyaltyPos.tier}` as I18nKey)}`
                      : ""}
                  </div>
                )
              ) : (
                <div className="hint">{t("bill.walkinNoEarn")}</div>
              ))}

            {heldBill && (
              <div className="note-box" style={{ marginTop: 0 }}>
                {t("billing.heldNote", { no: heldBill.billNo, total: fmtPKR(heldBill.total) })}
              </div>
            )}

            {notice && (
              <div
                className={notice.ok ? "note-box" : "form-error"}
                style={
                  notice.ok
                    ? { marginTop: 0, borderStyle: "solid", borderColor: "var(--accent)" }
                    : undefined
                }
              >
                {notice.text}
              </div>
            )}

                </div>
              </div>
              <div className="pos-cart-foot">
                <div style={rowBetween}>
                  <span style={{ color: "var(--muted)" }}>{t("billing.subtotal")}</span>
                  <b>{fmtPKR(subtotal)}</b>
                </div>
                <div style={rowBetween}>
                  <span style={{ color: "var(--muted)" }}>{t("billing.discount")}</span>
                  <b>− {fmtPKR(discountAmount)}</b>
                </div>
                {cartTaxGroups
                  .filter((g) => !g.inclusive)
                  .map((g) => (
                    <div style={rowBetween} key={`${g.name}|ex`}>
                      <span style={{ color: "var(--muted)" }}>
                        {g.name}
                        {g.kind === "percent" ? ` ${g.rate}%` : ""}
                      </span>
                      <b>+ {fmtPKR(g.amount)}</b>
                    </div>
                  ))}
                {cartTaxGroups
                  .filter((g) => g.inclusive)
                  .map((g) => (
                    <div style={rowBetween} key={`${g.name}|in`}>
                      <span style={{ color: "var(--muted)" }}>
                        {g.name}
                        {g.kind === "percent" ? ` ${g.rate}%` : ""} ·{" "}
                        {t("billing.tax.includedNote")}
                      </span>
                      <b>{fmtPKR(g.amount)}</b>
                    </div>
                  ))}
                <div
                  style={{
                    ...rowBetween,
                    borderTop: "1px solid var(--line)",
                    marginTop: 6,
                    paddingTop: 10,
                    fontSize: "1.2rem",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{t("billing.grandTotal")}</span>
                  <b style={{ fontFamily: "var(--font-display)" }}>{fmtPKR(total)}</b>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                  <button type="button" className="btn btn-primary btn-lg" onClick={completeBill}>
                    <IconCash /> {heldId ? t("billing.completeHeldBill") : t("billing.completeBill")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-amber"
                    onClick={holdCurrent}
                    disabled={!!heldId}
                  >
                    {t("billing.holdBill")}
                  </button>
                  {heldId && (
                    <button type="button" className="btn btn-ghost" onClick={resetForm}>
                      {t("billing.newBill")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>{/* /pos-grid */}

        {/* ================= C) Bill detail — the receipt modal.
            Opens the moment a bill completes (and from history):
            the receipt is on screen immediately, never below a
            scroll. Print output is the same .receipt-sheet. */}
        {selected && (
          <div
            className="modal-backdrop"
            onClick={() => setSelectedId(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("billing.detailAria")}
          >
            <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                <h2 style={{ fontSize: "1.3rem" }}>
                  {t("billing.billNoTitle", { no: selected.billNo })}{" "}
                  <span className={STATUS_BADGE[selected.status].cls}>
                    {t(STATUS_BADGE[selected.status].key)}
                  </span>
                </h2>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setSelectedId(null)}
                  aria-label={t("billing.closeDetailAria")}
                >
                  <IconClose />
                </button>
              </div>

              <div
                className="no-print"
                style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}
              >
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => printBill(false)}
                >
                  {t("action.print")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => printBill(true)}
                >
                  {t("action.print")} 80mm
                </button>
                <a
                  className="btn btn-ghost btn-sm"
                  href={waHref(selected)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconSend /> {t("action.whatsapp")}
                </a>
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setSelectedId(null);
                    searchRef.current?.focus();
                  }}
                >
                  <IconPlus /> {t("billing.newBill")}
                </button>
              </div>

              <div className="grid-2" style={{ alignItems: "start" }}>
                <BillPrintSheet
                  bill={selected}
                  settings={settings}
                  products={products}
                  cheques={cheques}
                  assets={brandingDataUrls(branding)}
                  thermal={thermal}
                />

                <div>
                  {canVoid &&
                    selected.status === "paid" &&
                    !Object.values(selected.returnedQty ?? {}).some((q) => q > 0) && (
                      <div style={{ marginBottom: 22 }}>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setConfirmVoid(true)}
                        >
                          {t("billing.voidBill")}
                        </button>
                      </div>
                    )}

                  {(selected.status === "paid" || selected.status === "partially_returned") && (
                    <>
                      <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>{t("billing.returnItems")}</h3>
                      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                        {selected.items.map((it) => {
                          const already = selected.returnedQty?.[it.productId] ?? 0;
                          const max = it.qty - already;
                          return (
                            <div
                              key={it.productId}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                flexWrap: "wrap",
                              }}
                            >
                              <div style={{ flex: "1 1 150px" }}>
                                <b style={{ fontSize: "0.92rem" }}>{it.name}</b>
                                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                                  {t("billing.returnMeta", {
                                    sold: fmtQty(it.qty),
                                    returned: fmtQty(already),
                                    left: fmtQty(max),
                                  })}
                                </div>
                              </div>
                              <div className="field" style={{ flex: "0 0 110px" }}>
                                <input
                                  type="number"
                                  min={0}
                                  max={max}
                                  step="any"
                                  disabled={max <= 0}
                                  value={returnQty[it.productId] ?? ""}
                                  onChange={(e) =>
                                    setReturnQty((prev) => ({
                                      ...prev,
                                      [it.productId]: e.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                  aria-label={t("billing.returnQtyAria", { name: it.name })}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {canNote && (
                        <div className="field" style={{ maxWidth: 420, marginBottom: 12 }}>
                          <label>{t("billing.returnReason")}</label>
                          <input
                            type="text"
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                            placeholder={t("billing.returnReasonPh")}
                          />
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <div className="field" style={{ flex: "0 0 170px" }}>
                          <select
                            value={refundMethod}
                            onChange={(e) => {
                              setRefundMethod(e.target.value as Exclude<PayMethod, "credit">);
                              setRefundAccountId("");
                            }}
                            aria-label={t("billing.refundMethodAria")}
                          >
                            {REFUND_METHODS.map((m) => (
                              <option key={m} value={m}>
                                {t("billing.refundPrefix", { method: payLabel(m) })}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: "0 0 170px" }}>
                          <AccountPicker
                            method={refundMethod}
                            value={refundAccountId}
                            onChange={setRefundAccountId}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-amber btn-sm"
                          onClick={() => processReturn(selected)}
                        >
                          {t("billing.processReturn")}
                        </button>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 10 }}>
                        {t("billing.returnNote")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= B) Bills history ================= */}
        <section aria-label={t("billing.historyAria")}>
          <div className="toolbar">
            <h2 style={{ fontSize: "1.3rem" }}>{t("billing.historyTitle")}</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div className="search-box">
                <IconSearch />
                <input
                  type="search"
                  placeholder={t("billing.histSearchPlaceholder")}
                  value={histSearch}
                  onChange={(e) => setHistSearch(e.target.value)}
                  aria-label={t("billing.histSearchAria")}
                />
                {histSearch && (
                  <SearchClear
                    onClear={() => setHistSearch("")}
                    label={t("action.clearSearch")}
                  />
                )}
              </div>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as "all" | "today" | "week")}
                aria-label={t("billing.rangeAria")}
                style={{
                  padding: "12px 16px",
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                  color: "var(--text)",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                }}
              >
                <option value="all">{t("billing.rangeAll")}</option>
                <option value="today">{t("common.today")}</option>
                <option value="week">{t("billing.rangeWeek")}</option>
              </select>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="empty">{t("billing.historyEmpty")}</div>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t("billing.thBillNo")}</th>
                    <th>{t("billing.thDate")}</th>
                    <th>{t("billing.thCustomer")}</th>
                    <th>{t("billing.thItems")}</th>
                    <th>{t("billing.thTotal")}</th>
                    <th>{t("billing.thStatus")}</th>
                    <th>{t("billing.payments")}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((b) => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      style={{ cursor: "pointer" }}
                      title={t("billing.openDetailTitle")}
                    >
                      <td>
                        <b>#{b.billNo}</b>
                      </td>
                      <td>{fmtDateTime(b.ts)}</td>
                      <td>
                        {b.customerName || t("billing.walkIn")}
                        {b.customerPhone && (
                          <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                            {b.customerPhone}
                          </div>
                        )}
                      </td>
                      <td>{b.items.length}</td>
                      <td>
                        <b style={{ fontFamily: "var(--font-display)" }}>{fmtPKR(b.total)}</b>
                      </td>
                      <td>
                        <span className={STATUS_BADGE[b.status].cls}>
                          {t(STATUS_BADGE[b.status].key)}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.88rem" }}>
                        {b.payments.length > 0
                          ? b.payments
                              .map((p) => payDisplay(p))
                              .join(" · ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* mobile: sticky cart bar + the sheet's scrim (desktop
            hides both — the cart is the sticky right pane there) */}
        {cartOpen && (
          <div className="pos-sheet-scrim" onClick={() => setCartOpen(false)} />
        )}
        <div className="pos-cartbar">
          <div>
            <div className="cb-total">{fmtPKR(total)}</div>
            <div className="cb-count">
              {t("billing.cartItems", { count: cart.length })}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setCartOpen(true)}
          >
            {t("billing.viewCart")}
          </button>
        </div>

        {/* void confirmation */}
        {confirmVoid && selected && (
          <div
            className="modal-backdrop"
            onClick={() => setConfirmVoid(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t("billing.voidModalAria")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("billing.voidTitle", { no: selected.billNo })}</h2>
              <p className="modal-sub">
                {t("billing.voidBody", { total: fmtPKR(selected.total) })}
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setConfirmVoid(false)}
                >
                  {t("billing.keepBill")}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => doVoid(selected)}
                >
                  <IconTrash /> {t("billing.voidBill")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
