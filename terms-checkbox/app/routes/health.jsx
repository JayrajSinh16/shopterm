/**
 * Health Check Endpoint
 * GET /health
 * Used by Railway (and other hosts) to verify the app is alive.
 */
export const loader = () => {
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
};
