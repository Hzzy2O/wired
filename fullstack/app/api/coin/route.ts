import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSuiPrice } from "@/utils/api";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creator = searchParams.get('creator');
    
    await prisma.$connect();
    const coins = await prisma.coin.findMany({
      where: creator ? {
        creator: creator
      } : undefined,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(coins);
  } catch (_) {
    return NextResponse.json({ error: "failed to fetch" }, { status: 500 });
  }
}

export async function createCoin(data: any) {
	await prisma.$connect();
	const price = await getSuiPrice();
	const coin = await prisma.coin.create({
		data: {
			name: data.name,
			symbol: data.symbol,
			description: data.description,
			icon_url: data.icon_url,
			ca: data.ca,
			pool_id: data.pool_id,
			token_type: data.token_type,
			initial_token_supply: data.initial_token_supply,
			max_sui_cap: data.max_sui_cap,
			virtual_sui_reserve: data.virtual_sui_reserve,
			virtual_token_reserve: data.virtual_token_reserve,
			creator: data.creator,
			sui_reserve: data.sui_reserve,
			token_reserve: data.token_reserve,
			liquidity: String(Number(data.sui_reserve) * price),
			price: 0,
			marketcap: 0,
		},
	});

	return coin;
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const coin = await createCoin(body);

		return NextResponse.json(coin);
	} catch (_) {
		return NextResponse.json({ error: "创建代币失败" }, { status: 500 });
	}
}
