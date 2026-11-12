const $ = (selector) => document.querySelector(selector);
const loginView = $('#loginView');
const dashboardView = $('#dashboardView');
const toast = $('#toast');
let toastTimer;
let micStream;
let activeDirection = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function showLogin(message = '') {
  dashboardView.classList.add('hidden');
  loginView.classList.remove('hidden');
  $('#loginMessage').textContent = message;
}

function showDashboard(user) {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  $('#userEmail').textContent = user.login;
  $('#sessionState').textContent = '보안 세션 활성';
}

async function checkSession() {
  const params = new URLSearchParams(location.search);
  if (params.get('auth') === 'denied') showLogin('허용된 계정만 로그인할 수 있습니다.');
  if (params.get('auth') === 'error') {
    const reasons = {
      credentials: 'GitHub Client ID 또는 Client secret을 확인해야 합니다. 비밀값은 공유하지 말고 설정을 확인해 주세요.',
      redirect: 'GitHub Redirect URI와 현재 앱 주소가 일치하지 않습니다.',
      authorization: 'GitHub 인증 코드 교환에 실패했습니다. 다시 로그인해 주세요.',
      token: 'GitHub 인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      profile: 'GitHub 프로필 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      session: '로그인 세션을 만들지 못했습니다. 설정을 확인해 주세요.',
      server: '로그인 처리 중 서버 오류가 발생했습니다.',
    };
    showLogin(reasons[params.get('reason')] || '로그인 처리 중 오류가 발생했습니다.');
  }
  try {
    const response = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) {
      if (params.get('auth') !== 'error' && params.get('auth') !== 'denied') showLogin('');
      return;
    }
    const { user } = await response.json();
    if (!user?.login) return showLogin();
    showDashboard(user);
  } catch {
    showLogin('서버 인증을 사용할 수 없습니다. 배포 주소에서 다시 열어 주세요.');
  }
  if (params.has('auth')) history.replaceState({}, '', location.pathname);
}

async function logout() {
  await stopMicrophone();
  try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); }
  finally { showLogin('로그아웃했습니다.'); }
}

$('#logoutButton').addEventListener('click', logout);
$('#accountButton').addEventListener('click', () => {
  if (!dashboardView.classList.contains('hidden')) showToast(`로그인 계정: ${$('#userEmail').textContent}`);
});

function notConnected() {
  showToast('이 카메라는 제조사의 공개 원격 제어 연동 방식이 확인되지 않아 아직 연결되지 않았습니다.');
}

$('#connectButton').addEventListener('click', notConnected);
$('#videoConnect').addEventListener('click', notConnected);
$('#refreshButton').addEventListener('click', notConnected);
$('#settingsButton').addEventListener('click', () => showToast('카메라 공식 연동 방법이 확인되면 설정을 추가합니다.'));
$('#powerToggle').addEventListener('click', notConnected);

document.querySelectorAll('[data-direction]').forEach((button) => {
  const end = () => {
    button.classList.remove('pressed');
    if (activeDirection === button.dataset.direction) activeDirection = null;
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (activeDirection) return;
    activeDirection = button.dataset.direction;
    button.classList.add('pressed');
    notConnected();
  });
  ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'].forEach((name) => button.addEventListener(name, end));
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});

$('#fullscreenButton').addEventListener('click', async () => {
  const stage = $('#videoStage');
  try {
    if (!document.fullscreenElement) await stage.requestFullscreen();
    else await document.exitFullscreen();
  } catch { showToast('전체 화면을 사용할 수 없습니다.'); }
});

$('#snapshotButton').addEventListener('click', () => {
  const video = $('#cameraVideo');
  if (video.classList.contains('hidden') || !video.videoWidth) {
    showToast('연결된 영상이 없어 화면을 저장할 수 없습니다.');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const link = document.createElement('a');
  link.download = `home-camera-${new Date().toISOString().replaceAll(':', '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

async function stopMicrophone() {
  if (micStream) micStream.getTracks().forEach((track) => track.stop());
  micStream = undefined;
  const button = $('#micButton');
  if (!button) return;
  button.classList.remove('active');
  button.setAttribute('aria-pressed', 'false');
  button.querySelector('b').textContent = '눌러서 말하기';
  $('#micBadge').textContent = '◌';
  $('#muteIndicator').classList.remove('on');
  $('#audioStatus').textContent = '마이크 꺼짐 · 음소거';
}

$('#micButton').addEventListener('pointerdown', async (event) => {
  event.preventDefault();
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('마이크는 HTTPS 환경에서 열었을 때 사용할 수 있습니다.');
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const button = $('#micButton');
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
    button.querySelector('b').textContent = '마이크 켜짐 · 놓으면 종료';
    $('#micBadge').textContent = '●';
    $('#muteIndicator').classList.add('on');
    $('#audioStatus').textContent = '마이크 켜짐 · 카메라 음성 연결 대기';
  } catch {
    showToast('마이크 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.');
  }
});
['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture'].forEach((name) => $('#micButton').addEventListener(name, stopMicrophone));

checkSession();
