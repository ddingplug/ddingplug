import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { bootChannelTalk, setChannelTalkPage } from './lib/channelTalk';
import { ALL_PRICE_ITEMS, CRAFT_ITEMS, COOKING_ITEMS } from './data/prices';
import { OCEAN as OCEAN_CFG, ROD as ROD_CFG, OCEAN_SKILLS as OCEAN_SKILLS_CFG, OCEAN_ENGRAVING as OCEAN_ENGRAVING_CFG, CLAM as CLAM_CFG, CRAFTS as CRAFTS_CFG, ALCHEMY as ALCHEMY_CFG, PRECISION_ALCHEMY as PRECISION_ALCHEMY_CFG, VANILLA_META as VANILLA_META_CFG, OCEAN_DEFAULT_PRICES as OCEAN_DEFAULT_PRICES_CFG, SEAFOOD_TYPES as SEAFOOD_TYPES_CFG } from './data/oceanConfig';
import './styles.css';

const fallbackAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="18" fill="%23604a3b"/><rect x="32" y="45" width="17" height="12" fill="%23e8d7c2"/><rect x="78" y="45" width="17" height="12" fill="%23e8d7c2"/></svg>';
const POLICY_VERSION = '2026-05-20';
const DEFAULT_MOD_VERSION = {
  ok: true,
  modId: 'ddingplug',
  latestVersion: '0.1.0',
  minecraftVersion: '1.21.4',
  fabricLoader: '0.16.10+',
  fabricApi: '0.119.2+1.21.4',
  downloadUrl: 'https://ddingplug.vercel.app/download',
  releaseNote: '공식 0.1.0 배포판',
  required: false
};
const MAX_DOWNLOAD_BYTES = 8 * 1024 * 1024;
const money = (n) => `${Number(n || 0).toLocaleString()} G`;
const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return '크기 정보 없음';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};
const formatPriceChange = (value) => {
  if (value === null || value === undefined || value === '' || Number(value) === 0) return { text:'-', direction:'none' };
  const n = Number(value);
  if (!Number.isFinite(n)) return { text:'-', direction:'none' };
  return n > 0
    ? { text:`▲ ${Math.abs(n).toLocaleString()}`, direction:'up' }
    : { text:`▼ ${Math.abs(n).toLocaleString()}`, direction:'down' };
};
const pathRoutes = {
  '/download': '#/download',
  '/privacy': '#/privacy',
  '/mod-policy': '#/mod-policy'
};
const route = () => location.hash || pathRoutes[location.pathname] || '#/';
const go = (hash) => { location.hash = hash; };
// [SECURITY FIX] minecraft_id는 영문·숫자·언더스코어만 허용 (mcHead URL 인젝션 방지)
const mcHead = (name) => {
  if (!name) return '';
  const safe = String(name).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16);
  if (!safe) return '';
  return `https://mc-heads.net/avatar/${safe}/128`;
};
const displayName = (user, profile) => profile?.korean_nickname || profile?.minecraft_id || profile?.username || user?.user_metadata?.global_name || user?.user_metadata?.name || 'User';
const displaySub = (user, profile) => profile?.minecraft_id ? `Minecraft · ${profile.minecraft_id}` : user?.email || 'Discord connected';
const avatar = (user, profile) => profile?.minecraft_avatar_url || profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || fallbackAvatar;
const profileComplete = (profile) => Boolean(profile?.korean_nickname?.trim() && profile?.minecraft_id?.trim());
const readPendingAgreement = () => {
  try { return JSON.parse(localStorage.getItem('dding_pending_agreement') || 'null'); } catch { return null; }
};
const clearPendingAgreement = () => {
  try { localStorage.removeItem('dding_pending_agreement'); } catch {}
};
const agreementProfilePayload = () => {
  const pending = readPendingAgreement();
  if(!pending?.agreed_at) return {};
  return {
    privacy_agreed_at: pending.agreed_at,
    privacy_policy_version: pending.policy_version || POLICY_VERSION,
    mod_policy_agreed_at: pending.agreed_at,
    mod_policy_version: pending.policy_version || POLICY_VERSION
  };
};
const isOptionalProfileColumnError = (error) => {
  const msg = error?.message || '';
  return ['privacy_agreed_at','privacy_policy_version','mod_policy_agreed_at','mod_policy_version','profile_completed_at','schema cache','column'].some(x=>msg.includes(x));
};
const withoutOptionalProfileFields = (payload) => {
  const next = {...payload};
  ['privacy_agreed_at','privacy_policy_version','mod_policy_agreed_at','mod_policy_version','profile_completed_at'].forEach(key=>delete next[key]);
  return next;
};
const normalizeModVersion = (payload = {}) => ({
  ...DEFAULT_MOD_VERSION,
  latestVersion: payload.latestVersion || DEFAULT_MOD_VERSION.latestVersion,
  minecraftVersion: payload.minecraftVersion || DEFAULT_MOD_VERSION.minecraftVersion,
  fabricLoader: payload.fabricLoader || DEFAULT_MOD_VERSION.fabricLoader,
  fabricApi: payload.fabricApi || DEFAULT_MOD_VERSION.fabricApi,
  downloadUrl: payload.downloadUrl || DEFAULT_MOD_VERSION.downloadUrl,
  releaseNote: payload.releaseNote || DEFAULT_MOD_VERSION.releaseNote,
  required: Boolean(payload.required)
});
const formatLogTime = (iso) => {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ko-KR', { month:'long', day:'numeric', hour:'numeric', minute:'2-digit' });
};
const debounce = (fn, wait) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; };

function App(){
  const [hash,setHash] = useState(route());
  const [theme,setTheme] = useState(()=>{
    try { return localStorage.getItem('dding_theme') || 'light'; } catch { return 'light'; }
  });
  const [user,setUser] = useState(null);
  const [profile,setProfile] = useState(null);
  const [prices,setPrices] = useState([]);
  const [logs,setLogs] = useState([]);
  const [notices,setNotices] = useState([]);
  const [downloads,setDownloads] = useState([]);
  const [modVersion,setModVersion] = useState(DEFAULT_MOD_VERSION);
  const [featureLocks,setFeatureLocks] = useState(defaultFeatureLocks);
  const [oceanSettings,setOceanSettings] = useState(()=>{ try { return {...defaultOceanSettings, ...JSON.parse(localStorage.getItem('dding_ocean_settings') || '{}')}; } catch { return {...defaultOceanSettings}; } });
  const [loading,setLoading] = useState(true);
  const [profileReady,setProfileReady] = useState(false);
  const current = hash.replace('#/','') || 'market';

  useEffect(()=>{ const h=()=>setHash(route()); addEventListener('hashchange',h); return()=>removeEventListener('hashchange',h); },[]);
  useEffect(()=>{
    bootChannelTalk({user, profile, theme}).catch(error=>console.warn('ChannelTalk boot failed', error));
  },[
    user?.id,
    user?.email,
    profile?.korean_nickname,
    profile?.minecraft_id,
    profile?.username,
    profile?.avatar_url,
    profile?.minecraft_avatar_url,
    profile?.role,
    theme
  ]);
  useEffect(()=>{
    setChannelTalkPage(`${location.pathname}${hash}`);
  },[hash]);
  useEffect(()=>{
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('dding_theme', theme); } catch {}
  },[theme]);
  useEffect(()=>{
    if(!isSupabaseConfigured){ setLoading(false); loadPrices(); return; }
    supabase.auth.getSession().then(({data})=>{ setUser(data.session?.user ?? null); setLoading(false); });
    const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user??null));
    return()=>l.subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    if(user){
      setProfileReady(false);
      ensureProfile(user)
        .then(async()=>{ await loadProfile(); await loadOceanSettings(); })
        .catch(error=>console.warn('profile bootstrap failed', error?.message || error))
        .finally(()=>setProfileReady(true));
    } else {
      setProfile(null);
      setProfileReady(false);
    }
    loadPrices(); loadLogs(); loadNotices(); loadDownloads(); loadFeatureLocks(); loadModVersion();
  },[user]);
  useEffect(()=>{
    if(user && profile?.role) loadLogs();
  },[profile?.role]);
  const saveOceanRef = useRef(null);
  useEffect(()=>{
    try { localStorage.setItem('dding_ocean_settings', JSON.stringify(oceanSettings)); } catch {}
    if(!user || !isSupabaseConfigured) return;
    if(!saveOceanRef.current){
      saveOceanRef.current = debounce(async(next)=>{
        await supabase.from('user_ocean_settings').upsert({ user_id:user.id, settings:next, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
      }, 900);
    }
    saveOceanRef.current(oceanSettings);
  }, [oceanSettings, user?.id]);

  async function ensureProfile(u){
    if(!isSupabaseConfigured) return;
    const m = u.user_metadata || {};
    const payload = {
      id:u.id,
      username:m.global_name || m.name || m.user_name || u.email || 'Discord User',
      discord_id:m.provider_id || m.sub || null,
      avatar_url:m.avatar_url || m.picture || null,
      updated_at:new Date().toISOString(),
      ...agreementProfilePayload()
    };
    let {error}=await supabase.from('profiles').upsert(payload,{onConflict:'id'});
    if(error && isOptionalProfileColumnError(error)){
      ({error}=await supabase.from('profiles').upsert(withoutOptionalProfileFields(payload),{onConflict:'id'}));
    }
    if(error) throw error;
  }
  async function loadProfile(){
    if(!user || !isSupabaseConfigured) return;
    const {data}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();
    setProfile(data);
  }
  async function loadOceanSettings(){
    if(!user || !isSupabaseConfigured) return;
    let localSettings = {};
    try { localSettings = JSON.parse(localStorage.getItem('dding_ocean_settings') || '{}') || {}; } catch {}
    const {data,error}=await supabase.from('user_ocean_settings').select('settings').eq('user_id', user.id).maybeSingle();
    const merged = {...defaultOceanSettings, ...(data?.settings || {}), ...localSettings};
    if(!error){
      setOceanSettings(merged);
      try { localStorage.setItem('dding_ocean_settings', JSON.stringify(merged)); } catch {}
      if(Object.keys(localSettings).length){
        await supabase.from('user_ocean_settings').upsert({ user_id:user.id, settings:merged, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
      }
    }
  }
  async function loadPrices(){
    if(!isSupabaseConfigured){ setPrices(ALL_PRICE_ITEMS.map(x=>({...x,price:0,checked_at:null}))); return; }
    const {data}=await supabase.from('market_prices').select('*').in('category',['craft','cooking']);
    const map=Object.fromEntries((data||[]).map(p=>[p.item_key,p]));
    setPrices(ALL_PRICE_ITEMS.map(x=>({
      ...x,
      ...(map[x.item_key]||{}),
      price_max:x.price_max,
      item_name:x.item_name,
      category:x.category,
      update_cycle:x.update_cycle,
      image:x.image,
      type:x.type,
      id:x.id
    })));
  }
  async function hydrateProfiles(rows, key){
    const ids = [...new Set((rows || []).map(row => row?.[key]).filter(Boolean))];
    if(!ids.length) return rows || [];
    const {data:profileRows} = await supabase
      .from('profiles')
      .select('id,korean_nickname,minecraft_id,username,avatar_url,minecraft_avatar_url')
      .in('id', ids);
    const profileMap = Object.fromEntries((profileRows || []).map(p => [p.id, p]));
    return (rows || []).map(row => ({...row, profiles: profileMap[row?.[key]] || null}));
  }

  async function loadLogs(){
    if(!isSupabaseConfigured) return;
    const isAdmin = ['owner','admin'].includes(profile?.role);
    if(!isAdmin){
      try {
        const res = await fetch('/api/market-latest');
        if(!res.ok) throw new Error('market-latest failed');
        const payload = await res.json();
        const latest = Array.isArray(payload.latest) ? payload.latest : payload.latest ? [payload.latest] : [];
        setLogs(latest.map(row => ({
          category: row.category,
          created_at: row.updatedAt,
          profiles: {
            korean_nickname: row.displayName,
            minecraft_id: row.reporterMinecraftId,
            avatar_url: row.avatarUrl,
            minecraft_avatar_url: row.avatarUrl
          }
        })));
      } catch (error) {
        console.warn('load public latest failed', error?.message || error);
        setLogs([]);
      }
      return;
    }
    const {data,error}=await supabase
      .from('market_price_logs')
      .select('id,item_key,item_name,category,old_price,new_price,changed_by,created_at,source,reporter_minecraft_id')
      .in('category',['craft','cooking'])
      .order('created_at',{ascending:false})
      .limit(30);
    if(error){ console.warn('loadLogs failed', error.message); setLogs([]); return; }
    setLogs(await hydrateProfiles(data || [], 'changed_by'));
  }
  async function loadNotices(){
    if(!isSupabaseConfigured){ setNotices([]); return; }
    const {data,error}=await supabase
      .from('notices')
      .select('*')
      .eq('is_published', true)
      .order('is_pinned',{ascending:false})
      .order('created_at',{ascending:false});
    if(error){ console.warn('loadNotices failed', error.message); setNotices([]); return; }
    setNotices(await hydrateProfiles(data || [], 'created_by'));
  }

  async function loadDownloads(){
    if(!isSupabaseConfigured){ setDownloads([]); return; }
    const {data,error}=await supabase
      .from('downloads')
      .select('*')
      .order('created_at',{ascending:false});
    if(error){ console.warn('loadDownloads failed', error.message); setDownloads([]); return; }
    setDownloads(await hydrateProfiles(data || [], 'created_by'));
  }

  async function loadModVersion(){
    try {
      const res = await fetch('/api/mod-version', { cache:'no-store' });
      if(!res.ok) throw new Error('mod-version failed');
      const payload = await res.json();
      setModVersion(normalizeModVersion(payload));
    } catch (error) {
      console.warn('loadModVersion failed', error?.message || error);
      setModVersion(DEFAULT_MOD_VERSION);
    }
  }

  async function loadFeatureLocks(){
    if(!isSupabaseConfigured){ setFeatureLocks(defaultFeatureLocks); return; }
    const {data,error}=await supabase
      .from('feature_locks')
      .select('*')
      .in('feature_key', ['mining','farming','ocean','hunting']);
    if(error){ console.warn('loadFeatureLocks failed', error.message); setFeatureLocks(defaultFeatureLocks); return; }
    const merged = {...defaultFeatureLocks};
    for(const row of data || []){
      merged[row.feature_key] = {
        feature_key: row.feature_key,
        is_locked: !!row.is_locked,
        message: row.message || '현재 점검 중입니다.',
        updated_at: row.updated_at || null
      };
    }
    setFeatureLocks(merged);
  }

  async function login(agreement){
    if(!isSupabaseConfigured){ alert('.env 파일에 Supabase 값을 넣어 주세요.'); return; }
    if(agreement){
      try {
        localStorage.setItem('dding_pending_agreement', JSON.stringify({
          agreed_at:new Date().toISOString(),
          policy_version:POLICY_VERSION,
          privacy:!!agreement.privacy,
          modApi:!!agreement.modApi
        }));
      } catch {}
    }
    const {error}=await supabase.auth.signInWithOAuth({provider:'discord',options:{redirectTo:location.origin,scopes:'identify email'}});
    if(error) alert(error.message);
  }
  async function logout(){ await supabase?.auth.signOut(); setUser(null); setProfile(null); }

  const activeExpertKey = current.startsWith('ocean') ? 'ocean' : ['mining','farming','hunting'].includes(current) ? current : null;
  const isAdminUser = ['owner','admin'].includes(profile?.role);
  const activeExpertLock = activeExpertKey ? featureLocks?.[activeExpertKey] : null;

  const visibleItems = useMemo(()=>{
    if(current === 'crafting') return prices.filter(x=>x.category==='craft');
    if(current === 'cooking') return prices.filter(x=>x.category==='cooking');
    if(current === 'market' || current === 'home') return prices;
    if(current === 'profile') return [];
    return prices;
  },[prices,current]);

  function isStubRoute(key){
    return ['download','mining','farming','hunting'].includes(key);
  }

  if(loading) return <div className="splash">DDING PLUG</div>;
  if(!user && ['privacy','mod-policy','download'].includes(current)){
    return <PublicInfoShell current={current} theme={theme} setTheme={setTheme} downloads={downloads} reloadDownloads={loadDownloads} modVersion={modVersion} reloadModVersion={loadModVersion}/>;
  }
  if(!user) return <LoginScreen login={login} theme={theme} setTheme={setTheme}/>;
  if(!profileReady) return <div className="splash">프로필 확인 중...</div>;
  if(!profileComplete(profile)){
    if(['privacy','mod-policy'].includes(current)){
      return <PublicInfoShell current={current} theme={theme} setTheme={setTheme} returnLabel="프로필 설정"/>;
    }
    return <OnboardingShell user={user} profile={profile} setProfile={setProfile} logout={logout} theme={theme} setTheme={setTheme}/>;
  }

  return <div className="plug-shell">
    <Topbar current={current === 'home' ? 'market' : current} user={user} profile={profile} logout={logout} theme={theme} setTheme={setTheme}/>
    <main className="plug-main">
      {current === 'profile'
        ? <Profile user={user} profile={profile} setProfile={setProfile}/>
        : current === 'privacy'
          ? <PrivacyPage/>
        : current === 'mod-policy'
          ? <ModPolicyPage/>
        : current === 'notice'
          ? <NoticePage user={user} profile={profile} notices={notices} reload={loadNotices}/>
          : current === 'admin'
            ? <AdminPage
                user={user}
                profile={profile}
                logs={logs}
                reloadLogs={loadLogs}
                featureLocks={featureLocks}
                reloadLocks={loadFeatureLocks}
                downloads={downloads}
                reloadDownloads={loadDownloads}
                notices={notices}
                reloadNotices={loadNotices}
                modVersion={modVersion}
                reloadModVersion={loadModVersion}
              />
          : current === 'home'
            ? <MarketDesk current="market" items={prices} user={user} profile={profile} logs={logs} reload={()=>{loadPrices(); loadLogs();}} />
          : activeExpertKey && activeExpertLock?.is_locked && !isAdminUser
            ? <MaintenancePage featureKey={activeExpertKey} lock={activeExpertLock}/>
        : (current === 'ocean' || current.startsWith('ocean-'))
            ? <OceanRouter current={current} prices={prices} user={user} oceanSettings={oceanSettings} setOceanSettings={setOceanSettings}/>
          : isStubRoute(current)
          ? current === 'download'
            ? <DownloadPage user={user} profile={profile} downloads={downloads} reload={loadDownloads} modVersion={modVersion} reloadModVersion={loadModVersion}/>
            : <CategoryPlaceholder current={current} profile={profile}/>
          : ['market','crafting','cooking'].includes(current)
          ? <MarketDesk current={current} items={visibleItems} user={user} profile={profile} logs={logs} reload={()=>{loadPrices(); loadLogs();}} />
          : <MarketDesk current="market" items={visibleItems} user={user} profile={profile} logs={logs} reload={()=>{loadPrices(); loadLogs();}} />}
    </main>
    <SiteFooter/>
  </div>;
}

function LoginScreen({login,theme,setTheme}){
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const [agreements,setAgreements] = useState({privacy:false, modApi:false});
  const [legalModal,setLegalModal] = useState(null);
  const [message,setMessage] = useState('');
  const canStart = agreements.privacy && agreements.modApi;
  const toggleAgreement = (key) => setAgreements(prev=>({...prev,[key]:!prev[key]}));
  const confirmAgreement = (key) => {
    setAgreements(prev=>({...prev,[key]:true}));
    setLegalModal(null);
  };
  function startLogin(){
    if(!canStart){ setMessage('가입 전 필수 안내를 먼저 확인해 주세요.'); return; }
    login(agreements);
  }
  return <main className="login-screen">
    <section className="login-card">
      <button
        type="button"
        className="theme-toggle login-theme-toggle"
        onClick={()=>setTheme(nextTheme)}
        aria-label={`${nextTheme === 'dark' ? '다크' : '라이트'} 모드로 변경`}
      >
        <span className="theme-toggle-dot" aria-hidden="true"></span>
        <b>{theme === 'dark' ? '다크 모드' : '라이트 모드'}</b>
      </button>
      <p className="mono">LOGIN REQUIRED</p>
      <h1><span>DDING PLUG</span>는<br/>Discord 로그인 후<br/>사용할 수 있습니다.</h1>
      <p>공예품·요리 시세표를 확인하고 최신 가격을 공유하기 위해 로그인이 필요합니다.</p>
      <div className="signup-notice compact-signup-notice">
        <b>가입 전 확인</b>
        <span>필수 안내는 팝업에서 확인한 뒤 동의할 수 있습니다.</span>
        <div className="login-legal-actions">
          <button type="button" onClick={()=>setLegalModal('privacy')}>개인정보 처리방침</button>
          <button type="button" onClick={()=>setLegalModal('modApi')}>모드/API 안내</button>
        </div>
      </div>
      <div className="agreement-list">
        <label>
          <input type="checkbox" checked={agreements.privacy} onChange={()=>toggleAgreement('privacy')}/>
          <span><button type="button" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setLegalModal('privacy');}}>개인정보 처리방침</button>을 확인하고 동의합니다.</span>
        </label>
        <label>
          <input type="checkbox" checked={agreements.modApi} onChange={()=>toggleAgreement('modApi')}/>
          <span><button type="button" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); setLegalModal('modApi');}}>모드/API 안내</button>를 확인했습니다.</span>
        </label>
      </div>
      {message && <p className="login-message">{message}</p>}
      <button className="primary big" disabled={!canStart} onClick={startLogin}>Discord로 시작하기</button>
    </section>
    {legalModal && (
      <LegalConsentModal
        type={legalModal}
        onClose={()=>setLegalModal(null)}
        onConfirm={()=>confirmAgreement(legalModal)}
      />
    )}
  </main>;
}

