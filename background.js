// background.js (最终完整版 - 集成计时、存储、历史和清除功能)

let timerInterval = null;
let secondsElapsed = 0;
let sessionStartTime = null; // 记录当前会话的开始时间戳
let isPaused = false;        // 记录是否处于暂停状态

// --- 存储和配置键 ---
const REQUIRED_TIME_SECONDS = 15 * 60; // 15分钟 = 900秒
const STORAGE_KEY = 'readingTimeElapsed';
const TIMER_RUNNING_KEY = 'isTimerRunning';
const HISTORY_KEY = 'readingHistory'; 

// --- 辅助函数 ---

function updateStorage(runningState) {
    // 异步保存当前累计时间、会话开始时间、和运行状态
    chrome.storage.local.set({ 
        [STORAGE_KEY]: secondsElapsed,
        [TIMER_RUNNING_KEY]: runningState,
        'sessionStart': sessionStartTime ? sessionStartTime.toISOString() : null,
        'isPaused': isPaused
    });
}

function formatLocalYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// --- 计时和存储逻辑 ---

async function startTimer() {
    // 1. 读取上次保存的状态
    const storedData = await chrome.storage.local.get([STORAGE_KEY, TIMER_RUNNING_KEY, 'sessionStart', 'isPaused']);
    secondsElapsed = storedData[STORAGE_KEY] || 0;
    isPaused = storedData['isPaused'] || false;

    // 2. 检查并停止旧的计时
    if (timerInterval !== null) {
        clearInterval(timerInterval);
    } 
    
    // 如果是从暂停中恢复，解除暂停状态
    isPaused = false; 

    // 3. 设置会话开始时间（仅在第一次启动或长时间中断后）
    if (secondsElapsed === 0) {
        sessionStartTime = new Date();
    } else if (!sessionStartTime && storedData['sessionStart']) {
        sessionStartTime = new Date(storedData['sessionStart']);
    } else if (!sessionStartTime) {
        // 兜底：如果存储中没有，视为当前时间开始
        sessionStartTime = new Date();
    }

    // 4. 启动计时循环
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateIconStatus(true);
        updateStorage(true); // 状态设为运行中

        const minutes = Math.floor(secondsElapsed / 60);
        const seconds = secondsElapsed % 60;
        
        // 发送更新到 content 脚本 (尽管 content.js 已移除UI，但仍需发送以保持通信完整)
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { 
                    action: 'updateTime', 
                    minutes: minutes, 
                    seconds: seconds 
                });
            }
        });

        // 检查是否达到要求时间 (可选的通知功能)
        /**
        if (secondsElapsed === REQUIRED_TIME_SECONDS) {
            chrome.notifications.create('reading-complete', {
                type: 'basic',
                iconUrl: 'icon.png', 
                title: '阅读计时器',
                message: '恭喜！已完成15分钟阅读时长要求。',
                priority: 2
            });
        }
        */

    }, 1000); 
    updateIconStatus(true);
    console.log(`计时器启动，累计时间从 ${secondsElapsed} 秒开始。`);
}

async function handlePause() {
    /**
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;
        updateStorage(true); // 状态仍为 true (未终止)，但 isPaused 为 true
        console.log("计时器暂停。");
    }
    */
    
    handleStop();
}

// sendResetMessage: 确定是否发送重置消息给 Content Script。
async function handleStop(sendResetMessage = true) {
    updateIconStatus(false);
    if (timerInterval !== null || secondsElapsed > 0) {
        const endTime = new Date();
        const duration = secondsElapsed;
        
        // 1. 创建历史记录对象
        const historyEntry = {
            id: Date.now(),
            date: formatLocalYYYYMMDD(endTime),
            startTime: sessionStartTime ? sessionStartTime.toISOString() : endTime.toISOString(), 
            endTime: endTime.toISOString(),
            totalTimeSeconds: duration
        };

        // 2. 读取并更新历史记录
        const storedHistory = await chrome.storage.local.get(HISTORY_KEY);
        const history = storedHistory[HISTORY_KEY] || [];
        history.push(historyEntry);
        chrome.storage.local.set({ [HISTORY_KEY]: history });

        // 3. 清理当前会话状态
        if (timerInterval !== null) {
            clearInterval(timerInterval);
        }
        timerInterval = null;
        secondsElapsed = 0;
        sessionStartTime = null;
        isPaused = false;
        
        // 4. 清理存储
        chrome.storage.local.set({ 
            [STORAGE_KEY]: 0, 
            [TIMER_RUNNING_KEY]: false, 
            'sessionStart': null, 
            'isPaused': false
        });

        console.log("计时器停止，记录已保存。");
        
        // 5. 根据参数决定是否通知 Content Script
        if (sendResetMessage) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'resetDisplay' });
                }
            });
        }
    }
}

