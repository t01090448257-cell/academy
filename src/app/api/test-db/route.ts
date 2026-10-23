import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const students = await prisma.students.findMany({
      take: 10,
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}