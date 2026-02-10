import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const PLAN_PRICES: Record<string, number> = {
  plus: 7500,
  pro: 15000,
};

function generateOrderId(): string {
  return `KAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// RSA encrypt in 64-byte chunks (RSA/ECB/PKCS1Padding)
function rsaEncrypt(data: string, publicKeyBase64: string): Buffer {
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64}\n-----END PUBLIC KEY-----`;
  const chunks: Buffer[] = [];
  const dataBytes = Buffer.from(data, "utf-8");

  for (let i = 0; i < dataBytes.length; i += 64) {
    const chunk = dataBytes.subarray(i, i + 64);
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      chunk
    );
    chunks.push(encrypted);
  }

  return Buffer.concat(chunks);
}

// HMAC-SHA256 hash
function hmacSha256(data: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(data).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, providerName: reqProvider, methodName: reqMethod, customerPhone } = body;

    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const amount = PLAN_PRICES[plan];

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Don't allow purchasing same or lower plan
    if ((user.plan === "pro" && plan === "plus") || user.plan === plan) {
      return NextResponse.json({ error: "You already have this plan or a higher one" }, { status: 400 });
    }

    const merchantOrderId = generateOrderId();
    const customerName = user.name || user.email || "Kabyar User";

    // Dinger credentials from env
    const projectName = process.env.DINGER_PROJECT_NAME!;
    const apiKey = process.env.DINGER_API_KEY!;
    const merchantName = process.env.DINGER_MERCHANT_NAME!;
    const publicKey = process.env.DINGER_PUBLIC_KEY!;
    const secretKey = process.env.DINGER_SECRET_KEY!;
    const baseUrl = process.env.DINGER_BASE_URL || "https://staging.dinger.asia/payment-gateway-uat";

    // Step 1: Get Token from Dinger
    const tokenUrl = `${baseUrl}/api/token?projectName=${encodeURIComponent(projectName)}&apiKey=${encodeURIComponent(apiKey)}&merchantName=${encodeURIComponent(merchantName)}`;

    console.log("[Dinger] Requesting token from:", tokenUrl);
    const tokenRes = await fetch(tokenUrl, { method: "GET" });
    const tokenText = await tokenRes.text();
    console.log("[Dinger] Token response status:", tokenRes.status, "body:", tokenText.slice(0, 300));

    let tokenData: any;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error("[Dinger] Token API returned non-JSON:", tokenText.slice(0, 500));
      const isDown = tokenRes.status === 503 || tokenRes.status === 502;
      return NextResponse.json(
        { error: isDown
            ? "Payment server is temporarily down. Please try again in a few minutes."
            : `Payment server error (${tokenRes.status}). Please try again later.`
        },
        { status: 502 }
      );
    }

    if (tokenData.code !== "000" || !tokenData.paymentToken) {
      console.error("[Dinger] Token error:", tokenData);
      return NextResponse.json(
        { error: tokenData.message || "Failed to get payment token from Dinger" },
        { status: 502 }
      );
    }

    const paymentToken = tokenData.paymentToken;

    // Step 2: Build payload and encrypt
    const planLabel = plan === "plus" ? "Kabyar Plus Plan" : "Kabyar Pro Plan";
    const items = JSON.stringify([
      { name: planLabel, amount: amount, quantity: 1 },
    ]);

    const payloadData = JSON.stringify({
      providerName: reqProvider || "AYA Pay",
      methodName: reqMethod || "QR",
      totalAmount: amount,
      items: items,
      orderId: merchantOrderId,
      customerName: customerName,
      customerPhone: customerPhone || "",
    });

    // RSA encrypt the payload
    const encryptedBytes = rsaEncrypt(payloadData, publicKey);
    const base64Payload = encryptedBytes.toString("base64");

    // HMAC-SHA256 hash of the raw payload
    const hashValue = hmacSha256(payloadData, secretKey);

    // Step 3: Call Pay API
    console.log("[Dinger] Calling Pay API...");
    const payRes = await fetch(`${baseUrl}/api/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${paymentToken}`,
      },
      body: `payload=${encodeURIComponent(base64Payload)}`,
    });

    const payText = await payRes.text();
    console.log("[Dinger] Pay API response status:", payRes.status, "body:", payText.slice(0, 500));

    let payData: any;
    try {
      payData = JSON.parse(payText);
    } catch {
      console.error("[Dinger] Pay API returned non-JSON:", payText.slice(0, 500));
      return NextResponse.json(
        { error: "Dinger Pay API returned an invalid response. Please try again." },
        { status: 502 }
      );
    }

    // Create payment record in DB
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        plan,
        amount,
        merchantOrderId,
        transactionStatus: "PENDING",
        customerName,
      },
    });

    // Return payment info to frontend
    return NextResponse.json({
      success: true,
      merchantOrderId,
      paymentToken,
      payData,
      qrCode: payData.response?.qrCode || null,
      transactionId: payData.response?.transactionId || null,
      hashValue,
    });
  } catch (error: any) {
    console.error("[Payment Initiate] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
