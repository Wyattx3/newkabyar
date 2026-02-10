import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Check payment status by merchantOrderId
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { merchantOrderId: orderId },
      select: {
        transactionStatus: true,
        plan: true,
        amount: true,
        providerName: true,
        methodName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: payment.transactionStatus,
      plan: payment.plan,
      amount: payment.amount,
      provider: payment.providerName,
      method: payment.methodName,
      createdAt: payment.createdAt,
    });
  } catch (error: any) {
    console.error("[Payment Status] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to check status" },
      { status: 500 }
    );
  }
}
