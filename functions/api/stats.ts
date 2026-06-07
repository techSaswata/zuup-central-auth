interface Env {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_SERVICE_ROLE_KEY: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ZONE_ID: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  
  let dbActiveConnections = "—";
  let dbRamUsage = "—";
  let cfRequests24h = "—";
  let cfBandwidth24h = "—";
  let cfThreats24h = "—";
  let trafficGraph: any[] = [];

  // 1. Fetch Supabase Metrics
  try {
    if (env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      const authStr = btoa(`service_role:${env.VITE_SUPABASE_SERVICE_ROLE_KEY}`);
      const sbUrl = env.VITE_SUPABASE_URL || "https://qnapwukqhybziduhzpow.supabase.co";
      const res = await fetch(`${sbUrl}/customer/v1/privileged/metrics`, {
        headers: { Authorization: `Basic ${authStr}` }
      });
      if (res.ok) {
        const text = await res.text();
        const getMetric = (pattern: string) => {
          const match = text.match(new RegExp(`^${pattern}(?:\\{.*?\\})?\\s+([0-9.]+)`, 'm'));
          return match ? parseFloat(match[1]) : null;
        };
        
        const memTotal = getMetric("node_memory_MemTotal_bytes");
        const memAvail = getMetric("node_memory_MemAvailable_bytes");
        if (memTotal && memAvail) {
          dbRamUsage = (((memTotal - memAvail) / memTotal) * 100).toFixed(1) + "%";
        }
        const conn = getMetric("pgbouncer_pools_client_active_connections");
        if (conn !== null) dbActiveConnections = conn.toString();
      }
    }
  } catch (e) {
    console.error("Supabase metrics error:", e);
  }

  // 2. Fetch Cloudflare GraphQL
  try {
    if (env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const dynamicQuery = `
        query {
          viewer {
            zones(filter: { zoneTag: "${env.CLOUDFLARE_ZONE_ID}" }) {
              httpRequests1dGroups(limit: 1, filter: { date_gt: "${yesterday.toISOString().split('T')[0]}" }) {
                sum { requests bytes threats }
              }
              httpRequests1hGroups(limit: 24, orderBy: [datetime_ASC], filter: { datetime_gt: "${yesterday.toISOString()}" }) {
                dimensions { datetime }
                sum { requests bytes threats }
              }
            }
          }
        }
      `;
      
      const cfRes = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: dynamicQuery })
      });
      
      if (cfRes.ok) {
        const cfData: any = await cfRes.json();
        const zone = cfData?.data?.viewer?.zones?.[0];
        if (zone) {
          const sum1d = zone.httpRequests1dGroups?.[0]?.sum || {};
          cfRequests24h = sum1d.requests?.toString() || "—";
          cfThreats24h = sum1d.threats?.toString() || "0";
          
          if (sum1d.bytes) {
            cfBandwidth24h = (sum1d.bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
          }
          
          const hourly = zone.httpRequests1hGroups || [];
          trafficGraph = hourly.map((h: any) => ({
            time: new Date(h.dimensions.datetime).getHours() + ":00",
            requests: h.sum.requests,
            bytes: h.sum.bytes,
            threats: h.sum.threats,
            sessions: Math.floor(h.sum.requests * 0.12) // Approximate sessions relative to network requests
          }));
        }
      }
    }
  } catch (e) {
    console.error("Cloudflare metrics error:", e);
  }

  // Fallback for development if no Cloudflare keys
  if (trafficGraph.length === 0) {
    trafficGraph = Array.from({ length: 24 }).map((_, i) => ({
      time: `${i}:00`,
      requests: 0,
      sessions: 0,
    }));
  }

  return new Response(JSON.stringify({
    activeConnections: dbActiveConnections,
    ramUsage: dbRamUsage,
    cfRequests24h,
    cfBandwidth24h,
    cfThreats24h,
    trafficGraph
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
};
