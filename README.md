# DDING PLUG

띵타이쿤 공예품·요리 시세표와 전문가 계산을 위한 비공식 팬 도구입니다. 띵타이쿤 및 관련 콘텐츠의 저작권은 원 개발사와 권리자에게 있으며, 본 프로젝트는 하이퍼루나틱과 무관하게 개인이 제작했습니다.

## 실행

```bash
npm install
cp .env.example .env
npm run dev
```

## 빌드

```bash
npm run build
npm run preview
```

## 필수 환경변수

클라이언트에서 사용하는 값:

```txt
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_CHANNEL_PLUGIN_KEY=YOUR_CHANNELTALK_PLUGIN_KEY
```

Vercel Serverless API / Minecraft Mod API에서 사용하는 값:

```txt
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
DDINGPLUG_MOD_API_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
DDINGPLUG_ALLOWED_ORIGIN=https://YOUR_DEPLOYED_DOMAIN
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버 환경변수에만 넣고, 클라이언트 코드에는 절대 노출하지 마세요.

## Supabase

`supabase/schema.sql`을 Supabase SQL Editor에서 실행해야 합니다.
모드 최신 버전 정보는 `mod_version_config` 테이블에 저장되며, owner/admin 계정은 다운로드 페이지에서 직접 수정할 수 있습니다.

Discord OAuth Redirect URL에는 배포 도메인과 로컬 개발 주소를 등록하세요.

## Minecraft Mod API

- `GET /api/market-prices?category=craft`
- `GET /api/market-prices?category=cooking`
- `GET /api/market-latest?category=craft`
- `GET /api/mod-version`
- `POST /api/market-report`

자세한 사용법은 `docs/mod-api.md`를 확인하세요.

모드 제보 API는 `consentAccepted: true`가 포함된 요청만 처리합니다. 자동 판매, 자동 클릭, 자동 구매, 서버 조작, 플레이 자동화 기능은 포함하지 않습니다.

## 현재 모드 배포 기준

- 최신 Fabric 모드: `0.1.0`
- 지원 Minecraft: `1.21.4`
- Fabric Loader: `0.16.10+`
- Fabric API: `0.119.2+1.21.4`

## 오픈 전 체크

- `npm run build` 성공 확인
- `.env` 값이 실제 배포 환경에 등록됐는지 확인
- `DDINGPLUG_ALLOWED_ORIGIN`이 실제 배포 도메인인지 확인
- Supabase schema 재실행 및 RLS/RPC 동작 확인
- Discord OAuth Redirect URL 확인
- 채널톡 플러그인 키 확인
- 다운로드 페이지에 실제 `ddingplug-fabric-0.1.0` 배포 파일 업로드
