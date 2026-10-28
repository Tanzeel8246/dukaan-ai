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
  IconTruck,
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
import { effectiveBillStatus } from "@/lib/ledger";
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
  unpaid: { cls: "badge red", key: "billing.status.unpaid" },
  partial: { cls: "badge amber", key: "billing.status.partial" },
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
  padding: "4px 0",
};

/** High-speed POS scan beep feedback (Web Audio API) */
function playScanBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    /* browser audio restrictions ignore */
  }
}

export default function BillingDesk() {
  const {
    ready,
    products,
    bills,
    credits,
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
  const canVoid = can(role, "billingVoid", "write");
  const canNote = can(role, "creditDebitNotes", "write");
  const { t } = useLang();
  const payLabel = (m: PayMethod) => t(PAY_KEY[m]);

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
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickIdx, setPickIdx] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  /* Camera barcode scan modal */
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMsg, setCameraMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* Billing-time customer advance modal */
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advAmount, setAdvAmount] = useState("");
  const [advMethod, setAdvMethod] = useState<"cash" | "jazzcash" | "easypaisa" | "bank">("cash");
  const [advNote, setAdvNote] = useState("");

  /* Held bills modal / drawer */
  const [showHeldModal, setShowHeldModal] = useState(false);

  /* Quick Cash Tender state */
  const [cashTendered, setCashTendered] = useState<string>("");

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
  const [billSource, setBillSource] = useState<{
    type: "order" | "challan" | "quotation" | "job";
    id: string;
    label: string;
  } | null>(null);
  const [billWarehouseId, setBillWarehouseId] = useState("");
  const billWhId = resolveWarehouseId(warehouses, billWarehouseId || null);
  const whQty = (p: (typeof products)[number]): number =>
    qtyAtWarehouse(p, stockLevels, warehouses, billWhId);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  /* ---------------- history / detail state ---------------- */
  const [histSearch, setHistSearch] = useState("");
  const [range, setRange] = useState<"all" | "today" | "week">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thermal, setThermal] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, string>>({});
  const [refundMethod, setRefundMethod] = useState<Exclude<PayMethod, "credit">>("cash");
  const [refundAccountId, setRefundAccountId] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [confirmVoid, setConfirmVoid] = useState(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const pickable = useMemo(() => {
    const list = [...products].sort((a, b) => a.name.localeCompare(b.name));
    return filterProducts(list, pickerSearch);
  }, [products, pickerSearch]);

  const searching = pickerSearch.trim().length > 0;
  const pickResults = useMemo(
    () => (searching ? pickable.slice(0, 10) : []),
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
          ...(r.instrument === "cheque"
            ? { instrument: "cheque" as const, cheque: chequeDraftOf(r.cheque) }
            : {}),
        };
      })
      .filter((p) => p.amount > 0);
  }, [payments, pointsQuote]);
  const paidSum = parsedPayments.reduce((a, p) => a + p.amount, 0);

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

  /* Quick Cash calculations */
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = tenderedNum > total ? tenderedNum - total : 0;

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
        return billMatches(b, histSearch, t("billing.walkInCustomer"));
      })
      .slice()
      .sort((a, b) => b.ts.localeCompare(a.ts));
  }, [bills, histSearch, range, t]);

  const selected = selectedId ? bills.find((b) => b.id === selectedId) ?? null : null;

  const availabilityWarnings = useMemo(() => {
    if (cart.length === 0) return [] as string[];
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
      else if (c && effectiveWarehouseId(c, defWhId) === billWhId) {
        const billed = challanBilledQty(c, bills);
        for (const l of c.lines) {
          own.set(
            l.productId,
            (own.get(l.productId) ?? 0) + remainingQty(l.qty, billed, l.productId)
          );
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
    playScanBeep();
    setCart((prev) =>
      existing
        ? prev.map((l) => (l.productId === productId ? { ...l, qty: nextQty } : l))
        : [...prev, { productId, qty: 1 }]
    );
  };

  /* Unified Omni-Search & Barcode key handler */
  const onOmniKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = pickerSearch.trim().toLowerCase();
      if (!code) return;
      // 1. Direct SKU / Barcode lookup
      const p = findProductBySku(products, code);
      if (p) {
        addLine(p.id);
        setPickerSearch("");
        setPickIdx(0);
        return;
      }
      // 2. Pick highlighted item from result list
      if (pickResults.length > 0) {
        const item = pickResults[pickIdx] ?? pickResults[0];
        if (item && whQty(item) > 0) {
          addFromPicker(item.id);
          return;
        }
      }
      fail(t("billing.errSkuNotFound", { sku: pickerSearch.trim() }));
      return;
    }

    // Arrow navigation
    pickerKeyDown(e, pickResults.length, pickIdx, setPickIdx, () => {
      const p = pickResults[pickIdx] ?? pickResults[0];
      if (p && whQty(p) > 0) addFromPicker(p.id);
    });
  };

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

  /* Phase B: conversion draft prefill */
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

  /* ---------------- Quick Cash helper ---------------- */
  const applyQuickCash = (val: number) => {
    setCashTendered(String(val));
    setPayments((prev) => {
      const cashIdx = prev.findIndex(
        (r) => r.method === "cash" && r.instrument !== "cheque" && r.instrument !== "points"
      );
      // When tendered >= total, we post exact total to balance entry; change is calculated and shown live
      const amtToPost = val >= total ? total : val;
      if (cashIdx === -1) {
        return [{ ...blankPayRow(), amount: String(amtToPost) }, ...prev];
      }
      return prev.map((r, i) => (i === cashIdx ? { ...r, amount: String(amtToPost) } : r));
    });
  };

  /* ---------------- submit helpers ---------------- */
  const resetForm = () => {
    setCart([]);
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
    setCashTendered("");
  };

  const discardHeld = (b: Bill) => {
    discardHeldBill(b.id);
    if (heldId === b.id) resetForm();
  };

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
      ...(l.unitPrice != null ? { unitPrice: l.unitPrice } : {}),
      ...(l.sourceProductId ? { sourceProductId: l.sourceProductId } : {}),
    })),
    discountType,
    discountValue: discountVal,
    payments: pays,
    warehouseId: billWhId,
    ...(billSource ? { sourceType: billSource.type, sourceId: billSource.id } : {}),
  });

  const validateCart = (): string | null => {
    if (cart.length === 0) return t("billing.errNoItems");
    for (const l of cart) {
      const p = byId.get(l.productId);
      if (!p) return t("billing.errItemGone");
      if (l.qty <= 0) return t("billing.errQtyZero", { name: p.name });
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

    // Strict Udhaar lock: block credit sale to nameless walk-in customer
    const hasCredit = parsedPayments.some((p) => p.method === "credit") || total > paidSum;
    if (hasCredit && !customerId && !customerName.trim()) {
      fail(t("billing.errCreditNeedsName"));
      return;
    }

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

  /* POS Global Hotkeys: F2 (Omni Search), F4 (Complete), F8 (Hold), F9 (Reset), Esc (Close modals) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "F4") {
        e.preventDefault();
        completeBill();
      } else if (e.key === "F8" || (e.key.toLowerCase() === "h" && e.ctrlKey && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT")) {
        e.preventDefault();
        holdCurrent();
      } else if (e.key === "F9") {
        e.preventDefault();
        resetForm();
      } else if (e.key === "Escape") {
        setShowCamera(false);
        setShowAdvanceModal(false);
        setShowHeldModal(false);
        setShowNewCustomer(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, payments, customerId, customerName, customerPhone, discountType, discountValue, billWarehouseId, total, heldId, heldBill]);

  /* Camera controls */
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
                setCameraMsg(t("billing.camScanSuccess", { name: prod.name }));
                stopCamera();
                return;
              }
              setCameraMsg(t("billing.camNotFound"));
            }
          } catch {
            /* retry next tick */
          }
          if (streamRef.current) setTimeout(tick, 600);
        };
        setTimeout(tick, 600);
      } else {
        setCameraMsg(t("billing.camUnsupported"));
      }
    } catch {
      setCameraMsg(t("billing.camError"));
    }
  };

  /* Billing-time customer advance submission */
  const submitAdvance = () => {
    if (!customerId) {
      fail(t("billing.advanceNeedCustomer"));
      return;
    }
    const amt = Math.round(parseFloat(advAmount) || 0);
    if (!(amt > 0)) {
      fail(t("billing.advanceAmtZero"));
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
    setShowAdvanceModal(false);
    succeed(t("billing.advanceSuccess", { amount: fmtPKR(amt) }));
  };

  const resumeHeld = (bill: Bill) => {
    setNotice(null);
    setCart(
      bill.items.map((it) => ({
        productId: it.productId,
        qty: it.qty,
        ...(bill.sourceType ? { unitPrice: it.unitPrice } : {}),
        ...(it.sourceProductId ? { sourceProductId: it.sourceProductId } : {}),
      }))
    );
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
    setShowHeldModal(false);
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
        {/* ================= OPTION 1: CLASSIC HIGH-SPEED COUNTER POS ================= */}

        {/* 1. Header Toolbar: Omni-Search + Camera + Customer + Warehouse + Hotkeys HUD */}
        <section className="pos-counter-topbar" aria-label="POS Counter Command Strip">
          {/* Omni Barcode & Product Search */}
          <div className="pos-omni-wrap">
            <input
              id="pos-omni-search"
              ref={searchRef}
              type="search"
              className="pos-omni-input"
              autoFocus
              placeholder="بارکوڈ اسکین کریں یا پروڈکٹ کا نام لکھیں... [F2]"
              value={pickerSearch}
              onChange={(e) => {
                setPickerSearch(e.target.value);
                setPickIdx(0);
              }}
              onKeyDown={onOmniKeyDown}
              aria-label="بارکوڈ اور پروڈکٹ تلاش"
            />
            <div className="pos-omni-actions">
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
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => (showCamera ? stopCamera() : void startCamera())}
                title="کیمرہ بارکوڈ اسکین"
                style={{ padding: "6px 8px" }}
              >
                📷
              </button>
            </div>

            {/* Instant drop-down picker results */}
            {searching && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  insetInline: 0,
                  zIndex: 45,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                }}
              >
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
            )}
          </div>

          {/* Customer Selection & Quick Actions */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              id="bill-customer-select"
              value={customerId}
              onChange={(e) => onCustomerSelect(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                background: "var(--bg)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: "0.92rem",
                maxWidth: 200,
              }}
              aria-label="کسٹمر منتخب کریں"
            >
              <option value="">{t("billing.walkInOption")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` — ${c.phone}` : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowNewCustomer((s) => !s)}
              title="نیا گاہک درج کریں"
            >
              <IconPlus /> نیا گاہک
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAdvanceModal(true)}
              title="کسٹمر ایڈوانس درج کریں"
            >
              💰 پیشگی رقم
            </button>

            {/* Warehouse select */}
            {warehouses.length > 0 && (
              <select
                value={billWarehouseId}
                onChange={(e) => setBillWarehouseId(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
                aria-label={t("wh.pickerLabel")}
              >
                {warehouses
                  .filter((w) => !w.archived)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.isDefault ? ` (${t("wh.pickerDefaultSuffix")})` : ""}
                    </option>
                  ))}
              </select>
            )}

            {/* Held bills pill */}
            {heldBills.length > 0 && (
              <button
                type="button"
                className="btn btn-amber btn-sm"
                onClick={() => setShowHeldModal((s) => !s)}
              >
                ⏸ ہولڈ بلز ({heldBills.length})
              </button>
            )}
          </div>

          {/* Hotkeys HUD */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span className="pos-hotkey-badge"><b>F2</b> سرچ</span>
            <span className="pos-hotkey-badge"><b>F4</b> مکمل بل</span>
            <span className="pos-hotkey-badge"><b>F8</b> ہولڈ</span>
            <span className="pos-hotkey-badge"><b>F9</b> نیا بل</span>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)", marginInlineStart: 4 }}>
              {fmtDateShort(new Date())}
            </span>
          </div>
        </section>

        {/* Inline New Customer Strip (when toggled) */}
        {showNewCustomer && (
          <section className="card" style={{ marginBottom: 16, background: "var(--card-2)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
              <div className="field" style={{ flex: "1 1 200px" }}>
                <label htmlFor="nc-name">{t("billing.ncName")}</label>
                <input
                  id="nc-name"
                  value={ncName}
                  onChange={(e) => setNcName(e.target.value)}
                  placeholder={t("billing.ncNamePlaceholder")}
                />
              </div>
              <div className="field" style={{ flex: "1 1 200px" }}>
                <label htmlFor="nc-phone">{t("billing.ncPhone")}</label>
                <input
                  id="nc-phone"
                  value={ncPhone}
                  onChange={(e) => setNcPhone(e.target.value)}
                  placeholder={t("billing.ncPhonePlaceholder")}
                />
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={saveNewCustomer}>
                {t("billing.addAndSelect")}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewCustomer(false)}>
                منسوخ
              </button>
            </div>
          </section>
        )}

        {/* Document Conversion Pipeline Stepper */}
        {billSource && (
          <div className="pos-pipeline-stepper" role="status">
            <span className={"pos-pipeline-step " + (billSource.type === "quotation" ? "past" : "")}>
              کوٹیشن (Quotation)
            </span>
            <span className="pos-pipeline-sep">➔</span>
            <span className={"pos-pipeline-step " + (billSource.type === "order" ? "past" : "")}>
              سیل آرڈر (Sale Order)
            </span>
            <span className="pos-pipeline-sep">➔</span>
            <span className={"pos-pipeline-step " + (billSource.type === "challan" ? "past" : "")}>
              ڈلیوری چالان (Challan)
            </span>
            <span className="pos-pipeline-sep">➔</span>
            <span className="pos-pipeline-step active">
              بلنگ ڈیسک (#{billSource.label})
            </span>
            <span style={{ marginInlineStart: "auto", fontSize: "0.82rem", color: "var(--accent-text)" }}>
              {t(billSource.type === "challan" ? "challan.deskNote" : "doc.agreedPrices")}
            </span>
          </div>
        )}

        {/* Phase C · C5: Job materials banner */}
        {billSource?.type === "job" && sourceJobMaterials.length > 0 && (
          <div
            className="note-box"
            role="status"
            style={{ marginBottom: 14, borderStyle: "solid", borderColor: "var(--amber, #b45309)" }}
          >
            <strong>{t("job.bill.materialsTitle", { number: billSource.label })}</strong>
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

        {/* Notice alert */}
        {notice && (
          <div
            className={notice.ok ? "note-box" : "form-error"}
            style={
              notice.ok
                ? { marginBottom: 14, borderStyle: "solid", borderColor: "var(--accent)" }
                : { marginBottom: 14 }
            }
          >
            {notice.text}
          </div>
        )}

        {/* 2. Central Live POS Cart Table */}
        <section className="pos-table-card" aria-label="POS Cart Table">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 18px",
              background: "var(--card-2)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", margin: 0 }}>
              {heldBill
                ? t("billing.resumingHeld", { no: heldBill.billNo })
                : `کاؤنٹر بل (${cart.length} آئٹمز)`}
            </h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {customerId && loyaltyPos && (
                <span className="badge green" style={{ fontSize: "0.8rem" }}>
                  پوائنٹس: {loyaltyPos.redeemablePoints.toLocaleString()}
                </span>
              )}
              {cart.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={resetForm}
                  style={{ color: "var(--danger)" }}
                >
                  <IconTrash /> خالی کریں
                </button>
              )}
            </div>
          </div>

          <div className="pos-table-scroll">
            {cart.length === 0 ? (
              <div className="empty" style={{ padding: "48px 20px" }}>
                <p style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 6px" }}>
                  کاؤنٹر بل خالی ہے
                </p>
                <p style={{ color: "var(--muted)", margin: 0 }}>
                  بارکوڈ اسکین کریں یا اوپر پروڈکٹ کا نام لکھ کر انٹر دبائیں [F2]
                </p>
              </div>
            ) : (
              <table className="pos-counter-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>پروڈکٹ / آئٹم</th>
                    <th style={{ width: 140 }}>قیمت فی یونٹ</th>
                    <th style={{ width: 170, textAlign: "center" }}>مقدار (Qty)</th>
                    <th style={{ width: 110, textAlign: "end" }}>ٹیکس</th>
                    <th style={{ width: 140, textAlign: "end" }}>کل رقم</th>
                    <th style={{ width: 50, textAlign: "center" }}>عمل</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line, idx) => {
                    const p = byId.get(line.productId);
                    if (!p) return null;
                    const lineTax = cartTax.lines[idx]?.taxAmount ?? 0;
                    const lineTaxIncl = cartTax.lines[idx]?.slab?.inclusive === true;
                    const step = isFractional(p.unit) ? 0.5 : 1;
                    const lineTotal = line.qty * (line.unitPrice ?? p.salePrice);

                    return (
                      <tr key={line.productId}>
                        <td style={{ color: "var(--muted)", fontWeight: 700 }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: "1rem" }}>{p.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                            اسٹاک: {fmtQty(whQty(p))} {fmtUnit(p.unit)}
                            {p.stockClass === "raw" && (
                              <span className="badge amber" style={{ marginInlineStart: 8, padding: "1px 6px" }}>
                                {t("inv.rawBadge")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <b style={{ fontFamily: "var(--font-display)" }}>
                            {fmtPKR(line.unitPrice ?? p.salePrice)}
                          </b>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <button
                              type="button"
                              className="pos-stepper-btn"
                              onClick={() => bumpLine(line.productId, -step)}
                              aria-label="مقدار کم کریں"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={line.qty || ""}
                              onChange={(e) => setLineQty(line.productId, parseFloat(e.target.value))}
                              style={{
                                width: 62,
                                textAlign: "center",
                                fontWeight: 800,
                                fontFamily: "var(--font-display)",
                                fontSize: "1.05rem",
                                padding: "4px 6px",
                                border: "1px solid var(--line)",
                                borderRadius: 8,
                                background: "var(--bg)",
                                color: "var(--text)",
                              }}
                            />
                            <button
                              type="button"
                              className="pos-stepper-btn"
                              onClick={() => bumpLine(line.productId, step)}
                              aria-label="مقدار بڑھائیں"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: "end", fontSize: "0.86rem", color: "var(--muted)" }}>
                          {lineTax > 0 ? (
                            <span>
                              {fmtPKR(lineTax)}
                              <br />
                              <small>{lineTaxIncl ? "(شامل)" : "(الگ)"}</small>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "end" }}>
                          <b style={{ fontFamily: "var(--font-display)", fontSize: "1.08rem" }}>
                            {fmtPKR(lineTotal)}
                          </b>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => removeLine(line.productId)}
                            aria-label="حذف کریں"
                          >
                            <IconTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Availability report note */}
          {availabilityWarnings.length > 0 && (
            <div
              className="note-box"
              role="status"
              style={{
                margin: 12,
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
        </section>

        {/* 3. Bottom POS Command Deck (Discounts/Payments + Quick Cash + Grand Totals & Complete) */}
        <section className="pos-deck" aria-label="POS Command Deck">
          {/* Deck Column 1: Payments & Tender methods */}
          <div className="pos-deck-col">
            <div>
              <h3 style={{ fontSize: "1.05rem", margin: "0 0 12px" }}>ڈسکاؤنٹ و طریقہ ادائیگی</h3>

              {/* Discount inputs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "flat" | "percent")}
                  style={{
                    flex: "0 0 110px",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                  aria-label="ڈسکاؤنٹ کی قسم"
                >
                  <option value="flat">روپے (Flat)</option>
                  <option value="percent">فیصد (%)</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="ڈسکاؤنٹ رعایت"
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                />
              </div>

              {/* Multi-payment rows */}
              <div style={{ display: "grid", gap: 8 }}>
                {payments.map((row, i) => (
                  <div key={i} style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
                              if (e.target.value === "cheque") {
                                return {
                                  ...r,
                                  instrument: "cheque" as const,
                                  method: "bank" as PayMethod,
                                  accountId: "",
                                };
                              }
                              if (e.target.value === "points") {
                                return {
                                  ...r,
                                  instrument: "points" as const,
                                  method: "cash" as PayMethod,
                                  accountId: "",
                                };
                              }
                              if (e.target.value === "credit") {
                                const otherSum = prev.reduce((a, it, idx) => {
                                  if (idx === i) return a;
                                  if (it.instrument === "points") return a + (pointsQuote.rs || 0);
                                  return a + (parseFloat(it.amount) || 0);
                                }, 0);
                                const remDue = Math.max(0, total - otherSum);
                                return {
                                  ...r,
                                  instrument: null,
                                  method: "credit" as PayMethod,
                                  amount: remDue > 0 ? String(remDue) : r.amount,
                                  accountId: "",
                                };
                              }
                              return {
                                ...r,
                                instrument: null,
                                method: e.target.value as PayMethod,
                                accountId: "",
                              };
                            })
                          )
                        }
                        style={{
                          flex: "0 0 120px",
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid var(--line)",
                          background: "var(--bg)",
                          color: "var(--text)",
                        }}
                      >
                        {PAY_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {payLabel(m)}
                          </option>
                        ))}
                        <option value="cheque">{t("chq.payOption")}</option>
                        {customerId && <option value="points">{t("bill.payPoints")}</option>}
                      </select>

                      {row.method !== "credit" &&
                        row.instrument !== "cheque" &&
                        row.instrument !== "points" && (
                          <div style={{ flex: "0 0 130px" }}>
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

                      <div style={{ flex: 1 }}>
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
                            placeholder="پوائنٹس تعداد"
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid var(--line)",
                              background: "var(--bg)",
                              color: "var(--text)",
                            }}
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
                            placeholder="رقم"
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid var(--line)",
                              background: "var(--bg)",
                              color: "var(--text)",
                            }}
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        className="icon-btn danger"
                        disabled={payments.length <= 1}
                        onClick={() => setPayments((prev) => prev.filter((_, j) => j !== i))}
                        aria-label="قطار حذف کریں"
                        style={{ width: 32, height: 32 }}
                      >
                        <IconTrash />
                      </button>
                    </div>

                    {row.instrument === "cheque" && (
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
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
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPayments((prev) => [...prev, blankPayRow()])}
              >
                <IconPlus /> مزید طریقہ
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={fillRemaining}>
                باقی رقم کیش میں بھریں
              </button>
            </div>
          </div>

          {/* Deck Column 2: Quick Cash Tender & Change Due */}
          <div className="pos-deck-col">
            <div>
              <h3 style={{ fontSize: "1.05rem", margin: "0 0 10px" }}>
                فوری نقد ادائیگی (Quick Cash)
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "var(--muted)" }}>
                نوٹ پر کلک کریں — سسٹم خود بخود گاہک کو واپس کی جانے والی رقم شمار کر لے گا۔
              </p>

              <div className="pos-quick-cash-grid">
                <button
                  type="button"
                  className="pos-cash-btn"
                  onClick={() => applyQuickCash(total)}
                >
                  برابر رقم ({fmtPKR(total)})
                </button>
                <button
                  type="button"
                  className="pos-cash-btn"
                  onClick={() => applyQuickCash(100)}
                >
                  Rs 100
                </button>
                <button
                  type="button"
                  className="pos-cash-btn"
                  onClick={() => applyQuickCash(500)}
                >
                  Rs 500
                </button>
                <button
                  type="button"
                  className="pos-cash-btn"
                  onClick={() => applyQuickCash(1000)}
                >
                  Rs 1,000
                </button>
                <button
                  type="button"
                  className="pos-cash-btn"
                  onClick={() => applyQuickCash(5000)}
                >
                  Rs 5,000
                </button>
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    type="number"
                    min={0}
                    value={cashTendered}
                    onChange={(e) => applyQuickCash(parseFloat(e.target.value) || 0)}
                    placeholder="دیگر کیش..."
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Change due / Remaining display */}
            <div>
              {changeDue > 0 ? (
                <div className="pos-change-box">
                  <span style={{ fontSize: "0.88rem", color: "var(--accent-text)", fontWeight: 700 }}>
                    گاہک کو واپسی (Change Due):
                  </span>
                  <span className="pos-change-val">{fmtPKR(changeDue)}</span>
                </div>
              ) : remaining > 0 ? (
                <div className="pos-change-box due">
                  <span style={{ fontSize: "0.88rem", color: "var(--amber-text)", fontWeight: 700 }}>
                    بقایا واجب الادا (Remaining):
                  </span>
                  <span className="pos-change-val" style={{ color: "var(--amber-text)" }}>
                    {fmtPKR(remaining)}
                  </span>
                </div>
              ) : (
                <div className="pos-change-box">
                  <span style={{ fontSize: "0.88rem", color: "var(--accent-text)", fontWeight: 700 }}>
                    ادائیگی مکمل ہے ✓
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Deck Column 3: Totals & Complete Bill Action */}
          <div className="pos-deck-col" style={{ background: "var(--card-2)" }}>
            <div>
              <div style={rowBetween}>
                <span style={{ color: "var(--muted)" }}>{t("billing.subtotal")}</span>
                <b>{fmtPKR(subtotal)}</b>
              </div>
              {discountAmount > 0 && (
                <div style={rowBetween}>
                  <span style={{ color: "var(--muted)" }}>{t("billing.discount")}</span>
                  <b style={{ color: "var(--danger)" }}>− {fmtPKR(discountAmount)}</b>
                </div>
              )}
              {cartTaxGroups.map((g) => (
                <div style={rowBetween} key={`${g.name}|${g.inclusive ? "in" : "ex"}`}>
                  <span style={{ color: "var(--muted)" }}>
                    {g.name} {g.kind === "percent" ? `${g.rate}%` : ""} {g.inclusive ? "(شامل)" : ""}
                  </span>
                  <b>{g.inclusive ? "" : "+ "}{fmtPKR(g.amount)}</b>
                </div>
              ))}
              <div
                style={{
                  ...rowBetween,
                  borderTop: "2px solid var(--line)",
                  marginTop: 8,
                  paddingTop: 12,
                }}
              >
                <span style={{ fontWeight: 800, fontSize: "1.15rem" }}>{t("billing.grandTotal")}</span>
                <b style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--accent-text)" }}>
                  {fmtPKR(total)}
                </b>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={completeBill}
                disabled={cart.length === 0}
                style={{
                  padding: "16px",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  justifyContent: "center",
                }}
              >
                <IconCash /> [F4] {heldId ? t("billing.completeHeldBill") : "بل مکمل کریں"}
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-amber"
                  onClick={holdCurrent}
                  disabled={cart.length === 0 || !!heldId}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  [F8] {t("billing.holdBill")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={resetForm}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  [F9] نیا بل
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================= MODALS & DRAWERS ================= */}

        {/* 1. Customer Advance Modal */}
        {showAdvanceModal && (
          <div
            className="modal-backdrop"
            onClick={() => setShowAdvanceModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: "1.3rem", margin: 0 }}>کسٹمر پیشگی رقم (Advance)</h2>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowAdvanceModal(false)}
                  aria-label="بند کریں"
                >
                  <IconClose />
                </button>
              </div>
              <p className="hint" style={{ margin: "0 0 16px" }}>
                کسٹمر سے پیشگی رقم لیں — یہ رقم unearned کھاتے میں جاتی ہے اور کسٹمر لیجر میں محفوظ رہتی ہے۔
              </p>
              <div className="form">
                <div className="field">
                  <label>کسٹمر</label>
                  <b>{customerName || "پہلے اوپر کسٹمر منتخب کریں"}</b>
                  {!customerId && (
                    <div style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 4 }}>
                      ایڈوانس درج کرنے کے لیے کسٹمر کا انتخاب لازمی ہے۔
                    </div>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="adv-amt">رقم</label>
                  <input
                    id="adv-amt"
                    type="number"
                    min="0"
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label htmlFor="adv-method">طریقہ ادائیگی</label>
                  <select
                    id="adv-method"
                    value={advMethod}
                    onChange={(e) => setAdvMethod(e.target.value as typeof advMethod)}
                  >
                    <option value="cash">کیش (Cash)</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="bank">بینک (Bank)</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="adv-note">تفصیل / نوٹ</label>
                  <input
                    id="adv-note"
                    type="text"
                    value={advNote}
                    onChange={(e) => setAdvNote(e.target.value)}
                    placeholder="پیشگی کس چیز کے لیے ہے؟"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowAdvanceModal(false)}>
                    منسوخ
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={submitAdvance}
                    disabled={!customerId}
                  >
                    ایڈوانس محفوظ کریں
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Camera Barcode Scanner Modal */}
        {showCamera && (
          <div
            className="modal-backdrop"
            onClick={stopCamera}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: "1.2rem", margin: 0 }}>📷 کیمرہ بارکوڈ اسکینر</h2>
                <button type="button" className="icon-btn" onClick={stopCamera} aria-label="بند کریں">
                  <IconClose />
                </button>
              </div>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", maxWidth: 400, borderRadius: 12, background: "#000" }}
              />
              {cameraMsg && (
                <p style={{ margin: "10px 0 0", fontWeight: 600, color: "var(--accent-text)" }}>
                  {cameraMsg}
                </p>
              )}
              <p className="hint" style={{ marginTop: 8 }}>
                بارکوڈ کو کیمرے کے سامنے لائیں، اسکین ہوتے ہی بیپ کے ساتھ آئٹم بل میں شامل ہو جائے گا۔
              </p>
              <div className="modal-actions" style={{ justifyContent: "center" }}>
                <button type="button" className="btn btn-ghost" onClick={stopCamera}>
                  کیمرہ بند کریں
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Held Bills Modal */}
        {showHeldModal && (
          <div
            className="modal-backdrop"
            onClick={() => setShowHeldModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: "1.25rem", margin: 0 }}>
                  ہولڈ کیے گئے بلز ({heldBills.length})
                </h2>
                <button type="button" className="icon-btn" onClick={() => setShowHeldModal(false)}>
                  <IconClose />
                </button>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {heldBills.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                      padding: "12px 16px",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      background: "var(--card-2)",
                    }}
                  >
                    <b>#{b.billNo}</b>
                    <span style={{ flex: "1 1 180px" }}>
                      {b.customerName || t("billing.walkInCustomer")}
                      <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                        {" "}· {fmtTime(b.ts)} ({b.items.length} آئٹمز)
                      </span>
                    </span>
                    <b style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
                      {fmtPKR(b.total)}
                    </b>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => resumeHeld(b)}
                    >
                      <IconEdit /> بل بحال کریں
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => discardHeld(b)}
                      aria-label="ہولڈ بل خارج کریں"
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. Bill Receipt Modal */}
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
                <h2 style={{ fontSize: "1.3rem", margin: 0 }}>
                  {t("billing.billNoTitle", { no: selected.billNo })}{" "}
                  {(() => {
                    const st = effectiveBillStatus(selected, credits);
                    const badge = STATUS_BADGE[st] ?? STATUS_BADGE.paid;
                    return (
                      <span className={badge.cls}>
                        {t(badge.key)}
                      </span>
                    );
                  })()}
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
                  {t("action.print")} A4 / رسیپٹ
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => printBill(true)}
                >
                  {t("action.print")} 80mm تھرمل
                </button>
                <a
                  className="btn btn-ghost btn-sm"
                  href={waHref(selected)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconSend /> {t("action.whatsapp")}
                </a>
                <a
                  className="btn btn-ghost btn-sm"
                  href="/challans"
                >
                  <IconTruck /> ڈیلیوری چالان بنائیں
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
                  <IconPlus /> نیا بل بنائیں
                </button>
              </div>

              {(() => {
                const linkedChallans = deliveryChallans.filter(
                  (dc) => dc.billId === selected.id && dc.status !== "cancelled"
                );
                if (linkedChallans.length === 0) return null;
                return (
                  <div className="note-box" style={{ marginBottom: 16 }}>
                    <b>ڈیلیوری چالان جاری شدہ:</b>{" "}
                    {linkedChallans.map((dc) => (
                      <span key={dc.id} className="badge outline" style={{ marginInline: 4 }}>
                        {dc.number ?? "مسودہ"} ({dc.lines.reduce((s, l) => s + l.qty, 0)} آئٹمز)
                      </span>
                    ))}
                    <a href="/challans" style={{ marginInlineStart: 8, fontSize: "0.85rem", textDecoration: "underline" }}>
                      چالان دیکھیں
                    </a>
                  </div>
                );
              })()}

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
                      <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>
                        {t("billing.returnItems")}
                      </h3>
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

        {/* 5. Void confirmation modal */}
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

        {/* ================= BILLS HISTORY ================= */}
        <section aria-label={t("billing.historyAria")} style={{ marginTop: 32 }}>
          <div className="toolbar">
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>{t("billing.historyTitle")}</h2>
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
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: "var(--card)",
                  color: "var(--text)",
                  fontSize: "0.92rem",
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
                        {(() => {
                          const st = effectiveBillStatus(b, credits);
                          const badge = STATUS_BADGE[st] ?? STATUS_BADGE.paid;
                          const linked = deliveryChallans.filter(
                            (dc) => dc.billId === b.id && dc.status !== "cancelled"
                          );
                          return (
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <span className={badge.cls}>
                                {t(badge.key)}
                              </span>
                              {linked.length > 0 && (
                                <span className="badge outline" title="ڈیلیوری چالان جاری شدہ">
                                  {linked.map((l) => l.number ?? "DC").join(", ")}
                                </span>
                              )}
                            </div>
                          );
                        })()}
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

        {/* Mobile: sticky cart bottom pill */}
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
            onClick={() => {
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            }}
          >
            ادائیگی کریں [F4]
          </button>
        </div>
      </div>
    </div>
  );
}
