# DDING PLUG style beta v11

수정 사항:
- 상단 메뉴에서 프로필 카테고리 제거
- 우측 상단 프로필 클릭 → 내 프로필 / 관리자 로그 / 로그아웃 드롭다운
- 프로필 설정 반응형 보강
- 공지사항 작성/삭제 안정화
- 시세 변경 시 로그 저장 안정화
- 공개 최근 변경에는 누가/언제 수정했는지만 표시
- 관리자 로그에서는 전체 변경 기록 확인

## 실행

```bash
npm install
cp .env.example .env
npm run dev
```

## Supabase

`supabase/schema.sql`을 SQL Editor에서 다시 실행하세요.

## Minecraft Mod API 베타

v30부터 마인크래프트 모드 연동을 위한 베타 API가 포함되어 있습니다.

- `GET /api/market-prices?category=craft`
- `GET /api/market-prices?category=cooking`
- `GET /api/market-latest?category=craft`
- `POST /api/market-report`

자세한 사용법은 `docs/mod-api.md`를 확인하세요.

### 추가 환경변수

```txt
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
DDINGPLUG_MOD_API_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
```

`SUPABASE_SERVICE_ROLE_KEY`는 Vercel 서버 환경변수에만 넣고, 클라이언트 코드에는 절대 노출하지 마세요.

## 모드/API 개인정보 및 비공식 서비스 고지

DDING PLUG 모드/API는 띵타이쿤 온라인과 무관하게 독립적으로 운영되는 비공식 팬 도구입니다. 인게임 툴팁에서 시세를 감지해 제보하는 기능을 배포할 경우, 유저에게 수집 항목과 이용 목적을 충분히 고지하고 동의를 받은 뒤 사용해야 합니다.

모드 제보 API는 `consentAccepted: true`가 포함된 요청만 처리합니다. 자동 판매, 자동 클릭, 자동 구매, 서버 조작, 플레이 자동화 기능은 포함하지 않습니다.
