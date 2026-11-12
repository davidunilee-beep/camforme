# camforme
캠 원격제어기

사진 라벨을 기준으로 Xiaomi/Mijia Mi 360° Home Security Camera (MJSXJ05CM)용 개인 제어 앱을 구성했습니다.

## 실행

`index.html`을 브라우저에서 열면 화면을 확인할 수 있습니다. 마이크 권한은 HTTPS 또는 localhost에서 실행할 때 브라우저가 허용합니다.

## 현재 포함된 화면

- 한국어 로그인 화면과 로그인 후 대시보드
- 카메라 영상 연결 대기 영역, 방향 패드, 작동 토글
- 기본 음소거, 누르는 동안만 마이크 권한을 요청하는 푸시 투 토크 버튼
- 작은 화면에 맞춘 반응형 레이아웃

## 보안 및 연동 상태

로그인은 GitHub OAuth를 통한 서버 측 계정 확인으로 구성되어 있습니다. 허용된 GitHub 로그인을 하나로 제한하고, 브라우저에는 12시간짜리 서명된 HttpOnly/Secure/SameSite 세션 쿠키만 둡니다. OAuth 토큰은 세션에 넣지 않고 저장하지 않습니다. OAuth 앱과 Vercel 환경 변수를 설정하기 전에는 인증이 열리지 않습니다.

### 실제 로그인 설정

1. 저장소를 Vercel에 배포합니다.
2. GitHub에서 OAuth App을 만들고 Authorization callback URL에 `https://<배포 도메인>/api/callback`을 입력합니다. Homepage URL은 같은 배포 도메인을 사용합니다.
3. Vercel 프로젝트의 Settings → Environment Variables에 다음 값을 Production(필요하면 Preview도)으로 설정합니다.
   - `GITHUB_CLIENT_ID`: GitHub OAuth App의 Client ID
   - `GITHUB_CLIENT_SECRET`: GitHub OAuth App의 Client secret (저장소에는 절대 추가하지 않음)
   - `GITHUB_ALLOWED_LOGIN`: 로그인 허용할 GitHub 사용자명 한 개
   - `SESSION_SECRET`: 최소 32자 무작위 비밀 문자열
4. 환경 변수를 저장한 뒤 새 배포를 실행합니다.

OAuth 앱 등록과 Client secret 발급은 사용자의 GitHub 계정에서 직접 승인해야 합니다. 비밀값은 채팅이나 GitHub 저장소에 보내지 말고 Vercel 환경 변수 입력란에만 넣으세요. 이 기본 구성은 소유자 식별을 지원하며, 인증된 요청을 로그/감사하는 별도 체계는 아직 포함하지 않습니다.

카메라 영상, 회전, 전원, 음성 제어는 아직 연결되지 않았습니다. 사진의 CMIIT ID와 전원 표기는 MJSXJ05CM 모델과 일치합니다. GitHub의 [`tsunglung/xiaomi-360-hacks`](https://github.com/tsunglung/xiaomi-360-hacks) 지원표에는 MJSXJ05CM의 RTSP/Telnet 지원이 표시되지만, 방식은 카메라 분해와 수정 펌웨어를 요구합니다. 공개 인터넷에 카메라나 Telnet을 노출하거나 펌웨어를 변경하지 마세요.

실기 연동 전에는 공식 Mi Home/Xiaomi Home 제어와 별도로 사용할 수 있는 제조사 승인 API/SDK가 있는지 확인해야 합니다. Xiaomi의 공개 Miloco 통합 자료에서 이 모델의 호환 문제 보고를 찾았으며, 카메라 보기 기능도 PTZ·양방향 음성 제어를 제공하지 않습니다. 카메라가 연결된 것처럼 표시하지 않고, 조작 버튼은 미연결 상태를 알립니다. 따라서 이 단계에서 실제 카메라 제어 연결은 제조사 승인 경로가 공개되지 않아 보류합니다.
