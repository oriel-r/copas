export interface Env {
  ASSETS: {
    fetch: (request: Request | URL | string) => Promise<Response>;
  };
  API_SERVICE?: {
    fetch: (request: Request | URL | string, init?: RequestInit) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env, _ctx: unknown): Promise<Response> {
    const url = new URL(request.url);

    // Interceptar rutas /api/*, /api, /auth/* y /auth para enrutar hacia el backend
    if (
      url.pathname.startsWith('/api/') ||
      url.pathname === '/api' ||
      url.pathname.startsWith('/auth/') ||
      url.pathname === '/auth'
    ) {
      if (!env.API_SERVICE) {
        return new Response(
          JSON.stringify({
            error: 'API_SERVICE_NOT_CONFIGURED',
            message: 'Service binding to API is not configured',
          }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Remover /api para entregar la ruta limpia a apps/api
      const targetPath = url.pathname.replace(/^\/api/, '') || '/';
      const targetUrl = new URL(targetPath + url.search, url.origin);

      const headers = new Headers(request.headers);
      headers.set('x-forwarded-host', url.host);
      headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

      const requestInit: RequestInit & { duplex?: 'half' } = {
        method: request.method,
        headers,
        body: request.body,
        redirect: 'manual',
        ...(request.body ? { duplex: 'half' } : {}),
      };

      const proxiedRequest = new Request(targetUrl.toString(), requestInit as RequestInit);
      return env.API_SERVICE.fetch(proxiedRequest);
    }

    // Servir assets estáticos del SPA para cualquier otra ruta
    return env.ASSETS.fetch(request);
  },
};
