import { NextResponse } from "next/server";

export async function POST(): Promise<Response> {
  return NextResponse.json(
    {
      error: "Not Implemented",
      message: "The code generation API is not implemented.",
    },
    { status: 501 },
  );
}
