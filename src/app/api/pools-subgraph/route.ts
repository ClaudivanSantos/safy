import { NextRequest, NextResponse } from "next/server";

const GATEWAY = "https://gateway.thegraph.com/api";

/** Subgraph IDs por rede (The Graph decentralized). */
const SUBGRAPH_IDS: Record<string, string> = {
  ethereum: "A3Np3RQbaBA6oKJgiwDJeo5T3zrYfGHPWFYayMwtNDum", // Uniswap V2
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GRAPH_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json(
        { errors: [{ message: "Serviço temporariamente indisponível. Tente mais tarde." }] },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { networkId, query, variables } = body as {
      networkId?: string;
      query?: string;
      variables?: Record<string, unknown>;
    };

    if (!networkId || !query) {
      return NextResponse.json(
        { errors: [{ message: "networkId e query são obrigatórios." }] },
        { status: 400 }
      );
    }

    const subgraphId = SUBGRAPH_IDS[networkId];
    if (!subgraphId) {
      return NextResponse.json(
        { errors: [{ message: "Rede não suportada para subgraph." }] },
        { status: 400 }
      );
    }

    const url = `${GATEWAY}/${apiKey}/subgraphs/id/${subgraphId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: variables ?? {} }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        data ?? { errors: [{ message: `Subgraph retornou ${res.status}` }] },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao consultar subgraph.";
    return NextResponse.json(
      { errors: [{ message }] },
      { status: 500 }
    );
  }
}
