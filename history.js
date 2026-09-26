// history.js

const HISTORY_KEY = 'readingHistory';
const ITEMS_PER_PAGE = 5; // 每页显示5天的数据

let allHistory = [];
let dailyTotals = {};
let allDates = []; // 按日期倒序排列的数组
let currentPage = 1;

// --- 辅助函数 (与 popup.js 保持一致) ---
function formatSeconds(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatISOTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
                    // 重新初始化数据并渲染当前页
                    await initializeHistory(); 
                } else if (response && response.success === false) {
                    alert("删除失败，未找到记录。");
                } else {
                    // 接收到 null/undefined 响应（通信通道关闭）
                    // 假设操作已执行，刷新视图并显示成功消息。
                    console.warn("未收到后台脚本的明确响应，但假定操作已执行并刷新视图。");
                    await initializeHistory(); // 重新加载和渲染分页数据
                }
            }
        });
    });
}
// --- 核心显示逻辑 ---

function renderPage() {
    const displayDiv = document.getElementById('history-display');
    const pageInfoSpan = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    displayDiv.innerHTML = '';
    
    // 计算当前页的起始和结束日期索引
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const datesToDisplay = allDates.slice(startIndex, endIndex);

    // 渲染数据
    datesToDisplay.forEach(dateKey => {
        // 渲染每日总时长
        const dailySummaryDiv = document.createElement('div');
        dailySummaryDiv.className = 'daily-summary-item';
        dailySummaryDiv.textContent = `${dateKey} 总时长：${formatSeconds(dailyTotals[dateKey] || 0)}`;
        displayDiv.appendChild(dailySummaryDiv);

        // 渲染当天的所有会话记录
        const sessions = allHistory.filter(item => item.date === dateKey)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)); // 会话按时间倒序

        const sessionList = document.createElement('ul');
        sessionList.className = 'session-list';
        
        sessions.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'session-item';
            const formattedStartTime = formatISOTime(item.startTime);
            const formattedEndTime = formatISOTime(item.endTime);
            const formattedTotal = formatSeconds(item.totalTimeSeconds);
            
            // 格式: 开始: hh:mm:ss, 结束： hh:mm:ss, 总共录音 hh:mm:ss
            listItem.innerHTML = `
                <div>
                    开始: ${formattedStartTime} | 
                    结束: ${formattedEndTime} | 
                    总共录音: ${formattedTotal}
                </div>
                <button class="delete-history-btn" data-id="${item.id}"
                    style="margin-left: 10px; padding: 2px 6px; background-color: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    删除
                </button>
            `;
            sessionList.appendChild(listItem);
        });
        displayDiv.appendChild(sessionList);
    });

    // --- 分页控制 ---
    const totalPages = Math.ceil(allDates.length / ITEMS_PER_PAGE);
    pageInfoSpan.textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    attachDeleteListener();
}

function setupPagination() {
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
        }
    });

    document.getElementById('next-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(allDates.length / ITEMS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
        }
    });
}

// --- 初始化数据 ---

async function initializeHistory() {
    const storedData = await chrome.storage.local.get(HISTORY_KEY);
    allHistory = storedData[HISTORY_KEY] || [];

    // 1. 计算每日总时长
    dailyTotals = {}; 
    allHistory.forEach(item => {
        const dateKey = item.date;
        dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + item.totalTimeSeconds;
    });

    // 2. 获取所有日期，并按日期倒序排序
    allDates = Object.keys(dailyTotals).sort().reverse();
    
    setupPagination();
    renderPage();
}

document.addEventListener('DOMContentLoaded', initializeHistory);
