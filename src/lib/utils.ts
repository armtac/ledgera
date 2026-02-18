import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MESI = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;

export function getMeseLabel(mese: number): string {
  return MESI[mese - 1] ?? `Mese ${mese}`;
}

export function formatImporto(importo: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(importo));
}

export function formatPeriodo(anno: number, mese: number): string {
  return `${getMeseLabel(mese)} ${anno}`;
}

export function generatePeriods(
  annoFrom: number,
  meseFrom: number,
  annoTo: number,
  meseTo: number
): { anno: number; mese: number }[] {
  const periods: { anno: number; mese: number }[] = [];
  let anno = annoFrom;
  let mese = meseFrom;

  while (anno < annoTo || (anno === annoTo && mese <= meseTo)) {
    periods.push({ anno, mese });
    mese++;
    if (mese > 12) {
      mese = 1;
      anno++;
    }
  }

  return periods;
}

export function splitImporto(
  totale: number,
  numPeriods: number
): number[] {
  if (numPeriods <= 0) return [];
  if (numPeriods === 1) return [totale];

  const perPeriod = Math.floor((totale * 100) / numPeriods) / 100;
  const amounts = Array(numPeriods).fill(perPeriod) as number[];

  const remainder =
    Math.round(totale * 100) -
    Math.round(perPeriod * 100) * numPeriods;
  if (remainder !== 0) {
    amounts[amounts.length - 1] =
      Math.round((amounts[amounts.length - 1] + remainder / 100) * 100) / 100;
  }

  return amounts;
}
