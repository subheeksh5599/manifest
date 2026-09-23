import { NextResponse } from "next/server";

const PROGRAM_ID = "pTpaE75ubNyv9voydPJNaEfmv3GbmcN5bvZBfnRtdiA";
const DEVNET_RPC = "https://api.devnet.solana.com";

// Known on-chain artifacts from integration tests
const ARTIFACTS = {
  program: PROGRAM_ID,
  plan_filled: "rDt5XPbutXYPtMgox2AGepKGtDVvBkuhaHiCgU3oxh3",
  fill_receipt: "67t8p3KmxtNnyc21LCwABvpy4kQsroN2JvoCm8f3ESsA",
  refusal_receipt: "7hBCzAdqrsNUmQ4VGEvvHjjSGMurQARVB5emjbYHVmsj",
  plan_preflight: "8PHugk8n4Sq3UMCyrysPUs3WvHgf5pw2TNGskkrQuQcJ",
};

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(DEVNET_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}

export async function GET() {
  try {
    // Check program exists
    const programInfo = await rpc("getAccountInfo", [
      ARTIFACTS.program,
      { encoding: "base64" },
    ]);

    // Check plan account
    const planInfo = await rpc("getAccountInfo", [
      ARTIFACTS.plan_filled,
      { encoding: "base64" },
    ]);

    // Check refusal account
    const refusalInfo = await rpc("getAccountInfo", [
      ARTIFACTS.refusal_receipt,
      { encoding: "base64" },
    ]);

    // Check fill account
    const fillInfo = await rpc("getAccountInfo", [
      ARTIFACTS.fill_receipt,
      { encoding: "base64" },
    ]);

    const results = {
      program: {
        address: ARTIFACTS.program,
        exists: !!programInfo?.result?.value,
        executable: programInfo?.result?.value?.executable ?? false,
        explorer: `https://explorer.solana.com/address/${ARTIFACTS.program}?cluster=devnet`,
      },
      plan: {
        address: ARTIFACTS.plan_filled,
        exists: !!planInfo?.result?.value,
        data_len: planInfo?.result?.value?.data?.[0]
          ? Buffer.from(planInfo.result.value.data[0], "base64").length
          : 0,
        explorer: `https://explorer.solana.com/address/${ARTIFACTS.plan_filled}?cluster=devnet`,
      },
      fill: {
        address: ARTIFACTS.fill_receipt,
        exists: !!fillInfo?.result?.value,
        data_len: fillInfo?.result?.value?.data?.[0]
          ? Buffer.from(fillInfo.result.value.data[0], "base64").length
          : 0,
        explorer: `https://explorer.solana.com/address/${ARTIFACTS.fill_receipt}?cluster=devnet`,
      },
      refusal: {
        address: ARTIFACTS.refusal_receipt,
        exists: !!refusalInfo?.result?.value,
        data_len: refusalInfo?.result?.value?.data?.[0]
          ? Buffer.from(refusalInfo.result.value.data[0], "base64").length
          : 0,
        explorer: `https://explorer.solana.com/address/${ARTIFACTS.refusal_receipt}?cluster=devnet`,
      },
    };

    return NextResponse.json(results);
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
