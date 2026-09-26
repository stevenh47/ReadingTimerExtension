const START_BUTTON_SELECTOR = '#recordButton';
const PAUSE_BUTTON_SELECTOR = '#pauseRecordingButton';
const STOP_BUTTON_SELECTOR = '#stopRecordingButton';
const SUCCESS_STRING = 'Recording sent'; // 提交成功的字符串

// 移除所有 UI 注入和更新函数。
// 现在只需确保发送和接收消息的逻辑正常。

// --- 初始化与状态恢复 ---

async function initialize() {
    // 1. 请求后台的当前状态
    // 发送 requestTime 消息，shouldRun: true 确保后台服务工作线程在录音中时被唤醒。
    // 注意：我们不再使用返回的状态来更新页面UI，但仍然需要发送消息以触发后台的自动停止/恢复逻辑。
    await chrome.runtime.sendMessage({ action: 'requestTime', shouldRun: true });

    // 2. 监听所有按钮
    attachButtonListeners();
}

function attachButtonListeners() {
    const startButton = document.querySelector(START_BUTTON_SELECTOR);
    const pauseButton = document.querySelector(PAUSE_BUTTON_SELECTOR);
    const stopButton = document.querySelector(STOP_BUTTON_SELECTOR);

    // 辅助函数：发送消息
    const sendMessage = (action) => {
        chrome.runtime.sendMessage({ action: action });
    };

    if (startButton) {
        startButton.addEventListener('click', () => {
            sendMessage('startTimer');
        });
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', () => {
            sendMessage('pauseTimer');
        });
    }

    if (stopButton) {
        stopButton.addEventListener('click', () => {
            sendMessage('stopTimer');
        });
    }

    // 如果按钮未立即出现，可能需要延迟重试
    if (!startButton || !pauseButton || !stopButton) {
        setTimeout(attachButtonListeners, 500);
    }
}

function startStatusCheck() {
    const stopButtonExists = document.querySelector(STOP_BUTTON_SELECTOR);
    const recordingSentTextFound = document.body.innerText.includes(SUCCESS_STRING);

    // 检查条件：没有停止按钮 AND 找到了成功提交字符串
    if (!stopButtonExists && recordingSentTextFound) {
      console.log("检测到录音已提交成功，自动触发停止计时。");
                
      // 触发后台的停止逻辑
      chrome.runtime.sendMessage({ action: 'stopTimer' });
    }
}

// --- 接收来自 Background 的更新消息 ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 尽管移除了 UI，但我们仍需要监听这些消息来确保逻辑链条的完整性
    // 例如，stopTimer 仍会发送 'resetDisplay' 消息，但 content.js 现在只忽略它。
    if (request.action === 'updateTime') {
        // 忽略更新 UI 的指令
        startStatusCheck();
    } else if (request.action === 'resetDisplay') {
        // 忽略重置 UI 的指令
    }
});

// 页面加载完成后，启动初始化流程
initialize();