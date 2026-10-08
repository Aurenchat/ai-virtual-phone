import { CLOUD_CREDENTIAL_KV_KEYS, DATA_MODULES } from "@/lib/data-management/modules";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({
    version: 1,
    modules: DATA_MODULES.map(({ id, label, critical, large, sources }) => ({
      id, label, critical: Boolean(critical), large: Boolean(large),
      sources: [
        ...sources.map((source, sourceIndex) => ({ ...source, sourceIndex })),
        ...(id === "settings" ? [{ type: "kv", sourceIndex: 999, label: "云服务连接信息（本地备份）", keys: CLOUD_CREDENTIAL_KV_KEYS }] : []),
      ],
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
