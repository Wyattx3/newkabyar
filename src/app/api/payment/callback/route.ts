import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// AES-256-ECB decrypt (matching Dinger's encryption)
function decryptAesEcb(encryptedBase64: string, secretKey: string): string {
  const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
  const keyBuffer = Buffer.from(secretKey, "utf-8");

  const decipher = crypto.createDecipheriv("aes-256-ecb", keyBuffer, null);
  decipher.setAutoPadding(true);

  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf-8");
}

// SHA-256 hash
function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// Calculate plan expiry (30 days from now)
function getPlanExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  return expiry;
}

// Get daily credits for plan
function getDailyCreditsForPlan(plan: string): number {
  switch (plan) {
    case "pro":
    case "unlimited":
      return 999999;
    case "plus":
    case "student":
      return 500;
    default:
      return 50;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentResult, checksum } = body;

    if (!paymentResult || !checksum) {
      console.error("[Dinger Callback] Missing paymentResult or checksum");
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const secretKey = process.env.DINGER_SECRET_KEY!;

    // Step 1: Decrypt paymentResult with AES-256-ECB
    let decryptedString: string;
    try {
      decryptedString = decryptAesEcb(paymentResult, secretKey);
    } catch (decryptError) {
      console.error("[Dinger Callback] Decryption failed:", decryptError);
      return NextResponse.json({ error: "Decryption failed" }, { status: 400 });
    }

    console.log("[Dinger Callback] Decrypted:", decryptedString);

    // Step 2: Verify checksum with SHA-256
    const computedChecksum = sha256(decryptedString);
    if (computedChecksum !== checksum) {
      console.error("[Dinger Callback] Checksum mismatch:", {
        expected: checksum,
        computed: computedChecksum,
      });
      return NextResponse.json({ error: "Invalid checksum" }, { status: 400 });
    }

    // Step 3: Parse the decrypted result
    let result: {
      totalAmount: number;
      createdAt: string;
      transactionStatus: string;
      methodName: string;
      merchantOrderId: string;
      transactionId: string;
      customerName: string;
      providerName: string;
    };

    try {
      result = JSON.parse(decryptedString);
    } catch (parseError) {
      console.error("[Dinger Callback] JSON parse failed:", parseError);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[Dinger Callback] Transaction:", {
      orderId: result.merchantOrderId,
      status: result.transactionStatus,
      amount: result.totalAmount,
      provider: result.providerName,
    });

    // Step 4: Find the payment record
    const payment = await prisma.payment.findUnique({
      where: { merchantOrderId: result.merchantOrderId },
    });

    if (!payment) {
      console.error("[Dinger Callback] Payment not found:", result.merchantOrderId);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Step 5: Update payment record
    await prisma.payment.update({
      where: { merchantOrderId: result.merchantOrderId },
      data: {
        transactionId: result.transactionId,
        transactionStatus: result.transactionStatus,
        providerName: result.providerName,
        methodName: result.methodName,
        customerName: result.customerName,
      },
    });

    // Step 6: If payment is successful, upgrade user plan
    if (result.transactionStatus === "SUCCESS") {
      const planExpiry = getPlanExpiry();
      const newDailyCredits = getDailyCreditsForPlan(payment.plan);

      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          plan: payment.plan,
          planExpiresAt: planExpiry,
          dailyCredits: newDailyCredits,
          dailyCreditsUsed: 0,
          creditsResetAt: new Date(),
        },
      });

      console.log(`[Dinger Callback] User ${payment.userId} upgraded to ${payment.plan} plan until ${planExpiry.toISOString()}`);
    } else {
      console.log(`[Dinger Callback] Transaction ${result.transactionStatus} for order ${result.merchantOrderId}`);
    }

    // Return success to Dinger
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Dinger Callback] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Callback processing failed" },
      { status: 500 }
    );
  }
}
