# 作业阅读计时器 (Homework Reading Timer Extension)

这是一个基于 Manifest V3 开发的 Chrome 浏览器扩展程序，旨在自动检测、管理和记录跨页面的阅读与录音时长。特别适用于 [Kids A-Z](https://www.kidsa-z.com/) 等在线学习与阅读平台。

---

## 🌟 核心功能

* **自动录音检测：** 自动监听目标网站上的操作按钮（如开始录音、暂停录音、停止录音），无需手动干预即可同步触发计时。
* **跨页面持续计时：** 基于 Service Worker 后台运行，即使在不同页面或阅读任务之间切换，也能精准累加和保存本次会话的计时时长。
* **智能自动停止：** 持续检测页面状态，当检测到提交成功提示（如 `Recording sent`）时，自动结束当前会话并保存记录。
* **状态指示标记：** 计时器运行期间，扩展程序图标上会显示醒目的红色指示点（`•`），方便随时查看运行状态。
* **完善的历史记录管理：**
  * **今日概览：** 点击弹出界面即可快速查看今日阅读总时长与单次录音明细。
  * **完整历史列表：** 提供独立的分页历史记录页面（`history.html`），按日期展示每日总时长及具体时间段。
  * **记录管理：** 支持单条记录删除及一键清空所有历史数据。

---

## 📁 项目结构

| 文件 / 文件夹 | 功能说明 |
| :--- | :--- |
| `manifest.json` | 扩展配置文件（Manifest V3），定义权限、后台服务、内容脚本及弹窗等。 |
| `background.js` | 后台 Service Worker，负责全局计时器状态、使用 `chrome.storage.local` 进行数据持久化、图标 Badge 更新及历史记录存储。 |
| `content.js` | 注入到目标页面的脚本，监听 DOM 元素（录音按钮、提交状态）并将事件同步至后台。 |
| `popup.html` / `popup.js` | 工具栏弹窗界面，支持手动开始/停止计时、查看今日数据概览以及跳转至完整历史页面。 |
| `history.html` / `history.js` | 完整的历史记录管理页面，支持按日期分页查看、按时间倒序排列和删除记录。 |
| `test_harness.html` | 本地测试页面，模拟在线录音按钮与提交成功逻辑，便于开发调试。 |
| `icon.png` | 扩展程序的工具栏图标。 |

---

## 🛠️ 安装方法

1. 将本项目代码克隆或下载到本地计算机：
   ```bash
   git clone [https://github.com/stevenh47/ReadingTimerExtension.git](https://github.com/stevenh47/ReadingTimerExtension.git)

-------------------------------------------------------------------------------
# Homework Reading Timer Extension (作业阅读计时器)

A Manifest V3 Chrome Extension designed to automatically track, manage, and log reading and recording sessions across pages—specifically tailored for educational platforms like [Kids A-Z](https://www.kidsa-z.com/).

---

## 🌟 Key Features

* **Automatic Recording Detection:** Listens to page interactions on supported sites (such as start, pause, and stop recording actions) to begin or stop timing seamlessly.
* **Cross-Page Persistence:** Operates via a background service worker to accurately track session durations even when navigating between different pages or reading assignments.
* **Smart Auto-Stop:** Continuously checks page state and automatically finalizes the timing session when detecting a successful submission message (`Recording sent`).
* **Visual Status Badge:** Displays a active red indicator badge (`•`) directly on the extension icon whenever a recording/reading timer is running.
* **Comprehensive Session History:**
  * **Today's Overview:** Quick access via the popup menu to check total time spent today and review daily sessions.
  * **Full History View:** Paginated history view (`history.html`) summarizing daily reading totals with entry-level timestamps.
  * **Management Options:** Ability to delete individual logs or reset stored reading history.

---

## 📁 Repository Structure

| File | Description |
| :--- | :--- |
| `manifest.json` | Extension configuration file (Manifest V3) specifying permissions, background scripts, content scripts, and popups. |
| `background.js` | Service worker managing global timer state, session persistence using `chrome.storage.local`, extension badges, and history storage. |
| `content.js` | Injected script targeting target websites to monitor DOM elements (recording buttons, submission status) and relay events to the background. |
| `popup.html` / `popup.js` | User popup interface allowing manual start/stop toggles, viewing today's session summary, and navigating to full history. |
| `history.html` / `history.js` | Full-page historical log interface featuring paginated daily summaries and detailed session management. |
| `test_harness.html` | A standalone HTML test page mimicking online recording controls and auto-submission messages for local testing. |
| `icon.png` | Extension toolbar icon asset. |

---

## 🛠️ Installation

1. Clone or download this repository to your local computer:
   ```bash
   git clone [https://github.com/stevenh47/ReadingTimerExtension.git](https://github.com/stevenh47/ReadingTimerExtension.git)
