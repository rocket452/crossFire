import * as THREE from './vendor/three.module.js';

const slots = {
  buildingColor: 'building color', buildingGlow: 'building glow',
  signColor: 'sign color', signGlow: 'sign glow'
};
const cacheName = 'crossfire-asset-city-textures-v1';
const maxImageBytes = 64 * 1024 * 1024;

const packagedFiles = {
  buildingColor: 'building-color.webp',
  buildingGlow: 'building-glow.webp',
  signColor: 'sign-color.webp',
  signGlow: 'sign-glow.webp'
};

export async function loadPackagedCityTextures(city, load = url => new THREE.TextureLoader().loadAsync(url)) {
  // Each slot can fall back independently if a device loses its connection.
  await Promise.all(Object.entries(packagedFiles).map(async ([slot, filename]) => {
    try {
      const url = new URL('./city-assets/licensed-city/' + filename + '?v=313', import.meta.url);
      const texture = await load(url.href);
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      city.applyTexture(slot, texture);
    } catch (error) {
      console.warn('Could not load Asset City texture', filename, error);
    }
  }));
}

export function textureSlot(path) {
  const name = path.split(/[\\/]/).pop();
  if (!/\.(png|jpe?g|webp)$/i.test(name) || name.startsWith('._')) return;
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const family = /buildings?0*2(?!\d)/.test(key) ? 'building' : /props(?!0*[2-9])/.test(key) ? 'sign' : '';
  if (!family) return;
  if (/emiss(ive|ion)/.test(key)) return family + 'Glow';
  if (/diffuse|basecolor|albedo/.test(key)) return family + 'Color';
}

// Read only the directory and matched images. Even a large pack stays on disk.
async function readView(blob, offset, length) {
  if (offset < 0 || offset + length > blob.size) throw Error('Incomplete ZIP file.');
  return new DataView(await blob.slice(offset, offset + length).arrayBuffer());
}

async function zipEntries(file) {
  const length = Math.min(file.size, 65557);
  const tail = await readView(file, file.size - length, length);
  let end = length - 22;
  while (end >= 0 && (tail.getUint32(end, true) !== 0x06054b50 ||
         end + 22 + tail.getUint16(end + 20, true) !== length)) end--;
  if (end < 0) throw Error('Open the ZIP in Files and select its texture images.');
  const size = tail.getUint32(end + 12, true);
  if (size > 16 * 1024 * 1024) throw Error('Extract the texture images from this ZIP first.');
  const directory = await readView(file, tail.getUint32(end + 16, true), size);
  const selected = new Map();
  for (let i = 0; i < size;) {
    if (i + 46 > size || directory.getUint32(i, true) !== 0x02014b50) throw Error('Incomplete ZIP directory.');
    const nameLength = directory.getUint16(i + 28, true);
    const name = new TextDecoder().decode(new Uint8Array(directory.buffer, i + 46, nameLength));
    const slot = textureSlot(name);
    if (slot && !selected.has(slot)) {
      selected.set(slot, {
        offset: directory.getUint32(i + 42, true), compressed: directory.getUint32(i + 20, true),
        size: directory.getUint32(i + 24, true), method: directory.getUint16(i + 10, true),
        encrypted: Boolean(directory.getUint16(i + 8, true) & 1)
      });
    }
    i += 46 + nameLength + directory.getUint16(i + 30, true) + directory.getUint16(i + 32, true);
  }
  return selected;
}

export async function* textureImages(files) {
  for (const file of files) {
    if (!/\.zip$/i.test(file.name)) {
      const slot = textureSlot(file.name);
      if (slot && file.size <= maxImageBytes) yield [slot, file];
      continue;
    }
    for (const [slot, entry] of await zipEntries(file)) {
      if (entry.encrypted || ![0, 8].includes(entry.method) || entry.size > maxImageBytes ||
          entry.compressed > maxImageBytes) throw Error('Extract the texture images from this ZIP first.');
      const header = await readView(file, entry.offset, 30);
      if (header.getUint32(0, true) !== 0x04034b50) throw Error('Incomplete ZIP entry.');
      const start = entry.offset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
      if (start + entry.compressed > file.size) throw Error('Incomplete ZIP entry.');
      let image = file.slice(start, start + entry.compressed);
      if (entry.method === 8) {
        const reader = image.stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
        const chunks = [];
        let size = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > entry.size) { await reader.cancel(); throw Error('Invalid texture size in ZIP.'); }
          chunks.push(value);
        }
        image = new Blob(chunks);
      }
      if (image.size !== entry.size) throw Error('Incomplete texture in ZIP.');
      yield [slot, image];
    }
  }
}

async function makeTexture(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 2048 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false; // Original FBX UVs have already been converted to glTF.
    return texture;
  } finally { URL.revokeObjectURL(url); }
}

export async function setupCityTexturePicker(city, parent) {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.zip,.png,.jpg,.jpeg,.webp';
  input.hidden = true;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Load city textures';
  const status = document.createElement('small');
  status.setAttribute('role', 'status');
  parent.append(button, input, status);
  const cacheKey = slot => new URL('local-city-textures/' + slot, location.href).href;
  button.disabled = true;
  let cache;
  try {
    cache = await globalThis.caches?.open(cacheName);
    if (cache) for (const slot of Object.keys(slots)) {
      const response = await cache.match(cacheKey(slot));
      if (response) city.applyTexture(slot, await makeTexture(await response.blob()));
    }
    if (city.textures.size < Object.keys(slots).length) status.textContent = 'Some city textures are unavailable. You can load a local pack.';
  } catch { /* A device without persistent storage can still apply a local selection. */ }
  button.disabled = false;
  button.onclick = () => input.click();
  input.onchange = async () => {
    if (!input.files.length) return;
    button.disabled = true;
    status.textContent = 'Reading textures…';
    const applied = new Set();
    let saved = Boolean(cache);
    try {
      for await (const [slot, image] of textureImages(input.files)) {
        city.applyTexture(slot, await makeTexture(image));
        applied.add(slots[slot]);
        if (cache) try { await cache.put(cacheKey(slot), new Response(image)); } catch { saved = false; }
      }
      status.textContent = applied.size ? 'Loaded ' + [...applied].join(', ') + (saved ? '. Saved on this device.' : '. This session only.') :
        'No matching textures found. Choose the original Buildings_002 and Props diffuse or emissive images.';
    } catch {
      status.textContent = (applied.size ? 'Applied ' + [...applied].join(', ') + '. ' : '') + 'Could not read the selection. Try the extracted texture images.';
    } finally {
      input.value = '';
      button.disabled = false;
    }
  };
}
