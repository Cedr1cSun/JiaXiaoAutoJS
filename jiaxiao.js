
var config = {
    password: "0000",
    packageName: "com.jxedt",
    
    robustnessConfig: {
        postLaunchWaitTarget: "柏宁驾校",
        handlePopups: true,
        popupKeywords: ["跳过", "关闭", "我知道了", "同意并继续", "允许"]
    },

    performanceConfig: {
        speed: "fast", 
        actionDelay: 1500,
        transitionDelay: 2000,
        retryDelay: 3000
    },

    // --- 科目选择配置 ---
    subjectConfig: {
        enableSubjectSelection: true,         // 是否启用科目选择功能
        subjectCategory: "科二模拟器",      // 需要点击展开的科目类别
        targetSubject: "科二实操"            // 最终需要选择的目标科目
    },

    drivingSchoolName: "柏宁驾校", 
    coachName: "卢晨圣（C2实操）",
    enableDateSelection: true,
    targetDate: "8-26", // 请确保格式为 M-D 或 MM-DD
    dateScanningMode: "weekday",
    scanDaysRange: 7,
    enableTimeSlotSelection: true,
    desiredTimeStart: "14:00",
    desiredTimeEnd: "20:00",
    confirmBookingButtonText: "立即预约",
    successIndicatorText: "查看约课记录",
    timeoutMinutes: 100000
};


// --- 2. 主逻辑 ---
auto.waitFor();
main();

function main() {
    log("===== 脚本开始执行 (v5.9) =====");

    // 根据速度预设调整延迟时间
    var perf = config.performanceConfig;
    if (perf.speed === "fast") {
        perf.actionDelay = 500;
        perf.transitionDelay = 800;
        perf.retryDelay = 1500;
    } else if (perf.speed === "slow") {
        perf.actionDelay = 2000;
        perf.transitionDelay = 2500;
        perf.retryDelay = 4000;
    }
    log("当前运行速度: " + perf.speed);
    log("目标驾校: " + config.drivingSchoolName);
    log("目标教练: " + config.coachName);
    
    if (config.password && !device.isScreenOn()) {
        unlockDevice();
    }

    if (!openAndNavigateToCoachList()) {
        log("错误：未能成功导航到教练列表页面。脚本终止。");
        return;
    }

    mainBookingLoop();

    log("===== 脚本执行结束 =====");
}


function openAndNavigateToCoachList() {
    var perf = config.performanceConfig;
    log("正在启动 " + config.packageName);
    if (!launch(config.packageName)) { return false; }

    log("等待App主页加载 (等待目标: '" + config.robustnessConfig.postLaunchWaitTarget + "', 最长15秒)...");
    var waitTarget = text(config.robustnessConfig.postLaunchWaitTarget).findOne(15000);
    if (!waitTarget) {
        log("错误：15秒内未检测到初始目标 '" + config.robustnessConfig.postLaunchWaitTarget + "'。");
        return false;
    }
    log("App主页加载成功。");

    if (config.robustnessConfig.handlePopups) {
        sleep(perf.transitionDelay);
        log("开始检查是否存在弹窗...");
        var keywords = config.robustnessConfig.popupKeywords;
        for (var i = 0; i < keywords.length; i++) {
            var el = text(keywords[i]).findOne(1000);
            if (el && el.clickable()) {
                log("发现并点击弹窗按钮: '" + keywords[i] + "'");
                el.click();
                sleep(perf.transitionDelay);
                break;
            }
        }
    }

    log("开始执行核心导航流程...");
    if (config.drivingSchoolName && !clickTarget(config.drivingSchoolName)) { return false; }
    if (!findAndClickWithSwipe("我要约课", 3)) { return false; }
    
    log("已成功导航至教练/科目列表页面。");
    
    if (config.subjectConfig.enableSubjectSelection) {
        log("开始进行科目选择...");
        if (!clickTarget(config.subjectConfig.subjectCategory)) {
            log("错误：未能点击科目类别 '" + config.subjectConfig.subjectCategory + "'");
            return false;
        }
        if (!clickTarget(config.subjectConfig.targetSubject)) {
            log("错误：未能选择目标科目 '" + config.subjectConfig.targetSubject + "'");
            return false;
        }
        log("科目选择完成，等待列表刷新...");
        sleep(perf.transitionDelay);
    }

    log("准备就绪，即将开始寻找教练。");
    return true;
}

