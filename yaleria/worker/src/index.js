export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ========== DADOS DOS CARROSSÉIS (sincronização) ==========
    // GET /data  → devolve o JSON guardado
    // PUT /data  → grava o JSON completo
    if (path === '/data' || path.endsWith('/data')) {
      if (request.method === 'GET') {
        try {
          const obj = await env.BUCKET.get('carousels.json');
          if (!obj) {
            return new Response(JSON.stringify({ carousels: [], updatedAt: 0 }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const text = await obj.text();
          return new Response(text, {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Erro ao ler dados:', error);
          return new Response(JSON.stringify({ error: 'Erro ao ler dados' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      if (request.method === 'PUT' || request.method === 'POST') {
        try {
          const body = await request.json();
          if (!body || !Array.isArray(body.carousels)) {
            return new Response(JSON.stringify({ error: 'Formato inválido' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const payload = {
            carousels: body.carousels,
            updatedAt: body.updatedAt || Date.now()
          };
          await env.BUCKET.put('carousels.json', JSON.stringify(payload), {
            httpMetadata: { contentType: 'application/json' }
          });
          return new Response(JSON.stringify({ ok: true, updatedAt: payload.updatedAt }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Erro ao gravar dados:', error);
          return new Response(JSON.stringify({ error: 'Erro ao gravar dados' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ========== UPLOAD DE IMAGEM ==========
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file) {
        return new Response(JSON.stringify({ error: 'Ficheiro em falta' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `image_${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;

      await env.BUCKET.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type || 'image/jpeg' }
      });

      // Endpoint público do R2
      const publicUrl = `https://pub-c377ce7f35a74e54b07bb843d73ef48b.r2.dev/${filename}`;

      return new Response(JSON.stringify({ url: publicUrl }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      return new Response(JSON.stringify({ error: 'Erro interno' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};