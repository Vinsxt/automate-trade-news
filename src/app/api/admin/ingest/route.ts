export function POST() {
  return Response.json({ error: { code: "OPERATOR_ONLY", message: "Trade snapshots are prepared offline." } }, { status: 410 });
}
