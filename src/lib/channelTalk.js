const CHANNEL_PLUGIN_KEY =
  import.meta.env.VITE_CHANNEL_PLUGIN_KEY || '5a172fdc-10ee-45ca-b437-b1c63541c969';

let scriptPromise = null;
let bootSignature = '';
let booted = false;

function createQueue() {
  if (typeof window === 'undefined') return null;
  if (window.ChannelIO) return window.ChannelIO;

  const channel = function channelQueue() {
    channel.c(arguments);
  };
  channel.q = [];
  channel.c = function queueCommand(args) {
    channel.q.push(args);
  };
  window.ChannelIO = channel;
  return channel;
}

function loadChannelScript() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return Promise.resolve(null);
  if (!CHANNEL_PLUGIN_KEY) return Promise.resolve(null);
  if (scriptPromise) return scriptPromise;

  createQueue();
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-channel-io-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.ChannelIO), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://cdn.channel.io/plugin/ch-plugin-web.js';
    script.dataset.channelIoSdk = 'true';
    script.onload = () => resolve(window.ChannelIO);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function compactProfile(profile) {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => value !== null && value !== undefined && value !== '')
  );
}

export function buildChannelProfile(user, profile) {
  const metadata = user?.user_metadata || {};
  const name =
    profile?.korean_nickname ||
    profile?.minecraft_id ||
    profile?.username ||
    metadata.global_name ||
    metadata.name ||
    user?.email ||
    'DDING PLUG User';
  const avatarUrl =
    profile?.minecraft_avatar_url ||
    profile?.avatar_url ||
    metadata.avatar_url ||
    metadata.picture ||
    null;

  return compactProfile({
    name,
    email: user?.email || null,
    avatarUrl,
    discordId: profile?.discord_id || metadata.provider_id || metadata.sub || null,
    minecraftId: profile?.minecraft_id || null,
    koreanNickname: profile?.korean_nickname || null,
    role: profile?.role || null
  });
}

export async function bootChannelTalk({ user, profile, theme } = {}) {
  if (typeof window === 'undefined' || !CHANNEL_PLUGIN_KEY) return;

  const bootOption = {
    pluginKey: CHANNEL_PLUGIN_KEY,
    language: 'ko',
    appearance: theme === 'dark' ? 'dark' : 'light'
  };

  if (user?.id) {
    bootOption.memberId = user.id;
    bootOption.profile = buildChannelProfile(user, profile);
  }

  const signature = JSON.stringify(bootOption);
  if (signature === bootSignature) return;

  await loadChannelScript();
  if (!window.ChannelIO) return;

  if (booted) {
    window.ChannelIO('shutdown');
  }
  window.ChannelIO('boot', bootOption);
  booted = true;
  bootSignature = signature;
  window.ChannelIO('setPage', `${window.location.pathname}${window.location.hash || '#/'}`);
}

export function setChannelTalkPage(page) {
  if (typeof window === 'undefined' || !window.ChannelIO || !booted) return;
  window.ChannelIO('setPage', page);
}
