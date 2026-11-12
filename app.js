const $ = (selector) => document.querySelector(selector);
const loginView = $('#loginView');
const dashboardView = $('#dashboardView');
const loginForm = $('#loginForm');
const loginMessage = $('#loginMessage');
const toast = $('#toast');
let toastTimer;
let micStream;
let activeDirection = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function showDashboard(email) {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  $('#userEmail').textContent = email || '내 계정';
}

function showLogin() {
  dashboardView.classList.add('hidden');
  loginView.classList.remove('hidden');
  $('#password').value = '';
}

// Demo sign-in is intentionally local. A production account needs a private auth service.
loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loginMessage.textContent = '';
  const email = $('#email').value.trim();
  const password = $('#password').value;
  if (!email || password.length < 8) {
    loginMessage.textContent = '이메일과 8자 이상의 비밀번호를 입력해 주세요.';
    return;
  }
  sessionStorage.setItem('homecam-demo-session', email);
  showDashboard(email);
  showToast('시제품 화면에 로그인했습니다. 카메라는 아직 연결되지 않았습니다.');
});

$('#togglePassword').addEventListener('click', () => {
  const field = $('#password');
  const visible = field.type === 'password';
  field.type = visible ? 'text' : 'password';
  $('#togglePassword').textContent = visible ? '숨기기' : '보기';
});

$('#logoutButton').addEventListener('click', () => {
  sessionStorage.removeItem('homecam-demo-session');
  stopMicrophone();
  showLogin();
});

$('#accountButton').addEventListener('click', () => {
  const email = sessionStorage.getItem('homecam-demo-session');
  if (email) showToast(`로그인 계정: ${email}`);
});

function notConnected() {
  showToast('연동 가능한 카메라 연결 방식이 확인되면 이 기능을 사용할 수 있습니다.');
}

$('#connectButton').addEventListener('click', notConnected);
$('#videoConnect').addEventListener('click', notConnected);
$('#refreshButton').addEventListener('click', notConnected);
$('#settingsButton').addEventListener('click', () => showToast('카메라의 공식 연동 방법을 확인한 뒤 설정을 추가합니다.'));
$('#powerToggle').addEventListener('click', notConnected);

document.querySelectorAll('[data-direction]').forEach((button) => {
  const begin = (event) => {
    event.preventDefault();
    if (activeDirection) return;
    activeDirection = button.dataset.direction;
    button.classList.add('pressed');
    notConnected();
  };
  const end = () => {
    button.classList.remove('pressed');
    if (activeDirection === button.dataset.direction) activeDirection = null;
  };
  button.addEventListener('pointerdown', begin);
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('pointerleave', end);
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
    button.querySelector('b').textContent = '말하는 중 · 놓으면 종료';
    $('#micBadge').textContent = '●';
    $('#muteIndicator').classList.add('on');
    $('#audioStatus').textContent = '마이크 켜짐 · 기기 연결 대기';
  } catch {
    showToast('마이크 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.');
  }
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => $('#micButton').addEventListener(name, stopMicrophone));
$('#micButton').addEventListener('lostpointercapture', stopMicrophone);

const rememberedSession = sessionStorage.getItem('homecam-demo-session');
if (rememberedSession) showDashboard(rememberedSession);
