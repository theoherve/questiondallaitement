import { NextResponse } from "next/server";

export const GET = () => {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
};
