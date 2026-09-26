// popup.js (最终完整版)

const HISTORY_KEY = 'readingHistory';

const startPauseBtn = document.getElementById('start-pause-btn');
let isRunning = false;

async function initializeTimerControls() {
	chrome.runtime.sendMessage({ action: 'requestTime' }).then(res => {
            if (res) {
                isRunning = res.isRunning;
            } else {
                 console.log("尝试获取状态失败。");
            }
        });
    startPauseBtn.addEventListener('click', async () => {
    	if (!isRunning) {
            await chrome.runtime.sendMessage({ action: 'startTimer' });
            startPauseBtn.style.backgroundColor = '#f39c12'; // 橙色
            isRunning = true;
            startPauseBtn.textContent='停止';
        } else {
            await chrome.runtime.sendMessage({ action: 'stopTimer' });
            isRunning = false;
            startPauseBtn.style.backgroundColor = '#2ecc71'; // 绿色
            startPauseBtn.textContent='开始';
            displayHistory(); 
        }
    });
}

// ---------------------------------------------
// --- 辅助函数：时间格式化 ---

// 将秒数转换为 HH:MM:SS 格式
function formatSeconds(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 格式化 ISO 时间字符串为 HH:MM:SS (本地时间)
function formatISOTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 获取今天的日期字符串 (YYYY-MM-DD)，用于匹配 background.js 中存储的记录
function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function attachDeleteListener() {
    document.querySelectorAll('.delete-history-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const idToDelete = Number(event.target.dataset.id);
            if (confirm("确定要删除这条记录吗？")) {
                // 发送消息给 background.js
                const response = await chrome.runtime.sendMessage({ 
                    action: 'deleteHistoryEntry', 
                    id: idToDelete 
                });
                
                if (response && response.success) {
                    // 重新加载记录显示
                    displayHistory();
                } else if (response && response.success === false) {
                    alert("删除失败，未找到记录。");
                } else {
                    // 接收到 null/undefined 响应（通信通道关闭）
                    // 基于您的反馈，我们知道删除操作在后台已经成功。
                    // 假设操作已执行，刷新视图并显示成功消息。
                    console.warn("未收到后台脚本的明确响应，但假定操作已执行并刷新视图。");
                    displayHistory();
                }
            }
        });
    });
}

// --- 核心显示逻辑 ---

async function displayHistory() {
    const historyList = document.getElementById('history-list');
    const dailySummaryDiv = document.getElementById('daily-summary');
    historyList.innerHTML = '';
    dailySummaryDiv.innerHTML = '';

    const storedData = await chrome.storage.local.get(HISTORY_KEY);
    const history = storedData[HISTORY_KEY] || [];
    
    // 1. 确定今天的日期
    const today = getTodayDateString(); 
    
    // 2. 筛选出今天的记录
    const todayHistory = history.filter(item => item.date === today);

    // 3. 显示今日总时长
    const todayTotalSeconds = todayHistory.reduce((sum, item) => sum + item.totalTimeSeconds, 0);

    dailySummaryDiv.innerHTML = `
        <div class="date-header">${today} 总时长：${formatSeconds(todayTotalSeconds)}</div>
    `;

    if (todayHistory.length === 0) {
        historyList.innerHTML = '<p>今天暂无录音记录。</p>';
        return;
    }

    // 4. 显示今日会话记录
    // 按时间倒序排列
    todayHistory.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)); 

    todayHistory.forEach(item => {
        const formattedStartTime = formatISOTime(item.startTime);
        const formattedEndTime = formatISOTime(item.endTime);
        const formattedTotal = formatSeconds(item.totalTimeSeconds);

        const listItem = document.createElement('li');
        listItem.className = 'history-item';
        
        listItem.innerHTML = `
            <div>
                <strong>开始:</strong> ${formattedStartTime} | 
                <strong>结束:</strong> ${formattedEndTime} <br>
                <strong>总共录音:</strong> ${formattedTotal}
            </div>
            <button class="delete-history-btn" data-id="${item.id}" 
                style="float: right; padding: 3px 8px; margin-top: -30px; background-color: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">
                删除
            </button>
        `;
        historyList.appendChild(listItem);
    });
    attachDeleteListener();
}

// --- 事件监听器：打开新页面 ---
function setupShowAllButton() {
    document.getElementById('show-all-btn').addEventListener('click', () => {
        // 使用 chrome.tabs.create 打开新的浏览器窗口显示 history.html
        chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
    });
}

// --- 事件监听器：清空全部数据 ---
function setupClearAllButton() {
    document.getElementById('clear-all-btn').addEventListener('click', async () => {
        if (confirm("确定要清空全部录音历史数据吗？此操作不可撤销！")) {
            // 发送消息给 background.js 执行清空操作
            await chrome.runtime.sendMessage({ action: 'clearAllHistory' });
            
            // 清空完成后，刷新 popup 界面显示
            displayHistory(); 
            alert("全部历史数据已清空。");
        }
    });
}

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    displayHistory();
    setupShowAllButton();
    setupClearAllButton();
    initializeTimerControls();
});