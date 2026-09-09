// functions/api/upload.js
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Verifica se o body é FormData
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'Ficheiro em falta' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Gera um nome único para a imagem
    const filename = `image_${Date.now()}_${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() || 'jpg'}`;
    
    // Guarda no R2
    await env.BUCKET.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'image/jpeg'
      }
    });
    
    // Devolve a URL pública
    const publicUrl = `https://pub-xxxxxxxx.r2.dev/${filename}`; // Substitua pelo seu endpoint real
    
    return new Response(JSON.stringify({ url: publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}