/** i18n part: sales — Pashto (پښتو) DRAFT dictionary (Phase H design §4.1).
 *  Machine-drafted once at build time; every key's review state lives in
 *  ../review-manifest.json. A draft is a starting point for a named human
 *  reviewer — never finished copy, never runtime translation. */
import type { enSales } from "./sales";

export const psSales: Record<keyof typeof enSales, string> = {
  "sales.eyebrow": "کاونټر",
  "sales.title": "پلور ثبت کړئ",
  "sales.subtitle": "یو توکی وټاکئ، مقدار ولیکئ — پلور ثبتېږي او موجودي سمدستي کمېږي.",
  "sales.newSaleAria": "نوی پلور",
  "sales.newSale": "نوی پلور",
  "sales.newSaleSub": "د هټۍ د کاونټر په څېر کار کوي — چټک او اسانه.",
  "sales.findProduct": "توکی ومومئ",
  "sales.searchPlaceholder": "توکي ولټوئ — د ټاکلو لپاره په پایله کلیک وکړئ…",
  "sales.noResults": "هېڅ توکی له “{query}” سره سمون نه خوري.",
  "sales.product": "توکی *",
  "sales.chooseProduct": "— یو توکی وټاکئ —",
  "sales.optionLabel": "{name} — {price} (په موجودي کې {qty} {unit})",
  "sales.quantity": "مقدار *",
  "sales.decreaseQty": "مقدار کم کړئ",
  "sales.increaseQty": "مقدار زیات کړئ",
  "sales.stockHint": "{qty} {unit} شته · په هر واحد کې ګټه {margin}",
  "sales.recordSale": "پلور ثبت کړئ",
  "sales.errChooseProduct": "مهرباني وکړئ لومړی یو توکی وټاکئ.",
  "sales.errQtyMin": "مقدار باید لږ تر لږه 1 وي.",
  "sales.errStock": "کافي موجودي نشته — د {name} یوازې {qty} {unit} شته.",
  "sales.successRecorded": "ثبت شو: {qty} × {name} = {amount}. موجودي تازه شوه.",
  "sales.errRecordFailed": "پلور ثبت نه شو. مهرباني وکړئ بیا هڅه وکړئ.",
  "sales.todayAria": "د نن ورځې پلور",
  "sales.todayCounter": "د نن ورځې کاونټر",
  "sales.statRevenue": "عاید",
  "sales.statItems": "پلورل شوي توکي",
  "sales.statProfit": "ګټه",
  "sales.statTransactions": "معاملې",
  "sales.todayList": "د نن ورځې د پلور لېست",
  "sales.emptyToday": "نن لا تر اوسه هېڅ پلور نه دی ثبت شوی.",
  "sales.unknownProduct": "نامعلوم توکی",
  "sales.rowLine": "{qty} × {price}",
};