// --- 新增：清空全部历史记录逻辑 ---
async function clearAllHistory() {
    // 仅清空历史记录键，不影响当前的秒数累计 (STORAGE_KEY)
    await chrome.storage.local.set({ [HISTORY_KEY]: [] });
    console.log("所有历史记录已清空。");
}

async function deleteHistoryEntry(idToDelete) {
    if (!idToDelete) return;
    const targetId = Number(idToDelete);
    const storedHistory = await chrome.storage.local.get(HISTORY_KEY);
    let history = storedHistory[HISTORY_KEY] || [];
    
    // 过滤掉 ID 匹配的记录 (ID 通常是时间戳，Number 类型)
    const originalLength = history.length;
    history = history.filter(item => item.id !== targetId);

    if (history.length < originalLength) {
        await chrome.storage.local.set({ [HISTORY_KEY]: history });
        console.log(`历史记录 ID: ${targetId} 已删除。`);
        return true; // 删除成功
    }
    return false; // 未找到记录
}

// --- 监听器 ---

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    
    // --- 控制指令 ---
    if (request.action === 'startTimer') {
        startTimer();
    } else if (request.action === 'pauseTimer') {
        handlePause();
    } else if (request.action === 'stopTimer') {
        handleStop();
    } else if (request.action === 'clearAllHistory') {
        await clearAllHistory();
        sendResponse({ success: true });
    } else if (request.action === 'deleteHistoryEntry') {
        const success = await deleteHistoryEntry(request.id);
        sendResponse({ success: success });
    }
    // --- 状态请求与自动停止逻辑 ---
    else if (request.action === 'requestTime') {
        
        const storedData = await chrome.storage.local.get([STORAGE_KEY, TIMER_RUNNING_KEY, 'isPaused']);
        
        const isRunning = timerInterval !== null;
        const currentSeconds = isRunning ? secondsElapsed : (storedData[STORAGE_KEY] || 0);
        const currentPaused = isRunning ? isPaused : (storedData['isPaused'] || false);
        const storedRunningState = storedData[TIMER_RUNNING_KEY] === true;

        // 核心修正逻辑：如果存储的状态是“正在运行”但“已暂停”，并且新页面发起了请求 (意味着暂停时发生了跳转)
        if (storedRunningState && currentPaused) {
            
            console.log("检测到暂停状态下的页面跳转。执行自动停止。");
            // 触发停止逻辑：记录历史并重置状态。传入 false 表示不发送重置消息给 content.js
            await handleStop(false); 

            // 将重置后的状态发送给新的 content script
            sendResponse({ 
                secondsElapsed: 0,
                isRunning: false,
                isPaused: false
            });
            return true; 
        }
        
        // --- 正常逻辑：未暂停或正在运行 ---
        
        sendResponse({ 
            secondsElapsed: currentSeconds,
            isRunning: isRunning,
            isPaused: currentPaused
        });
        
        // 如果 content script 期望计时器运行但后台没有运行 (用户在录音中跳转页面)
        if (request.shouldRun && storedRunningState && !isRunning) {
            startTimer();
        }
    }
    return true; 
});

function updateIconStatus(isRunning) {
    let color = null;
    let text = '';

    if (isRunning) {
        // 运行中：红色徽章，显示一个小点
        color = '#E74C3C'; // 鲜红色
        text = '•';
    } else {
        // 停止/未运行：清除徽章
        color = null;
        text = '';
    }
    
    // 应用 Badge
    chrome.action.setBadgeText({ text: text });
    if (color) {
        chrome.action.setBadgeBackgroundColor({ color: color });
    }
}