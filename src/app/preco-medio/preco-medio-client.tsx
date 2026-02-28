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
import {
  addPurchase,
  clearPurchases,
  getPurchases,
  removePurchase,
} from "./actions";
import { MOEDAS, type PurchaseRow } from "./constants";

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

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function PrecoMedioClient({
  initialPurchases,
}: {
  initialPurchases: PurchaseRow[];
}) {
  const [purchases, setPurchases] = useState<PurchaseRow[]>(initialPurchases);
  const [currency, setCurrency] = useState<string>(MOEDAS[0].value);
  const [modalOpen, setModalOpen] = useState(false);
  const [preco, setPreco] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [modalCurrency, setModalCurrency] = useState<string>(MOEDAS[0].value);
  const [dataCompra, setDataCompra] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [precoAtual, setPrecoAtual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  const totalInvestido = filtered.reduce(
    (s, e) => s + e.preco * e.quantidade,
    0
  );
  const precoMedio = totalQuantidade > 0 ? totalInvestido / totalQuantidade : 0;
  const precoAtualNum = parseFloat(precoAtual.replace(",", ".")) || 0;
  const plValor =
    totalQuantidade > 0 && precoAtualNum > 0
      ? (precoAtualNum - precoMedio) * totalQuantidade
      : null;
  const plPercent =
    precoMedio > 0 && precoAtualNum > 0
      ? ((precoAtualNum - precoMedio) / precoMedio) * 100
      : null;

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

  const symbol = CURRENCY_SYMBOL[currency] ?? currency;

  return (
    <div className="min-h-screen px-4 py-8 pb-24">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-primary">Preço Médio</h1>
          <p className="mt-0.5 text-sm text-foreground/70">
            Acompanhe suas criptomoedas com gráficos e preço médio.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/80">
            Criptomoeda
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.currentTarget.value)}
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
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setModalOpen(true);
              setModalCurrency(currency);
              setDataCompra(new Date().toISOString().slice(0, 10));
              setError(null);
            }}
            className="rounded-lg bg-primary px-5 py-2.5 font-medium text-black transition-colors hover:bg-primary-hover"
          >
            Adicionar compra
          </button>
        </div>

        {purchases.length > 0 && (
          <>
            {barData.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground/90">
                  Total investido por moeda
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
                      formatter={(value: number, _name: string, props: { payload?: { name?: string } }) => {
                        const sym = CURRENCY_SYMBOL[props.payload?.name ?? ""] ?? "";
                        return [`${sym} ${Number(value).toFixed(2)}`, "Total"];
                      }}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground/90">
                  Entradas ({currency})
                </h2>
                {filtered.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Limpar desta moeda
                  </button>
                )}
              </div>
              <ul className="space-y-2">
                {filtered.map((ent) => (
                  <li
                    key={ent.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">
                      {ent.quantidade} × {symbol} {ent.preco.toFixed(2)} = {symbol}{" "}
                      {(ent.preco * ent.quantidade).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(ent.id)}
                      className="text-foreground/60 hover:text-red-400"
                      aria-label="Remover"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {chartData.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground/90">
                  Evolução do preço médio ({currency})
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
                      formatter={(value: number) => [
                        `${symbol} ${value.toFixed(2)}`,
                        "Preço médio",
                      ]}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="precoMedio"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: "#22c55e", r: 4 }}
                      name="Preço médio"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-xs text-foreground/70">Total investido</p>
                <p className="text-xl font-semibold text-foreground">
                  {symbol} {totalInvestido.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-xs text-foreground/70">Preço médio</p>
                <p className="text-xl font-semibold text-primary">
                  {symbol} {precoMedio.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <label
                htmlFor="preco-atual"
                className="mb-2 block text-xs font-medium text-foreground/80"
              >
                Preço atual (para P/L estimado)
              </label>
              <input
                id="preco-atual"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={precoAtual}
                onChange={(e) => setPrecoAtual(e.target.value)}
                className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {plValor !== null && plPercent !== null && (
                <div className="text-sm">
                  <p className="text-foreground/70">P/L estimado</p>
                  <p
                    className={
                      plValor >= 0
                        ? "text-lg font-semibold text-primary"
                        : "text-lg font-semibold text-red-400"
                    }
                  >
                    {symbol} {plValor.toFixed(2)} ({plPercent >= 0 ? "+" : ""}
                    {plPercent.toFixed(1)}%)
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {purchases.length === 0 && (
          <p className="text-center text-sm text-foreground/60">
            Clique em &quot;Adicionar compra&quot; para registrar suas compras e
            ver gráficos e preço médio.
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
                Adicionar compra
              </h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground/80">
                    Criptomoeda
                  </label>
                  <select
                    value={modalCurrency}
                    onChange={(e) => setModalCurrency(e.currentTarget.value)}
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
                    Preço
                  </label>
                  <input
                    id="modal-preco"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="modal-data" className="mb-1 block text-xs font-medium text-foreground/80">
                    Data
                  </label>
                  <input
                    id="modal-data"
                    type="date"
                    required
                    value={dataCompra}
                    onChange={(e) => setDataCompra(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="modal-quantidade" className="mb-1 block text-xs font-medium text-foreground/80">
                    Quantidade
                  </label>
                  <input
                    id="modal-quantidade"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 rounded-lg border border-border bg-muted py-2.5 font-medium text-foreground hover:bg-muted/80"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-primary py-2.5 font-medium text-black hover:bg-primary-hover disabled:opacity-50"
                  >
                    {loading ? "Salvando…" : "Adicionar"}
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
