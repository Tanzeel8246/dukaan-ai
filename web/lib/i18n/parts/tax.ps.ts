/** i18n part: tax — Pashto (پښتو) DRAFT dictionary (Phase H design §4.1).
 *  Machine-drafted once at build time; every key's review state lives in
 *  ../review-manifest.json. A draft is a starting point for a named human
 *  reviewer — never finished copy, never runtime translation. */
import type { enTax } from "./tax";

export const psTax: Record<keyof typeof enTax, string> = {
  "tax.title": "د مالیې سلیبونه",
  "tax.sub": "هغه مالیې وټاکئ چې ستاسو هټۍ یې اخلي (لکه GST). یو سلیب یوازې هغه وخت پلي کېږي چې فعال وي او لاندې د هټۍ ډیفالټ وټاکل شي یا کوم توکي ته ورکړل شي — تر هغه وخته، په هېڅ بل یا پېرود کې مالیه نه وي.",
  "tax.empty": "تر اوسه د مالیې سلیب نشته.",
  "tax.name": "د سلیب نوم",
  "tax.namePlaceholder": "لکه GST",
  "tax.kind": "ډول",
  "tax.kindPercent": "د بیې سلنه",
  "tax.kindFixed": "په هر واحد ټاکلی مبلغ",
  "tax.ratePercent": "شرح (%)",
  "tax.rateFixed": "په هر واحد مبلغ (PKR)",
  "tax.appliesTo": "پلي کېږي په",
  "tax.appliesSales": "پلور",
  "tax.appliesPurchases": "پېرود",
  "tax.appliesBoth": "پلور او پېرود",
  "tax.inclusive": "بیې مخکې له مخکې دا مالیه لري",
  "tax.inclusiveBadge": "شامله",
  "tax.exclusiveBadge": "په سر اضافه",
  "tax.active": "فعال",
  "tax.inactive": "غیر فعال",
  "tax.defaultBadge": "ډیفالټ",
  "tax.edit": "سم کړئ",
  "tax.addTitle": "د مالیې سلیب زیات کړئ",
  "tax.editTitle": "د مالیې سلیب سم کړئ",
  "tax.add": "سلیب زیات کړئ",
  "tax.errName": "سلیب ته نوم ورکړئ.",
  "tax.errRate": "شرح باید 0 یا زیات وي.",
  "tax.saved": "د مالیې سلیب خوندي شو.",
  "tax.removed": "د مالیې سلیب لرې شو.",
  "tax.defaultsTitle": "د هټۍ ډیفالټونه",
  "tax.defaultsSub": "ډیفالټ سلیب په هر هغه توکي پلي کېږي چې خپل سلیب نه لري. د دې اړخ لپاره مالیه بندولو لپاره “هېڅ مالیه نه” وټاکئ — موجوده بلونه او پېرودونه هېڅکله نه بدلېږي.",
  "tax.defaultSales": "د پلور لپاره ډیفالټ",
  "tax.defaultPurchases": "د پېرود لپاره ډیفالټ",
  "tax.noDefault": "هېڅ مالیه نه",
  "tax.defaultSaved": "د مالیې ډیفالټونه تازه شول.",
  "tax.readonlyNote": "تاسو د مالیې سلیبونه لیدلی شئ؛ یوازې مالک یې بدلولی شي.",
  "tax.perUnit": "{amount} په هر واحد",
};