function LegalConsentModal({type,onClose,onConfirm}){
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? '개인정보 처리방침' : '모드/API 안내';
  const summary = isPrivacy
    ? '로그인, 프로필 표시, 시세 수정자 기록을 위해 필요한 최소 정보만 처리합니다.'
    : 'DDING PLUG 모드와 API는 비공식 팬 도구이며, 시세 조회·제보 기능의 기준을 안내합니다.';
  const items = isPrivacy
    ? [
        ['수집 항목', 'Discord 계정 식별값, 이메일, 사용자명, 프로필 이미지, 사이트 프로필, 시세 수정 기록'],
        ['이용 목적', '로그인 유지, 최근 수정자 표시, 시세 제보 출처 확인, 관리자 기능 운영'],
        ['보관 기준', '서비스 운영에 필요한 기간 동안 보관하며 삭제 요청 또는 서비스 종료 시 파기']
      ]
    : [
        ['서비스 성격', '하이퍼루나틱 및 띵타이쿤 공식 서비스와 무관한 개인 제작 비공식 도구'],
        ['저작권 안내', '띵타이쿤 및 관련 콘텐츠의 저작권은 원 개발사와 권리자에게 귀속'],
        ['제보 항목', 'Minecraft ID, 아이템명, 기본 판매가, 전일 대비 변동값, 제보 시각과 처리 결과'],
        ['운영 기준', '자동 플레이·자동 판매·서버 조작 기능 없이, 이용자 확인과 동의를 전제로 동작']
      ];
  return <div className="modal-backdrop legal-backdrop" role="dialog" aria-modal="true">
    <div className="modal-card legal-modal">
      <div className="modal-head">
        <div>
          <p className="mono">{isPrivacy ? 'PRIVACY POLICY' : 'MOD / API NOTICE'}</p>
          <h2>{title}</h2>
        </div>
        <button type="button" onClick={onClose}>×</button>
      </div>
      <p className="legal-modal-summary">{summary}</p>
      <div className="legal-modal-body">
        {items.map(([heading, body]) => <section key={heading}>
          <h3>{heading}</h3>
          <p>{body}</p>
        </section>)}
      </div>
      <p className="legal-modal-date">공고 및 시행 일자: 2026년 5월 20일</p>
      <div className="modal-actions legal-modal-actions">
        <button type="button" className="ghost" onClick={onClose}>닫기</button>
        <button type="button" className="primary" onClick={onConfirm}>{isPrivacy ? '동의하고 닫기' : '확인하고 닫기'}</button>
      </div>
    </div>
  </div>;
}

function PublicInfoShell({current,theme,setTheme,returnLabel='로그인 화면',downloads=[],reloadDownloads,modVersion=DEFAULT_MOD_VERSION,reloadModVersion}){
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return <div className="plug-shell public-shell">
    <header className="topbar public-topbar">
      <button className="brand" onClick={()=>go('#/market')}>DDING <span>PLUG</span></button>
      <div className="public-topbar-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={()=>setTheme(nextTheme)}
          aria-label={`${nextTheme === 'dark' ? '다크' : '라이트'} 모드로 변경`}
        >
          <span className="theme-toggle-dot" aria-hidden="true"></span>
          <b>{theme === 'dark' ? '다크' : '라이트'}</b>
        </button>
        <button className="ghost public-return" onClick={()=>go('#/market')}>{returnLabel}</button>
      </div>
    </header>
    <main className="plug-main">
      {current === 'privacy'
        ? <PrivacyPage/>
        : current === 'download'
          ? <DownloadPage user={null} profile={null} downloads={downloads} reload={reloadDownloads} modVersion={modVersion} reloadModVersion={reloadModVersion}/>
          : <ModPolicyPage/>}
    </main>
    <SiteFooter/>
  </div>;
}

function OnboardingShell({user,profile,setProfile,logout,theme,setTheme}){
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return <div className="plug-shell onboarding-shell">
    <header className="topbar public-topbar">
      <button className="brand" onClick={()=>go('#/market')}>DDING <span>PLUG</span></button>
      <div className="public-topbar-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={()=>setTheme(nextTheme)}
          aria-label={`${nextTheme === 'dark' ? '다크' : '라이트'} 모드로 변경`}
        >
          <span className="theme-toggle-dot" aria-hidden="true"></span>
          <b>{theme === 'dark' ? '다크' : '라이트'}</b>
        </button>
        <button className="ghost public-return" onClick={logout}>로그아웃</button>
      </div>
    </header>
    <main className="plug-main">
      <ProfileSetupGate user={user} profile={profile} setProfile={setProfile}/>
    </main>
    <SiteFooter/>
  </div>;
}

