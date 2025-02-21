import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { bcs } from "@mysten/sui/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import googleTrends from "google-trends-api";
import { deployTokenTx } from "@/contracts/deploy";
import { CoinMetaData, PoolInfo } from "@/types";
import { get } from "lodash-es";
import { Transaction } from "@mysten/sui/transactions";
import { createPoolTx } from "@/contracts/trade";
import { normalizeSuiObjectId } from "@mysten/sui/utils";
import { generateCoin } from "@/app/api/call/lain/route";
import * as template from "./move-bytecode-template";
import init from "./move-bytecode-template";
import { fromHex } from "@mysten/sui/utils";
import { createCoin } from "@/app/api/coin/route";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import cron from "node-cron";
import { join } from "path";
import { uploadToWalrus } from "@/app/api/upload/route";

const { secretKey } = decodeSuiPrivateKey(process.env.SUI_PRIVATE_KEY);

const client = new SuiClient({ url: getFullnodeUrl("testnet") });
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

export const BYTECODE =
	"a11ceb0b060000000a01000c020c1e032a21044b0805535707aa01b70108e1026006c1032d0aee03050cf30331000f010b02060210021102120002020001010701000002000c01000102030c01000104040200050507000009000100010e05060100020708090102030c0d01010c040d0a0b00050a03040001040207030c030e02080007080400020b020108000b03010800010a02010805010900010b01010900010800070900020a020a020a020b01010805070804020b030109000b02010900010608040105010b0201080002090005010b030108000c436f696e4d65746164617461064f7074696f6e0854454d504c4154450b5472656173757279436170095478436f6e746578740355726c04636f696e0f6372656174655f63757272656e63790b64756d6d795f6669656c6404696e6974156e65775f756e736166655f66726f6d5f6279746573066f7074696f6e0f7075626c69635f7472616e736665720673656e64657204736f6d650874656d706c617465087472616e736665720a74785f636f6e746578740375726c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020a02070673796d626f6c0a0205046e616d650a020c0b6465736372697074696f6e0a02090869636f6e5f75726c00020108010000000002170b0031090700070107020703110538000a0138010c020c030b020a012e110438020b030b012e110438030200";

export function editBytecode({
	symbol,
	name,
	description,
	icon_url,
}: CoinMetaData) {
	let updated;
	template.version();

	const updateFunc = (
		code: Uint8Array,
		newVal: string,
		oldVal: string,
		type = "Vector(U8)",
	) => {
		return template.update_constants(
			code,
			bcs.string().serialize(newVal).toBytes(),
			bcs.string().serialize(oldVal).toBytes(),
			type,
		);
	};

	updated = updateFunc(fromHex(BYTECODE), symbol, "symbol");
	updated = updateFunc(updated, name, "name");
	updated = updateFunc(updated, description, "description");
	updated = updateFunc(updated, icon_url, "icon_url");
	updated = template.update_identifiers(updated, {
		TEMPLATE: symbol.toUpperCase(),
		template: symbol.toLowerCase(),
	});

	return template.serialize(template.deserialize(updated));
}

export async function deployTokenTx(sender: string, config: CoinMetaData) {
	await init(join(__dirname, "../public/wasm/move_bytecode_template_bg.wasm"));

	const tx = new Transaction();
	tx.setGasBudget(100000000);

	const bytecode = editBytecode(config);

	const [treasuryCap] = tx.publish({
		modules: [[...bytecode]],
		dependencies: [normalizeSuiObjectId("0x1"), normalizeSuiObjectId("0x2")],
	});

	tx.setSender(sender);

	tx.transferObjects([treasuryCap], tx.pure.address(sender));

	return tx;
}

async function getGoogleTrends() {
	try {
		const result = await googleTrends.dailyTrends({
			geo: "US",
		});
		const data = JSON.parse(result);
		const trends = data.default.trendingSearchesDays[0].trendingSearches.map(
			(trend: any) => trend.title.query,
		);
		return trends;
	} catch (error) {
		console.error("Error fetching Google trends:", error);
		return [];
	}
}

const TEMPLATE = `As a meme token generator, analyze the following trending topics and create a fun token based on the most meme-worthy one:

{input}

Selection Criteria:
- Topic should be viral, memeable, and culturally relevant
- Should have potential for community engagement and memes
- Prefer current pop culture, events, or phenomena
- Avoid sensitive or controversial topics

Based on the selected topic, create a token with:

Requirements:
- Name: short, catchy, and relevant to the chosen topic (2-20 characters)
- Symbol: 2-6 letters
- Description: fun and engaging explanation (50-200 characters)
- Icon prompt: detailed description for generating a unique logo

Important: 
- No special characters (like @, #, $, %, ", etc.) in name or symbol
- No quotes around any content
- Name must NOT contain words like "meme", "coin", or "token"
- Icon prompt must be specific and detailed

First explain why you chose this particular topic, then generate the token information.`;

async function deployToken(trend: string) {
	try {
		const tokenData = (await generateCoin(trend, TEMPLATE)) as CoinMetaData;

		const imageResponse = await fetch(tokenData.icon_url);
		const imageBlob = await imageResponse.blob();
		const imageFile = new File([imageBlob], "icon.png", { type: "image/png" });
		tokenData.icon_url = await uploadToWalrus(imageFile);

		const tx = await deployTokenTx(
			keypair.getPublicKey().toSuiAddress(),
			tokenData,
		);

		const result = await client.signAndExecuteTransaction({
			transaction: tx,
			signer: keypair,
			options: {
				showObjectChanges: true,
				showEvents: true,
			},
		});

		const { objectChanges } = await client.waitForTransaction({
			digest: result.digest,
			options: {
				showObjectChanges: true,
				showEvents: true,
			},
		});

		if (!objectChanges) {
			throw new Error("No object changes found in transaction");
		}

		let packageId, treasuryCap, metadata;
		objectChanges.forEach((obj: any) => {
			if (obj.type === "published") {
				packageId = obj.packageId;
			}
			if (obj.type === "created") {
				if (obj.objectType.includes("TreasuryCap")) {
					treasuryCap = obj.objectId;
				}
				if (obj.objectType.includes("CoinMetadata")) {
					metadata = obj.objectId;
				}
			}
		});

		if (packageId && treasuryCap && metadata) {
			const coinType = `${packageId}::${tokenData.symbol.toLowerCase()}::${tokenData.symbol}`;
			const poolTx = createPoolTx(treasuryCap, metadata, coinType);

			const poolResult = await client.signAndExecuteTransaction({
				transaction: poolTx,
				signer: keypair,
				options: {
					showEvents: true,
				},
			});

			const { events } = await client.waitForTransaction({
				digest: poolResult.digest,
				options: {
					showEvents: true,
				},
			});

			const poolInfo = get(events, "[0].parsedJson") as PoolInfo;

			return await createCoin({
				...tokenData,
				...poolInfo,
				creator: keypair.getPublicKey().toSuiAddress(),
				token_reserve: poolInfo.virtual_token_reserve,
				sui_reserve: "0",
				ca: coinType,
			});
		}
	} catch (error) {
		console.error(`Failed to deploy token for trend ${trend}:`, error);
		return { success: false, error };
	}
}

cron.schedule("0 */2 * * *", async () => {
	const trends = await getGoogleTrends();
	await deployToken(trends);
});
