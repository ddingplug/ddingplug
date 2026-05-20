# DDING PLUG Minecraft Mod API 베타

이 API는 마인크래프트 모드가 DDING PLUG 시세 정보를 조회하고, 인게임 툴팁에서 감지한 시세를 제보하기 위한 베타 구조입니다.

## 개인정보 및 비공식 서비스 고지

DDING PLUG의 웹사이트, API, 마인크래프트 모드는 띵타이쿤 온라인과 무관하게 독립적으로 운영되는 비공식 팬 도구입니다.

모드가 인게임 툴팁에서 시세를 감지하고 DDING PLUG API로 제보하는 기능은 유저에게 수집 항목과 이용 목적을 충분히 고지한 뒤, 유저가 동의한 경우에만 사용해야 합니다.

제보 API는 다음 정보를 처리할 수 있습니다.

- Minecraft ID
- 아이템명
- 기본 판매가
- 선택적으로 감지된 개인 보정 판매가
- 제보 시각, 제보 출처, 처리 결과

공용 시세에는 기본 판매가만 반영하며, 개인 보정 판매가는 공용 시세로 저장하지 않습니다. 모드는 자동 판매, 자동 클릭, 자동 구매, 서버 패킷 조작, 플레이 자동화 기능을 포함해서는 안 됩니다.


## 환경변수

Vercel Project Settings → Environment Variables에 아래 값을 추가하세요.

```txt
SUPABASE_URL=Supabase Project URL
SUPABASE_ANON_KEY=Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=Supabase service role key
DDINGPLUG_MOD_API_KEY=충분히 긴 랜덤 문자열
DDINGPLUG_ALLOWED_ORIGIN=https://배포도메인
DDINGPLUG_MOD_LATEST_VERSION=0.6.7
DDINGPLUG_MOD_DOWNLOAD_URL=https://ddingplug.vercel.app/download
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버리스 API에서만 사용해야 하며, 브라우저 코드에 노출하면 안 됩니다.
`DDINGPLUG_MOD_API_KEY`는 모드 배포본에 하드코딩하지 말고, 운영자가 관리하는 별도 설정값으로 주입하는 방식을 권장합니다.
모드 버전 정보는 기본적으로 `mod_version_config` 테이블에서 읽습니다. 위 `DDINGPLUG_MOD_*` 값은 DB 조회 실패 시 사용할 fallback입니다.

## 1. 시세 조회

```http
GET /api/market-prices?category=craft
GET /api/market-prices?category=cooking
GET /api/market-prices
```

응답 예시:

```json
{
  "ok": true,
  "category": "craft",
  "count": 1,
  "items": [
    {
      "itemKey": "shell_brooch",
      "itemName": "조개껍데기 브로치",
      "category": "craft",
      "price": 40624,
      "priceMax": 50000,
      "percent": 81,
      "updateCycle": "daily",
      "checkedAt": "2026-05-19T04:10:00Z",
      "updatedAt": "2026-05-19T04:10:00Z"
    }
  ]
}
```

## 1-1. 모드 최신 버전 조회

```http
GET /api/mod-version
```

인증이나 API key가 필요 없는 공개 조회 API입니다. 개발 중에는 최신 정보가 바로 반영되도록 `Cache-Control: no-store`를 사용합니다.
관리자 권한이 있는 계정은 웹사이트 다운로드 페이지에서 이 값을 수정할 수 있습니다.

응답 예시:

```json
{
  "ok": true,
  "modId": "ddingplug",
  "latestVersion": "0.6.7",
  "minecraftVersion": "1.21.4",
  "fabricLoader": "0.16.10+",
  "fabricApi": "0.119.2+1.21.4",
  "downloadUrl": "https://ddingplug.vercel.app/download",
  "releaseNote": "업데이트 확인 UI 추가",
  "required": false
}
```

## 2. 최근 수정자 조회

```http
GET /api/market-latest?category=craft
GET /api/market-latest?category=cooking
GET /api/market-latest
```

응답 예시:

```json
{
  "ok": true,
  "category": "craft",
  "latest": {
    "category": "craft",
    "categoryLabel": "공예품 시세",
    "updatedAt": "2026-05-19T04:10:00Z",
    "source": "minecraft_tooltip",
    "reporterMinecraftId": "creker8392",
    "displayName": "미아",
    "avatarUrl": "https://mc-heads.net/avatar/creker8392"
  }
}
```

## 3. 모드 시세 제보

```http
POST /api/market-report
x-ddingplug-api-key: DDINGPLUG_MOD_API_KEY
Content-Type: application/json
```

요청 예시:

```json
{
  "category": "craft",
  "source": "minecraft_tooltip",
  "minecraftId": "creker8392",
  "consentAccepted": true,
  "items": [
    {
      "itemKey": "shell_brooch",
      "itemName": "조개껍데기 브로치",
      "price": 40624,
      "personalPrice": 60936
    }
  ]
}
```

처리 원칙:

- `price`만 공용 시세에 반영합니다.
- `personalPrice`는 개인 보정가이므로 공용 시세에 저장하지 않습니다.
- `consentAccepted: true`가 없으면 제보 API는 요청을 거부합니다.
- 요청 본문은 64KB 이하만 허용합니다.
- `items`는 한 요청에 최대 30개까지 허용합니다.
- `minecraftId`는 영문, 숫자, 언더스코어 3~16자만 허용합니다.
- `price <= 0`이면 거부합니다.
- `price > priceMax`이면 거부합니다.
- 없는 `itemKey` 또는 `itemName`은 거부합니다.
- `minecraftId`가 `profiles.minecraft_id`와 일치하면 해당 유저를 최근 수정자로 연결합니다.
- 일치하지 않더라도 `reporter_minecraft_id`에는 기록합니다.

응답 예시:

```json
{
  "ok": true,
  "category": "craft",
  "reporter": {
    "minecraftId": "creker8392",
    "matchedProfile": true
  },
  "accepted": [
    {
      "itemKey": "shell_brooch",
      "itemName": "조개껍데기 브로치",
      "oldPrice": 50000,
      "newPrice": 40624,
      "changed": true
    }
  ],
  "rejected": []
}
```

## 마인크래프트 모드 권장 흐름

1. 유저가 인게임 공예품/요리 툴팁에 마우스를 올립니다.
2. 모드가 `판매가 : 40,624 골드` 줄을 읽습니다.
3. `나의 판매가`는 개인 보정가이므로 공용 시세로 전송하지 않습니다.
4. 유저에게 확인창을 보여줍니다.
5. 확인 시 `/api/market-report`로 제보합니다.

완전 자동 반영보다 **자동 감지 + 유저 확인 후 제보**를 권장합니다.

## v32 priceChange

`POST /api/market-report` supports optional `priceChange` per item.

- Positive number: price increased from the previous day.
- Negative number: price decreased from the previous day.
- Zero or null: no change / unknown.
- `personalPrice` is accepted as reference data only and is not used as the public market price.

Example:

```json
{
  "category": "craft",
  "source": "minecraft_tooltip",
  "minecraftId": "Creker8392",
  "consentAccepted": true,
  "items": [
    {
      "itemName": "자개 손거울",
      "itemKey": "mother_of_pearl_mirror",
      "price": 144554,
      "personalPrice": 218831,
      "priceChange": 122102
    }
  ]
}
```

`GET /api/market-prices` returns `priceChange` in camelCase.