function findAndClickWithSwipe(targetText, maxSwipes) {
    var perf = config.performanceConfig;
    maxSwipes = maxSwipes || 3;
    log("正在通过滑动查找: '" + targetText + "'");

    var target = text(targetText).findOne(1000);
    if (target) {
        return clickTarget(targetText, 1000);
    }

    for (var i = 0; i < maxSwipes; i++) {
        log("当前屏幕未找到，执行第 " + (i + 1) + " 次向下滑动...");
        var centerX = device.width / 2;
        var startY = device.height * 0.8;
        var endY = device.height * 0.5;
        var duration = 800;
        swipe(centerX, startY, centerX, endY, duration);
        sleep(perf.transitionDelay);

        target = text(targetText).findOne(1000);
        if (target) {
            return clickTarget(targetText, 1000);
        }
    }
    log("错误：滑动 " + maxSwipes + " 次后仍未找到 '" + targetText + "'");
    return false;
}

function attemptClick(widget) {
    if (!widget) { log("错误: attemptClick 接收到的控件为空。"); return false; }
    var targetInfo = widget.text() || widget.desc() || widget.id();
    if (widget.clickable() && widget.click()) { return true; }
    var parent = widget.parent();
    if (parent && parent.clickable() && parent.click()) { return true; }
    var bounds = widget.bounds();
    if (click(bounds.centerX(), bounds.centerY())) { return true; }
    log("错误: 对 '" + targetInfo + "' 的所有点击方式均失败。");
    return false;
}

function clickTarget(target, timeout) {
    timeout = timeout || 5000;
    log("正在尝试点击目标: '" + target + "'");
    var widget = text(target).findOne(timeout);
    if (!widget) { widget = id(target).findOne(timeout); }
    if (widget) {
        if (attemptClick(widget)) {
            log("成功点击: '" + target + "'");
            sleep(config.performanceConfig.actionDelay);
            return true;
        }
    }
    log("错误: " + (timeout / 1000) + "秒内未找到或点击目标: '" + target + "'");
    return false;
}

function mainBookingLoop() {
    var perf = config.performanceConfig;
    var startTime = new Date();
    var bookingCompleted = false;

    while (new Date() - startTime < config.timeoutMinutes * 60 * 1000 && !bookingCompleted) {
        if (text(config.successIndicatorText).exists()) {
            bookingCompleted = true;
            log("检测到成功标识，脚本退出。");
            break;
        }

        log("正在寻找并点击教练: " + config.coachName);
        if (clickTarget(config.coachName, 3000)) {
            var bookingAttempted = searchAndBookOnCoachPage();
            if (bookingAttempted) {
                bookingCompleted = true;
            } else {
                log("未找到合适课程，返回教练列表页准备刷新...");
                back();
                sleep(perf.transitionDelay);
            }
        } else {
            log("在当前页面找不到教练 '" + config.coachName + "'，稍后重试...");
            sleep(perf.retryDelay);
        }
    }

    if (bookingCompleted) { toast("恭喜！预约成功！"); } 
    else { log("运行超时或未找到合适课程，脚本自动停止。"); }
}

