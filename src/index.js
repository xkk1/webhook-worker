/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

function jsonResponse(data, status = 200, space=2, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, space), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders
    }
  });
}


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const headers = Object.fromEntries(request.headers.entries());

    // 群发入口：/api/broadcast
    if (url.pathname === "/api/broadcast" && method === "POST") {
      const method = request.method;

      let body = null;

      // 解析 body（支持 JSON / text / form）
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        body = await request.json().catch(() => "Invalid JSON");
      } else {
        return jsonResponse({ error: "Invalid Content-Type" }, 400);
      }
      if (Array.isArray(body) === false) {
        return jsonResponse({ error: "Invalid body, must JSON Array" }, 400);
      }


      // TODO: 群发
      let responses = [];
      for (const item of body) {
        /**
         * {
         *   url: string,
         *   body: string,
         *   headers: Record<string, string>,
         *   method: string
         * }
         */
        if (typeof item !== "object" || item === null) {
          responses.push({
            status: 400,
            body: "Invalid webhook"
          });
        }
        // url 必填，判断 url 是否存在
        if (!item.url) {
          responses.push({
            status: 400,
            body: "Invalid webhook, missing url"
          });
        }
        // 判断 url 是否为 str
        if (typeof item.url !== "string") {
          responses.push({
            status: 400,
            body: "Invalid webhook, url must be string"
          });
        }

        const response = await fetch(item.url, {
          method: item.method || "POST",
          headers: item.headers || {"Content-Type": "application/json"},
          body: JSON.stringify(item.body) || null
        });
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch (e) {
          responseBody = await response.text();
        }
        responses.push({
          status: response.status,
          body: responseBody
        })
      }
      return jsonResponse(responses);
    }

    // other path
    return jsonResponse({ error: "404 Not Found", path: url.pathname }, 404);
  }
};
