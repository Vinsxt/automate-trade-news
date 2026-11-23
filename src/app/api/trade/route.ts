import { connection, NextResponse } from "next/server";

import { getPilotDashboardData } from "@/lib/trade/dashboard";
import { SupabaseConfigurationError } from "@/lib/supabase/admin";

export async function GET() {
  await connection();
  try {
    return NextResponse.json({ data: await getPilotDashboardData() });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json(
        { error: { code: "DATABASE_NOT_CONFIGURED", message: "Database access is not configured" } },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: { code: "TRADE_DATA_UNAVAILABLE", message: "Trade data could not be loaded" } },
      { status: 500 },
    );
  }
}
