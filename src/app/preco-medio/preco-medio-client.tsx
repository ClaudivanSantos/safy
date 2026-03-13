"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";
import {
  addPurchase,
  clearPurchases,
  getPurchases,
  removePurchase,
} from "./actions";
import { MOEDAS, type PurchaseRow } from "./constants";
import { useTranslation } from "../hooks/use-translation";

const COLORS = ["#22c55e", "#a855f7", "#3b82f6", "#f59e0b", "#ec4899", "#14b8a6", "#eab308", "#6366f1"];
const CURRENCY_SYMBOL: Record<string, string> = {
  BTC: "BTC ",
  ETH: "ETH ",
  SOL: "SOL ",
  BNB: "BNB ",
  XRP: "XRP ",
  ADA: "ADA ",
  DOGE: "DOGE ",
  AVAX: "AVAX ",
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function getFieldValue(target: unknown): string {
  return (target as { value: string }).value;
}

/** Formata data de forma consistente entre servidor e cliente (evita hydration mismatch). */
function formatDate(d: Date | string) {
  const s = typeof d === "string" ? d : new Date(d).toISOString();
  const [, month, day] = s.slice(0, 10).split("-");
  return `${day}/${month}`;
}

export default function PrecoMedioClient({
  initialPurchases,
  isLoggedIn = true,
}: {
  initialPurchases: PurchaseRow[];
  isLoggedIn?: boolean;
}) {
  const [purchases, setPurchases] = useState<PurchaseRow[]>(initialPurchases);
  const [currency, setCurrency] = useState<string>(MOEDAS[0].value);
  const [modalOpen, setModalOpen] = useState(false);
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [modalCurrency, setModalCurrency] = useState<string>(MOEDAS[0].value);
  const [dataCompra, setDataCompra] = useState("");
  const [precoAtual, setPrecoAtual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation("averagePricePage");

  const load = useCallback(async () => {
    const res = await getPurchases();
    if (res.error) setError(res.error);
    else setPurchases(res.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = purchases.filter((p) => p.currency === currency);
  const totalQuantidade = filtered.reduce((s, e) => s + e.quantidade, 0);
  const totalInvestidoUsd = filtered.reduce(
    (s, e) => s + e.preco * e.quantidade,
    0
  );
  const precoMedio = totalQuantidade > 0 ? totalInvestidoUsd / totalQuantidade : 0;
  const precoAtualNum = parseFloat(precoAtual.replace(",", ".")) || 0;
  const plValor =
    totalQuantidade > 0 && precoAtualNum > 0
      ? (precoAtualNum - precoMedio) * totalQuantidade
      : null;
  const plPercent =
    precoMedio > 0 && precoAtualNum > 0
      ? ((precoAtualNum - precoMedio) / precoMedio) * 100
      : null;
  const modalPrecoNum = parseFloat(preco.replace(",", ".")) || 0;
  const modalQuantidadeNum = parseFloat(quantidade.replace(",", ".")) || 0;
  const modalTotalUsd = modalPrecoNum > 0 && modalQuantidadeNum > 0
    ? modalPrecoNum * modalQuantidadeNum
    : 0;

  // Dados para gráfico de evolução do preço médio (por data)
  const chartData = filtered.reduce<
    { date: string; totalInvestido: number; totalQty: number; precoMedio: number }[]
  >((acc, p) => {
    const date = formatDate(new Date(p.created_at));
    const prev = acc[acc.length - 1];
    const newTotalInv = prev
      ? prev.totalInvestido + p.preco * p.quantidade
      : p.preco * p.quantidade;
    const newTotalQty = prev ? prev.totalQty + p.quantidade : p.quantidade;
    acc.push({
      date,
      totalInvestido: newTotalInv,
      totalQty: newTotalQty,
      precoMedio: newTotalQty > 0 ? newTotalInv / newTotalQty : 0,
    });
    return acc;
  }, []);

  // Total por moeda (para gráfico de barras)
  const byCurrency = purchases.reduce<
    Record<string, { totalInvestido: number; totalQty: number }>
  >((acc, p) => {
    if (!acc[p.currency]) acc[p.currency] = { totalInvestido: 0, totalQty: 0 };
    acc[p.currency].totalInvestido += p.preco * p.quantidade;
    acc[p.currency].totalQty += p.quantidade;
    return acc;
  }, {});
  const barData = Object.entries(byCurrency).map(([name, v]) => ({
    name,
    total: Math.round(v.totalInvestido * 100) / 100,
  }));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(preco.replace(",", "."));
    const q = parseFloat(quantidade.replace(",", "."));
    if (!Number.isFinite(p) || !Number.isFinite(q) || p <= 0 || q <= 0) return;
    setLoading(true);
    setError(null);
    const res = await addPurchase(modalCurrency, p, q, dataCompra);
    setLoading(false);
    if (res.error) setError(res.error);
    else {
      setPreco("");
      setQuantidade("");
      setDataCompra(new Date().toISOString().slice(0, 10));
      setModalOpen(false);
      load();
    }
  };

  const handleRemove = async (id: string) => {
    setError(null);
    const res = await removePurchase(id);
    if (res.error) setError(res.error);
    else load();
  };

  const handleClear = async () => {
    const ok =
      typeof globalThis !== "undefined" &&
      "confirm" in globalThis &&
      (globalThis as unknown as { confirm: (m: string) => boolean }).confirm(
        "Apagar todas as entradas desta moeda?"
      );
    if (!ok) return;
    setError(null);
    const res = await clearPurchases(currency);
    if (res.error) setError(res.error);
    else load();
  };

  const exportRows = purchases.map((p) => ({
    Moeda: p.currency,
    Data: formatDate(p.created_at),
    "Preço (USD)": p.preco,
    Quantidade: p.quantidade,
    "Total (USD)": Math.round(p.preco * p.quantidade * 100) / 100,
  }));

  const exportToCSV = () => {
    if (exportRows.length === 0) return;
    const headers = ["Moeda", "Data", "Preço (USD)", "Quantidade", "Total (USD)"];
    const csvContent = [
      headers.join(";"),
      ...exportRows.map((r) =>
        [r.Moeda, r.Data, r["Preço (USD)"], r.Quantidade, r["Total (USD)"]].join(";")
      ),
    ].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const doc = (globalThis as unknown as { document?: { createElement: (tag: string) => HTMLElement } }).document;
    const link = doc?.createElement("a") as (HTMLElement & { setAttribute(name: string, value: string): void; click(): void }) | undefined;
    if (link) {
      link.setAttribute("href", url);
      link.setAttribute("download", `preco-medio-${new Date().toISOString().slice(0, 10)}.csv`);
      link.click();
    }
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    if (exportRows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compras");
    const resumo = Object.entries(byCurrency).map(([moeda, v]) => ({
      Moeda: moeda,
      "Total investido (USD)": Math.round(v.totalInvestido * 100) / 100,
      "Quantidade total": v.totalQty,
      "Preço médio (USD)":
        v.totalQty > 0 ? Math.round((v.totalInvestido / v.totalQty) * 100) / 100 : 0,
    }));
    if (resumo.length > 0) {
      const wsResumo = XLSX.utils.json_to_sheet(resumo);
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo por moeda");
    }
    XLSX.writeFile(wb, `preco-medio-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const symbol = CURRENCY_SYMBOL[currency] ?? currency;

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-2xl border border-border bg-linear-to-br from-primary/15 via-background to-accent/10 p-6 text-center md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)_0%,transparent_50%)] opacity-30" />
          <div className="relative">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm text-foreground/70 md:text-base">
              {t("subtitle")}
            </p>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {purchases.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportToCSV}
                className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                {t("exportCsv")}
              </button>
              <button
                type="button"
                onClick={exportToExcel}
                className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                {t("exportExcel")}
              </button>
            </>
          )}
          <button
            type="button"
            disabled={!isLoggedIn}
            onClick={() => {
              setModalOpen(true);
              setModalCurrency(currency);
              setDataCompra(new Date().toISOString().slice(0, 10));
              setError(null);
            }}
            className="rounded-xl bg-primary px-5 py-2.5 font-medium text-black transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            title={!isLoggedIn ? t("addPurchaseTooltip") : undefined}
          >
            {t("addPurchase")}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-6">
          <label className="mb-2 block text-xs font-medium text-foreground/80">
            {t("cryptoLabel")}
          </label>
          <select
            value={currency}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setCurrency(getFieldValue(e.currentTarget))
            }
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {MOEDAS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}

        {purchases.length > 0 && (
          <>
            {barData.length > 0 && (
              <section className="rounded-xl border border-border bg-muted/20 p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  {t("totalInvestedByCoin")}
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="name"
                      stroke="#a1a1aa"
                      tick={{ fill: "#e5e5e5", fontSize: 12 }}
                    />
                    <YAxis
                      stroke="#a1a1aa"
                      tick={{ fill: "#e5e5e5", fontSize: 12 }}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#27272a",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                      }}
                      formatter={(value, _name, item) => {
                        const coin = item?.payload?.name as string | undefined;
                        const sym = CURRENCY_SYMBOL[coin ?? ""] ?? "";
                        return [`${sym} ${usdFormatter.format(Number(value ?? 0))}`, "Total"];
                      }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("entriesTitle").replace("{currency}", currency)}
                </h2>
                {filtered.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    {t("clearThisCoin")}
                  </button>
                )}
              </div>
              <ul className="space-y-2">
                {filtered.map((ent) => (
                  <li
                    key={ent.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm transition hover:border-accent/30"
                  >
                    <span className="text-foreground">
                      {ent.quantidade} {currency} × {usdFormatter.format(ent.preco)} ={" "}
                      {usdFormatter.format(ent.preco * ent.quantidade)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(ent.id)}
                      className="text-foreground/60 hover:text-red-400"
                      aria-label={t("removeEntryAria")}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {chartData.length > 0 && (
              <section className="rounded-xl border border-border bg-muted/20 p-6">
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  {t("chartAverageEvolution").replace("{currency}", currency)}
                </h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      dataKey="date"
                      stroke="#a1a1aa"
                      tick={{ fill: "#e5e5e5", fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#a1a1aa"
                      tick={{ fill: "#e5e5e5", fontSize: 11 }}
                      tickFormatter={(v) => `${v.toFixed(2)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#27272a",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [
                        `${usdFormatter.format(Number(value ?? 0))}`,
                        t("chartLabelPrice"),
                      ]}
                      labelFormatter={(label) =>
                        t("chartLabelDate").replace("{date}", String(label))
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="precoMedio"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e", r: 4 }}
                      name={t("chartLabelPrice")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-5 transition hover:border-accent/30">
                <p className="text-xs font-medium uppercase tracking-wider text-foreground/60">
                  {t("totalInvestedUsd")}
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {usdFormatter.format(totalInvestidoUsd)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-5 transition hover:border-accent/30">
                <p className="text-xs font-medium uppercase tracking-wider text-foreground/60">
                  {t("averagePrice")}
                </p>
                <p className="mt-1 text-2xl font-semibold text-primary">
                  {symbol} {precoMedio.toFixed(2)}
                </p>
              </div>
            </div>

            <section className="rounded-xl border border-border bg-muted/20 p-6">
              <label
                htmlFor="preco-atual"
                className="mb-2 block text-xs font-medium text-foreground/80"
              >
                {t("currentPriceLabel")}
              </label>
              <input
                id="preco-atual"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={precoAtual}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPrecoAtual(getFieldValue(e.currentTarget))
                }
                className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {plValor !== null && plPercent !== null && (
                <div className="mt-3 text-sm">
                  <p className="text-foreground/70">{t("estimatedPl")}</p>
                  <p
                    className={
                      plValor >= 0
                        ? "text-xl font-semibold text-primary"
                        : "text-xl font-semibold text-red-400"
                    }
                  >
                    {usdFormatter.format(plValor)} ({plPercent >= 0 ? "+" : ""}
                    {plPercent.toFixed(1)}%)
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {purchases.length === 0 && (
          <p className="rounded-xl border border-border bg-muted/20 py-12 text-center text-sm text-foreground/60">
            {t("addPurchaseCta")}
          </p>
        )}

        {/* Modal Adicionar compra */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-xl">
              <h2 id="modal-title" className="mb-4 text-lg font-semibold text-foreground">
                {t("modalTitle")}
              </h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/80">
                    {t("modalCrypto")}
                  </label>
                  <select
                    value={modalCurrency}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setModalCurrency(getFieldValue(e.currentTarget))
                    }
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {MOEDAS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="modal-preco" className="mb-1 block text-xs font-medium text-foreground/80">
                    {t("modalUnitPrice")}
                  </label>
                  <input
                    id="modal-preco"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={preco}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPreco(getFieldValue(e.currentTarget))
                    }
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="modal-data" className="mb-1 block text-xs font-medium text-foreground/80">
                    {t("modalDate")}
                  </label>
                  <input
                    id="modal-data"
                    type="date"
                    required
                    value={dataCompra}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setDataCompra(getFieldValue(e.currentTarget))
                    }
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="modal-quantidade" className="mb-1 block text-xs font-medium text-foreground/80">
                    {t("modalQuantity").replace("{currency}", modalCurrency)}
                  </label>
                  <input
                    id="modal-quantidade"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={quantidade}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setQuantidade(getFieldValue(e.currentTarget))
                    }
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="modal-total-usd" className="mb-1 block text-xs font-medium text-foreground/80">
                    {t("modalTotalUsd")}
                  </label>
                  <input
                    id="modal-total-usd"
                    type="text"
                    value={usdFormatter.format(modalTotalUsd)}
                    readOnly
                    className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2 text-foreground"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 rounded-lg border border-border bg-muted py-2.5 font-medium text-foreground hover:bg-muted/80"
                  >
                    {t("modalClose")}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-primary py-2.5 font-medium text-black hover:bg-primary-hover disabled:opacity-50"
                  >
                    {loading ? t("modalSaving") : t("modalAdd")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
