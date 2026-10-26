import { NextResponse } from "next/server";
import { loadPublicTuition } from "@/lib/publicTuition.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await loadPublicTuition();

    return NextResponse.json(
      { success: true, ...data },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Public tuition lookup failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load tuition information." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
