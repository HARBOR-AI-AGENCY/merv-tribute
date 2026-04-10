import { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = "https://eopwxchguerhvlpevbxo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcHd4Y2hndWVyaHZscGV2YnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTkzNjQsImV4cCI6MjA4OTY3NTM2NH0.JcaFxQALMiJymMrWBclr8bVLU8_uS9dph8j_GAZ6yps";
const ADMIN_PASSWORD = "mervorocks";
const DEVON_DRIVE_LINK = "https://drive.google.com/drive/u/1/folders/1mhP-GejBwU1b_qCMt-AEbO5Kgyn8H8ZS";

async function supabaseUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Update failed");
}

async function supabaseInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Submission failed");
}

async function uploadPhoto(blob, name) {
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/photos/${fileName}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "image/jpeg",
    },
    body: blob,
  });
  if (!res.ok) throw new Error("Upload failed");
  return `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;
}

async function rotateStoragePhoto(photoUrl, degrees) {
  const res = await fetch(photoUrl);
  if (!res.ok) throw new Error("Failed to fetch image");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")); };
    img.onload = () => {
      const rotated90 = degrees === 90 || degrees === 270;
      const cw = rotated90 ? img.height : img.width;
      const ch = rotated90 ? img.width : img.height;
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.translate(cw / 2, ch / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(async (blob) => {
        try { resolve(await uploadPhoto(blob, '')); }
        catch (e) { reject(e); }
      }, 'image/jpeg', 0.82);
    };
    img.src = objectUrl;
  });
}

function compressAndCrop(imgSrc, aspectRatio, maxW = 1200, rotation = 0) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Image failed to load"));
    img.onload = () => {
      // Step 1: apply rotation
      const rotated90 = rotation === 90 || rotation === 270;
      const rotW = rotated90 ? img.height : img.width;
      const rotH = rotated90 ? img.width : img.height;
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = rotW;
      rotCanvas.height = rotH;
      const rotCtx = rotCanvas.getContext('2d');
      rotCtx.translate(rotW / 2, rotH / 2);
      rotCtx.rotate((rotation * Math.PI) / 180);
      rotCtx.drawImage(img, -img.width / 2, -img.height / 2);

      // Step 2: crop and compress from rotated canvas
      const canvas = document.createElement('canvas');
      let sw = rotW, sh = rotH;
      let sx = 0, sy = 0;
      if (aspectRatio) {
        const srcRatio = sw / sh;
        if (srcRatio > aspectRatio) {
          sw = Math.round(sh * aspectRatio);
          sx = Math.round((rotW - sw) / 2);
        } else {
          sh = Math.round(sw / aspectRatio);
          sy = Math.round((rotH - sh) / 2);
        }
      }
      const scale = Math.min(1, maxW / sw);
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(rotCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(resolve, 'image/jpeg', 0.82);
    };
    img.src = imgSrc;
  });
}

const ASPECT_OPTIONS = [
  { label: "Original", value: null },
  { label: "Square 1:1", value: 1 },
  { label: "Landscape 4:3", value: 4/3 },
  { label: "Portrait 3:4", value: 3/4 },
];

const ARTWORKS = [
  { title: "Willie Nelson", medium: "Drawing", img: "https://i.pinimg.com/736x/fa/12/78/fa12780cb9808d77b3dd6a21b7275ade.jpg", link: "https://www.pinterest.com/pin/britishcanadian-artist-merv-scoble-httpswwwfacebookcommervscoblereftsfrefts--187180928240206725", note: "Expressive portraiture - one of hundreds of drawings Merv created across five decades." },
  { title: "Jimi Hendrix", medium: "Acrylic on canvas", img: "/merv_hendrix.jpg", link: "https://www.facebook.com/merv.scoble", note: "One of Merv's rock icon portraits - vibrant acrylic work capturing Hendrix mid-performance." },
  { title: "Darryl Sittler - Toronto Maple Leafs", medium: "Lithograph, numbered & signed - 43/500", img: "https://artisticafineart.com/cdn/shop/files/A435-Darryl-Sittler-Toronto-Maple-Leafs-by-Mervyn-Scoble.jpg?v=1736386449&width=600", link: "https://artisticafineart.com/products/darryl-sittler-toronto-maple-leafs-by-mervyn-scoble-lithograph", note: "Co-signed by Darryl Sittler himself. One of Merv's landmark Canadian sports commissions." },
  { title: "Chinatown", medium: "Lithograph, numbered & signed - 302/500", img: "https://artisticafineart.com/cdn/shop/files/A106-Chinatown-by-Mervyn-Scoble.jpg?v=1736389021&width=600", link: "https://artisticafineart.com/products/chinatown-by-mervyn-scoble-lithograph", note: "Part of Merv's series documenting Toronto's distinctive neighbourhoods." },
  { title: "Le Vieux Montreal", medium: "Lithograph, numbered & signed - 06/200", img: "https://artisticafineart.com/cdn/shop/files/SIG578-Le-Vieux-Montreal-by-Mervyn-Scoble.jpg?v=1736379063&width=600", link: "https://artisticafineart.com/products/le-vieux-montreal-lithography-numbered-signed-06-200", note: "Merv's eye for architectural character shines in this Old Montreal scene." },
  { title: "Notre Dame de Bonsecours - Montreal", medium: "Lithograph, numbered & signed - 25/200", img: "https://artisticafineart.com/cdn/shop/products/artistica_fine_art_sig577.jpg?v=1736379243&width=600", link: "https://artisticafineart.com/products/notre-dame-de-bonsecours-lithography-numbered-signed-25-200", note: "Architectural study of one of Montreal's most beloved historic chapels." },
];

const ART_LINKS = [
  { label: "Artistica Fine Art", url: "https://artisticafineart.com/collections/canadian-art/artist_scoble-mervyn", note: "Limited edition lithographs - exclusive publisher of Merv's graphic works" },
  { label: "Artsy - Mervyn Scoble", url: "https://www.artsy.net/artist/mervyn-scoble", note: "International art platform profile" },
  { label: "Heffel Fine Art", url: "https://www.heffel.com/Artist/585F5D5B/Mervyn%20Scoble/", note: "Canada's leading fine art auction house" },
  { label: "Facebook - Merv Scoble Art", url: "https://www.facebook.com/merv.scoble", note: "Merv's own Facebook art page" },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #f5f0e6; --parchment: #ede5d2; --forest: #253426;
    --forest-mid: #324e34; --gold: #b6903a; --gold-light: #d2ab63;
    --charcoal: #222222; --muted: #6a5f54; --border: #d6ccb8; --white: #ffffff;
  }
  html { scroll-behavior: smooth; }
  body { background: var(--cream); font-family: 'Jost', sans-serif; font-weight: 300; color: var(--charcoal); line-height: 1.7; -webkit-text-size-adjust: 100%; }

  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 200; height: 52px; background: rgba(37,52,38,0.96); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; padding: 0 1.2rem; transform: translateY(-100%); transition: transform 0.35s ease; border-bottom: 1px solid rgba(182,144,58,0.15); }
  .nav.show { transform: translateY(0); }
  .nav-name { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 1rem; color: var(--gold-light); }
  .nav-links { display: flex; gap: 1.2rem; }
  .nav-links a { color: rgba(245,240,230,0.5); text-decoration: none; font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; transition: color 0.2s; }
  .nav-links a:hover { color: var(--gold-light); }

  .hero { min-height: 100svh; display: grid; grid-template-rows: 1fr auto; position: relative; overflow: hidden; background: #1b2b1c; }
  .hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at 15% 15%, rgba(182,144,58,0.18) 0%, transparent 55%), linear-gradient(170deg, #1e2f1f 0%, #253426 45%, #192019 100%); }
  .hero-inner { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 5rem 1.5rem 2rem; position: relative; z-index: 1; }
  .hero-pill { display: inline-flex; align-items: center; gap: 0.7rem; background: rgba(182,144,58,0.1); border: 1px solid rgba(182,144,58,0.28); border-radius: 100px; padding: 0.38rem 1.2rem; margin-bottom: 2rem; animation: fadeUp 0.9s ease both; }
  .hero-pill span { font-size: 0.65rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--gold-light); font-weight: 300; }
  .hero-pill-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--gold); opacity: 0.55; }
  .hero-name { font-family: 'Cormorant Garamond', serif; font-size: clamp(3.2rem, 13vw, 8rem); font-weight: 300; color: var(--cream); line-height: 0.95; animation: fadeUp 0.9s 0.12s ease both; margin-bottom: 0.6rem; }
  .hero-name em { font-style: italic; color: var(--gold-light); }
  .hero-aka { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: clamp(1rem, 3vw, 1.6rem); color: rgba(210,171,99,0.6); animation: fadeUp 0.9s 0.22s ease both; margin-bottom: 2rem; letter-spacing: 0.06em; }
  .hero-divider { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 2rem; animation: fadeUp 0.9s 0.3s ease both; }
  .hdl { width: 40px; height: 1px; background: rgba(182,144,58,0.38); }
  .hdd { width: 5px; height: 5px; background: var(--gold); transform: rotate(45deg); opacity: 0.55; }
  .hero-event { animation: fadeUp 0.9s 0.4s ease both; color: rgba(245,240,230,0.6); font-size: clamp(0.82rem, 2.5vw, 0.95rem); letter-spacing: 0.05em; line-height: 2.1; font-weight: 300; }
  .hero-event strong { color: var(--cream); font-weight: 400; display: block; font-size: clamp(0.9rem, 3vw, 1.08rem); margin-bottom: 0.15rem; }
  .hero-foot { position: relative; z-index: 1; border-top: 1px solid rgba(255,255,255,0.05); padding: 1.2rem 1.5rem; display: flex; align-items: center; justify-content: center; gap: 0.6rem; animation: fadeUp 0.9s 0.75s ease both; }
  .hero-foot-txt { font-size: 0.65rem; letter-spacing: 0.25em; text-transform: uppercase; color: rgba(245,240,230,0.28); }
  .bounce { color: rgba(182,144,58,0.45); animation: bounce 2.2s infinite; font-size: 0.85rem; }

  .hero-wall-link { display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 2.2rem; padding: 0.45rem 1.4rem; border: 1px solid rgba(182,144,58,0.22); border-radius: 100px; text-decoration: none; color: rgba(210,171,99,0.5); font-size: 0.62rem; letter-spacing: 0.22em; text-transform: uppercase; transition: color 0.3s, border-color 0.3s; animation: fadeUp 0.9s 0.55s ease both; }
  .hero-wall-link:hover { color: var(--gold-light); border-color: rgba(182,144,58,0.45); }
  .hero-wall-link-arrow { font-size: 0.7rem; opacity: 0.6; transition: opacity 0.3s; }
  .hero-wall-link:hover .hero-wall-link-arrow { opacity: 1; }

  .about { background: var(--forest); position: relative; }
  .about-inner { max-width: 960px; margin: 0 auto; padding: 4rem 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start; }
  .about-quote { position: relative; padding: 1rem 0; }
  .about-quote blockquote { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: clamp(1rem, 2.5vw, 1.45rem); line-height: 1.78; color: rgba(245,240,230,0.88); font-weight: 300; }
  .about-quote cite { display: block; margin-top: 1.4rem; font-style: normal; font-size: 0.7rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold-light); opacity: 0.7; }
  .about-bio { padding: 1rem 0; }
  .about-eyebrow { font-size: 0.65rem; letter-spacing: 0.35em; text-transform: uppercase; color: var(--gold); margin-bottom: 1rem; opacity: 0.8; }
  .about-bio p { color: rgba(245,240,230,0.62); font-size: 0.95rem; line-height: 1.85; margin-bottom: 1rem; font-weight: 300; }
  .about-bio p strong { color: rgba(245,240,230,0.9); font-weight: 400; }
  .about-bio p em { color: var(--gold-light); font-style: italic; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 1.2rem 0 1.5rem; }
  .tag { font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; border: 1px solid rgba(182,144,58,0.3); color: var(--gold-light); padding: 0.25rem 0.7rem; border-radius: 100px; }
  .tufc-link { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--gold-light); text-decoration: none; font-size: 0.73rem; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid rgba(210,171,99,0.3); padding-bottom: 0.1rem; transition: color 0.2s; }
  .tufc-link:hover { color: var(--gold); }

  .section { max-width: 860px; margin: 0 auto; padding: 3.5rem 1.5rem; }
  .section-eyebrow { font-size: 0.65rem; letter-spacing: 0.35em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.7rem; }
  .section-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.8rem, 5vw, 3rem); font-weight: 300; line-height: 1.12; color: var(--forest); margin-bottom: 1rem; }
  .section-title em { font-style: italic; color: var(--gold); }
  .section-body { color: var(--muted); font-size: 0.95rem; line-height: 1.85; margin-bottom: 1.4rem; }
  .section-body strong { color: var(--charcoal); font-weight: 400; }

  .divider { display: flex; align-items: center; gap: 1rem; margin: 0 auto; max-width: 860px; padding: 0 1.5rem; opacity: 0.32; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .divider-d { width: 5px; height: 5px; background: var(--gold); transform: rotate(45deg); }

  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); margin-bottom: 2rem; border-radius: 2px; overflow: hidden; }
  .info-cell { background: var(--white); padding: 1.2rem 1.3rem; }
  .info-label { font-size: 0.62rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.35rem; }
  .info-val { font-family: 'Cormorant Garamond', serif; font-size: 1.05rem; color: var(--forest); line-height: 1.4; }

  .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.2rem; margin-bottom: 2.5rem; }
  .art-card { background: var(--white); border: 1px solid var(--border); border-radius: 2px; overflow: hidden; text-decoration: none; color: inherit; display: flex; flex-direction: column; transition: transform 0.25s ease, box-shadow 0.25s ease; box-shadow: 0 2px 12px rgba(37,52,38,0.06); }
  .art-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(37,52,38,0.12); }
  .art-img-wrap { position: relative; padding-bottom: 72%; overflow: hidden; background: var(--parchment); }
  .art-img-wrap img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
  .art-card:hover .art-img-wrap img { transform: scale(1.04); }
  .art-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(37,52,38,0.65) 0%, transparent 50%); opacity: 0; transition: opacity 0.3s; display: flex; align-items: flex-end; padding: 1rem; }
  .art-card:hover .art-overlay { opacity: 1; }
  .art-overlay-txt { color: var(--cream); font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; }
  .art-info { padding: 1rem 1.1rem 1.2rem; flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
  .art-title { font-family: 'Cormorant Garamond', serif; font-size: 1.05rem; font-weight: 400; color: var(--forest); line-height: 1.3; }
  .art-medium { font-size: 0.67rem; letter-spacing: 0.1em; color: var(--gold); text-transform: uppercase; }
  .art-note { font-size: 0.8rem; color: var(--muted); line-height: 1.6; margin-top: 0.3rem; }

  .art-links { display: grid; gap: 0.7rem; margin-bottom: 2rem; }
  .art-link-card { display: flex; align-items: flex-start; gap: 0.9rem; background: var(--white); border: 1px solid var(--border); border-radius: 2px; padding: 1rem 1.2rem; text-decoration: none; color: inherit; transition: border-color 0.2s; }
  .art-link-card:hover { border-color: var(--gold); }
  .art-link-dot { flex-shrink: 0; width: 7px; height: 7px; background: var(--gold); border-radius: 50%; margin-top: 0.42rem; opacity: 0.7; }
  .art-link-label { font-size: 0.88rem; font-weight: 400; color: var(--forest); margin-bottom: 0.15rem; }
  .art-link-note { font-size: 0.78rem; color: var(--muted); }

  .find-more { background: var(--parchment); border: 1px solid var(--border); border-radius: 2px; padding: 1.8rem; margin-bottom: 1rem; }
  .find-more h3 { font-family: 'Cormorant Garamond', serif; font-size: 1.25rem; font-weight: 400; color: var(--forest); margin-bottom: 0.5rem; }
  .find-more p { font-size: 0.88rem; color: var(--muted); line-height: 1.7; margin-bottom: 1rem; }

  .tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 1.8rem; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .tab { flex-shrink: 0; padding: 0.75rem 1.3rem; background: none; border: none; border-bottom: 2px solid transparent; font-family: 'Jost', sans-serif; font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: all 0.2s; margin-bottom: -1px; font-weight: 300; white-space: nowrap; }
  .tab.active { color: var(--forest); border-bottom-color: var(--gold); font-weight: 400; }
  .tab:hover:not(.active) { color: var(--charcoal); }

  .card { background: var(--white); border: 1px solid var(--border); border-radius: 2px; padding: 1.8rem; box-shadow: 0 1px 14px rgba(37,52,38,0.05); }
  .form-group { margin-bottom: 1.2rem; }
  label { display: block; font-size: 0.68rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.45rem; font-weight: 400; }
  input, textarea, select { width: 100%; padding: 0.78rem 0.9rem; border: 1px solid var(--border); background: var(--cream); font-family: 'Jost', sans-serif; font-weight: 300; font-size: 1rem; color: var(--charcoal); border-radius: 1px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none; }
  input:focus, textarea:focus, select:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(182,144,58,0.1); background: var(--white); }
  textarea { resize: vertical; min-height: 120px; line-height: 1.7; }

  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.85rem 2rem; background: var(--forest); color: var(--cream); border: none; font-family: 'Jost', sans-serif; font-size: 0.72rem; font-weight: 400; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: background 0.2s; border-radius: 1px; touch-action: manipulation; }
  .btn:hover { background: var(--forest-mid); }
  .btn:disabled { opacity: 0.42; cursor: not-allowed; }
  .btn-full { width: 100%; }

  .success-msg { display: flex; align-items: center; gap: 0.7rem; padding: 1rem 1.2rem; background: rgba(37,52,38,0.06); border-left: 3px solid var(--forest); font-size: 0.88rem; color: var(--forest); margin-top: 1rem; }
  .error-msg { padding: 0.9rem 1.1rem; background: rgba(180,60,60,0.07); border-left: 3px solid #b43c3c; font-size: 0.84rem; color: #8b2020; margin-top: 1rem; }

  .memories-wall { display: grid; gap: 0.9rem; margin-top: 2rem; }
  .memory-card { background: var(--white); border: 1px solid var(--border); padding: 1.4rem; border-radius: 2px; }
  .memory-text { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 1.08rem; line-height: 1.72; color: var(--charcoal); margin-bottom: 0.7rem; }
  .memory-meta { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
  .memory-author { font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
  .memory-rel { font-size: 0.68rem; color: var(--gold); }

  /* Photo upload & preview */
  .photo-drop-zone { border: 2px dashed #999; border-radius: 4px; padding: 2rem 1rem; text-align: center; cursor: pointer; background: rgba(255,255,255,0.75); transition: border-color 0.2s, background 0.2s; margin-bottom: 1rem; }
  .photo-drop-zone:hover { border-color: #555; background: rgba(255,255,255,0.95); }
  .photo-drop-zone input[type=file] { display: none; }
  .photo-drop-zone-text { color: #444; font-size: 0.92rem; }
  .photo-drop-zone-sub { color: #888; font-size: 0.78rem; margin-top: 0.3rem; }

  .photo-preview-wrap { margin-bottom: 1.2rem; }
  .photo-preview-img { width: 100%; max-height: 340px; object-fit: contain; border-radius: 2px; border: 1px solid var(--border); background: #f0f0f0; display: block; }
  .aspect-btns { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.8rem 0 1rem; }
  .aspect-btn { padding: 0.4rem 0.9rem; font-family: 'Jost', sans-serif; font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; border: 1px solid #aaa; background: white; color: #333; border-radius: 100px; cursor: pointer; transition: all 0.15s; }
  .aspect-btn.active { background: var(--forest); color: white; border-color: var(--forest); }

  .photo-grid-public { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-top: 1.8rem; }
  .photo-pub-card { background: var(--white); border: 1px solid var(--border); border-radius: 2px; overflow: hidden; }
  .photo-pub-img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
  .photo-pub-desc { padding: 0.6rem 0.8rem; font-size: 0.78rem; color: var(--muted); line-height: 1.5; }
  .photo-pub-name { font-size: 0.68rem; color: var(--gold); letter-spacing: 0.08em; margin-top: 0.2rem; }

  .footer { background: var(--forest); color: rgba(245,240,230,0.42); text-align: center; padding: 3.5rem 1.5rem 2.5rem; font-size: 0.86rem; line-height: 2.1; }
  .footer-name { font-family: 'Cormorant Garamond', serif; font-style: italic; color: var(--gold-light); font-size: 1.6rem; display: block; margin-bottom: 0.4rem; font-weight: 300; }
  .footer-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1.2rem; margin-top: 1.4rem; }
  .footer-link { color: rgba(210,171,99,0.5); text-decoration: none; font-size: 0.73rem; letter-spacing: 0.1em; transition: color 0.2s; }
  .footer-link:hover { color: var(--gold-light); }

  .admin-wrap { max-width: 900px; margin: 0 auto; padding: 2.5rem 1.5rem; }
  .admin-title { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; color: var(--forest); margin-bottom: 0.3rem; font-weight: 300; }
  .admin-sub { color: var(--muted); font-size: 0.85rem; margin-bottom: 2.5rem; }
  .admin-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; margin-bottom: 1.8rem; }
  .admin-stat { padding: 1.3rem 1rem; border-radius: 2px; text-align: center; cursor: pointer; transition: opacity 0.2s; user-select: none; }
  .admin-stat:hover { opacity: 0.85; }
  .admin-stat-num { font-family: 'Cormorant Garamond', serif; font-size: 2.8rem; font-weight: 300; display: block; }
  .admin-stat-label { font-size: 0.65rem; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.75; display: block; margin-top: 0.2rem; }
  .admin-panel { border: 1px solid var(--border); border-radius: 2px; margin-bottom: 1.8rem; overflow: hidden; }
  .admin-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.3rem; background: var(--parchment); border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 0.5rem; }
  .admin-panel-title { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; color: var(--forest); font-weight: 300; }
  .admin-panel-body { padding: 1.3rem; background: var(--white); }
  .admin-row { border: 1px solid var(--border); padding: 1rem 1.2rem; border-radius: 2px; margin-bottom: 0.65rem; background: var(--cream); }
  .admin-row:last-child { margin-bottom: 0; }
  .admin-row-msg { font-style: italic; font-family: 'Cormorant Garamond', serif; font-size: 1rem; color: var(--charcoal); margin-bottom: 0.45rem; }
  .admin-row-meta { font-size: 0.72rem; color: var(--muted); display: flex; gap: 0.8rem; flex-wrap: wrap; }
  .admin-row-meta strong { color: var(--charcoal); }
  .admin-song-title { font-size: 0.95rem; font-weight: 400; color: var(--forest); margin-bottom: 0.25rem; }
  .admin-song-artist { color: var(--gold); }
  .admin-song-note { font-size: 0.85rem; color: var(--muted); font-style: italic; margin-bottom: 0.25rem; }
  .admin-empty { color: var(--muted); font-size: 0.88rem; padding: 0.4rem 0; }
  .admin-photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px,1fr)); gap: 0.9rem; }
  .admin-photo-item { position: relative; border-radius: 2px; overflow: hidden; border: 1px solid var(--border); }
  .admin-photo-item img { width: 100%; height: 130px; object-fit: cover; display: block; }
  .admin-photo-desc { padding: 0.35rem 0.5rem; font-size: 0.72rem; color: var(--muted); line-height: 1.4; background: var(--cream); }
  .admin-photo-dl { display: block; text-align: center; padding: 0.35rem; background: var(--forest); color: var(--cream); font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; }
  .admin-photo-dl:hover { background: var(--forest-mid); }

  /* Wall section overrides */
  #contribute .section-eyebrow { color: #111 !important; font-weight: 600 !important; }
  #contribute .section-title { color: #111 !important; font-weight: 400 !important; }
  #contribute .section-title em { color: #7a5a10 !important; }
  #contribute .section-body { color: #111 !important; font-weight: 500 !important; }
  #contribute .tab { color: #cc0000 !important; font-weight: 600 !important; }
  #contribute .tab.active { color: #880000 !important; font-weight: 700 !important; border-bottom-color: #cc0000 !important; }
  #contribute .tab:hover:not(.active) { color: #000 !important; }
  #contribute a { color: #1a1a1a !important; font-weight: 600 !important; text-decoration: underline !important; text-underline-offset: 3px !important; text-decoration-color: #7a5a10 !important; }
  #contribute a:hover { color: #7a5a10 !important; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }

  @media (max-width: 700px) {
    .about-inner { grid-template-columns: 1fr; gap: 2rem; }
    .card { padding: 1.3rem; }
    .nav-links { gap: 0.8rem; }
    .gallery-grid { grid-template-columns: 1fr 1fr; gap: 0.8rem; }
    .admin-stats { grid-template-columns: 1fr; }
    .admin-photo-grid { grid-template-columns: 1fr 1fr; }
    .photo-grid-public { grid-template-columns: 1fr 1fr; }
    .aspect-btns { gap: 0.4rem; }
    .tabs { overflow-x: visible; }
    .tab { flex-shrink: 1; white-space: normal; text-align: center; padding: 0.75rem 0.6rem; font-size: 0.65rem; min-width: 0; }
  }
  @media (max-width: 380px) {
    .gallery-grid { grid-template-columns: 1fr; }
    .nav-links { display: none; }
    .hero-name { font-size: 2.8rem; }
  }
`;