function Topbar({current,user,profile,logout,theme,setTheme}){
  const [profileOpen,setProfileOpen] = useState(false);
  const wrapRef = useRef(null);
  const isAdmin = ['owner','admin'].includes(profile?.role);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const items = [
    ['market','오늘의 시세','/assets/nav/today.png'],
    ['crafting','공예품 시세','/assets/nav/craft.png'],
    ['cooking','요리 시세','/assets/nav/cooking.png'],
    ['ocean','해양 전문가','/assets/professions/ocean.png'],
    ['notice','공지사항',null],
    ['download','다운로드',null],
  ];
  const currentKey = String(current || '');
  const isActiveNav = (key) => key === 'ocean' ? currentKey === 'ocean' || currentKey.startsWith('ocean-') : currentKey === key;

  useEffect(()=>{
    const close = (e)=>{ if(wrapRef.current && !wrapRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', close);
    return ()=>document.removeEventListener('mousedown', close);
  },[]);

  return <header className="topbar">
    <button className="brand" onClick={()=>go('#/market')}>DDING <span>PLUG</span></button>
    <nav className="topnav">
      {items.map(([key,label,icon])=> key==='market'
        ? <div className="market-nav" key={key}>
            <button className={isActiveNav(key)?'active':''} onClick={()=>go('#/market')}>{icon && <img className="nav-icon" src={icon}/>}<span>{label}</span></button>
            <div className="market-subnav">
              <button className={current==='market'?'active-sub':''} onClick={()=>go('#/market')}>
                <img className="sub-img" src="/assets/nav/today.png"/><span>오늘의 시세</span>
              </button>
              <button className={current==='crafting'?'active-sub':''} onClick={()=>go('#/crafting')}>
                <img className="sub-img" src="/assets/nav/craft.png"/><span>공예품 시세</span>
              </button>
              <button className={current==='cooking'?'active-sub':''} onClick={()=>go('#/cooking')}>
                <img className="sub-img" src="/assets/nav/cooking.png"/><span>요리 시세</span>
              </button>
            </div>
          </div>
        : <button key={key} className={isActiveNav(key)?'active':''} onClick={()=>go(`#/${key}`)}>{icon && <img className="nav-icon" src={icon}/>}<span>{label}</span></button>)}
    </nav>
    <button
      type="button"
      className="theme-toggle"
      onClick={()=>setTheme(nextTheme)}
      aria-label={`${nextTheme === 'dark' ? '다크' : '라이트'} 모드로 변경`}
    >
      <span className="theme-toggle-dot" aria-hidden="true"></span>
      <b>{theme === 'dark' ? '다크' : '라이트'}</b>
    </button>
    <div className="profile-menu" ref={wrapRef}>
      <button className="top-user" onClick={()=>setProfileOpen(v=>!v)} aria-expanded={profileOpen}>
        <img src={avatar(user,profile)} onError={e=>e.currentTarget.src=fallbackAvatar}/>
        <div><b>{displayName(user,profile)}</b><span>{profile?.minecraft_id || 'Discord'}</span></div>
      </button>
      {profileOpen && <div className="profile-dropdown">
        <p className="dropdown-label">내 계정 정보</p>
        <button className="dropdown-theme-action" onClick={()=>{setTheme(nextTheme); setProfileOpen(false);}}>
          <span className="theme-toggle-dot" aria-hidden="true"></span>
          <span>{nextTheme === 'dark' ? '다크 모드로 변경' : '라이트 모드로 변경'}</span>
        </button>
        <button onClick={()=>{go('#/profile'); setProfileOpen(false);}}>내 프로필</button>
        {isAdmin && <button onClick={()=>{go('#/admin'); setProfileOpen(false);}}>관리자 로그</button>}
        <button className="danger" onClick={logout}>로그아웃</button>
      </div>}
    </div>
  </header>;
}


const EXPERT_LABELS = { mining:'채광', farming:'재배', ocean:'해양', hunting:'사냥' };
const defaultFeatureLocks = {
  mining: {feature_key:'mining', is_locked:false, message:'채광 콘텐츠는 현재 점검 중입니다.', updated_at:null},
  farming: {feature_key:'farming', is_locked:false, message:'재배 콘텐츠는 현재 점검 중입니다.', updated_at:null},
  ocean: {feature_key:'ocean', is_locked:false, message:'해양 콘텐츠는 현재 점검 중입니다.', updated_at:null},
  hunting: {feature_key:'hunting', is_locked:false, message:'사냥 콘텐츠는 현재 점검 중입니다.', updated_at:null},
};

const CATEGORY_META = {
  download: ['다운로드', '추후 배포 파일과 자료를 제공할 공간입니다.'],
  mining: ['채광 전문가', '채광 활동 계산 기능을 다시 연결할 예정입니다.'],
  farming: ['재배 전문가', '재배·요리·바리스타 계산 기능을 다시 연결할 예정입니다.'],
  ocean: ['해양 전문가', '해양 어획, 연금, 공예품 계산을 관리하는 전문가 도구입니다.'],
  hunting: ['사냥 전문가', '사냥·포획·계약서 계산 기능을 다시 연결할 예정입니다.'],
};
function CategoryPlaceholder({current,profile}){
  const [title, desc] = CATEGORY_META[current] || ['준비 중', '아직 내용이 없습니다.'];
  const isAdmin = ['owner','admin'].includes(profile?.role);
  return <section className="placeholder-page">
    <div className="page-title"><h1>{title}</h1><p>{desc}</p></div>
    <article className="placeholder-card locked-placeholder">
      <p className="mono">현재 준비 중</p>
      <h2>아직 일반 유저에게 공개되지 않은 페이지입니다.</h2>
      <p>{isAdmin ? '관리자 계정으로 확인 중입니다. 추후 기능이 준비되면 공개할 수 있습니다.' : '콘텐츠 준비가 완료되면 이용할 수 있습니다.'}</p>
    </article>
  </section>;
}

function MaintenancePage({featureKey, lock}){
  const label = EXPERT_LABELS[featureKey] || '전문가';
  return <section className="maintenance-page">
    <div className="compact-page-header">
      <div><p className="mono">MAINTENANCE</p><h1>{label} 점검 중</h1><p>{lock?.message || `${label} 콘텐츠는 현재 점검 중입니다.`}</p></div>
    </div>
    <article className="maintenance-card">
      <span className="maintenance-badge">점검 중</span>
      <h2>{label} 콘텐츠를 잠시 사용할 수 없습니다.</h2>
      <p>관리자가 해당 전문가 페이지를 점검 중으로 전환했습니다. 시세, 프로필, 공지사항, 다운로드 등 다른 기능은 계속 사용할 수 있습니다.</p>
      {lock?.updated_at && <small>마지막 변경: {new Date(lock.updated_at).toLocaleString('ko-KR')}</small>}
      <button className="primary" onClick={()=>go('#/market')}>시세표로 돌아가기</button>
    </article>
  </section>;
}


function MarketDesk({current,items,user,profile,logs,reload}){
  const craft = items.filter(x=>x.category==='craft');
  const cooking = items.filter(x=>x.category==='cooking');
  const hotCraft = craft.filter(x=>percentOf(x) >= 90);
  const hotCooking = cooking.filter(x=>percentOf(x) >= 90);
  const title = current==='crafting' ? '공예품 시세' : current==='cooking' ? '요리 시세' : '오늘의 시세';
  const desc = current==='cooking' ? '3일마다 바뀌는 요리 판매가를 확인하고 최신 가격을 공유하세요.' : current==='crafting' ? '매일 바뀌는 공예품 가격을 최고가 대비 비율과 함께 확인합니다.' : '최고가 대비 90% 이상인 오늘의 공예품과 요리를 빠르게 확인합니다.';
  return <section className="market-page internal-page">
    <div className="compact-page-header">
      <div><p className="mono">MARKET DATA</p><h1>{title}</h1><p>{desc}</p></div>
      <div className="filterbar"><span>90% 이상 추천</span></div>
    </div>
    {current === 'market' && <div className="market-summary-row">
      <div><span>공예 추천</span><b>{hotCraft.length.toLocaleString()}개</b></div>
      <div><span>요리 추천</span><b>{hotCooking.length.toLocaleString()}개</b></div>
    </div>}
    <div className="market-layout">
      <div className="market-stack">
        {current === 'market' && <>
          <MarketSection title="오늘의 공예품" items={hotCraft} allItems={craft} user={user} reload={reload} mode="today" empty="현재 90% 이상인 공예품이 없습니다." />
          <MarketSection title="오늘의 요리" items={hotCooking} allItems={cooking} user={user} reload={reload} mode="today" empty="현재 90% 이상인 요리가 없습니다." />
        </>}
        {current === 'crafting' && <MarketSection title="공예품 시세" items={craft} allItems={craft} user={user} reload={reload}/>} 
        {current === 'cooking' && <MarketSection title="요리 시세" items={cooking} allItems={cooking} user={user} reload={reload}/>} 
        <p className="market-note">퍼센트(%)는 최고가 대비 현재 시세의 비율입니다. 오늘의 시세에서는 90% 이상 항목만 오늘의 추천으로 표시됩니다.</p>
      </div>
      <RecentPanel logs={logs} current={current}/>
    </div>
  </section>;
}

function percentOf(item){
  return item.price_max ? Math.round((Number(item.price||0)/item.price_max)*100) : 0;
}

function MarketSection({title,items,allItems,user,reload,mode,empty}){
  const [open,setOpen] = useState(false);
  const isCooking = title.includes('요리');
  const compactCooking = isCooking && mode !== 'today';
  return <section className={`market-board ${compactCooking ? 'cooking-board' : ''}`}>
    <div className="board-head">
      <div><h2>{title}</h2><p>{title.includes('요리') ? '요리는 3일 주기 변동 항목입니다.' : title.includes('공예') ? '공예품은 매일 오전 3시 이후 확인한 값을 입력하세요.' : 'DB 기준 90% 이상 항목만 자동 표시됩니다.'}</p></div>
      {user && <button className="edit-badge" onClick={()=>setOpen(true)}>시세 수정</button>}
    </div>
    <div className="price-list">
      {items.length ? items.map(item=><MarketCard key={item.item_key} item={item}/>) : <div className="empty-state">{empty || '표시할 항목이 없습니다.'}</div>}
    </div>
    {open && <BulkPriceModal title={title.replace('오늘의 ', '')} items={allItems || items} user={user} onClose={()=>setOpen(false)} reload={reload}/>} 
  </section>;
}

function MarketCard({item}){
  const pct = percentOf(item);
  const change = formatPriceChange(item.price_change ?? item.priceChange ?? null);
  return <article className={`price-row ${pct>=90?'high':pct<=40?'low':''}`}> 
    <div className="row-left">
      <img className="row-icon" src={item.image} onError={e=>e.currentTarget.style.display='none'} />
      <div><h3>{item.item_name}</h3><span className="row-meta">최고가 {Number(item.price_max||0).toLocaleString()} G</span></div>
    </div>
    <div className="row-right read-only">
      <strong className="market-price-value">{Number(item.price||0).toLocaleString()}<em> G</em></strong>
      <span className={`price-change ${change.direction}`}>{change.text}</span>
      <span className="ratio">최고가의 {pct}%</span>
    </div>
  </article>;
}

function BulkPriceModal({title,items,user,onClose,reload}){
  const [values,setValues] = useState(()=>Object.fromEntries(items.map(i=>[i.item_key, i.price || ''])));
  const [message,setMessage] = useState('');
  function setOne(key,value){ setValues(v=>({...v,[key]:value})); }
  async function saveAll(){
    if(!user){ setMessage('로그인 후 수정할 수 있습니다.'); return; }
    const invalid = items.find(item => {
      const n = Number(values[item.item_key] || 0);
      return !Number.isFinite(n) || n < 0 || n > item.price_max;
    });
    if(invalid){ setMessage(`${invalid.item_name}: 잘못된 시세를 입력했습니다.`); return; }

    for (const item of items){
      const num = Number(values[item.item_key] || 0);
      const old = Number(item.price || 0);
      if (num === old) continue;

      const {error:rpcError}=await supabase.rpc('update_market_price', {
        target_item_key: item.item_key,
        target_price: num
      });

      if(rpcError){
        setMessage(rpcError.message + ' · supabase/schema.sql을 최신 버전으로 다시 실행해 주세요.');
        return;
      }
    }
    setMessage('저장되었습니다.');
    await reload();
    setTimeout(onClose,450);
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true">
    <div className="modal-card">
      <div className="modal-head"><div><p className="mono">PRICE UPDATE</p><h2>{title} 전체 수정</h2></div><button onClick={onClose}>×</button></div>
      <div className="bulk-list">
        {items.map(item=>{
          const pct = item.price_max ? Math.round((Number(values[item.item_key]||0)/item.price_max)*100) : 0;
          return <label className="bulk-row" key={item.item_key}>
            <img src={item.image} onError={e=>e.currentTarget.style.display='none'}/>
            <span>{item.item_name}</span>
            <input type="number" min="0" max={item.price_max} value={values[item.item_key]} onChange={e=>setOne(item.item_key,e.target.value)} placeholder="0" />
            <em>{pct}%</em>
          </label>;
        })}
      </div>
      {message && <p className="modal-message">{message}</p>}
      <div className="modal-actions"><button className="ghost" onClick={onClose}>취소</button><button className="primary" onClick={saveAll}>전체 저장</button></div>
    </div>
  </div>;
}

function getLogActor(log){
  const p = log.profiles || {};
  return {
    name: p.korean_nickname || p.minecraft_id || p.username || '알 수 없는 유저',
    avatar: p.minecraft_avatar_url || p.avatar_url || fallbackAvatar,
  };
}
function categoryLabel(category){
  return category === 'craft' ? '공예품 시세' : category === 'cooking' ? '요리 시세' : '시세';
}

function RecentPanel({logs,current}){
  const latestCraft = logs.find(log => log.category === 'craft');
  const latestCooking = logs.find(log => log.category === 'cooking');
  const rows = current === 'crafting'
    ? [['공예품', latestCraft]]
    : current === 'cooking'
      ? [['요리', latestCooking]]
      : [['공예품', latestCraft], ['요리', latestCooking]];
  return <div className="panel-card compact-recent">
    <p className="mono">최근 시세 수정자</p>
    <div className="recent-split">
      {rows.map(([label, log]) => log ? <LogRow key={label} log={log} label={label}/> : <div className="recent-category empty-log" key={label}>
        <div className="recent-category-head"><span>{label}</span><i>/</i><b>기록 없음</b></div>
        <p>아직 수정 기록이 없습니다.</p>
      </div>)}
    </div>
  </div>;
}
function LogRow({log,label}){
  const actor = getLogActor(log);
  return <div className="recent-category public-log">
    <div className="recent-category-head"><span>{label || categoryLabel(log.category)}</span><i>/</i><b>{formatLogTime(log.created_at)}</b></div>
    <div className="recent-person">
      <img src={actor.avatar} onError={e=>e.currentTarget.src=fallbackAvatar}/>
      <div>
        <strong>{actor.name}</strong>
      </div>
    </div>
  </div>;
}

function AdminPage({user,profile,logs,reloadLogs,featureLocks,reloadLocks,downloads=[],reloadDownloads,notices=[],reloadNotices,modVersion=DEFAULT_MOD_VERSION,reloadModVersion}){
  const isAdmin = ['owner','admin'].includes(profile?.role);
  const [versionOpen,setVersionOpen]=useState(false);
  const [downloadOpen,setDownloadOpen]=useState(false);
  const [noticeOpen,setNoticeOpen]=useState(false);
  if(!isAdmin){
    return <section className="placeholder-page"><div className="page-title"><h1>관리자</h1><p>관리자만 접근할 수 있습니다.</p></div></section>;
  }
  const version = normalizeModVersion(modVersion);
  const lockRows = Object.keys(defaultFeatureLocks).map(key=>locksOrDefault(featureLocks, key));
  const lockedCount = lockRows.filter(row=>row.is_locked).length;
  const todayCount = logs.filter(log=>Date.now() - new Date(log.created_at).getTime() < 24 * 60 * 60 * 1000).length;
  const latestDownloads = downloads.slice(0,3);
  async function refreshAll(){
    await Promise.all([reloadLogs?.(), reloadLocks?.(), reloadDownloads?.(), reloadNotices?.(), reloadModVersion?.()]);
  }
  return <section className="admin-page">
    <div className="page-title admin-title">
      <div><p className="mono">ADMIN CONSOLE</p><h1>관리자</h1><p>버전, 다운로드, 공지, 점검 상태와 시세 로그를 한 곳에서 관리합니다.</p></div>
      <button className="edit-badge" onClick={refreshAll}>전체 새로고침</button>
    </div>

    <div className="admin-overview-grid">
      <article className="admin-status-card">
        <span>모드 최신 버전</span>
        <b>v{version.latestVersion}</b>
        <p>{version.required ? '필수 업데이트 상태' : version.releaseNote || '릴리즈 노트 없음'}</p>
      </article>
      <article className="admin-status-card">
        <span>다운로드 자료</span>
        <b>{downloads.length.toLocaleString()}개</b>
        <p>{latestDownloads[0]?.title || '등록된 자료 없음'}</p>
      </article>
      <article className="admin-status-card">
        <span>점검 잠금</span>
        <b>{lockedCount.toLocaleString()}개</b>
        <p>{lockedCount ? '잠긴 전문가 페이지가 있습니다.' : '모든 전문가 페이지 공개 중'}</p>
      </article>
      <article className="admin-status-card">
        <span>최근 24시간 수정</span>
        <b>{todayCount.toLocaleString()}건</b>
        <p>전체 로그 {logs.length.toLocaleString()}건</p>
      </article>
    </div>

    <div className="admin-command-grid">
      <article className="admin-command-card">
        <div><p className="mono">RELEASE</p><h2>모드 배포 관리</h2><p>모드 UI에서 확인하는 최신 버전과 릴리즈 노트를 수정합니다.</p></div>
        <div className="admin-command-actions">
          <button className="primary" onClick={()=>setVersionOpen(true)}>버전 정보 수정</button>
          <button className="ghost" onClick={()=>go('#/download')}>다운로드 페이지 보기</button>
        </div>
      </article>
      <article className="admin-command-card">
        <div><p className="mono">CONTENT</p><h2>자료와 공지</h2><p>jar 파일이나 안내 자료를 올리고, 공지사항을 바로 작성합니다.</p></div>
        <div className="admin-command-actions">
          <button className="primary" onClick={()=>setDownloadOpen(true)}>자료 업로드</button>
          <button className="ghost" onClick={()=>setNoticeOpen(true)}>공지 작성</button>
        </div>
      </article>
    </div>

    <div className="admin-workspace-grid">
      <FeatureLockPanel locks={featureLocks} reload={reloadLocks}/>
      <article className="admin-side-card">
        <div className="admin-side-head"><p className="mono">RECENT FILES</p><h2>최근 자료</h2></div>
        <div className="admin-file-list">
          {latestDownloads.length ? latestDownloads.map(item=><div className="admin-file-row" key={item.id}>
            <b>{item.title}</b>
            <span>{item.file_name || '파일명 없음'} · {formatFileSize(item.file_size)}</span>
          </div>) : <p className="muted">아직 등록된 다운로드 자료가 없습니다.</p>}
        </div>
        <button className="ghost admin-wide-button" onClick={()=>go('#/download')}>자료 관리로 이동</button>
      </article>
    </div>

    <article className="admin-log-card">
      <div className="admin-side-head admin-log-title"><p className="mono">PRICE LOGS</p><h2>시세 수정 로그</h2></div>
      <div className="admin-log-head">
        <span>변경자</span><span>품목</span><span>변경 내용</span><span>시간</span>
      </div>
      <div className="admin-log-list">
        {logs.map(log=><AdminLogRow key={log.id} log={log}/>)}
        {!logs.length && <p className="muted admin-empty">아직 시세 변경 기록이 없습니다.</p>}
      </div>
    </article>
    {versionOpen && <ModVersionModal user={user} version={version} onClose={()=>setVersionOpen(false)} reload={reloadModVersion}/>} 
    {downloadOpen && <DownloadModal user={user} onClose={()=>setDownloadOpen(false)} reload={reloadDownloads}/>} 
    {noticeOpen && <NoticeModal user={user} onClose={()=>setNoticeOpen(false)} reload={reloadNotices}/>} 
  </section>;
}

function locksOrDefault(locks, key){
  return locks?.[key] || defaultFeatureLocks[key];
}

function FeatureLockPanel({locks,reload}){
  const [saving,setSaving] = useState('');
  async function toggleLock(key){
    if(!isSupabaseConfigured){ alert('Supabase 연결 후 사용할 수 있습니다.'); return; }
    const current = !!locks?.[key]?.is_locked;
    const message = locks?.[key]?.message || `${EXPERT_LABELS[key]} 콘텐츠는 현재 점검 중입니다.`;
    setSaving(key);
    const {error:rpcError}=await supabase.rpc('set_feature_lock', {
      target_feature_key: key,
      target_is_locked: !current,
      target_message: message
    });
    if(rpcError){
      const {error}=await supabase.from('feature_locks').upsert({
        feature_key:key,
        is_locked:!current,
        message,
        updated_at:new Date().toISOString()
      }, {onConflict:'feature_key'});
      if(error){ alert(error.message + '\n\nsupabase/schema.sql을 다시 실행했는지 확인해 주세요.'); setSaving(''); return; }
    }
    await reload?.();
    setSaving('');
  }
  async function updateMessage(key, message){
    if(!isSupabaseConfigured) return;
    const current = !!locks?.[key]?.is_locked;
    await supabase.from('feature_locks').upsert({feature_key:key,is_locked:current,message,updated_at:new Date().toISOString()}, {onConflict:'feature_key'});
    await reload?.();
  }
  return <article className="feature-lock-card">
    <div className="feature-lock-head"><div><p className="mono">MAINTENANCE LOCK</p><h2>전문가 점검 관리</h2><p>관리자만 채광·재배·해양·사냥 페이지를 개별로 잠글 수 있습니다.</p></div></div>
    <div className="feature-lock-grid">
      {Object.keys(defaultFeatureLocks).map(key=>{
        const row = locks?.[key] || defaultFeatureLocks[key];
        return <div className={`feature-lock-row ${row.is_locked ? 'locked' : ''}`} key={key}>
          <div><b>{EXPERT_LABELS[key]}</b><span>{row.is_locked ? '점검 중' : '공개 중'}</span></div>
          <input defaultValue={row.message || ''} onBlur={e=>updateMessage(key, e.target.value)} placeholder={`${EXPERT_LABELS[key]} 점검 안내 문구`} />
          <button className={row.is_locked ? 'ghost' : 'danger-soft'} disabled={saving===key} onClick={()=>toggleLock(key)}>{saving===key ? '저장 중...' : row.is_locked ? '잠금 해제' : '점검 잠금'}</button>
        </div>;
      })}
    </div>
  </article>;
}
function AdminLogRow({log}){
  const actor = getLogActor(log);
  return <div className="admin-log-row">
    <div className="admin-actor"><img src={actor.avatar} onError={e=>e.currentTarget.src=fallbackAvatar}/><b>{actor.name}</b></div>
    <div className="admin-log-item"><b>{log.item_name || '전체 시세'}</b><span>{categoryLabel(log.category)}</span></div>
    <strong className="admin-log-change">{Number(log.old_price || 0).toLocaleString()} G → {Number(log.new_price || 0).toLocaleString()} G</strong>
    <time>{new Date(log.created_at).toLocaleString('ko-KR')}</time>
  </div>;
}


function NoticePage({user,profile,notices,reload}){
  const isAdmin = ['owner','admin'].includes(profile?.role);
  const [open,setOpen] = useState(false);
  async function deleteNotice(id){
    if(!isAdmin) return;
    if(!confirm('이 공지사항을 삭제할까요?')) return;
    const {error:rpcError}=await supabase.rpc('delete_notice', {notice_id:id});
    if(rpcError){
      const {error}=await supabase.from('notices').delete().eq('id',id);
      if(error){ alert(error.message + '\n\nsupabase/schema.sql을 다시 실행했는지 확인해 주세요.'); return; }
    }
    await reload();
  }
  return <section className="notice-page">
    <div className="page-title"><h1>공지사항</h1><p>DDING PLUG의 업데이트와 안내를 확인하세요.</p></div>
    {isAdmin && <div className="notice-action"><button className="edit-badge" onClick={()=>setOpen(true)}>공지 작성</button></div>}
    <div className="notice-list">
      {notices.length ? notices.map(n=><article className="notice-card" key={n.id}>
        <div><p className="mono">{n.is_pinned ? 'PINNED NOTICE' : 'NOTICE'}</p><h2>{n.title}</h2><p>{n.content}</p></div>
        <div className="notice-side">
          <span>{new Date(n.created_at).toLocaleString('ko-KR')}</span>
          {isAdmin && <button className="notice-delete" onClick={()=>deleteNotice(n.id)}>삭제</button>}
        </div>
      </article>) : <article className="placeholder-card"><p className="mono">NOTICE</p><h2>등록된 공지사항이 없습니다.</h2><p>관리자 계정으로 공지사항을 작성하면 이곳에 표시됩니다.</p></article>}
    </div>
    {open && <NoticeModal user={user} onClose={()=>setOpen(false)} reload={reload}/>} 
  </section>;
}
function NoticeModal({user,onClose,reload}){
  const [title,setTitle]=useState('');
  const [content,setContent]=useState('');
  const [message,setMessage]=useState('');
  async function save(){
    if(!title.trim()){ setMessage('제목을 입력해 주세요.'); return; }
    const {error:rpcError}=await supabase.rpc('create_notice', {
      notice_title:title.trim(),
      notice_content:content.trim()
    });
    if(rpcError){
      const {error}=await supabase.from('notices').insert({title:title.trim(),content:content.trim(),created_by:user.id,is_published:true});
      if(error){ setMessage(error.message + ' · supabase/schema.sql을 다시 실행했는지 확인해 주세요.'); return; }
    }
    await reload();
    onClose();
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true">
    <div className="modal-card notice-modal">
      <div className="modal-head"><div><p className="mono">NOTICE WRITE</p><h2>공지사항 작성</h2></div><button onClick={onClose}>×</button></div>
      <label className="notice-input">제목<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}/></label>
      <label className="notice-input">내용<textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={3000}/></label>
      {message && <p className="modal-message">{message}</p>}
      <div className="modal-actions"><button className="ghost" onClick={onClose}>취소</button><button className="primary" onClick={save}>등록</button></div>
    </div>
  </div>;
}


function DownloadPage({user,profile,downloads,reload,modVersion=DEFAULT_MOD_VERSION,reloadModVersion}){
  const isAdmin = ['owner','admin'].includes(profile?.role);
  const [open,setOpen]=useState(false);
  const [versionOpen,setVersionOpen]=useState(false);
  const [detailItem,setDetailItem]=useState(null);
  const version = normalizeModVersion(modVersion);
  async function remove(id){
    if(!isAdmin) return;
    if(!confirm('이 다운로드 항목을 삭제할까요?')) return;
    const {error}=await supabase.from('downloads').delete().eq('id',id);
    if(error){ alert(error.message); return; }
    await reload();
  }
  function doDownload(item){
    if(!item?.file_data){ alert('다운로드 파일 데이터가 없습니다. 관리자에게 문의해 주세요.'); return; }
    const a=document.createElement('a');
    a.href=item.file_data;
    a.download=item.file_name || item.title || 'download';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function scrollToDownloads(){
    document.getElementById('download-files')?.scrollIntoView({behavior:'smooth', block:'start'});
  }
  return <section className="download-page">
    <div className="page-title admin-title">
      <div><p className="mono">FABRIC MOD</p><h1>다운로드</h1><p>DDING PLUG Fabric 모드 최신 버전과 설치 안내를 확인하세요.</p></div>
      {isAdmin && <div className="admin-title-actions">
        <button className="edit-badge secondary-edit" onClick={()=>setVersionOpen(true)}>버전 정보 수정</button>
        <button className="edit-badge" onClick={()=>setOpen(true)}>자료 업로드</button>
      </div>}
    </div>
    <article className="mod-download-hero">
      <div>
        <p className="mono">DDING PLUG FABRIC MOD</p>
        <h2>DDING PLUG Fabric Mod v{version.latestVersion}</h2>
        <p>띵타이쿤 시세 조회, tooltip 시세 표시, 사용자가 직접 확인한 시세의 수동 제보를 돕는 Fabric 기반 클라이언트 모드입니다.</p>
        <div className="mod-version-meta">
          <span>Minecraft {version.minecraftVersion}</span>
          <span>Fabric Loader {version.fabricLoader}</span>
          <span>Fabric API {version.fabricApi}</span>
          {version.required && <span className="required-version">필수 업데이트</span>}
        </div>
        <p className="mod-release-note">최신 변경: {version.releaseNote}</p>
      </div>
      <button type="button" className="primary mod-download-button" onClick={scrollToDownloads}>다운로드 파일 보기</button>
    </article>
    <div className="mod-guide-grid">
      <article className="privacy-card">
        <h2>설치 방법</h2>
        <ol>
          <li>Fabric Loader와 Fabric API를 설치합니다.</li>
          <li>DDING PLUG jar 파일을 Minecraft `mods` 폴더에 넣습니다.</li>
          <li>게임 실행 후 P 키로 DDING PLUG UI를 열어 상태를 확인합니다.</li>
        </ol>
      </article>
      <article className="privacy-card">
        <h2>주의사항</h2>
        <p>DDING PLUG 모드는 하이퍼루나틱 및 띵타이쿤 공식 서비스와 무관한 개인 제작 비공식 정보 제공 모드입니다. 띵타이쿤 및 관련 콘텐츠의 저작권은 원 개발사와 권리자에게 있으며, 자동 판매, 자동 구매, 자동 클릭, 매크로, 서버 패킷 조작 기능은 포함되어 있지 않습니다.</p>
      </article>
    </div>
    <article className="notice-strip mod-disclaimer"><b>모드/API 안내</b><span>시세 제보 기능은 유저 고지와 동의를 전제로 사용해야 하며, 공용 시세에는 기본 판매가만 반영합니다.</span><button onClick={()=>go('#/mod-policy')}>자세히 보기</button></article>
    <div id="download-files" className="download-section-head"><p className="mono">DOWNLOAD FILES</p><h2>자료 다운로드</h2></div>
    <div className="download-grid">
      {downloads.length ? downloads.map(item=>{
        const actor=getLogActor({profiles:item.profiles});
        const description = (item.description || '').trim();
        const preview = description.length > 110 ? `${description.slice(0,110).trim()}...` : description;
        return <article className="download-card" key={item.id}>
          <p className="mono">DOWNLOAD</p>
          <h2>{item.title}</h2>
          {description && <p className="download-summary">{preview}</p>}
          <div className="download-meta">
            <span>{item.file_name || '파일명 없음'}</span>
            <span>{formatFileSize(item.file_size)}</span>
            <span>{new Date(item.created_at).toLocaleString('ko-KR')}</span>
          </div>
          <div className="download-author"><img src={actor.avatar} onError={e=>e.currentTarget.src=fallbackAvatar}/><span>{actor.name}</span></div>
          <div className="download-actions">
            <button className="primary" disabled={!item.file_data} onClick={()=>doDownload(item)}>다운로드</button>
            {description && <button className="ghost" onClick={()=>setDetailItem(item)}>상세 보기</button>}
            {isAdmin && <button className="notice-delete" onClick={()=>remove(item.id)}>삭제</button>}
          </div>
        </article>;
      }) : <article className="placeholder-card"><p className="mono">DOWNLOAD</p><h2>등록된 다운로드가 없습니다.</h2><p>관리자 계정으로 파일을 업로드하면 일반 유저가 다운로드할 수 있습니다.</p></article>}
    </div>
    {open && <DownloadModal user={user} onClose={()=>setOpen(false)} reload={reload}/>} 
    {versionOpen && <ModVersionModal user={user} version={version} onClose={()=>setVersionOpen(false)} reload={reloadModVersion}/>} 
    {detailItem && <DownloadDetailModal item={detailItem} onClose={()=>setDetailItem(null)} onDownload={()=>doDownload(detailItem)} />} 
  </section>;
}
function DownloadDetailModal({item,onClose,onDownload}){
  const description = (item?.description || '').trim();
  return <div className="modal-backdrop" role="dialog" aria-modal="true">
    <div className="modal-card download-detail-modal">
      <div className="modal-head">
        <div><p className="mono">DOWNLOAD DETAIL</p><h2>{item?.title || '다운로드 상세'}</h2></div>
        <button onClick={onClose}>×</button>
      </div>
      <div className="download-detail-meta">
        <span>{item?.file_name || '파일명 없음'}</span>
        <span>{formatFileSize(item?.file_size)}</span>
        <span>{item?.created_at ? new Date(item.created_at).toLocaleString('ko-KR') : '등록일 없음'}</span>
      </div>
      <div className="download-detail-body">
        {description ? <p>{description}</p> : <p className="muted">등록된 설명이 없습니다.</p>}
      </div>
      <div className="modal-actions">
        <button className="ghost" onClick={onClose}>닫기</button>
        <button className="primary" disabled={!item?.file_data} onClick={onDownload}>다운로드</button>
      </div>
    </div>
  </div>;
}
function ModVersionModal({user,version,onClose,reload}){
  const [form,setForm]=useState(()=>normalizeModVersion(version));
  const [message,setMessage]=useState('');
  const [saving,setSaving]=useState(false);
  const update = (key,value) => setForm(prev=>({...prev,[key]:value}));
  async function save(){
    if(!isSupabaseConfigured){ setMessage('.env 파일에 Supabase 값을 넣어 주세요.'); return; }
    if(!form.latestVersion.trim()){ setMessage('최신 버전을 입력해 주세요.'); return; }
    if(!form.minecraftVersion.trim()){ setMessage('지원 Minecraft 버전을 입력해 주세요.'); return; }
    if(!form.downloadUrl.trim()){ setMessage('다운로드 페이지 URL을 입력해 주세요.'); return; }
    try { new URL(form.downloadUrl.trim()); }
    catch { setMessage('다운로드 URL 형식이 올바르지 않습니다.'); return; }

    setSaving(true);
    setMessage('');
    const {error}=await supabase.from('mod_version_config').upsert({
      id:'ddingplug',
      latest_version:form.latestVersion.trim(),
      minecraft_version:form.minecraftVersion.trim(),
      fabric_loader:form.fabricLoader.trim(),
      fabric_api:form.fabricApi.trim(),
      download_url:form.downloadUrl.trim(),
      release_note:form.releaseNote.trim(),
      required:!!form.required,
      updated_by:user.id
    }, { onConflict:'id' });
    setSaving(false);
    if(error){ setMessage(error.message + ' · supabase/schema.sql을 다시 실행했는지 확인해 주세요.'); return; }
    await reload?.();
    onClose();
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true">
    <div className="modal-card notice-modal mod-version-modal">
      <div className="modal-head"><div><p className="mono">MOD VERSION</p><h2>모드 버전 정보 수정</h2></div><button onClick={onClose}>×</button></div>
      <div className="mod-version-form-grid">
        <label className="notice-input">최신 버전<input value={form.latestVersion} onChange={e=>update('latestVersion',e.target.value)} placeholder="0.1.0"/></label>
        <label className="notice-input">지원 Minecraft 버전<input value={form.minecraftVersion} onChange={e=>update('minecraftVersion',e.target.value)} placeholder="1.21.4"/></label>
        <label className="notice-input">Fabric Loader<input value={form.fabricLoader} onChange={e=>update('fabricLoader',e.target.value)} placeholder="0.16.10+"/></label>
        <label className="notice-input">Fabric API<input value={form.fabricApi} onChange={e=>update('fabricApi',e.target.value)} placeholder="0.119.2+1.21.4"/></label>
      </div>
      <label className="notice-input">다운로드 페이지 URL<input value={form.downloadUrl} onChange={e=>update('downloadUrl',e.target.value)} placeholder="https://ddingplug.vercel.app/download"/></label>
      <label className="notice-input">릴리즈 노트<textarea value={form.releaseNote} onChange={e=>update('releaseNote',e.target.value)} maxLength={300} /></label>
      <label className="notice-input check-input">
        <input type="checkbox" checked={form.required} onChange={e=>update('required',e.target.checked)} />
        <span>필수 업데이트로 표시</span>
      </label>
      {message && <p className="modal-message">{message}</p>}
      <div className="modal-actions"><button className="ghost" onClick={onClose}>취소</button><button className="primary" onClick={save} disabled={saving}>{saving ? '저장 중...' : '저장'}</button></div>
    </div>
  </div>;
}
function DownloadModal({user,onClose,reload}){
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [file,setFile]=useState(null);
  const [message,setMessage]=useState('');
  async function toDataURL(f){
    return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(f); });
  }
  async function save(){
    if(!isSupabaseConfigured){ setMessage('.env 파일에 Supabase 값을 넣어 주세요.'); return; }
    if(!title.trim()){ setMessage('제목을 입력해 주세요.'); return; }
    if(!file){ setMessage('파일을 선택해 주세요.'); return; }
    if(file.size > MAX_DOWNLOAD_BYTES){ setMessage(`베타에서는 ${formatFileSize(MAX_DOWNLOAD_BYTES)} 이하 파일만 업로드할 수 있습니다.`); return; }
    const fileData=await toDataURL(file);
    const {error}=await supabase.from('downloads').insert({
      title:title.trim(), description:description.trim(), file_name:file.name, file_type:file.type || 'application/octet-stream', file_size:file.size, file_data:fileData, created_by:user.id
    });
    if(error){ setMessage(error.message + ' · supabase/schema.sql을 다시 실행했는지 확인해 주세요.'); return; }
    await reload(); onClose();
  }
  return <div className="modal-backdrop" role="dialog" aria-modal="true">
    <div className="modal-card notice-modal">
      <div className="modal-head"><div><p className="mono">UPLOAD</p><h2>다운로드 자료 업로드</h2></div><button onClick={onClose}>×</button></div>
      <label className="notice-input">제목<input value={title} onChange={e=>setTitle(e.target.value)} /></label>
      <label className="notice-input">설명<textarea value={description} onChange={e=>setDescription(e.target.value)} /></label>
      <label className="notice-input">파일<input type="file" onChange={e=>setFile(e.target.files?.[0] || null)} /></label>
      {message && <p className="modal-message">{message}</p>}
      <div className="modal-actions"><button className="ghost" onClick={onClose}>취소</button><button className="primary" onClick={save}>업로드</button></div>
    </div>
  </div>;
}



function ModPolicyPage(){
  return <section className="privacy-page policy-page compact-policy">
    <div className="compact-page-header policy-header">
      <div>
        <p className="mono">MOD / API NOTICE</p>
        <h1>모드/API 이용 고지</h1>
        <p>시세 조회·제보 기능을 사용할 때 어떤 정보가 오가고, 어떤 기능을 제공하지 않는지 안내합니다.</p>
      </div>
    </div>

    <div className="legal-summary-strip">
      <article><span>서비스 성격</span><b>비공식 팬 도구</b></article>
      <article><span>제보 기준</span><b>사용자 확인 필요</b></article>
      <article><span>제공하지 않음</span><b>자동 플레이·조작</b></article>
    </div>

    <article className="privacy-card policy-card important-policy legal-lead-card">
      <p className="mono">IMPORTANT</p>
      <h2>DDING PLUG는 독립적으로 운영됩니다.</h2>
      <p>DDING PLUG 웹사이트, API, 마인크래프트 모드는 하이퍼루나틱 및 띵타이쿤 공식 서비스와 무관하게 개인이 제작·운영하는 비공식 팬 도구입니다. 띵타이쿤 및 관련 콘텐츠의 저작권은 원 개발사와 권리자에게 귀속됩니다.</p>
    </article>

    <div className="policy-grid concise-policy-grid">
      <article className="privacy-card">
        <h2>수집·처리될 수 있는 정보</h2>
        <ul>
          <li>Minecraft ID 또는 사이트 프로필에 연결된 닉네임</li>
          <li>제보한 아이템명, 기본 판매가, 전일 대비 변동값</li>
          <li>제보 시각, 제보 출처, API 처리 결과</li>
        </ul>
      </article>

      <article className="privacy-card">
        <h2>수집하지 않는 정보</h2>
        <ul>
          <li>마인크래프트/Discord 비밀번호 및 인증 토큰</li>
          <li>채팅 전문, 개인 대화, 화면 캡처 이미지</li>
          <li>자동 판매·구매·클릭 등 플레이 조작 정보</li>
        </ul>
      </article>

      <article className="privacy-card">
        <h2>제보 방식</h2>
        <ul>
          <li>모드는 DDING PLUG API를 통해 최신 시세와 업데이트 정보를 확인합니다.</li>
          <li>모드는 Supabase DB에 직접 접근하지 않습니다.</li>
          <li>시세 제보는 사용자의 확인과 동의를 전제로 동작해야 합니다.</li>
          <li>공용 시세에는 기본 판매가만 반영하며, 개인 보정 판매가는 공용 시세로 저장하지 않습니다.</li>
        </ul>
      </article>

      <article className="privacy-card">
        <h2>사용자 확인과 동의</h2>
        <p>모드의 시세 감지·제보 기능을 사용하는 경우, 이용자는 수집 항목과 이용 목적을 확인하고 동의해야 합니다. 동의하지 않아도 시세 조회 기능은 사용할 수 있도록 운영하는 것을 원칙으로 합니다.</p>
      </article>
    </div>

    <article className="privacy-card policy-note-card">
      <h2>운영 고지</h2>
      <p>DDING PLUG는 정보 제공 및 시세 공유를 위한 도구이며, 자동 플레이·자동 판매·서버 조작 기능을 제공하지 않습니다. 공용 시세에는 서버 전체 참고에 적합한 기본 판매가만 반영합니다.</p>
      <p className="policy-date">공고 및 시행 일자: 2026년 5월 20일</p>
    </article>
  </section>;
}

function PrivacyPage(){
  return <section className="privacy-page compact-policy">
    <div className="page-title policy-header">
      <div>
        <p className="mono">PRIVACY POLICY</p>
        <h1>개인정보 처리방침</h1>
        <p>DDING PLUG 운영에 필요한 정보의 수집 범위, 이용 목적, 보관 기준을 안내합니다.</p>
      </div>
    </div>

    <div className="legal-summary-strip">
      <article><span>수집 원칙</span><b>필요 최소한</b></article>
      <article><span>주요 목적</span><b>로그인·시세 기록</b></article>
      <article><span>보관 기준</span><b>운영 필요 기간</b></article>
    </div>

    <article className="privacy-card legal-lead-card">
      <p className="mono">OVERVIEW</p>
      <h2>서비스 운영에 필요한 정보만 처리합니다.</h2>
      <p>DDING PLUG는 Discord 로그인, 프로필 표시, 시세 수정자 기록, 모드/API 제보 출처 확인을 위해 필요한 범위의 정보를 사용합니다.</p>
    </article>

    <div className="policy-grid concise-policy-grid">
      <article className="privacy-card">
        <h2>수집하는 정보</h2>
        <ul>
          <li>Discord 로그인 정보: 고유 식별값, 이메일, 사용자명, 프로필 이미지 URL</li>
          <li>프로필 정보: 띵타이쿤 한글 닉네임, Minecraft ID, 마인크래프트 스킨 이미지 URL</li>
          <li>서비스 이용 기록: 시세 수정 기록, 공지사항/다운로드 작성 기록</li>
          <li>모드/API 제보 정보: 아이템명, 기본 판매가, 전일 대비 변동값, 제보 시각, 제보 출처, 연결된 Minecraft ID</li>
        </ul>
      </article>

      <article className="privacy-card">
        <h2>이용 목적</h2>
        <ul>
          <li>로그인 유지 및 사용자 프로필 표시</li>
          <li>공예품/요리 시세 갱신 및 최근 수정자 표시</li>
          <li>부정확하거나 악의적인 시세 입력 확인</li>
          <li>공지사항, 다운로드, 관리자 기능 운영</li>
        </ul>
      </article>

      <article className="privacy-card">
        <h2>보유 및 파기</h2>
        <p>수집된 정보는 서비스 운영에 필요한 기간 동안 보관하며, 삭제 요청 또는 서비스 종료 시 지체 없이 파기합니다.</p>
      </article>

      <article className="privacy-card">
        <h2>모드/API 고지</h2>
        <p>DDING PLUG 모드와 API는 하이퍼루나틱 및 띵타이쿤 공식 서비스와 무관하게 독립적으로 운영되는 개인 제작 비공식 팬 도구입니다. 띵타이쿤 및 관련 콘텐츠의 저작권은 원 개발사와 권리자에게 있으며, 시세 감지·제보 기능은 이용자의 사전 고지와 동의를 전제로 사용해야 합니다.</p>
      </article>
    </div>

    <article className="privacy-card policy-note-card">
      <h2>보안 및 문의</h2>
      <p>DDING PLUG는 인증과 데이터 저장을 위해 Supabase Auth 및 Database를 사용합니다. 개인정보 관련 문의는 사이트 운영자에게 연락해 주세요.</p>
      <p className="policy-date">공고 및 시행 일자: 2026년 5월 20일</p>
    </article>
  </section>;
}

function SiteFooter(){
  return <footer className="site-footer">
    <p>© 2026 띵플러그. All rights reserved.</p>
    <p>띵타이쿤 및 관련 콘텐츠의 저작권은 원 개발사와 권리자에게 있으며, 본 웹사이트는 하이퍼루나틱과 무관하게 개인이 제작한 비공식 팬사이트입니다.</p>
    <div className="footer-links"><button onClick={()=>go('#/privacy')}>개인정보 처리방침</button><button onClick={()=>go('#/mod-policy')}>모드/API 안내</button></div>
  </footer>;
}


function ProfileSetupGate({user,profile,setProfile}){
  const [form,setForm]=useState(()=>({korean_nickname:profile?.korean_nickname||'',minecraft_id:profile?.minecraft_id||''}));
  const [status,setStatus]=useState('');
  const [saving,setSaving]=useState(false);

  useEffect(()=>{ setForm({korean_nickname:profile?.korean_nickname||'', minecraft_id:profile?.minecraft_id||''}); },[profile?.id]);

  const nickname = form.korean_nickname.trim();
  const minecraftId = form.minecraft_id.trim();
  const validMinecraft = /^[A-Za-z0-9_]{3,16}$/.test(minecraftId);
  const minecraftReady = !minecraftId || validMinecraft;
  const canSubmit = nickname.length >= 1 && validMinecraft && !saving;
  const face = minecraftId ? mcHead(minecraftId) : avatar(user,profile);

  function change(key,value){
    if(key === 'minecraft_id'){
      value = value.trim().replace(/[^a-zA-Z0-9_]/g,'').slice(0,16);
    }
    setForm(prev=>({...prev,[key]:value}));
    setStatus('');
  }

  async function completeProfile(){
    if(!nickname){ setStatus('띵타이쿤 한글 닉네임을 입력해 주세요.'); return; }
    if(!validMinecraft){ setStatus('마인크래프트 아이디는 영문, 숫자, 언더스코어 3~16자로 입력해 주세요.'); return; }
    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      id:user.id,
      korean_nickname:nickname,
      minecraft_id:minecraftId,
      minecraft_uuid:null,
      minecraft_avatar_url:mcHead(minecraftId),
      profile_completed_at:now,
      updated_at:now,
      ...agreementProfilePayload()
    };
    let {data,error}=await supabase.from('profiles').upsert(payload,{onConflict:'id'}).select('*').maybeSingle();
    if(error && isOptionalProfileColumnError(error)){
      ({data,error}=await supabase.from('profiles').upsert(withoutOptionalProfileFields(payload),{onConflict:'id'}).select('*').maybeSingle());
    }
    setSaving(false);
    if(error){ setStatus('저장 실패 · '+error.message); return; }
    clearPendingAgreement();
    setProfile(prev=>data || {...prev,...payload});
    go('#/market');
  }

  return <section className="profile-page onboarding-profile">
    <div className="page-title onboarding-title">
      <div>
        <p className="mono">PROFILE SETUP</p>
        <h1>프로필을 먼저 설정해 주세요.</h1>
        <p>시세 수정자 표시와 모드/API 제보 연결을 위해 기본 프로필이 필요합니다.</p>
      </div>
    </div>
    <div className="profile-grid onboarding-profile-grid">
      <article className="profile-form panel-card onboarding-form-card">
        <div className="form-card-head">
          <div>
            <p className="mono">REQUIRED</p>
            <h2>기본 프로필</h2>
          </div>
          <span className="setup-step">1 / 1</span>
        </div>
        <label>
          <span>띵타이쿤 한글 닉네임</span>
          <input value={form.korean_nickname} onChange={e=>change('korean_nickname',e.target.value)} placeholder="예: 미아"/>
          <small>시세표와 최근 수정자에 표시될 이름입니다.</small>
        </label>
        <label>
          <span>마인크래프트 아이디</span>
          <input className={minecraftReady ? '' : 'invalid'} value={form.minecraft_id} onChange={e=>change('minecraft_id',e.target.value)} placeholder="영문/숫자/언더스코어" maxLength={16}/>
          <small className={minecraftReady ? '' : 'error'}>영문, 숫자, 언더스코어 3~16자로 입력해 주세요.</small>
        </label>
        <div className="profile-legal-note">
          <b>안내 확인</b>
          <span>입력한 프로필은 최근 수정자 표시와 시세 제보 출처 확인에 사용됩니다.</span>
          <div><button type="button" onClick={()=>go('#/privacy')}>개인정보 처리방침</button><button type="button" onClick={()=>go('#/mod-policy')}>모드/API 안내</button></div>
        </div>
        {status && <p className="modal-message">{status}</p>}
        <button className="primary profile-complete-button" disabled={!canSubmit} onClick={completeProfile}>{saving ? '저장 중...' : '저장하고 시작하기'}</button>
      </article>
      <aside className="profile-preview market-card onboarding-preview-card">
        <div className="preview-card-head">
          <span>프로필 미리보기</span>
          <b>{canSubmit ? '준비 완료' : '입력 필요'}</b>
        </div>
        <div className="profile-mini onboarding-mini">
          <img src={face} onError={e=>e.currentTarget.src=fallbackAvatar}/>
          <div>
            <h2>{nickname || '닉네임 입력 전'}</h2>
            <p>{minecraftId ? `Minecraft · ${minecraftId}` : 'Minecraft ID 입력 전'}</p>
          </div>
        </div>
        <div className="setup-checklist">
          <div className={nickname ? 'done' : ''}><span></span><b>닉네임</b><em>{nickname ? '입력됨' : '필수'}</em></div>
          <div className={validMinecraft ? 'done' : ''}><span></span><b>Minecraft ID</b><em>{validMinecraft ? '사용 가능' : '필수'}</em></div>
        </div>
        <p className="preview-note">설정 후 오늘의 시세, 시세 수정, 모드/API 제보 연결 기능을 사용할 수 있습니다.</p>
      </aside>
    </div>
  </section>;
}



const SET_SIZE = 64;
const BOX_SIZE = 3456;
const SEAFOOD_ORDER = ['oyster','conch','octopus','seaweed','urchin'];
const TIER_ORDER = [1,2,3];
const SEAFOOD_KO = Object.fromEntries(Object.entries(SEAFOOD_TYPES_CFG).map(([k,v])=>[k,v.name]));
const OCEAN_TABS = [
  ['ocean','전문가 세팅','요약'],
  ['ocean-stamina','스태미나 계산','예상 수익'],
  ['ocean-alchemy','연금품 계산기','보유 어패류'],
  ['ocean-materials','재료 역산','목표 제작'],
  ['ocean-craft','공예품 계산기','조개·진주'],
  ['ocean-recipes','조합법 도감','레시피'],
];
const defaultOceanSettings = {
  stamina:3000, rodLevel:12,
  skillFurnace:0, skillCraftBonus:0, skillAlchBonus:0, skillDeepHarvest:0, skillStarBonus:0, skillClamBonus:0,
  engClamSearch:0, engSeafoodLuck:0, engFisherRoulette:0, engSpiritWhale:0,
  alchemyMode:'include', vanillaUnitPrice:0
};
const oceanMoney = (n) => `${Math.round(Number(n || 0)).toLocaleString('ko-KR')} G`;
const oceanNum = (n, digits=2) => {
  const v = Number(n || 0);
  return Number.isInteger(v) ? v.toLocaleString('ko-KR') : v.toFixed(digits).replace(/\.?0+$/,'');
};
function formatOceanQty(n){
  const x = Math.floor(Number(n)||0);
  if(x <= 0) return '0개';
  const boxes = Math.floor(x / BOX_SIZE);
  const rest = x % BOX_SIZE;
  const sets = Math.floor(rest / SET_SIZE);
  const items = rest % SET_SIZE;
  return [[boxes,'상자'],[sets,'세트'],[items,'개']].filter(([v])=>v>0).map(([v,u])=>`${v}${u}`).join(' ');
}
function formatOceanTime(sec){
  const s = Math.round(Number(sec)||0);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), r=s%60;
  return [h&&`${h}시간`, m&&`${m}분`, r&&`${r}초`].filter(Boolean).join(' ') || '0초';
}
function sfKey(type,tier){ return `${type}${tier}`; }
function isSeafoodKey(key){ return /^(oyster|conch|octopus|seaweed|urchin)(1|2|3)$/.test(key); }
function seafoodLabel(key){ const m=key.match(/^(oyster|conch|octopus|seaweed|urchin)(1|2|3)$/); return m ? `${SEAFOOD_KO[m[1]]} ${m[2]}성` : key; }
const OCEAN_MATERIAL_NAME_MAP = {
  metal_scrap:'금속 재활용품', resin_scrap:'합성수지 재활용품', plastic_scrap:'플라스틱 재활용품', alloy_scrap:'합금 재활용품', fiber_scrap:'섬유 재활용품',
  spider_web:'거미줄', bamboo:'대나무', clock:'시계', bucket:'양동이', obsidian:'흑요석', amethyst:'자수정 조각', stick:'막대기', glass:'유리판', pink_petal:'분홍 꽃잎'
};
function getVanillaName(key){ return VANILLA_META_CFG?.[key]?.name || OCEAN_MATERIAL_NAME_MAP[key] || '한글명 데이터 필요'; }
function hasKnownMaterialName(key){ return Boolean(isSeafoodKey(key) || ALCHEMY_CFG[key] || PRECISION_ALCHEMY_CFG[key] || VANILLA_META_CFG?.[key]?.name || OCEAN_MATERIAL_NAME_MAP[key] || ['shell','yellow','blue','cyan','pink','purple','black'].includes(key)); }
function getMaterialDisplayName(key){
  if(isSeafoodKey(key)) return seafoodLabel(key);
  if(ALCHEMY_CFG[key]) return ALCHEMY_CFG[key].name;
  if(PRECISION_ALCHEMY_CFG[key]) return PRECISION_ALCHEMY_CFG[key].name;
  const clamNames={shell:'깨진 조개껍데기',yellow:'노란빛 진주',blue:'푸른빛 진주',cyan:'청록빛 진주',pink:'분홍빛 진주',purple:'보라빛 진주',black:'흑진주'};
  if(clamNames[key]) return clamNames[key];
  return getVanillaName(key);
}
function getRecipeKind(row){ return row.type === 'craft' ? '제작법' : '조합법'; }
function recipeKindMatches(row, kind){ return kind === '전체' || getRecipeKind(row) === kind; }
function getOceanSkillValues(form){
  return {
    furnaceReduce:(OCEAN_SKILLS_CFG.FURNACE.reductionPct[Number(form.skillFurnace)||0]||0),
    craftBonus:(OCEAN_SKILLS_CFG.CRAFT_BONUS.bonusPct[Number(form.skillCraftBonus)||0]||0),
    alchBonus:(OCEAN_SKILLS_CFG.ALCH_BONUS.bonusPct[Number(form.skillAlchBonus)||0]||0),
    deepHarvest:(OCEAN_SKILLS_CFG.DEEP_HARVEST.pct[Number(form.skillDeepHarvest)||0]||0),
    starBonus:(OCEAN_SKILLS_CFG.STAR_BONUS.pct[Number(form.skillStarBonus)||0]||0),
    clamBonus:(OCEAN_SKILLS_CFG.CLAM_BONUS.pct[Number(form.skillClamBonus)||0]||0),
    clamSearch:(OCEAN_ENGRAVING_CFG.CLAM_SEARCH.pct[Number(form.engClamSearch)||0]||0),
    seafoodLuck:(OCEAN_ENGRAVING_CFG.SEAFOOD_LUCK.drops[Number(form.engSeafoodLuck)||0]||{pct:0,count:0}),
    fisherRoulette:(OCEAN_ENGRAVING_CFG.FISHER_ROULETTE.dicePct[Number(form.engFisherRoulette)||0]||0),
    spiritWhale:(OCEAN_ENGRAVING_CFG.SPIRIT_WHALE.appearPct[Number(form.engSpiritWhale)||0]||0),
  };
}
function oceanStaminaResult(form){
  const skills=getOceanSkillValues(form);
  const rod=ROD_CFG[Number(form.rodLevel)||0] || ROD_CFG[0];
  const stamina=Number(form.stamina)||0;
  const count=Math.floor(stamina / OCEAN_CFG.STAMINA_PER_USE);
  const luckExtra=(skills.seafoodLuck.pct/100) * (skills.seafoodLuck.count||0);
  const rouletteExtra=(skills.fisherRoulette/100) * (0.9*3.5*OCEAN_ENGRAVING_CFG.FISHER_ROULETTE.normalMult + 0.1*3.5*OCEAN_ENGRAVING_CFG.FISHER_ROULETTE.goldenMult);
  const perCatch=(rod.seafoodDrop||0) + skills.deepHarvest/100 + luckExtra + rouletteExtra;
  const total=count * perCatch;
  const base1=60, base2=30, base3=10 + skills.starBonus;
  const totalPct=base1+base2+base3;
  const tiers={1:total*(base1/totalPct),2:total*(base2/totalPct),3:total*(base3/totalPct)};
  const inv={};
  SEAFOOD_ORDER.forEach(type=>TIER_ORDER.forEach(t=>{ inv[sfKey(type,t)] = tiers[t] / SEAFOOD_ORDER.length; }));
  const clamRate=(rod.clamPct||0) + skills.clamBonus + skills.clamSearch;
  const clamAppear=count*(clamRate/100);
  const clamDrop=clamAppear*(CLAM_CFG.dropPct/100);
  const whale=count*(skills.spiritWhale/100);
  return {count, perCatch, total, tiers, inv, clamAppear, clamDrop, whale, skills, rod};
}
function calcFinalNeed(finalKey, qty=1){
  const seafood={}, vanilla={}, intermediate={};
  const add=(map,k,v)=>{ map[k]=(map[k]||0)+v; };
  function expand(key, amount, depth=0){
    if(!amount || amount <= 0 || depth > 24) return;
    if(isSeafoodKey(key)){ add(seafood,key,amount); return; }
    if(VANILLA_META_CFG[key]){ add(vanilla,key,amount); return; }
    const rec=ALCHEMY_CFG[key];
    if(rec){ add(intermediate,key,amount); const batches=amount/(rec.output||1); Object.entries(rec.materials||{}).forEach(([mk,mq])=>expand(mk,mq*batches,depth+1)); return; }
    add(vanilla,key,amount);
  }
  const final=PRECISION_ALCHEMY_CFG[finalKey];
  if(!final) return {seafood,vanilla,intermediate,time:0,name:finalKey,tier:0,price:0};
  Object.entries(final.materials||{}).forEach(([mk,mq])=>expand(mk,mq*qty,0));
  return {seafood,vanilla,intermediate,time:(final.craftTimeSec||0)*qty,name:final.name,tier:final.tier,price:final.price||0};
}
function maxCraftable(inv, need){
  let max=Infinity;
  Object.entries(need.seafood || {}).forEach(([k,v])=>{ if(v>0) max=Math.min(max, Math.floor((Number(inv[k])||0)/v)); });
  return max===Infinity ? 0 : Math.max(0,max);
}
function consumeNeed(inv, need, qty){
  const next={...inv};
  Object.entries(need.seafood||{}).forEach(([k,v])=>{ next[k]=Math.max(0,(Number(next[k])||0)-v*qty); });
  return next;
}
function vanillaCostFromNeed(need, unitPrice){
  return Object.values(need.vanilla||{}).reduce((a,b)=>a+Number(b||0),0) * (Number(unitPrice)||0);
}
function makeInventoryFromTiers(tiers){
  const inv={};
  SEAFOOD_ORDER.forEach(type=>TIER_ORDER.forEach(t=>{ inv[sfKey(type,t)] = Math.floor((tiers?.[t]||0)/SEAFOOD_ORDER.length); }));
  return inv;
}
function planAlchemyV20(inv, settings){
  const mode=settings.alchemyMode || 'include';
  const alchBonus=(getOceanSkillValues(settings).alchBonus||0)/100;
  const vanillaUnit=Number(settings.vanillaUnitPrice)||0;
  let candidates=Object.entries(PRECISION_ALCHEMY_CFG).map(([key,item])=>{
    const need=calcFinalNeed(key,1);
    const can=maxCraftable(inv,need);
    const vanillaCost=vanillaCostFromNeed(need, vanillaUnit);
    const sell=Math.round((item.price||0)*(1+(item.tier===0?0:alchBonus)));
    const profit=sell-vanillaCost;
    const needTotal=Object.values(need.seafood||{}).reduce((a,b)=>a+Number(b||0),0);
    return {key,item,need,can,sell,vanillaCost,profit,needTotal};
  }).filter(e=>e.can>0);
  if(mode==='only_dilute') candidates=candidates.filter(e=>e.item.tier===0 || /희석|희석액|추출된/.test(e.item.name));
  if(mode==='exclude_dilute') candidates=candidates.filter(e=>!(e.item.tier===0 || /희석|희석액|추출된/.test(e.item.name)));
  candidates.sort((a,b)=>(b.profit-a.profit) || (b.needTotal-a.needTotal) || (a.can-b.can));
  let remain={...inv};
  const entries=[];
  for(const e of candidates){
    const qty=maxCraftable(remain,e.need);
    if(qty>0){ entries.push({...e, qty, totalSell:e.sell*qty, totalCost:e.vanillaCost*qty, totalProfit:e.profit*qty}); remain=consumeNeed(remain,e.need,qty); }
  }
  const shortage=[];
  if(!entries.length){
    const first=Object.entries(PRECISION_ALCHEMY_CFG)[0];
    if(first){ const need=calcFinalNeed(first[0],1); Object.entries(need.seafood||{}).forEach(([k,v])=>{ if((Number(inv[k])||0)<v) shortage.push({key:k, need:v, have:Number(inv[k])||0}); }); }
  }
  return {entries, remain, shortage, totalSell:entries.reduce((a,b)=>a+b.totalSell,0), totalCost:entries.reduce((a,b)=>a+b.totalCost,0), totalProfit:entries.reduce((a,b)=>a+b.totalProfit,0)};
}
function explainOptimizerChoice(entry){
  if(!entry) return '입력한 재고로 제작 가능한 최종 연금품이 없습니다.';
  const parts=[];
  parts.push(entry.profit>0 ? '순수익이 양수인 조합입니다.' : '판매가/부재료 단가 기준 순수익이 낮거나 음수입니다.');
  parts.push(`${entry.need.name}은 현재 재고로 ${entry.qty.toLocaleString('ko-KR')}개 제작 가능합니다.`);
  parts.push('동일 조건에서는 순수익이 높은 순서로 우선 배치합니다.');
  return parts.join(' ');
}
function getOceanConfigIssues(settings){
  const issues=[];
  if(!ROD_CFG[Number(settings.rodLevel)||0]) issues.push('세이지 낚싯대 강화 데이터가 없어 기본값으로 계산됩니다.');
  if(!PRECISION_ALCHEMY_CFG || !Object.keys(PRECISION_ALCHEMY_CFG).length) issues.push('최종 연금품 데이터가 없습니다.');
  if(!CRAFTS_CFG || !Object.keys(CRAFTS_CFG).length) issues.push('공예품 레시피 데이터가 없습니다.');
  if(!settings.stamina || Number(settings.stamina)<=0) issues.push('오늘 사용할 스태미나를 입력해야 합니다.');
  return issues;
}
function oceanEffectList(settings){
  const v=getOceanSkillValues(settings); const rod=ROD_CFG[Number(settings.rodLevel)||0] || ROD_CFG[0];
  return [
    {name:'세이지 낚싯대', value:`+${settings.rodLevel} · 기본 ${rod.seafoodDrop||0}개 / 조개 ${rod.clamPct||0}%`, page:'하루 수익'},
    {name:'심해 채집꾼', value:`+${v.deepHarvest}%`, page:'하루 수익 · 연금 최적화'},
    {name:'별별별!', value:`3성 보정 +${v.starBonus}%`, page:'하루 수익'},
    {name:'조개 무한리필', value:`조개 +${v.clamBonus}%`, page:'하루 수익 · 공예품'},
    {name:'조개 좀 사조개', value:`공예품 판매 +${v.craftBonus}%`, page:'공예품'},
    {name:'프리미엄 한정가', value:`연금품 판매 +${v.alchBonus}%`, page:'연금 최적화'},
    {name:'해양 제작 시간 감소', value:`-${v.furnaceReduce}%`, page:'재료 역산'},
    {name:'조개 탐색', value:`조개 +${v.clamSearch}%`, page:'하루 수익 · 공예품'},
    {name:'어패 행운', value:v.seafoodLuck?.pct ? `${v.seafoodLuck.pct}% / +${v.seafoodLuck.count}개` : '미적용', page:'하루 수익'},
    {name:'어부 룰렛', value:`${v.fisherRoulette}%`, page:'하루 수익'},
    {name:'정령 고래', value:`${v.spiritWhale}%`, page:'하루 수익'},
  ];
}
function craftRowsV20(form, settings, prices){
  const pearlMap={yellow:'노란빛 진주',blue:'푸른빛 진주',cyan:'청록빛 진주',pink:'분홍빛 진주',purple:'보라빛 진주',black:'흑진주'};
  const craftKeyMap={BROOCH:'shell_brooch', PERFUME:'blue_perfume_bottle', MIRROR:'mother_of_pearl_mirror', HAIRPIN:'pink_hairpin', FAN:'mother_of_pearl_fan', WATCH:'black_pearl_watch'};
  const bonus=(getOceanSkillValues(settings).craftBonus||0)/100;
  const owned = {...form};
  const materialName = (key)=>({shell:'깨진 조개껍데기', metal_scrap:'금속 재활용품', spider_web:'거미줄', resin_scrap:'수지 재활용품', plastic_scrap:'플라스틱 재활용품', bucket:'양동이', alloy_scrap:'합금 재활용품', glass:'유리', fiber_scrap:'섬유 재활용품', bamboo:'대나무', pink_petal:'분홍색 꽃잎', stick:'막대기', amethyst:'자수정 조각', obsidian:'흑요석', clock:'시계', ...pearlMap}[key] || getVanillaName(key) || key);
  const available = (key)=> key==='shell' ? Number(owned.shell||0) : pearlMap[key] ? Number(owned[key]||0) : 0;
  return Object.entries(CRAFTS_CFG).map(([code,c])=>{
    const key=craftKeyMap[code];
    const dbItem=(prices||[]).find(p=>p.item_key===key) || {};
    const currentPrice=Number(dbItem.price || 0);
    const basePrice=currentPrice || c.priceMax || 0;
    const expertPrice=Math.round(basePrice*(1+bonus));
    const required=Object.entries(c.materials||{}).map(([mk,qty])=>({key:mk,name:materialName(mk),qty,have:available(mk),tracked:mk==='shell'||!!pearlMap[mk]}));
    const tracked=required.filter(r=>r.tracked && r.qty>0);
    const can=tracked.length ? Math.max(0, Math.min(...tracked.map(r=>Math.floor((r.have||0)/r.qty)))) : 0;
    const lack=required.filter(r=>r.tracked && (r.have||0)<r.qty).map(r=>({name:r.name,lack:r.qty-(r.have||0)}));
    const untracked=required.filter(r=>!r.tracked);
    return {key, code, name:c.name, qty:can, currentPrice, basePrice, expertPrice, before:basePrice*can, total:can*expertPrice, lack, max:c.priceMax||0, materials:required, untracked, percent:c.priceMax?Math.round((currentPrice/c.priceMax)*100):0};
  }).sort((a,b)=>b.total-a.total || b.percent-a.percent);
}
function getOceanCraftPriceMap(prices){ return Object.fromEntries((prices||[]).filter(p=>p.category==='craft').map(p=>[p.item_key, Number(p.price || p.price_max || 0)])); }
function priceForCraftKey(key, prices){ const map=getOceanCraftPriceMap(prices); return Number(map[key] || 0); }
function ActionSummary({settings,prices,inventory}){
  const daily=oceanStaminaResult(settings); const plan=planAlchemyV20(inventory || makeInventoryFromTiers(daily.tiers), settings); const top=plan.entries[0]; const issues=getOceanConfigIssues(settings);
  const actions=[]; if(top) actions.push({title:`${top.need.name} 제작`, desc:`예상 순수익 ${oceanMoney(top.totalProfit)} · ${top.qty.toLocaleString()}개`, tone:'good'});
  actions.push({title:'진행 횟수 진행', desc:`스태미나 ${Number(settings.stamina||0).toLocaleString()} 기준 ${daily.count.toLocaleString()}회 · 어패류 ${formatOceanQty(daily.total)}`, tone:'info'});
  actions.push({title:'공예품은 90% 이상 시세만 확인', desc:`조개 예상 획득량 ${oceanNum(daily.clamDrop,1)}개 · 시세 페이지 기준 판단`, tone:'warn'});
  return {daily, plan, top, actions:actions.slice(0,3), issues};
}

function OceanRouter({current,prices,user,oceanSettings,setOceanSettings}){
  const routeKey=current || 'ocean';
  const shared={settings:oceanSettings,setSettings:setOceanSettings,prices,user};
  if(routeKey==='ocean-stamina') return <OceanWorkstation active="ocean-stamina" {...shared}><OceanStaminaCalculatorV3 {...shared}/></OceanWorkstation>;
  if(routeKey==='ocean-alchemy') return <OceanWorkstation active="ocean-alchemy" {...shared}><OceanAlchemyCalculatorV3 {...shared}/></OceanWorkstation>;
  if(routeKey==='ocean-materials') return <OceanWorkstation active="ocean-materials" {...shared}><OceanMaterialCalculatorV3 {...shared}/></OceanWorkstation>;
  if(routeKey==='ocean-craft') return <OceanWorkstation active="ocean-craft" {...shared}><OceanCraftCalculatorV3 {...shared}/></OceanWorkstation>;
  if(routeKey==='ocean-recipes') return <OceanWorkstation active="ocean-recipes" {...shared}><OceanRecipeBook {...shared}/></OceanWorkstation>;
  return <OceanWorkstation active="ocean" {...shared}><OceanHubV3 settings={oceanSettings} prices={prices}/></OceanWorkstation>;
}

function OceanWorkstation({active,settings,setSettings,children}){
  const activeMeta=OCEAN_TABS.find(t=>t[0]===active) || OCEAN_TABS[0];
  return <section className="ocean-workstation ocean-ux-v21">
    <div className="page-title ocean-title compact-title"><div><p className="mono">OCEAN EXPERT</p><h1>해양 전문가</h1><p>{activeMeta[1]} · 개인 설정을 기준으로 어획, 연금, 공예 계산을 빠르게 확인합니다.</p></div></div>
    <div className="ocean-tabbar-v3 ocean-tabs-compact">{OCEAN_TABS.map(([key,label,sub])=><button key={key} className={active===key?'active':''} onClick={()=>go(key==='ocean'?'#/ocean':`#/${key}`)}><b>{label}</b><span>{sub}</span></button>)}</div>
    <div className="ocean-console v21"><OceanSpecSidebar settings={settings} setSettings={setSettings}/><div className="ocean-console-main"><div className="ocean-section-head compact"><span>{activeMeta[2]}</span><h2>{activeMeta[1]}</h2></div>{children}</div></div>
  </section>;
}

function OceanSpecSidebar({settings,setSettings}){
  const result=oceanStaminaResult(settings);
  const [open,setOpen]=useState(false);
  const set=(k,v)=>setSettings(s=>({...s,[k]:Number(v)||0}));
  const applyPreset=(preset)=>setSettings(s=>({...s,...preset}));
  const v=getOceanSkillValues(settings);
  const active=oceanEffectList(settings).filter(x=>!/(미적용|\+0%|0%$|Lv\. 0)/.test(String(x.value))).slice(0,5);
  return <aside className={`ocean-spec-sidebar v21 ${open?'open':''}`}>
    <button className="ocean-mobile-toggle" onClick={()=>setOpen(o=>!o)}>{open?'계산 기준 닫기':'계산 기준 열기'}</button>
    <div className="ocean-spec-body">
      <div className="spec-save"><span className="pulse-dot"></span>{isSupabaseConfigured ? '자동 저장됨' : '로컬 저장'}</div>
      <div className="spec-card main compact-spec">
        <div className="spec-card-head"><div><p className="mono">CALC BASIS</p><h3>계산 기준</h3></div><span>실시간 반영</span></div>
        <div className="spec-mini-grid compact">
          <div><span>스태미나</span><b>{Number(settings.stamina||0).toLocaleString()}</b></div>
          <div><span>어획</span><b>{result.count.toLocaleString()}회</b></div>
          <div><span>낚싯대</span><b>+{settings.rodLevel}</b></div>
          <div><span>회당</span><b>{oceanNum(result.perCatch)}개</b></div>
        </div>
        <div className="active-effect-list compact">{active.length ? active.map(x=><span key={x.name}>{x.name} {x.value}</span>) : <span>전문가 효과 기본값</span>}</div>
      </div>
      <div className="ocean-preset-row">
        <button onClick={()=>applyPreset({stamina:3000})}>3,000</button>
        <button onClick={()=>applyPreset({stamina:4500})}>4,500</button>
        <button onClick={()=>applyPreset({stamina:6000})}>6,000</button>
      </div>
      <div className="spec-card compact-inputs">
        <div className="spec-form-title"><h4>자주 쓰는 설정</h4><span>핵심값만 먼저</span></div>
        <NumField label="오늘 사용할 스태미나" value={settings.stamina} onChange={v=>set('stamina',v)}/>
        <SelectField label="세이지 낚싯대 강화" value={settings.rodLevel} max={15} suffix="강" onChange={v=>set('rodLevel',v)}/>
        <SelectField label="제작 시간 감소" value={settings.skillFurnace} max={5} onChange={v=>set('skillFurnace',v)}/>
        <SelectField label="프리미엄 한정가" value={settings.skillAlchBonus} max={8} onChange={v=>set('skillAlchBonus',v)}/>
        <SelectField label="조개 좀 사조개" value={settings.skillCraftBonus} max={8} onChange={v=>set('skillCraftBonus',v)}/>
      </div>
      <details className="spec-card spec-details"><summary>전문가 · 각인석 상세 설정</summary>
        <div className="spec-subtitle">전문가</div>
        <SelectField label="심해 채집꾼 · 어패류 추가" value={settings.skillDeepHarvest} max={5} onChange={v=>set('skillDeepHarvest',v)}/>
        <SelectField label="별별별! · 3성 확률" value={settings.skillStarBonus} max={6} onChange={v=>set('skillStarBonus',v)}/>
        <SelectField label="조개 무한리필 · 조개 확률" value={settings.skillClamBonus} max={10} onChange={v=>set('skillClamBonus',v)}/>
        <div className="spec-subtitle">각인석</div>
        <SelectField label="조개 탐색" value={settings.engClamSearch} max={3} onChange={v=>set('engClamSearch',v)}/>
        <SelectField label="어패 행운" value={settings.engSeafoodLuck} max={4} onChange={v=>set('engSeafoodLuck',v)}/>
        <SelectField label="어부 룰렛" value={settings.engFisherRoulette} max={5} onChange={v=>set('engFisherRoulette',v)}/>
        <SelectField label="정령 고래" value={settings.engSpiritWhale} max={5} onChange={v=>set('engSpiritWhale',v)}/>
      </details>
      <p className="mini-muted">설정은 하루 수익, 연금 최적화, 재료 역산, 공예품 계산에 함께 적용됩니다.</p>
    </div>
  </aside>;
}

function OceanHubV3({settings,prices}){
  const summary=ActionSummary({settings,prices});
  const daily=summary.daily;
  const issues=summary.issues||[];
  const top=summary.top;
  const topRoute=top ? '#/ocean-alchemy' : '#/ocean-recipes';
  const metrics=[
    ['예상 어패류', formatOceanQty(daily.total), '오늘 스태미나 기준'],
    ['어획 횟수', `${daily.count.toLocaleString()}회`, `스태미나 ${Number(settings.stamina||0).toLocaleString()}`],
    ['조개 기대값', `${oceanNum(daily.clamDrop,1)}개`, '조개 스킬·각인 반영'],
    ['추천 순수익', top ? oceanMoney(top.totalProfit) : '계산 대기', top ? top.need.name : '연금 데이터 확인 필요'],
  ];
  const shortcuts=[
    ['#/ocean-stamina','스태미나 계산','스태미나로 예상 획득량 확인'],
    ['#/ocean-alchemy','연금품 계산기','보유 어패류로 추천 제작 확인'],
    ['#/ocean-materials','재료 역산','목표 연금품 필요 재료 확인'],
    ['#/ocean-craft','공예품 계산기','조개와 진주 기준 제작 가능 확인'],
    ['#/ocean-recipes','조합법 도감','연금·공예 레시피 검색'],
  ];
  return <div className="ocean-hub-simple">
    <article className="ocean-card compact-card hub-summary-card">
      <div className="hub-summary-main">
        <p className="mono">OCEAN DASHBOARD</p>
        <h2>오늘 해양 작업 요약</h2>
        <p className="muted">세이지 낚싯대 +{settings.rodLevel} · {oceanModeLabel(settings.alchemyMode)} · 모든 계산은 왼쪽 계산 기준을 즉시 반영합니다.</p>
      </div>
      <div className="hub-status-stack">
        {issues.length ? <div className="hub-alert">{issues[0]}{issues.length>1?` 외 ${issues.length-1}건`:''}</div> : <div className="hub-ok">필수 데이터 확인됨</div>}
        <button className="hub-primary-action" onClick={()=>go(topRoute)}>{top ? '추천 연금 확인' : '조합법 확인'}</button>
      </div>
    </article>
    <div className="ocean-metric-grid">{metrics.map(([title,value,desc])=><div key={title} className="ocean-metric-card"><span>{title}</span><b>{value}</b><small>{desc}</small></div>)}</div>
    <article className="ocean-card compact-card ocean-flow-card">
      <div><span>1</span><b>전문가 세팅</b><small>스킬, 각인, 낚싯대를 먼저 맞춥니다.</small></div>
      <div><span>2</span><b>스태미나 계산</b><small>어패류와 조개 기대값을 봅니다.</small></div>
      <div><span>3</span><b>연금·공예 판단</b><small>현재 시세 기준 추천만 고릅니다.</small></div>
    </article>
    <article className="ocean-card compact-card ocean-action-card">
      <div className="board-head compact"><div><h2>추천 작업</h2><p>현재 설정과 시세 기준으로 먼저 확인할 항목입니다.</p></div></div>
      <div className="ocean-action-list">{summary.actions.map(action=><button key={action.title} className={`ocean-action-row ${action.tone || ''}`} onClick={()=>go(action.tone==='good'?'#/ocean-alchemy':action.tone==='warn'?'#/ocean-craft':'#/ocean-stamina')}><b>{action.title}</b><span>{action.desc}</span></button>)}</div>
    </article>
    <div className="hub-shortcuts">{shortcuts.map(([href,title,desc])=><button key={href} onClick={()=>go(href)} className="hub-shortcut"><b>{title}</b><span>{desc}</span></button>)}</div>
  </div>;
}

function OceanStaminaCalculatorV3({settings}){
  const r=oceanStaminaResult(settings);
  const conservative=r.total*0.85, optimistic=r.total*1.15;
  const v=getOceanSkillValues(settings);
  const breakdown=[['낚싯대 기본 드롭',`${r.rod.seafoodDrop||0}개/회`],['심해 채집꾼',`+${v.deepHarvest}%`],['어패 행운',v.seafoodLuck?.pct?`${v.seafoodLuck.pct}% 확률 +${v.seafoodLuck.count}개`:'미적용'],['어부 룰렛',`${v.fisherRoulette}%`],['조개 관련',`${r.rod.clamPct||0}% + 스킬/각인 ${v.clamBonus+v.clamSearch}%`]];
  return <div className="ocean-calc-layout v21">
    <article className="ocean-card compact-card"><h2>하루 수익 요약</h2><div className="result-grid compact"><Metric title="진행 횟수" value={`${r.count.toLocaleString()}회`} accent/><Metric title="회당 기대" value={`${oceanNum(r.perCatch)}개`}/><Metric title="스태미나당" value={`${oceanNum(r.total/(Number(settings.stamina)||1),3)}개`}/></div><details className="detail-box"><summary>상세 보기</summary><div className="ocean-breakdown compact">{breakdown.map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div></details></article>
    <article className="ocean-card compact-card"><h2>예상 획득량</h2><div className="result-grid compact"><Metric title="보수" value={formatOceanQty(conservative)}/><Metric title="보통" value={formatOceanQty(r.total)} accent/><Metric title="낙관" value={formatOceanQty(optimistic)}/></div><div className="ocean-breakdown compact"><h3>성급 분포</h3><div><span>1성</span><b>{formatOceanQty(r.tiers[1])}</b></div><div><span>2성</span><b>{formatOceanQty(r.tiers[2])}</b></div><div><span>3성</span><b>{formatOceanQty(r.tiers[3])}</b></div><div><span>알쏭달쏭 조개</span><b>{oceanNum(r.clamDrop,1)}개</b></div><div><span>정령 고래</span><b>{oceanNum(r.whale,2)}회</b></div></div></article>
  </div>;
}

function oceanModeLabel(mode){ return mode==='only_dilute' ? '희석액만' : mode==='exclude_dilute' ? '희석액 제외' : '희석액 포함'; }
function loadOceanInventoryTable(){
  try{
    const raw=JSON.parse(localStorage.getItem('dding_ocean_inventory_v2') || 'null');
    if(raw) return raw;
    const old=JSON.parse(localStorage.getItem('dding_ocean_inventory') || '{}');
    return oceanTableFromFlat(old);
  }catch{return oceanTableFromFlat({});}
}
function oceanTableFromFlat(flat){ const o={}; SEAFOOD_ORDER.forEach(type=>TIER_ORDER.forEach(t=>{ const key=sfKey(type,t); const val=Number(flat?.[key])||0; o[key]={pieces:val%SET_SIZE, sets:Math.floor(val/SET_SIZE)}; })); return o; }
function oceanTableToFlat(table){ const flat={}; SEAFOOD_ORDER.forEach(type=>TIER_ORDER.forEach(t=>{ const key=sfKey(type,t); const r=table?.[key]||{}; flat[key]=Math.max(0,(Number(r.pieces)||0)+(Number(r.sets)||0)*SET_SIZE); })); return flat; }
function persistOceanInventoryTable(table){ try { localStorage.setItem('dding_ocean_inventory_v2', JSON.stringify(table)); localStorage.setItem('dding_ocean_inventory', JSON.stringify(oceanTableToFlat(table))); } catch {} }

function OceanAlchemyCalculatorV3({settings,setSettings}){
  const [form,setForm]=useState(()=>loadOceanInventoryTable());
  const [mode,setMode]=useState(settings.alchemyMode||'include');
  const [showDetail,setShowDetail]=useState(false);
  useEffect(()=>persistOceanInventoryTable(form),[form]);
  useEffect(()=>setSettings(s=>({...s,alchemyMode:mode})),[mode]);
  const setVanilla=(v)=>setSettings(s=>({...s,vanillaUnitPrice:Number(v)||0}));
  const flat=useMemo(()=>oceanTableToFlat(form),[form]);
  const plan=useMemo(()=>planAlchemyV20(flat,{...settings,alchemyMode:mode}),[flat,settings,mode]);
  const fillSample=()=>{ const r=oceanStaminaResult(settings); setForm(oceanTableFromFlat(Object.fromEntries(Object.entries(r.inv).map(([k,v])=>[k,Math.floor(v)])))); };
  const reset=()=>setForm(oceanTableFromFlat({}));
  const totalCraft=plan.entries.reduce((a,b)=>a+(b.qty||0),0);
  const used=computeUsedSeafood(flat, plan.remain);
  return <div className="alchemy-ux v21">
    <article className="ocean-card compact-card alchemy-input-card">
      <div className="board-head compact"><div><h2>보유 어패류</h2><p>낱개와 64개 세트를 나눠 입력하면 총 보유량이 자동 계산됩니다.</p></div><div className="ocean-actions"><button className="ghost-pill" onClick={fillSample}>오늘 평균치 채우기</button><button className="ghost-pill" onClick={reset}>전체 초기화</button></div></div>
      <div className="mode-tabs compact"><button className={mode==='include'?'active':''} onClick={()=>setMode('include')}>희석액 포함</button><button className={mode==='exclude_dilute'?'active':''} onClick={()=>setMode('exclude_dilute')}>희석액 제외</button><button className={mode==='only_dilute'?'active':''} onClick={()=>setMode('only_dilute')}>희석액만</button></div>
      <SeafoodInputTable form={form} setForm={setForm} used={used} remain={plan.remain}/>
      <div className="single-option"><NumField label="바닐라 재료 단가 일괄 차감 · 실제 재료별 가격 데이터가 없으면 0으로 두세요" value={settings.vanillaUnitPrice||0} onChange={setVanilla}/></div>
    </article>
    <aside className="ocean-card compact-card alchemy-result-card clean-result">
      <h2>추천 제작 결과</h2>
      <div className="result-summary-list">
        <div><span>총 매출</span><b>{oceanMoney(plan.totalSell)}</b></div>
        <div><span>부재료 비용</span><b>{oceanMoney(plan.totalCost)}</b></div>
        <div className="profit"><span>예상 순수익</span><b>{oceanMoney(plan.totalProfit)}</b></div>
        <div><span>제작 가능</span><b>{totalCraft.toLocaleString()}개</b></div>
        <div><span>바닐라 재료</span><b>{plan.totalCost>0?'비용 반영':'비용 미입력 · 계산 제외'}</b></div>
        <div><span>부족 재료</span><b>{plan.shortage?.length?'있음':'없음'}</b></div>
      </div>
      <h3 className="subheading">추천 제작 리스트</h3>
      <div className="alchemy-list dense">{plan.entries.length ? plan.entries.slice(0,6).map((e,i)=><AlchemyResultRow key={e.key} entry={e} rank={i+1}/>) : <p className="muted">입력된 어패류로 제작 가능한 연금품이 없습니다.</p>}</div>
      <div className="split-result"><RemainSeafood remain={plan.remain}/>{plan.shortage?.length ? <NeedSection title="부족한 대표 어패류" data={Object.fromEntries(plan.shortage.map(x=>[x.key, x.need-x.have]))} labeler={seafoodLabel}/> : null}</div>
      <details className="detail-box" open={showDetail} onToggle={e=>setShowDetail(e.currentTarget.open)}><summary>상세 보기</summary><div className="why-box"><b>왜 이 조합인가요?</b><p>{plan.entries[0] ? explainOptimizerChoice(plan.entries[0]) : '제작 가능한 후보가 없어 최적 조합을 만들 수 없습니다.'}</p><p>기본 기준은 순수익 최대화이며, 같은 순수익이면 남는 어패류가 적은 조합을 우선합니다.</p></div><NeedSection title="계산에 포함된 바닐라 재료" data={aggregateVanillaNeed(plan.entries)} labeler={getVanillaName}/><DataMissingBox/></details>
    </aside>
  </div>;
}
function AlchemyResultRow({entry,rank}){ const vanilla=entry.need?.vanilla||{}; const vRows=Object.entries(vanilla).slice(0,3); return <div className="alchemy-row dense"><span className="rank-dot">{rank}</span><div><b>{entry.need.name}</b><small>제작 {entry.qty.toLocaleString()}개 · 매출 {oceanMoney(entry.totalSell)} · 부재료 {oceanMoney(entry.totalCost)}</small><small>필요 어패류: {Object.entries(entry.need.seafood||{}).slice(0,4).map(([k,v])=>`${seafoodLabel(k)} ${formatOceanQty(v*entry.qty)}`).join(' / ') || '없음'}</small>{vRows.length ? <em>바닐라: {vRows.map(([k,v])=>`${getVanillaName(k)} ${oceanNum(v*entry.qty)}`).join(', ')}{Object.keys(vanilla).length>3?' 외':''}</em> : <em>바닐라 재료 데이터 없음 또는 필요 없음</em>}</div><strong>{oceanMoney(entry.totalProfit)}</strong></div>; }
function SeafoodInputTable({form,setForm,used,remain}){
  const setCell=(key,field,value)=>setForm(f=>({...f,[key]:{...(f[key]||{}),[field]:Math.max(0,Number(value)||0)}}));
  return <div className="seafood-table-wrap compact-v24"><table className="seafood-table compact-v24"><thead><tr><th>어패류</th><th>등급</th><th>보유 수량</th><th>사용</th><th>남음</th></tr></thead><tbody>{SEAFOOD_ORDER.flatMap(type=>TIER_ORDER.map(t=>{ const key=sfKey(type,t); const row=form[key]||{}; const pieces=Number(row.pieces)||0; const sets=Number(row.sets)||0; const total=pieces+sets*SET_SIZE; return <tr key={key}><td className="seafood-name-cell"><span className="empty-icon tiny"></span><span>{SEAFOOD_KO[type]}</span></td><td>{t}성</td><td className="qty-group-cell"><div className="qty-group"><label><span>낱개</span><input type="number" inputMode="numeric" min="0" value={row.pieces||''} onChange={e=>setCell(key,'pieces',e.target.value)} placeholder="0"/></label><label><span>64세트</span><input type="number" inputMode="numeric" min="0" value={row.sets||''} onChange={e=>setCell(key,'sets',e.target.value)} placeholder="0"/></label><strong>총 {formatOceanQty(total)}</strong></div></td><td className="number-cell">{formatOceanQty(used?.[key]||0)}</td><td className="number-cell">{formatOceanQty(remain?.[key]||0)}</td></tr>; }))}</tbody></table></div>;
}
function computeUsedSeafood(inv,remain){ const used={}; SEAFOOD_ORDER.forEach(type=>TIER_ORDER.forEach(t=>{ const key=sfKey(type,t); used[key]=Math.max(0,(Number(inv[key])||0)-(Number(remain?.[key])||0)); })); return used; }
function aggregateVanillaNeed(entries){ const out={}; (entries||[]).forEach(e=>Object.entries(e.need?.vanilla||{}).forEach(([k,v])=>{ out[k]=(out[k]||0)+v*(e.qty||0); })); return out; }
function DataMissingBox(){ return <div className="data-missing"><b>미확정 처리</b><p>재료별 개별 시세, 일부 획득처, 일부 아이콘은 데이터가 없으면 계산에 임의로 넣지 않습니다. 필요한 항목은 “데이터 필요”로 표시합니다.</p></div>; }
function RemainSeafood({remain}){ const total=Object.values(remain||{}).reduce((a,b)=>a+(Number(b)||0),0); return <div className="ocean-breakdown compact"><h3>남는 어패류</h3>{total>0 ? Object.entries(remain).filter(([,v])=>v>0.01).slice(0,8).map(([k,v])=><div key={k}><span>{seafoodLabel(k)}</span><b>{formatOceanQty(v)}</b></div>) : <p className="muted">남는 어패류가 없습니다.</p>}</div>; }

function OceanMaterialCalculatorV3({settings}){
  const [target,setTarget]=useState(Object.keys(PRECISION_ALCHEMY_CFG)[0]);
  const [qty,setQty]=useState(1);
  const [have,setHave]=useState({});
  const need=useMemo(()=>calcFinalNeed(target,Math.max(0,Number(qty)||0)),[target,qty]);
  const reduce=(getOceanSkillValues(settings).furnaceReduce||0)/100;
  const lackMap=(data)=>Object.fromEntries(Object.entries(data||{}).map(([k,v])=>[k,Math.max(0,Number(v||0)-Number(have[k]||0))]).filter(([,v])=>v>0));
  const copy=()=>navigator.clipboard?.writeText(Object.entries({...need.seafood,...need.vanilla}).map(([k,v])=>`${isSeafoodKey(k)?seafoodLabel(k):getVanillaName(k)} ${oceanNum(v)}`).join('\n'));
  return <div className="ocean-calc-layout v21"><article className="ocean-card compact-card"><h2>목표 설정</h2><div className="form-grid two"><label className="calc-field"><span>목표 연금품</span><select value={target} onChange={e=>setTarget(e.target.value)}>{Object.entries(PRECISION_ALCHEMY_CFG).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></label><NumField label="목표 수량" value={qty} onChange={setQty}/></div><div className="ocean-comment compact"><b>제작 시간 감소 적용</b><p>Lv.{settings.skillFurnace} · -{getOceanSkillValues(settings).furnaceReduce}%</p></div><button className="ghost-pill" onClick={copy}>결과 복사</button></article><article className="ocean-card compact-card"><h2>{need.name} {Number(qty||0).toLocaleString()}개 필요 재료</h2><div className="result-grid compact"><Metric title="기본 제작 시간" value={formatOceanTime(need.time)}/><Metric title="전문가 적용" value={formatOceanTime(need.time*(1-reduce))} accent/><Metric title="중간 재료" value={`${Object.keys(need.intermediate).length}종`}/></div><NeedSection title="부족 어패류" data={lackMap(need.seafood)} labeler={seafoodLabel}/><NeedSection title="필요 바닐라 재료" data={need.vanilla} labeler={getVanillaName}/><NeedSection title="중간 제작 단계" data={need.intermediate} labeler={(k)=>ALCHEMY_CFG[k]?.name || k}/><details className="detail-box"><summary>상세 보기</summary><DataMissingBox/></details></article></div>;
}
function NeedSection({title,data,labeler}){ const rows=Object.entries(data||{}).filter(([,v])=>v>0.0001); return <div className="ocean-breakdown compact"><h3>{title}</h3>{rows.length ? rows.map(([k,v])=><div key={k}><span>{labeler(k)}</span><b>{isSeafoodKey(k)?formatOceanQty(v):oceanNum(v)}</b></div>) : <p className="muted">필요 없음</p>}</div>; }

function OceanCraftCalculatorV3({settings,prices}){
  const [form,setForm]=useState({shell:0,yellow:0,blue:0,cyan:0,pink:0,purple:0,black:0});
  const pearlMap={yellow:'노란빛 진주',blue:'푸른빛 진주',cyan:'청록빛 진주',pink:'분홍빛 진주',purple:'보라빛 진주',black:'흑진주'};
  const set=(k,v)=>setForm(f=>({...f,[k]:Number(v)||0}));
  const rows=craftRowsV20(form,settings,prices);
  const best=rows.find(r=>r.qty>0);
  return <div className="ocean-calc-layout v21"><article className="ocean-card compact-card"><h2>보유 재료</h2><p className="muted">조개 좀 사조개 Lv.{settings.skillCraftBonus}이 적용 전/후 비교에 자동 반영됩니다.</p><div className="form-grid two"><NumField label="깨진 조개껍데기" value={form.shell} onChange={v=>set('shell',v)}/>{Object.entries(pearlMap).map(([k,n])=><NumField key={k} label={n} value={form[k]} onChange={v=>set(k,v)}/>)}</div></article><article className="ocean-card compact-card"><h2>제작 가능 공예품</h2>{best && <div className="why-box"><b>추천 제작</b><p>{best.name}이 현재 보유 재료와 입력 시세 기준 가장 높은 예상 가치를 가집니다.</p></div>}<div className="craft-card-list">{rows.map((r,i)=><CraftResultCard key={r.key} row={r} rank={i+1}/>)}</div></article></div>;
}
function CraftResultCard({row,rank}){
  return <div className="craft-result-card"><div className="craft-result-head"><span className="rank-dot">{rank}</span><div><b>{row.name}</b><small>현재가 {oceanMoney(row.currentPrice)} · 최고가 {oceanMoney(row.max)} · {row.percent}%</small></div><strong>{oceanMoney(row.total)}</strong></div><div className="craft-price-line"><span>기본 제작 판매가 {oceanMoney(row.basePrice)}</span><span>{row.expertPrice===row.basePrice?'전문가 적용 동일':`전문가 적용 ${oceanMoney(row.expertPrice)}`}</span><span>제작 가능 {row.qty.toLocaleString()}개</span></div><div className="craft-materials">{row.materials.map(m=><span key={m.key} className={!m.tracked?'untracked':''}><i className="material-icon-slot" aria-hidden="true"></i>{getMaterialDisplayName(m.key)} <b>x{oceanNum(m.qty)}</b></span>)}</div>{row.lack.length ? <em className="craft-lack">부족: {row.lack.map(x=>`${x.name} ${oceanNum(x.lack)}`).join(', ')}</em> : null}<details className="detail-box compact-detail"><summary>상세 보기</summary><div className="data-missing"><p>아이콘 없음, 가격 없음, 제작 시간 없음 같은 검수용 정보는 여기서만 확인합니다. 추적 불가 재료: {row.materials.filter(m=>!m.tracked).map(m=>getMaterialDisplayName(m.key)).join(', ') || '없음'}</p></div></details></div>;
}
function NumField({label,value,onChange}){ return <label className="calc-field"><span>{label}</span><input type="number" inputMode="numeric" min="0" value={value} onChange={e=>onChange(e.target.value)} /></label>; }
function SelectField({label,value,max,onChange,suffix='Lv.'}){ return <label className="calc-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{Array.from({length:max+1},(_,i)=><option key={i} value={i}>{suffix === '강' ? `+${i}` : `${suffix} ${i}`}</option>)}</select></label>; }
function Metric({title,value,accent}){ return <div className={`metric ${accent?'accent':''}`}><span>{title}</span><b>{value}</b></div>; }

function recipeRows(){
  const rows=[];
  Object.entries(PRECISION_ALCHEMY_CFG).forEach(([key,item])=>rows.push({key,type:'alchemy_final',kind:'조합법',category:'연금',name:item.name,output:1,time:item.craftTimeSec||0,materials:item.materials||{},source:'PRECISION_ALCHEMY'}));
  Object.entries(ALCHEMY_CFG).forEach(([key,item])=>rows.push({key,type:'alchemy_step',kind:'조합법',category:item.type==='essence'?'연금 재료':'연금 중간재료',name:item.name,output:item.output||1,time:item.craftTimeSec||0,materials:item.materials||{},source:'ALCHEMY'}));
  Object.entries(CRAFTS_CFG).forEach(([key,item])=>rows.push({key,type:'craft',kind:'제작법',category:'공예품',name:item.name,output:1,time:null,materials:item.materials||{},source:'CRAFTS'}));
  return rows;
}
function OceanRecipeBook(){
  const [q,setQ]=useState('');
  const [cat,setCat]=useState('전체');
  const [kind,setKind]=useState('전체');
  const rows=useMemo(()=>recipeRows(),[]);
  const cats=['전체','제작법','조합법',...Array.from(new Set(rows.map(r=>r.category)))];
  const filtered=rows.filter(r=>{
    const query=q.trim();
    const catOk=cat==='전체'||cat===r.category||cat===r.kind;
    const kindOk=recipeKindMatches(r,kind);
    const qOk=!query || r.name.includes(query) || Object.keys(r.materials||{}).some(k=>(getMaterialName(k)||'').includes(query));
    return catOk && kindOk && qOk;
  });
  const hasCombination=rows.some(r=>r.kind==='조합법');
  return <div className="recipe-book">
    <article className="ocean-card compact-card recipe-toolbar">
      <div><h2>제작 및 조합법</h2><p className="muted">제공된 해양 데이터 기준으로 제작법과 조합법을 구분해 조회합니다.</p></div>
      <div className="recipe-controls recipe-controls-v25"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="제작물 또는 재료 검색"/><select value={cat} onChange={e=>setCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select><select value={kind} onChange={e=>setKind(e.target.value)}>{['전체','제작법','조합법'].map(c=><option key={c}>{c}</option>)}</select></div>
      <div className="recipe-status-row"><span>제작법 {rows.filter(r=>r.kind==='제작법').length}개</span><span>조합법 {rows.filter(r=>r.kind==='조합법').length}개</span>{!hasCombination && <span className="warn">조합법 데이터 필요</span>}</div>
    </article>
    <div className="recipe-list">
      {filtered.map(r=><RecipeCard key={r.key} row={r}/>) }
      {!filtered.length && <article className="placeholder-card"><h2>검색 결과가 없습니다.</h2><p>다른 제작물명이나 재료명으로 검색해 주세요.</p></article>}
    </div>
  </div>;
}
function getMaterialName(key){ return getMaterialDisplayName(key); }
function RecipeCard({row}){
  const mats=Object.entries(row.materials||{});
  const missingNames=mats.filter(([k])=>!hasKnownMaterialName(k));
  return <article className="recipe-card">
    <div className="recipe-icon-slot" aria-hidden="true"></div>
    <div className="recipe-main"><div className="recipe-title-line"><b>{row.name}</b><span>{row.kind || getRecipeKind(row)}</span></div>
      <div className="recipe-meta"><span>{row.category}</span><span>결과 {row.output || 1}개</span><span>{row.time == null ? '제작 시간 미확정' : `제작 시간 ${formatOceanTime(row.time)}`}</span></div>
      <div className="recipe-mats">{mats.length ? mats.map(([k,v])=><span key={k}><i className="material-icon-slot" aria-hidden="true"></i>{getMaterialName(k)} <b>x{oceanNum(v)}</b></span>) : <span>재료 데이터 필요</span>}</div>
      <details className="detail-box"><summary>상세 보기</summary><div className="data-missing"><b>데이터 상태</b><p>출처: {row.source}. 아이콘, 획득처, 일부 시세는 미연결 상태일 수 있습니다.</p>{missingNames.length ? <p>한글명 데이터 필요: {missingNames.map(([k])=>k).join(', ')}</p> : null}</div></details>
    </div>
  </article>;
}

function Profile({user,profile,setProfile}){
  const [form,setForm]=useState(()=>({korean_nickname:profile?.korean_nickname||'',minecraft_id:profile?.minecraft_id||''}));
  const [status,setStatus]=useState('');
  const saveRef=useRef(null);
  useEffect(()=>{ setForm({korean_nickname:profile?.korean_nickname||'', minecraft_id:profile?.minecraft_id||''}); },[profile?.id]);
  useEffect(()=>{
    saveRef.current = debounce(async(next)=>{
      if(!user) return;
      const avatarUrl = next.minecraft_id ? mcHead(next.minecraft_id) : null;
      setStatus('자동 저장 중...');
      const payload = {korean_nickname:next.korean_nickname||null, minecraft_id:next.minecraft_id||null, minecraft_uuid:null, minecraft_avatar_url:avatarUrl, updated_at:new Date().toISOString()};
      const {error}=await supabase.from('profiles').update(payload).eq('id',user.id);
      if(error){ setStatus('저장 실패 · '+error.message); return; }
      setProfile(p=>({...p,...payload}));
      setStatus('자동 저장됨');
    },1400);
  },[user,setProfile]);
  function change(k,v){ const next={...form,[k]:v}; setForm(next); saveRef.current?.(next); }
  const face = form.minecraft_id ? mcHead(form.minecraft_id) : avatar(user,profile);
  return <section className="profile-page">
    <div className="desk-head"><p className="mono">프로필 설정</p><div className="status-pill">{status || '자동 저장됨'}</div></div>
    <div className="profile-grid">
      <article className="profile-preview market-card">
        <div className="profile-mini"><img src={face} onError={e=>e.currentTarget.src=fallbackAvatar}/><div><h2>{form.korean_nickname || form.minecraft_id || displayName(user,profile)}</h2><p>{displaySub(user, {...profile, minecraft_id:form.minecraft_id})}</p></div></div>
        <div className="skin-stage"><img src={face} onError={e=>e.currentTarget.src=fallbackAvatar}/><b>{form.korean_nickname || form.minecraft_id || '닉네임 미설정'}</b></div>
        <div className="joined"><span>가입일</span><b>{new Date(profile?.created_at || Date.now()).toLocaleDateString('ko-KR')}</b></div>
      </article>
      <article className="profile-form panel-card">
        <h2>프로필을 입력해 주세요.</h2>
        <label>띵타이쿤 한글 닉네임<input value={form.korean_nickname} onChange={e=>change('korean_nickname',e.target.value)} placeholder=""/></label>
        <label>마인크래프트 아이디<input value={form.minecraft_id} onChange={e=>{
          // [SECURITY FIX] minecraft_id: 영문·숫자·언더스코어만, 최대 16자 (Mojang 규격)
          const raw = e.target.value.trim();
          const safe = raw.replace(/[^a-zA-Z0-9_]/g,'').slice(0,16);
          change('minecraft_id', safe);
        }} placeholder="" maxLength={16}/></label>
        <p className="muted">한글 닉네임이 있으면 가장 먼저 표시됩니다. 마인크래프트 아이디는 프로필 이미지를 불러오는 데 사용됩니다.</p>
      </article>
    </div>
  </section>;
}

createRoot(document.getElementById('root')).render(<App/>);
