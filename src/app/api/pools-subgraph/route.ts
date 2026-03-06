import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, fallback, getAddress, hexToString, http } from "viem";
import { mainnet } from "viem/chains";

type ProtocolVersion = "v2" | "v3" | "v4";

type PoolRow = {
  id: string;
  protocol: ProtocolVersion;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  valorDepositadoUsd: string | null;
  plEstimado: string | null;
  ilAproximado: string | null;
  feesEstimadas: string | null;
  share: number;
};

const RPC_URLS = [
  "https://eth.llamarpc.com",
  "https://ethereum.publicnode.com",
  "https://cloudflare-eth.com",
];

const V3_POSITION_MANAGER = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const V3_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const V4_POSITION_MANAGER = "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e";

const V3_DEPLOY_BLOCK = BigInt(12369621);
const V4_DEPLOY_BLOCK = BigInt(20542267);
const MAX_POSITIONS = 100;
const LOG_BLOCK_CHUNK = BigInt(500000);

const erc20SymbolStringAbi = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const erc20SymbolBytesAbi = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

const v3PositionManagerAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "positions",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "nonce", type: "uint96" },
      { name: "operator", type: "address" },
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0", type: "uint128" },
      { name: "tokensOwed1", type: "uint128" },
    ],
  },
] as const;

const v3FactoryAbi = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

const v4PositionManagerAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getPositionLiquidity",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
  {
    type: "function",
    name: "getPoolAndPositionInfo",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "poolKey",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "positionInfo", type: "uint256" },
    ],
  },
] as const;

const transferEventAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
  },
] as const;