export default function App() {
  const isAdmin = window.location.pathname === '/admin';

  const [navVisible, setNavVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("memory");
  const [memoryForm, setMemoryForm] = useState({ name: "", relationship: "", message: "" });
  const [songForm, setSongForm] = useState({ name: "", song: "", artist: "", note: "" });
  const [memState, setMemState] = useState("idle");
  const [songState, setSongState] = useState("idle");
  const [memories, setMemories] = useState([]);
  const [songs, setSongs] = useState([]);
  const [photos, setPhotos] = useState([]);

  // Photo upload state
  const [rawSrc, setRawSrc] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [selectedAspect, setSelectedAspect] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [photoName, setPhotoName] = useState("");
  const [photoDesc, setPhotoDesc] = useState("");
  const [photoState, setPhotoState] = useState("idle");
  const fileInputRef = useRef(null);

  // Admin state
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminMemories, setAdminMemories] = useState([]);
  const [adminSongs, setAdminSongs] = useState([]);
  const [adminPhotos, setAdminPhotos] = useState([]);
  const [adminTab, setAdminTab] = useState(null);
  const [rotatingPhotoId, setRotatingPhotoId] = useState(null);

  useEffect(() => {
    return () => {
      if (previewSrc && previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/memories?select=name,relationship,message&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    }).then(r => r.json()).then(data => { if (Array.isArray(data)) setMemories(data.map(m => ({ name: m.name, rel: m.relationship, text: m.message }))); }).catch(console.error);

    fetch(`${SUPABASE_URL}/rest/v1/song_requests?select=song_title,artist,note,submitted_by&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    }).then(r => r.json()).then(data => { if (Array.isArray(data)) setSongs(data); }).catch(console.error);

    fetch(`${SUPABASE_URL}/rest/v1/photos?select=url,name,description,created_at&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    }).then(r => r.json()).then(data => { if (Array.isArray(data)) setPhotos(data); }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!adminAuth) return;
    fetch(`${SUPABASE_URL}/rest/v1/memories?select=*&order=created_at.desc`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }).then(r => r.json()).then(data => { if (Array.isArray(data)) setAdminMemories(data); });
    fetch(`${SUPABASE_URL}/rest/v1/song_requests?select=*&order=created_at.desc`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }).then(r => r.json()).then(data => { if (Array.isArray(data)) setAdminSongs(data); });
    fetch(`${SUPABASE_URL}/rest/v1/photos?select=*&order=created_at.desc`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }).then(r => r.json()).then(data => { if (Array.isArray(data)) setAdminPhotos(data); });
  }, [adminAuth]);

  // When file is selected, show preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawSrc(ev.target.result);
      setPreviewSrc(ev.target.result);
      setSelectedAspect(null);
      setRotation(0);
      setPhotoState("idle");
    };
    reader.readAsDataURL(file);
  };

  // Update preview when aspect or rotation changes
  const updatePreview = useCallback(async (aspect, rot) => {
    if (!rawSrc) return;
    const blob = await compressAndCrop(rawSrc, aspect, 1200, rot);
    const url = URL.createObjectURL(blob);
    setPreviewSrc(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return url;
    });
  }, [rawSrc]);

  const handleAspectChange = (aspect) => {
    setSelectedAspect(aspect);
    updatePreview(aspect, rotation);
  };

  const handleRotate = (dir) => {
    const newRot = (rotation + dir + 360) % 360;
    setRotation(newRot);
    updatePreview(selectedAspect, newRot);
  };

  const submitMemory = async () => {
    if (!memoryForm.message.trim()) return;
    setMemState("loading");
    try {
      await supabaseInsert("memories", { name: memoryForm.name || "Anonymous", relationship: memoryForm.relationship, message: memoryForm.message, created_at: new Date().toISOString() });
      setMemories(prev => [{ name: memoryForm.name || "Anonymous", rel: memoryForm.relationship, text: memoryForm.message }, ...prev]);
      setMemoryForm({ name: "", relationship: "", message: "" });
      setMemState("success");
    } catch { setMemState("error"); }
  };

  const submitSong = async () => {
    if (!songForm.song.trim()) return;
    setSongState("loading");
    try {
      await supabaseInsert("song_requests", { submitted_by: songForm.name || "Anonymous", song_title: songForm.song, artist: songForm.artist, note: songForm.note, created_at: new Date().toISOString() });
      setSongs(prev => [{ song_title: songForm.song, artist: songForm.artist, note: songForm.note, submitted_by: songForm.name || "Anonymous" }, ...prev]);
      setSongForm({ name: "", song: "", artist: "", note: "" });
      setSongState("success");
    } catch { setSongState("error"); }
  };

  const submitPhoto = async () => {
    if (!rawSrc) return;
    setPhotoState("loading");
    try {
      const blob = await compressAndCrop(rawSrc, selectedAspect, 1200, rotation);
      const url = await uploadPhoto(blob, photoName);
      await supabaseInsert("photos", { url, name: photoName || "Anonymous", description: photoDesc, created_at: new Date().toISOString() });
      setPhotos(prev => [{ url, name: photoName || "Anonymous", description: photoDesc }, ...prev]);
      setRawSrc(null); setPreviewSrc(null); setPhotoName(""); setPhotoDesc(""); setSelectedAspect(null); setRotation(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setPhotoState("success");
    } catch { setPhotoState("error"); }
  };

  const downloadCSV = () => {
    const escape = val => `"${(val||'').replace(/"/g, '""')}"`;
    const headers = ['Song Title', 'Artist / Band', 'Why This Song', 'Submitted By', 'Date Submitted'];
    const rows = adminSongs.map(s => [escape(s.song_title), escape(s.artist||''), escape(s.note||''), escape(s.submitted_by||'Anonymous'), escape(new Date(s.created_at).toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric'}))]);
    const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/tab-separated-values;charset=utf-8,' + encodeURIComponent(tsv);
    a.download = 'merv-song-requests.tsv';
    a.click();
  };

  const handleAdminRotate = async (photo, degrees) => {
    setRotatingPhotoId(photo.id);
    try {
      const newUrl = await rotateStoragePhoto(photo.url, degrees);
      await supabaseUpdate('photos', photo.id, { url: newUrl });
      setAdminPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, url: newUrl } : p));
    } catch (e) {
      alert('Rotation failed: ' + e.message);
    } finally {
      setRotatingPhotoId(null);
    }
  };

  const handleDownload = async (photo) => {
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1] || 'jpg';
      const filename = `merv-photo-${photo.id || Date.now()}.${ext}`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert('Download failed: ' + e.message);
    }
  };

  const checkPassword = () => {
    if (adminPass === ADMIN_PASSWORD) setAdminAuth(true);
    else alert('Incorrect password');
  };

  if (isAdmin && !adminAuth) {
    return (
      <>
        <style>{styles}</style>
        <div style={{minHeight:'100svh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--forest)',padding:'1rem'}}>
          <div style={{background:'white',padding:'2rem',borderRadius:'2px',width:'100%',maxWidth:'320px',textAlign:'center',boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
            <div style={{fontFamily:'Cormorant Garamond,serif',fontSize:'1.7rem',color:'var(--forest)',marginBottom:'0.3rem'}}>Admin Access</div>
            <div style={{fontSize:'0.78rem',color:'var(--muted)',marginBottom:'1.4rem',letterSpacing:'0.1em'}}>Mervyn Scoble Tribute</div>
            <input type="password" placeholder="Password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')checkPassword();}} style={{width:'100%',padding:'0.8rem',border:'1px solid var(--border)',marginBottom:'1rem',fontFamily:'Jost,sans-serif',borderRadius:'1px',outline:'none',fontSize:'1rem'}} />
            <button className="btn btn-full" onClick={checkPassword}>Enter</button>
          </div>
        </div>
      </>
    );
  }

  if (isAdmin && adminAuth) {
    return (
      <>
        <style>{styles}</style>
        <div style={{background:'var(--forest)',padding:'1rem 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
          <div style={{fontFamily:'Cormorant Garamond,serif',color:'var(--gold-light)',fontSize:'1rem',fontStyle:'italic'}}>Mervyn Scoble - Admin</div>
          <a href="/" style={{color:'rgba(245,240,230,0.5)',fontSize:'0.68rem',letterSpacing:'0.18em',textTransform:'uppercase',textDecoration:'none'}}>Back to site</a>
        </div>
        <div className="admin-wrap">
          <div className="admin-title">Dashboard</div>
          <div className="admin-sub">mervo.harborai.ca - All submissions</div>
          <div className="admin-stats">
            <div className="admin-stat" style={{background:'var(--forest)',color:'var(--cream)'}} onClick={()=>setAdminTab(adminTab==='memories'?null:'memories')}>
              <span className="admin-stat-num">{adminMemories.length}</span>
              <span className="admin-stat-label">Memories</span>
            </div>
            <div className="admin-stat" style={{background:'var(--gold)',color:'white'}} onClick={()=>setAdminTab(adminTab==='songs'?null:'songs')}>
              <span className="admin-stat-num">{adminSongs.length}</span>
              <span className="admin-stat-label">Songs</span>
            </div>
            <div className="admin-stat" style={{background:'#4a6b8a',color:'white'}} onClick={()=>setAdminTab(adminTab==='photos'?null:'photos')}>
              <span className="admin-stat-num">{adminPhotos.length}</span>
              <span className="admin-stat-label">Photos</span>
            </div>
          </div>

          {adminTab==='memories' && (
            <div className="admin-panel">
              <div className="admin-panel-header"><div className="admin-panel-title">Memories</div></div>
              <div className="admin-panel-body">
                {adminMemories.length===0 && <div className="admin-empty">No memories yet.</div>}
                {adminMemories.map((m,i)=>(
                  <div className="admin-row" key={i}>
                    <div className="admin-row-msg">{m.message}</div>
                    <div className="admin-row-meta"><span><strong>{m.name}</strong></span>{m.relationship&&<span>- {m.relationship}</span>}<span>{new Date(m.created_at).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab==='songs' && (
            <div className="admin-panel">
              <div className="admin-panel-header">
                <div className="admin-panel-title">Song Requests</div>
                <button className="btn" onClick={downloadCSV} style={{padding:'0.55rem 1.1rem',fontSize:'0.65rem'}}>Download for Excel</button>
              </div>
              <div className="admin-panel-body">
                {adminSongs.length===0 && <div className="admin-empty">No song requests yet.</div>}
                {adminSongs.map((s,i)=>(
                  <div className="admin-row" key={i}>
                    <div className="admin-song-title">{s.song_title}{s.artist&&<span className="admin-song-artist"> - {s.artist}</span>}</div>
                    {s.note&&<div className="admin-song-note">{s.note}</div>}
                    <div className="admin-row-meta"><span><strong>{s.submitted_by}</strong></span><span>{new Date(s.created_at).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'})}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminTab==='photos' && (
            <div className="admin-panel">
              <div className="admin-panel-header"><div className="admin-panel-title">Photos</div></div>
              <div className="admin-panel-body">
                {adminPhotos.length===0 && <div className="admin-empty">No photos yet.</div>}
                <div className="admin-photo-grid">
                  {adminPhotos.map((p,i)=>(
                    <div className="admin-photo-item" key={i}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer">
                        <img src={p.url} alt={p.name} style={{opacity: rotatingPhotoId===p.id ? 0.4 : 1, transition:'opacity 0.2s', display:'block', width:'100%'}} />
                      </a>
                      {p.description&&<div className="admin-photo-desc">{p.description}</div>}
                      <div style={{display:'flex',gap:'0.4rem',padding:'0.3rem 0.5rem',flexWrap:'wrap',alignItems:'center'}}>
                        <button disabled={!!rotatingPhotoId} onClick={()=>handleAdminRotate(p, -90)} style={{flex:1,padding:'0.35rem 0.3rem',fontSize:'0.72rem',background:'#324e34',color:'white',border:'none',cursor:'pointer',borderRadius:'1px',opacity:rotatingPhotoId===p.id?0.5:1}}>
                          {rotatingPhotoId===p.id ? '...' : '↺ Left'}
                        </button>
                        <button disabled={!!rotatingPhotoId} onClick={()=>handleAdminRotate(p, 90)} style={{flex:1,padding:'0.35rem 0.3rem',fontSize:'0.72rem',background:'#324e34',color:'white',border:'none',cursor:'pointer',borderRadius:'1px',opacity:rotatingPhotoId===p.id?0.5:1}}>
                          {rotatingPhotoId===p.id ? '...' : '↻ Right'}
                        </button>
                        <button className="admin-photo-dl" onClick={()=>handleDownload(p)} style={{flex:1,cursor:'pointer',border:'none'}}>Download</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <nav className={`nav ${navVisible?"show":""}`}>
        <div className="nav-name">Mervyn Scoble</div>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#art">Art</a>
          <a href="#details">Event</a>
          <a href="#contribute">Share</a>
        </div>
      </nav>

      <div style={{height:"100svh",overflowY:"auto",WebkitOverflowScrolling:"touch"}} onScroll={e=>setNavVisible(e.target.scrollTop>window.innerHeight*0.6)}>

        <section className="hero" id="top">
          <div className="hero-bg" />
          <div className="hero-inner">
            <div className="hero-pill"><div className="hero-pill-dot" /><span>A Celebration of Life</span><div className="hero-pill-dot" /></div>
            <h1 className="hero-name">Mervyn<br /><em>Scoble</em></h1>
            <div className="hero-aka">-- "Mervo" --</div>
            <div className="hero-divider"><div className="hdl" /><div className="hdd" /><div className="hdl" /></div>
            <div className="hero-event">
              <strong>April 11, 2026 - 1:00 to 4:00 pm</strong>
              Toronto, Ontario<br />
              Snacks and refreshments will be served<br /><br />
              <a href="https://www.facebook.com/merv.scoble" target="_blank" rel="noopener noreferrer" style={{color:'var(--gold-light)',textDecoration:'none',borderBottom:'1px solid rgba(210,171,99,0.5)',paddingBottom:'1px'}}>
                RSVP or message the family on Facebook
              </a>
            </div>
            <a href="#contribute" className="hero-wall-link" onClick={e => {
              e.preventDefault();
              document.getElementById('contribute')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Add to Merv's Wall <span className="hero-wall-link-arrow">&#8595;</span>
            </a>
          </div>
          <div className="hero-foot"><span className="hero-foot-txt">Scroll to remember Merv</span><span className="bounce">down</span></div>
        </section>

        <section className="about" id="about">
          <div className="about-inner">
            <div className="about-quote">
              <blockquote>"Merv lived with curiosity and conviction. He possessed a healthy scepticism of arbitrary rules and an even healthier disregard for authority. He taught and expressed himself not just in classrooms, but through charismatic conversation, art, music, and a deliberate willingness to unsettle complacency. He asked hard questions, challenged easy answers, and never missed a chance to stir things up if it meant making people think, laugh, or fight back. Life with Merv was rarely quiet, never dull, and always interesting."</blockquote>
              <cite>-- Sarah Scoble, daughter</cite>
            </div>
            <div className="about-bio">
              <div className="about-eyebrow">Mervyn John Scoble - 1948 to 2026</div>
              <p>Merv -- known to thousands around the world as <em>Mervo</em> -- was a British-Canadian artist, educator, internet pioneer, and lifelong Torquay United supporter. He passed away in January 2026, aged 77.</p>
              <p>Born in Devon, England, Merv trained at the <strong>St. Martin's School of Art</strong> in London. In <strong>1971 he moved to Canada</strong>, where he became an art teacher at secondary and tertiary levels while pursuing a prolific practice spanning painting, engraving, photography, wood carving, and sculpture.</p>
              <p>His work ranged from <strong>intimate portraiture</strong> of musicians and athletes to <strong>architectural silkscreens</strong> of Yorkville, Chinatown, and Old Montreal. His Toronto Maple Leafs commissions were reproduced as limited edition lithographs co-signed by <strong>Darryl Sittler</strong> and <strong>Borje Salming</strong>.</p>
              <p>An early adopter of the internet, Merv set up the <strong>Torquay United fan forum in 1997</strong> from Canada -- connecting Gulls supporters across the globe long before social media existed.</p>
              <div className="tag-row">{["Portraiture","Watercolour","Acrylics & Oils","Lithography","Silkscreen","Photography","Wood Carving","Digital Art"].map(t=><span className="tag" key={t}>{t}</span>)}</div>
              <a className="tufc-link" href="https://torquayunited.com/mervyn-scoble-rip" target="_blank" rel="noopener noreferrer">Read Torquay United's tribute to Mervo</a>
            </div>
          </div>
        </section>

        <section className="section" id="art">
          <div className="section-eyebrow">The Work</div>
          <h2 className="section-title">Mervyn Scoble -- <em>Artist</em></h2>
          <p className="section-body">Merv's body of work spans five decades and hundreds of pieces -- from expressive musician portraits and Canadian sports icons to architectural lithographs of Toronto and Montreal.</p>
          <div className="gallery-grid">
            {ARTWORKS.map((art,i)=>(
              <a key={i} className="art-card" href={art.link} target="_blank" rel="noopener noreferrer">
                <div className="art-img-wrap"><img src={art.img} alt={art.title} loading="lazy" /><div className="art-overlay"><span className="art-overlay-txt">View</span></div></div>
                <div className="art-info"><div className="art-title">{art.title}</div><div className="art-medium">{art.medium}</div><div className="art-note">{art.note}</div></div>
              </a>
            ))}
          </div>
          <div className="find-more">
            <h3>Hundreds more works across the web</h3>
            <p>Merv's limited edition lithographs are available through Artistica Fine Art, and his work appears on Artsy, Heffel, and collectors' sites worldwide.</p>
            <div className="art-links">
              {ART_LINKS.map((l,i)=>(
                <a key={i} className="art-link-card" href={l.url} target="_blank" rel="noopener noreferrer">
                  <div className="art-link-dot" />
                  <div><div className="art-link-label">{l.label}</div><div className="art-link-note">{l.note}</div></div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <div className="divider"><div className="divider-d" /></div>

        <section className="section" id="details">
          <div className="section-eyebrow">Event Details</div>
          <h2 className="section-title">Joining us for <em>Mervyn John Scoble</em></h2>
          <div className="info-grid">
            <div className="info-cell"><div className="info-label">Date & Time</div><div className="info-val">April 11, 2026<br />1:00 to 4:00 pm</div></div>
            <div className="info-cell"><div className="info-label">Location</div><div className="info-val">Toronto, Ontario</div></div>
            <div className="info-cell"><div className="info-label">Dress</div><div className="info-val">Colourful clothing or your favourite band t-shirt</div></div>
          </div>
          <p className="section-body"><strong>In lieu of flowers,</strong> please consider donating to the Canadian Association for Mental Health (CAMH). A custom donation link in Merv's honour is being prepared and will be shared before April 2.</p>
          <p className="section-body"><strong>To attend or for more details,</strong> please reach out through Merv's Facebook page -- the family will be in touch with the full address and any additional information. {" "}<a href="https://www.facebook.com/merv.scoble" target="_blank" rel="noopener noreferrer" style={{color:'var(--gold)',textDecoration:'none',borderBottom:'1px solid rgba(182,144,58,0.4)'}}>Message the family on Facebook</a></p>
        </section>

        <div className="divider"><div className="divider-d" /></div>

        <section className="section" id="contribute" style={{backgroundImage:"url('/the_wall_bg.jpg')",backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'local'}}>
          <div style={{fontFamily:'Impact,"Arial Narrow",sans-serif',fontSize:'clamp(2.5rem,8vw,5.5rem)',fontWeight:900,color:'#1a1a1a',letterSpacing:'0.12em',textTransform:'uppercase',lineHeight:1,marginBottom:'0.4rem',textShadow:'2px 2px 0px rgba(0,0,0,0.15)',WebkitTextStroke:'1px rgba(0,0,0,0.3)'}}>THE WALL</div>
          <div className="section-eyebrow" style={{color:'#222',marginBottom:'0.8rem',fontWeight:500}}>Share</div>
          <h2 className="section-title" style={{color:'#111'}}>Leave a piece of <em style={{color:'#7a5a10'}}>yourself</em></h2>
          <p className="section-body" style={{color:'#222',fontWeight:400}}>Help the family honour Merv -- share a memory, suggest a song for the memorial playlist, or contribute a photo to the gallery.</p>

          <div className="tabs" style={{borderBottom:'2px solid #444'}}>
            {[["memory","Share a Memory"],["song","Song Request"],["photos","Photos"]].map(([k,l])=>(
              <button key={k} className={`tab ${activeTab===k?"active":""}`} onClick={()=>setActiveTab(k)}>{l}</button>
            ))}
          </div>

          {activeTab==="memory" && (
            <div>
              <div className="card">
                <div className="form-group"><label>Your Name</label><input placeholder="How you'd like to be remembered here" value={memoryForm.name} onChange={e=>setMemoryForm(p=>({...p,name:e.target.value}))} /></div>
                <div className="form-group"><label>Relationship to Merv</label><input placeholder="e.g. Old friend, former student, fellow Gulls supporter..." value={memoryForm.relationship} onChange={e=>setMemoryForm(p=>({...p,relationship:e.target.value}))} /></div>
                <div className="form-group"><label>Your Memory or Message</label><textarea placeholder="Share a story, a moment, or simply what Merv meant to you. Take your time -- write as much as you like..." value={memoryForm.message} onChange={e=>setMemoryForm(p=>({...p,message:e.target.value}))} style={{minHeight:180}} /></div>
                <button className="btn btn-full" onClick={submitMemory} disabled={memState==="loading"||!memoryForm.message.trim()}>{memState==="loading"?"Submitting...":"Submit Memory"}</button>
                {memState==="success" && <div className="success-msg">Your memory has been added. Thank you.</div>}
                {memState==="error" && <div className="error-msg">Something went wrong. Please try again.</div>}
              </div>
              {memories.length>0 && (
                <div>
                  <div className="section-eyebrow" style={{marginTop:"2rem",marginBottom:"0.9rem"}}>Memories shared</div>
                  <div className="memories-wall">
                    {memories.map((m,i)=>(
                      <div className="memory-card" key={i}>
                        <div className="memory-text">{m.text}</div>
                        <div className="memory-meta"><div className="memory-author">-- {m.name}</div>{m.rel&&<div className="memory-rel">· {m.rel}</div>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab==="song" && (
            <div>
              <div className="card">
                <p style={{color:"#333",fontSize:"0.92rem",marginBottom:"1.5rem",lineHeight:1.75}}>Suggest a song for the memorial playlist -- something Merv loved, something that reminds you of him, or something you'd like played in his honour.</p>
                <div className="form-group"><label>Song Title</label><input placeholder="Song name" value={songForm.song} onChange={e=>setSongForm(p=>({...p,song:e.target.value}))} /></div>
                <div className="form-group"><label>Artist / Band</label><input placeholder="Who performs it?" value={songForm.artist} onChange={e=>setSongForm(p=>({...p,artist:e.target.value}))} /></div>
                <div className="form-group"><label>Why this song? (optional)</label><textarea placeholder="A line, a memory, a reason..." value={songForm.note} onChange={e=>setSongForm(p=>({...p,note:e.target.value}))} style={{minHeight:100}} /></div>
                <div className="form-group"><label>Your Name (optional)</label><input placeholder="Anonymous is fine" value={songForm.name} onChange={e=>setSongForm(p=>({...p,name:e.target.value}))} /></div>
                <button className="btn btn-full" onClick={submitSong} disabled={songState==="loading"||!songForm.song.trim()}>{songState==="loading"?"Submitting...":"Submit Song Request"}</button>
                {songState==="success" && <div className="success-msg">Song request received -- thank you.</div>}
                {songState==="error" && <div className="error-msg">Something went wrong. Please try again.</div>}
              </div>
              {songs.length>0 && (
                <div>
                  <div className="section-eyebrow" style={{marginTop:"2rem",marginBottom:"0.9rem"}}>Songs suggested</div>
                  <div className="memories-wall">
                    {songs.map((s,i)=>(
                      <div className="memory-card" key={i}>
                        <div className="memory-text">{s.song_title}{s.artist && <span style={{fontStyle:"normal"}}> — {s.artist}</span>}</div>
                        {s.note && <div style={{fontSize:"0.88rem",color:"var(--muted)",marginBottom:"0.5rem",lineHeight:1.6}}>{s.note}</div>}
                        <div className="memory-meta"><div className="memory-author">-- {s.submitted_by}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab==="photos" && (
            <div>
              <div className="card" style={{marginBottom:'1.2rem'}}>
                <p style={{color:'#333',fontSize:'0.92rem',marginBottom:'1.3rem',lineHeight:1.7}}>Share a photo of Merv -- choose your image, adjust the crop if needed, add a description, then upload. Your photo will appear in the gallery below.</p>

                {!rawSrc ? (
                  <div className="photo-drop-zone" onClick={()=>fileInputRef.current.click()}>
                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                    <div className="photo-drop-zone-text">Tap to choose a photo</div>
                    <div className="photo-drop-zone-sub">JPG, PNG, HEIC supported</div>
                  </div>
                ) : (
                  <div className="photo-preview-wrap">
                    <img src={previewSrc} className="photo-preview-img" alt="Preview" />
                    <div style={{marginTop:'0.8rem',display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap'}}>
                      <div style={{color:'#333',fontSize:'0.8rem',fontWeight:500}}>Rotate:</div>
                      <button className="aspect-btn" onClick={()=>handleRotate(-90)} title="Rotate left">↺ Left</button>
                      <button className="aspect-btn" onClick={()=>handleRotate(90)} title="Rotate right">↻ Right</button>
                    </div>
                    <div style={{marginTop:'0.6rem',color:'#333',fontSize:'0.8rem',fontWeight:500}}>Choose crop ratio:</div>
                    <div className="aspect-btns">
                      {ASPECT_OPTIONS.map(opt=>(
                        <button key={String(opt.value)} className={`aspect-btn ${selectedAspect===opt.value?'active':''}`} onClick={()=>handleAspectChange(opt.value)}>{opt.label}</button>
                      ))}
                    </div>
                    <button style={{background:'none',border:'none',color:'#888',fontSize:'0.78rem',cursor:'pointer',padding:'0.2rem 0',textDecoration:'underline'}} onClick={()=>{setRawSrc(null);setPreviewSrc(null);setSelectedAspect(null);setRotation(0);if(fileInputRef.current)fileInputRef.current.value="";}}>Choose a different photo</button>
                  </div>
                )}

                <div className="form-group" style={{marginTop:'1rem'}}>
                  <label>Photo Description</label>
                  <textarea placeholder="Tell us about this photo -- who is in it, when was it taken, what's the story..." value={photoDesc} onChange={e=>setPhotoDesc(e.target.value)} style={{minHeight:90}} />
                </div>
                <div className="form-group">
                  <label>Your Name (optional)</label>
                  <input placeholder="Anonymous is fine" value={photoName} onChange={e=>setPhotoName(e.target.value)} />
                </div>
                <button className="btn btn-full" onClick={submitPhoto} disabled={photoState==="loading"||!rawSrc}>
                  {photoState==="loading"?"Uploading...":"Upload Photo"}
                </button>
                {photoState==="success" && <div className="success-msg">Photo uploaded -- thank you!</div>}
                {photoState==="error" && <div className="error-msg">Upload failed. Please try again.</div>}
              </div>

              <div style={{background:'rgba(255,255,255,0.8)',border:'1px solid #aaa',borderRadius:'2px',padding:'1rem 1.3rem',marginBottom:'1.3rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem',flexWrap:'wrap'}}>
                <div style={{color:'#333',fontSize:'0.88rem'}}>Also add photos directly to Devon's Google Drive slideshow folder</div>
                <a href={DEVON_DRIVE_LINK} target="_blank" rel="noopener noreferrer" className="btn" style={{textDecoration:'none',flexShrink:0,padding:'0.7rem 1.4rem',fontSize:'0.68rem'}}>Open Google Drive</a>
              </div>

              {photos.length>0 && (
                <div>
                  <div className="section-eyebrow" style={{marginBottom:'0.9rem'}}>Photos shared</div>
                  <div className="photo-grid-public">
                    {photos.map((p,i)=>(
                      <div className="photo-pub-card" key={i}>
                        <img src={p.url} alt={p.description||p.name} className="photo-pub-img" />
                        {p.description && <div className="photo-pub-desc">{p.description}</div>}
                        <div className="photo-pub-name" style={{padding:'0 0.8rem 0.6rem'}}>{p.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="divider"><div className="divider-d" /></div>

        <footer className="footer">
          <span className="footer-name">Mervyn John Scoble</span>
          <span style={{color:"rgba(245,240,230,0.55)",fontSize:"0.8rem"}}>1948 to 2026 - Artist - Teacher - Internet Pioneer - Gulls Supporter</span>
          <br />Remembered with love - April 11, 2026 - Toronto
          <div className="footer-links">
            <a className="footer-link" href="https://torquayunited.com/mervyn-scoble-rip" target="_blank" rel="noopener noreferrer">Torquay United tribute</a>
            <a className="footer-link" href="https://artisticafineart.com/collections/canadian-art/artist_scoble-mervyn" target="_blank" rel="noopener noreferrer">Artistica Fine Art</a>
            <a className="footer-link" href="https://www.facebook.com/merv.scoble" target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
          <div style={{marginTop:"1.4rem",fontSize:"0.76rem"}}>Questions? Contact the family on Facebook</div>
        </footer>

      </div>
    </>
  );
}
