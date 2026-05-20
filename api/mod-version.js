import { sendJson } from './_supabase.js';

const MOD_VERSION = {
  ok: true,
  modId: 'ddingplug',
  latestVersion: process.env.DDINGPLUG_MOD_LATEST_VERSION || '0.6.7',
  minecraftVersion: process.env.DDINGPLUG_MOD_MINECRAFT_VERSION || '1.21.4',
  fabricLoader: process.env.DDINGPLUG_MOD_FABRIC_LOADER || '0.16.10+',
  fabricApi: process.env.DDINGPLUG_MOD_FABRIC_API || '0.119.2+1.21.4',
  downloadUrl: process.env.DDINGPLUG_MOD_DOWNLOAD_URL || 'https://ddingplug.vercel.app/download',
  releaseNote: process.env.DDINGPLUG_MOD_RELEASE_NOTE || '업데이트 확인 UI 추가',
  required: String(process.env.DDINGPLUG_MOD_REQUIRED || 'false').toLowerCase() === 'true'
};

function setPublicCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  setPublicCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, {
      ok: false,
      error: 'Method not allowed'
    });
  }

  return sendJson(res, 200, MOD_VERSION);
}