function searchAndBookOnCoachPage() {
    var perf = config.performanceConfig;
    if (config.enableDateSelection) {
        // 自动格式化 targetDate 以确保前导零
        var parts = config.targetDate.split('-');
        var month = parseInt(parts[0], 10);
        var day = parseInt(parts[1], 10);
        var monthString = month < 10 ? "0" + month : "" + month;
        var dayString = day < 10 ? "0" + day : "" + day;
        var formattedDate = monthString + "-" + dayString;

        if (!findAndClickDate(formattedDate)) {
            log("在教练页未找到指定日期: " + formattedDate);
            return false;
        }
        return findAndClickValidTimeSlot();
    }

    if (config.dateScanningMode === "weekday") {
        log("开始 'weekday' (星期) 扫描模式...");
        var dateButtons = textMatches(/.*周.*/).find();
        if (dateButtons.empty()) { log("教练页未找到任何'周X'日期按钮"); return false; }
        for (var i = 0; i < dateButtons.size(); i++) {
            var dateButton = dateButtons.get(i);
            log("--> 正在检查日期: " + dateButton.text());
            if (attemptClick(dateButton)) {
                sleep(perf.actionDelay);
                if (text("已约").findOne(1500)) { log("检测到当天已有'已约'课程，跳过此日期..."); continue; }
                if (findAndClickValidTimeSlot()) { return true; }
            } else { log("错误：点击日期按钮 '" + dateButton.text() + "' 失败。"); }
        }
    } else { // dayByDay 模式
        log("开始 'dayByDay' (逐日) 扫描模式...");
        for (var i = 0; i < config.scanDaysRange; i++) {
            var date = new Date();
            date.setDate(date.getDate() + i);
            var month = date.getMonth() + 1;
            var day = date.getDate();
            var monthString = month < 10 ? "0" + month : "" + month;
            var dayString = day < 10 ? "0" + day : "" + day;
            var dateString = monthString + "-" + dayString;
            log("--> 正在寻找日期: " + dateString);
            if (findAndClickDate(dateString)) {
                if (text("已约").findOne(1500)) { log("检测到当天已有'已约'课程，跳过此日期..."); continue; }
                if (findAndClickValidTimeSlot()) { return true; }
            } else { log("未找到日期 " + dateString + "，可能当天不可约或不在屏幕内。"); }
        }
    }
    return false;
}

function findAndClickValidTimeSlot() {
    var perf = config.performanceConfig;
    if (text("已约").exists()) { log("检测到当天已有'已约'课程，放弃本日所有时间段的查找。"); return false; }
    var timeSlotButtons = find(textMatches(/\d{2}:\d{2}-\d{2}:\d{2}/));
    if (timeSlotButtons.empty()) { return false; }
    for (var i = 0; i < timeSlotButtons.size(); i++) {
        var slotButton = timeSlotButtons.get(i);
        var slotText = slotButton.text();
        var isClickable = slotButton.clickable() || (slotButton.parent() && slotButton.parent().clickable());
        if (!isClickable) { log("跳过: 时间段 " + slotText + " 不可点击 (已约/锁定)"); continue; }
        var isSlotValid = !config.enableTimeSlotSelection || parseAndCheckTime(slotText);
        if (isSlotValid) {
            log("发现有效时间段: " + slotText + "...");
            if (attemptClick(slotButton)) {
                sleep(perf.actionDelay);
                if (clickTarget(config.confirmBookingButtonText, 3000)) { return true; } 
                else { log("点击时间段后未找到确认按钮，可能已被抢约，返回..."); back(); sleep(perf.actionDelay); }
            }
        }
    }
    return false;
}

function unlockDevice() {
    if (device.isScreenOn()) { return; }
    log("设备息屏，正在唤醒和解锁...");
    device.wakeUp();
    sleep(1500);
    swipe(500, 0, 500, device.height, 800);
    sleep(1000);
    click(180, 180);
    sleep(1000);
    for (var i = 0; i < config.password.length; i++) {
        var digit = config.password.charAt(i);
        var btn = desc(digit).findOne(1000);
        if (btn) { btn.click(); sleep(200); }
    }
    log("密码输入完成。");
    sleep(1000);
}

function findAndClickDate(dateStr) {
    var perf = config.performanceConfig;
    var dateWidget = textContains(dateStr).findOne(2000);
    if (dateWidget) {
        if(attemptClick(dateWidget)){
            sleep(perf.actionDelay);
            return true;
        }
    }
    log("当前屏幕未找到日期 " + dateStr + "，尝试滑动查找...");
    for (var i = 0; i < 5; i++) {
        var y = device.height / 5;
        swipe(device.width * 0.8, y, device.width * 0.2, y, 500);
        sleep(perf.transitionDelay);
        dateWidget = textContains(dateStr).findOne(1000);
        if (dateWidget) {
            log("通过滑动找到了日期！");
            if(attemptClick(dateWidget)){
                sleep(perf.actionDelay);
                return true;
            }
        }
    }
    return false;
}

function parseAndCheckTime(timeSlotText) {
    var times = timeSlotText.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (!times) return false;
    var slotStart = times[1];
    var slotEnd = times[2];
    if (slotStart >= config.desiredTimeStart && slotEnd <= config.desiredTimeEnd) {
        return true;
    }
    return false;
}