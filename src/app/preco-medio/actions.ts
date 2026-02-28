"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { PurchaseRow } from "./constants";

async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.sub ?? null;
}

export async function getPurchases(
  currency?: string
): Promise<{ data: PurchaseRow[]; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { data: [], error: "Faça login para ver suas entradas." };
  try {
    const data = await prisma.purchase.findMany({
      where: { user_id: userId, ...(currency ? { currency } : {}) },
      orderBy: { created_at: "asc" },
    });
    return {
      data: data.map((p) => ({
        id: p.id,
        currency: p.currency,
        preco: p.preco,
        quantidade: p.quantidade,
        created_at: p.created_at,
      })),
      error: null,
    };
  } catch (e) {
    return { data: [], error: "Erro ao carregar entradas." };
  }
}

export async function addPurchase(
  currency: string,
  preco: number,
  quantidade: number,
  dataCompra?: string
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Faça login para adicionar entradas." };
  if (!currency || preco <= 0 || quantidade <= 0)
    return { error: "Preço e quantidade devem ser positivos." };
  const created_at = dataCompra ? new Date(dataCompra + "T12:00:00") : undefined;
  try {
    await prisma.purchase.create({
      data: { user_id: userId, currency, preco, quantidade, ...(created_at && { created_at }) },
    });
    revalidatePath("/preco-medio");
    return { error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao salvar entrada.";
    return { error: message };
  }
}

export async function removePurchase(id: string): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Faça login." };
  try {
    await prisma.purchase.deleteMany({
      where: { id, user_id: userId },
    });
    revalidatePath("/preco-medio");
    return { error: null };
  } catch {
    return { error: "Erro ao remover." };
  }
}

export async function clearPurchases(
  currency?: string
): Promise<{ error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Faça login." };
  try {
    await prisma.purchase.deleteMany({
      where: { user_id: userId, ...(currency ? { currency } : {}) },
    });
    revalidatePath("/preco-medio");
    return { error: null };
  } catch {
    return { error: "Erro ao limpar." };
  }
}