function buildClient() {
  return createPublicClient({
    chain: mainnet,
    transport: fallback(RPC_URLS.map((url) => http(url, { timeout: 8000 }))),
  });
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function readSymbol(client: ReturnType<typeof buildClient>, token: string): Promise<string> {
  if (token.toLowerCase() === "0x0000000000000000000000000000000000000000") return "ETH";
  try {
    const symbol = await client.readContract({
      address: getAddress(token),
      abi: erc20SymbolStringAbi,
      functionName: "symbol",
    });
    if (symbol && symbol.trim()) return symbol.trim();
  } catch {
    // fallback bytes32
  }

  try {
    const symbolBytes = await client.readContract({
      address: getAddress(token),
      abi: erc20SymbolBytesAbi,
      functionName: "symbol",
    });
    const decoded = hexToString(symbolBytes, { size: 32 }).replace(/\u0000/g, "").trim();
    if (decoded) return decoded;
  } catch {
    // no-op
  }
  return shortAddress(token);
}

async function fetchV3Pools(client: ReturnType<typeof buildClient>, owner: `0x${string}`): Promise<PoolRow[]> {
  const balance = (await client.readContract({
    address: V3_POSITION_MANAGER,
    abi: v3PositionManagerAbi,
    functionName: "balanceOf",
    args: [owner],
  })) as bigint;

  const count = Number(balance > BigInt(MAX_POSITIONS) ? BigInt(MAX_POSITIONS) : balance);
  const rows: PoolRow[] = [];

  for (let i = 0; i < count; i += 1) {
    const tokenId = (await client.readContract({
      address: V3_POSITION_MANAGER,
      abi: v3PositionManagerAbi,
      functionName: "tokenOfOwnerByIndex",
      args: [owner, BigInt(i)],
    })) as bigint;

    const position = (await client.readContract({
      address: V3_POSITION_MANAGER,
      abi: v3PositionManagerAbi,
      functionName: "positions",
      args: [tokenId],
    })) as readonly [
      bigint,
      string,
      string,
      string,
      number,
      number,
      number,
      bigint,
      bigint,
      bigint,
      bigint,
      bigint,
    ];

    const token0 = getAddress(position[2]);
    const token1 = getAddress(position[3]);
    const fee = position[4];
    const liquidity = position[7];
    if (liquidity <= BigInt(0)) continue;

    const poolAddress = (await client.readContract({
      address: V3_FACTORY,
      abi: v3FactoryAbi,
      functionName: "getPool",
      args: [token0, token1, fee],
    })) as string;

    const [symbol0, symbol1] = await Promise.all([readSymbol(client, token0), readSymbol(client, token1)]);
    rows.push({
      id: tokenId.toString(),
      protocol: "v3",
      pairAddress: poolAddress,
      token0Symbol: symbol0,
      token1Symbol: symbol1,
      valorDepositadoUsd: null,
      plEstimado: null,
      ilAproximado: null,
      feesEstimadas: null,
      share: 0,
    });
  }

  return rows;
}

async function getTokenIdsByTransferLogs(
  client: ReturnType<typeof buildClient>,
  owner: `0x${string}`
): Promise<bigint[]> {
  const latest = await client.getBlockNumber();
  const owned = new Set<string>();

  for (let fromBlock = V4_DEPLOY_BLOCK; fromBlock <= latest; fromBlock += LOG_BLOCK_CHUNK + BigInt(1)) {
    const toBlock = fromBlock + LOG_BLOCK_CHUNK > latest ? latest : fromBlock + LOG_BLOCK_CHUNK;
    const [received, sent] = await Promise.all([
      client.getLogs({
        address: V4_POSITION_MANAGER,
        abi: transferEventAbi,
        eventName: "Transfer",
        args: { to: owner },
        fromBlock,
        toBlock,
      } as any),
      client.getLogs({
        address: V4_POSITION_MANAGER,
        abi: transferEventAbi,
        eventName: "Transfer",
        args: { from: owner },
        fromBlock,
        toBlock,
      } as any),
    ]);

    for (const log of received) {
      const id = (log as { args?: { tokenId?: bigint } }).args?.tokenId?.toString();
      if (id) owned.add(id);
    }
    for (const log of sent) {
      const id = (log as { args?: { tokenId?: bigint } }).args?.tokenId?.toString();
      if (id) owned.delete(id);
    }
  }

  return Array.from(owned)
    .map((id) => BigInt(id))
    .slice(0, MAX_POSITIONS);
}

async function fetchV4Pools(client: ReturnType<typeof buildClient>, owner: `0x${string}`): Promise<PoolRow[]> {
  const tokenIds = await getTokenIdsByTransferLogs(client, owner);
  const rows: PoolRow[] = [];

  for (const tokenId of tokenIds) {
    const currentOwner = (await client.readContract({
      address: V4_POSITION_MANAGER,
      abi: v4PositionManagerAbi,
      functionName: "ownerOf",
      args: [tokenId],
    })) as string;
    if (currentOwner.toLowerCase() !== owner.toLowerCase()) continue;

    const liquidity = (await client.readContract({
      address: V4_POSITION_MANAGER,
      abi: v4PositionManagerAbi,
      functionName: "getPositionLiquidity",
      args: [tokenId],
    })) as bigint;
    if (liquidity <= BigInt(0)) continue;

    const poolAndInfo = (await client.readContract({
      address: V4_POSITION_MANAGER,
      abi: v4PositionManagerAbi,
      functionName: "getPoolAndPositionInfo",
      args: [tokenId],
    })) as readonly [
      { currency0: string; currency1: string; fee: number; tickSpacing: number; hooks: string },
      bigint,
    ];

    const poolKey = poolAndInfo[0];
    const [symbol0, symbol1] = await Promise.all([
      readSymbol(client, poolKey.currency0),
      readSymbol(client, poolKey.currency1),
    ]);
    rows.push({
      id: tokenId.toString(),
      protocol: "v4",
      pairAddress: `${poolKey.currency0}-${poolKey.currency1}-${poolKey.fee}`,
      token0Symbol: symbol0,
      token1Symbol: symbol1,
      valorDepositadoUsd: null,
      plEstimado: null,
      ilAproximado: null,
      feesEstimadas: null,
      share: 0,
    });
  }

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { networkId, protocolVersion, address } = body as {
      networkId?: string;
      protocolVersion?: ProtocolVersion;
      address?: string;
    };

    if (!networkId || !protocolVersion || !address) {
      return NextResponse.json(
        { errors: [{ message: "networkId, protocolVersion e address são obrigatórios." }] },
        { status: 400 }
      );
    }

    if (networkId !== "ethereum") {
      return NextResponse.json(
        { errors: [{ message: "Sem indexador externo, apenas Ethereum está disponível no momento." }] },
        { status: 400 }
      );
    }

    const owner = getAddress(address);
    const client = buildClient();

    if (protocolVersion === "v2") {
      return NextResponse.json(
        {
          errors: [
            {
              message:
                "Sem indexador externo, a listagem de LP do Uniswap v2 não é suportada. Use v3 ou v4.",
            },
          ],
        },
        { status: 400 }
      );
    }

    const pools = protocolVersion === "v3" ? await fetchV3Pools(client, owner) : await fetchV4Pools(client, owner);
    return NextResponse.json({ pools });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao consultar pools on-chain.";
    return NextResponse.json(
      { errors: [{ message }] },
      { status: 500 }
    );
  }
}
