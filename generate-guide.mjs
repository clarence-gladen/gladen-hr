import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SHOTS = '/Users/Clarence/gladen-hr/guide-screenshots';

function img(file) {
  const data = fs.readFileSync(path.join(SHOTS, file));
  return `data:image/png;base64,${data.toString('base64')}`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1c2333; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; padding: 14mm 16mm; page-break-after: always; position: relative; }
  .page:last-child { page-break-after: avoid; }
  @page { size: A4 portrait; margin: 0; }

  /* ── Cover ─────────────────────────────────────────── */
  .cover { background: #2b3d6b; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 20px; padding: 30mm 20mm; }
  .cover-logo { font-size: 42px; font-weight: 800; letter-spacing: 4px; color: white; }
  .cover-subtitle { font-size: 13px; letter-spacing: 3px; color: rgba(255,255,255,0.6); text-transform: uppercase; }
  .cover-title-en { font-size: 28px; font-weight: 700; color: white; line-height: 1.3; margin-top: 20px; }
  .cover-title-zh { font-size: 22px; font-weight: 600; color: rgba(255,255,255,0.85); margin-top: 6px; }
  .cover-line { width: 60px; height: 4px; background: rgba(255,255,255,0.4); border-radius: 2px; margin: 16px auto; }
  .cover-badge { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); border-radius: 20px; padding: 8px 20px; font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 10px; }

  /* ── Section header ─────────────────────────────────── */
  .sec-header { margin-bottom: 18px; }
  .sec-num { display: inline-block; background: #2b3d6b; color: white; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-bottom: 6px; letter-spacing: 1px; }
  .sec-en { font-size: 22px; font-weight: 800; color: #2b3d6b; line-height: 1.2; }
  .sec-zh { font-size: 17px; font-weight: 600; color: #4a5d96; margin-top: 2px; margin-bottom: 10px; }
  .sec-rule { height: 3px; background: linear-gradient(90deg, #2b3d6b, #eef1f8); border-radius: 2px; }

  /* ── Steps layout ───────────────────────────────────── */
  .two-col { display: flex; gap: 24px; align-items: flex-start; }
  .steps-col { flex: 1; display: flex; flex-direction: column; gap: 16px; }
  .img-col { flex: 0 0 175px; display: flex; flex-direction: column; gap: 16px; align-items: center; }
  .step { display: flex; gap: 12px; align-items: flex-start; }
  .step-num { background: #2b3d6b; color: white; font-size: 12px; font-weight: 700; min-width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step-body {}
  .step-en { font-size: 13px; font-weight: 600; color: #1c2333; margin-bottom: 2px; line-height: 1.4; }
  .step-zh { font-size: 11px; color: #4a5d96; line-height: 1.5; margin-bottom: 4px; font-weight: 500; }
  .step-desc-en { font-size: 11px; color: #555; line-height: 1.6; }
  .step-desc-zh { font-size: 10px; color: #888; line-height: 1.6; margin-top: 2px; }

  /* ── Screenshots ────────────────────────────────────── */
  .phone-frame { background: #f4f6fb; border: 1.5px solid #dde1ed; border-radius: 14px; padding: 6px; box-shadow: 0 4px 18px rgba(43,61,107,0.12); }
  .phone-frame img { border-radius: 10px; width: 100%; display: block; }
  .img-label { font-size: 9px; color: #888; text-align: center; margin-top: 5px; font-style: italic; }
  .full-img { width: 100%; border-radius: 12px; border: 1.5px solid #dde1ed; box-shadow: 0 4px 18px rgba(43,61,107,0.10); }

  /* ── Note box ───────────────────────────────────────── */
  .note { background: #eef1f8; border-left: 4px solid #2b3d6b; border-radius: 0 8px 8px 0; padding: 10px 14px; margin: 14px 0; }
  .note-icon { font-size: 14px; margin-bottom: 4px; }
  .note-en { font-size: 11px; color: #2b3d6b; line-height: 1.6; font-weight: 500; }
  .note-zh { font-size: 10px; color: #4a5d96; margin-top: 3px; line-height: 1.5; }

  /* ── Table of contents ──────────────────────────────── */
  .toc-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px dashed #e0e4f0; gap: 12px; }
  .toc-num { font-size: 13px; font-weight: 700; color: #2b3d6b; min-width: 24px; }
  .toc-text { flex: 1; }
  .toc-en { font-size: 13px; font-weight: 600; color: #1c2333; }
  .toc-zh { font-size: 11px; color: #4a5d96; }
  .toc-dot { flex: 1; border-bottom: 1.5px dotted #c8cedf; margin: 0 8px; }
  .toc-page { font-size: 11px; color: #888; }

  /* ── Feature grid ───────────────────────────────────── */
  .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
  .feature-card { background: #f7f8fb; border: 1px solid #e0e4f0; border-radius: 10px; padding: 12px; }
  .feature-icon { font-size: 20px; margin-bottom: 6px; }
  .feature-en { font-size: 12px; font-weight: 600; color: #2b3d6b; }
  .feature-zh { font-size: 10px; color: #4a5d96; margin-top: 2px; }
  .feature-desc-en { font-size: 10px; color: #666; margin-top: 4px; line-height: 1.5; }
  .feature-desc-zh { font-size: 9px; color: #888; margin-top: 2px; line-height: 1.5; }

  /* ── Row img layout ─────────────────────────────────── */
  .img-row { display: flex; gap: 12px; margin-top: 14px; }
  .img-row .phone-frame { flex: 1; }

  /* ── Footer ─────────────────────────────────────────── */
  .footer { position: absolute; bottom: 10mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e0e4f0; padding-top: 6px; }
  .footer-brand { font-size: 9px; color: #2b3d6b; font-weight: 600; letter-spacing: 1px; }
  .footer-text { font-size: 9px; color: #aaa; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- COVER PAGE                                                  -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page cover">
  <div class="cover-logo">GLADEN</div>
  <div class="cover-subtitle">Maintenance Services (S) Pte Ltd</div>
  <div class="cover-line"></div>
  <div class="cover-title-en">Employee Portal<br>User Guide</div>
  <div class="cover-title-zh">员工门户使用指南</div>
  <div class="cover-line"></div>
  <div class="cover-badge">📱 Gladen HR App · English &amp; 中文</div>
  <div style="position:absolute;bottom:20mm;left:0;right:0;text-align:center;font-size:10px;color:rgba(255,255,255,0.4);">For internal use only · 仅供内部使用</div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- TABLE OF CONTENTS                                           -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="sec-header">
    <div class="sec-en">Contents</div>
    <div class="sec-zh">目录</div>
    <div class="sec-rule"></div>
  </div>
  <div class="toc-item"><span class="toc-num">1</span><div class="toc-text"><div class="toc-en">Logging In</div><div class="toc-zh">登录</div></div><span class="toc-dot"></span></div>
  <div class="toc-item"><span class="toc-num">2</span><div class="toc-text"><div class="toc-en">Home Page</div><div class="toc-zh">主页</div></div><span class="toc-dot"></span></div>
  <div class="toc-item"><span class="toc-num">3</span><div class="toc-text"><div class="toc-en">Leave Management</div><div class="toc-zh">请假管理</div></div><span class="toc-dot"></span></div>
  <div class="toc-item"><span class="toc-num">4</span><div class="toc-text"><div class="toc-en">Payslips</div><div class="toc-zh">工资单</div></div><span class="toc-dot"></span></div>
  <div class="toc-item"><span class="toc-num">5</span><div class="toc-text"><div class="toc-en">Announcements</div><div class="toc-zh">公告</div></div><span class="toc-dot"></span></div>
  <div class="toc-item"><span class="toc-num">6</span><div class="toc-text"><div class="toc-en">Notifications</div><div class="toc-zh">通知</div></div><span class="toc-dot"></span></div>
  <div class="toc-item"><span class="toc-num">7</span><div class="toc-text"><div class="toc-en">My Profile</div><div class="toc-zh">个人资料</div></div><span class="toc-dot"></span></div>
  <div class="toc-item"><span class="toc-num">8</span><div class="toc-text"><div class="toc-en">Signing Out</div><div class="toc-zh">退出登录</div></div><span class="toc-dot"></span></div>

  <div class="note" style="margin-top:30px;">
    <div class="note-icon">📱</div>
    <div class="note-en">The Gladen HR app works on any smartphone browser. For the best experience, add it to your home screen when prompted.</div>
    <div class="note-zh">格莱登HR应用可在任何智能手机浏览器上使用。为获得最佳体验，当系统提示时请将其添加到您的主屏幕。</div>
  </div>

  <div class="feature-grid">
    <div class="feature-card"><div class="feature-icon">📅</div><div class="feature-en">Leave Management</div><div class="feature-zh">请假管理</div><div class="feature-desc-en">View balance &amp; apply for leave anytime</div><div class="feature-desc-zh">随时查看假期余额及申请请假</div></div>
    <div class="feature-card"><div class="feature-icon">💰</div><div class="feature-en">Payslips</div><div class="feature-zh">工资单</div><div class="feature-desc-en">View and download your monthly payslips</div><div class="feature-desc-zh">查看并下载每月工资单</div></div>
    <div class="feature-card"><div class="feature-icon">📢</div><div class="feature-en">Announcements</div><div class="feature-zh">公告</div><div class="feature-desc-en">Stay updated with company announcements</div><div class="feature-desc-zh">随时了解公司公告</div></div>
    <div class="feature-card"><div class="feature-icon">👤</div><div class="feature-en">My Profile</div><div class="feature-zh">个人资料</div><div class="feature-desc-en">View your employment details and documents</div><div class="feature-desc-zh">查看您的就业详情及文件</div></div>
  </div>

  <div class="footer"><span class="footer-brand">GLADEN HR</span><span class="footer-text">Employee User Guide · 员工使用指南</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- SECTION 1 — LOGGING IN                                      -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="sec-header">
    <div class="sec-num">SECTION 1</div>
    <div class="sec-en">Logging In</div>
    <div class="sec-zh">登录</div>
    <div class="sec-rule"></div>
  </div>

  <div class="two-col">
    <div class="steps-col">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <div class="step-en">Open the Gladen HR app</div>
          <div class="step-zh">打开格莱登HR应用</div>
          <div class="step-desc-en">Open your browser and go to the Gladen HR link provided by your manager, or tap the app icon on your home screen.</div>
          <div class="step-desc-zh">打开浏览器并访问经理提供的格莱登HR链接，或点击主屏幕上的应用图标。</div>
        </div>
      </div>

      <div class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <div class="step-en">Enter your Singapore mobile number</div>
          <div class="step-zh">输入您的新加坡手机号码</div>
          <div class="step-desc-en">Type your 8-digit mobile number in the field. The +65 country code is already filled in. Then tap <strong>Send Code</strong>.</div>
          <div class="step-desc-zh">在输入框中输入您的8位手机号码。+65国家代码已自动填入。然后点击<strong>发送验证码</strong>。</div>
        </div>
      </div>

      <div class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <div class="step-en">Enter the 6-digit verification code</div>
          <div class="step-zh">输入6位验证码</div>
          <div class="step-desc-en">You will receive a 6-digit code via SMS. Enter it in the verification field and tap <strong>Verify &amp; Sign In</strong>.</div>
          <div class="step-desc-zh">您将通过短信收到一个6位验证码。在验证框中输入该验证码，然后点击<strong>验证并登录</strong>。</div>
        </div>
      </div>

      <div class="note">
        <div class="note-icon">⚠️</div>
        <div class="note-en">The verification code expires in 60 seconds. If it expires, tap <strong>Back</strong> and request a new code.</div>
        <div class="note-zh">验证码在60秒内有效。如果过期，请点击<strong>返回</strong>并重新申请验证码。</div>
      </div>

      <div class="note">
        <div class="note-icon">🔒</div>
        <div class="note-en">Only registered mobile numbers can log in. Contact your manager if your number is not recognised.</div>
        <div class="note-zh">只有已注册的手机号码才能登录。如果您的号码无法识别，请联系您的经理。</div>
      </div>
    </div>

    <div class="img-col">
      <div>
        <div class="phone-frame"><img src="${img('01-login-empty.png')}" /></div>
        <div class="img-label">Login screen · 登录页面</div>
      </div>
      <div>
        <div class="phone-frame"><img src="${img('03-otp.png')}" /></div>
        <div class="img-label">Enter OTP · 输入验证码</div>
      </div>
    </div>
  </div>

  <div class="footer"><span class="footer-brand">GLADEN HR</span><span class="footer-text">Employee User Guide · 员工使用指南</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- SECTION 2 — HOME PAGE                                       -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="sec-header">
    <div class="sec-num">SECTION 2</div>
    <div class="sec-en">Home Page</div>
    <div class="sec-zh">主页</div>
    <div class="sec-rule"></div>
  </div>

  <div class="two-col">
    <div class="steps-col">
      <p style="font-size:12px;color:#555;line-height:1.7;margin-bottom:14px;">After logging in, you will see your personal dashboard. It shows a summary of everything you need at a glance.</p>
      <p style="font-size:10px;color:#888;line-height:1.7;margin-bottom:18px;">登录后，您将看到个人仪表板，它显示您需要一目了然的所有摘要信息。</p>

      <div class="step">
        <div class="step-num">A</div>
        <div class="step-body">
          <div class="step-en">Welcome greeting &amp; date</div>
          <div class="step-zh">欢迎问候与日期</div>
          <div class="step-desc-en">Your name and today's date are shown in the top card.</div>
          <div class="step-desc-zh">您的姓名和今天的日期显示在顶部卡片中。</div>
        </div>
      </div>

      <div class="step">
        <div class="step-num">B</div>
        <div class="step-body">
          <div class="step-en">Leave balance tiles</div>
          <div class="step-zh">假期余额方块</div>
          <div class="step-desc-en">Annual leave and sick leave days remaining are shown. Tap either tile to go to your Leave page.</div>
          <div class="step-desc-zh">显示剩余年假和病假天数。点击任意方块可跳转到请假页面。</div>
        </div>
      </div>

      <div class="step">
        <div class="step-num">C</div>
        <div class="step-body">
          <div class="step-en">Latest pay &amp; unread announcements</div>
          <div class="step-zh">最新工资与未读公告</div>
          <div class="step-desc-en">See your most recent net pay and how many announcements you haven't read yet.</div>
          <div class="step-desc-zh">查看您最近的实发工资以及尚未阅读的公告数量。</div>
        </div>
      </div>

      <div class="step">
        <div class="step-num">D</div>
        <div class="step-body">
          <div class="step-en">Bottom navigation bar</div>
          <div class="step-zh">底部导航栏</div>
          <div class="step-desc-en">Use the tabs at the bottom — Home, Leave, Payslips, Announcements, Profile — to navigate between sections.</div>
          <div class="step-desc-zh">使用底部标签页——主页、请假、工资单、公告、个人资料——在各部分之间导航。</div>
        </div>
      </div>
    </div>

    <div class="img-col">
      <div>
        <div class="phone-frame"><img src="${img('04-home.png')}" /></div>
        <div class="img-label">Home dashboard · 主页仪表板</div>
      </div>
    </div>
  </div>

  <div class="footer"><span class="footer-brand">GLADEN HR</span><span class="footer-text">Employee User Guide · 员工使用指南</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- SECTION 3 — LEAVE MANAGEMENT                                -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="sec-header">
    <div class="sec-num">SECTION 3</div>
    <div class="sec-en">Leave Management</div>
    <div class="sec-zh">请假管理</div>
    <div class="sec-rule"></div>
  </div>

  <div class="two-col">
    <div class="steps-col">
      <p style="font-size:12px;color:#555;line-height:1.7;margin-bottom:6px;">Tap <strong>Leave</strong> in the bottom bar to manage your leave.</p>
      <p style="font-size:10px;color:#888;line-height:1.7;margin-bottom:14px;">点击底部导航栏的<strong>请假</strong>来管理您的请假。</p>

      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <div class="step-en">View your leave balance</div>
          <div class="step-zh">查看您的假期余额</div>
          <div class="step-desc-en">At the top of the Leave page you will see your Annual Leave, Sick Leave, and Hospitalisation Leave balances with the number of days used and available.</div>
          <div class="step-desc-zh">在请假页面顶部，您可以看到年假、病假和住院假的余额，包括已使用天数和可用天数。</div>
        </div>
      </div>

      <div class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <div class="step-en">Apply for leave</div>
          <div class="step-zh">申请请假</div>
          <div class="step-desc-en">Scroll down to the <strong>Apply for Leave</strong> form. Fill in all the required fields:</div>
          <div class="step-desc-zh">向下滚动到<strong>申请请假</strong>表格，填写所有必填项：</div>
          <ul style="margin-top:6px;padding-left:16px;font-size:10px;color:#555;line-height:1.8;">
            <li><strong>Leave Type</strong> — Annual / Sick / Hospitalisation / No Pay<br><span style="color:#888;">假期类型 — 年假 / 病假 / 住院假 / 无薪假</span></li>
            <li><strong>Start Date</strong> — First day of leave<br><span style="color:#888;">开始日期 — 请假第一天</span></li>
            <li><strong>End Date</strong> — Last day of leave<br><span style="color:#888;">结束日期 — 请假最后一天</span></li>
            <li><strong>Reason</strong> — Optional description<br><span style="color:#888;">原因 — 可选说明</span></li>
          </ul>
        </div>
      </div>

      <div class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <div class="step-en">Submit your application</div>
          <div class="step-zh">提交申请</div>
          <div class="step-desc-en">Tap <strong>Submit</strong>. Your application will be sent to your manager for approval. You will be notified once it is approved or rejected.</div>
          <div class="step-desc-zh">点击<strong>提交</strong>。您的申请将发送给经理审批。审批结果将通知您。</div>
        </div>
      </div>

      <div class="note">
        <div class="note-icon">💡</div>
        <div class="note-en">Sick leave and hospitalisation leave require a medical certificate (MC). Please submit it to your manager separately.</div>
        <div class="note-zh">病假和住院假需要医疗证明（MC）。请将其单独提交给您的经理。</div>
      </div>
    </div>

    <div class="img-col">
      <div>
        <div class="phone-frame"><img src="${img('05-leave-top.png')}" /></div>
        <div class="img-label">Leave balance · 假期余额</div>
      </div>
      <div>
        <div class="phone-frame"><img src="${img('06-leave-apply-form.png')}" /></div>
        <div class="img-label">Apply form · 申请表格</div>
      </div>
    </div>
  </div>

  <div class="footer"><span class="footer-brand">GLADEN HR</span><span class="footer-text">Employee User Guide · 员工使用指南</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- SECTION 4 — PAYSLIPS                                        -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="sec-header">
    <div class="sec-num">SECTION 4</div>
    <div class="sec-en">Payslips</div>
    <div class="sec-zh">工资单</div>
    <div class="sec-rule"></div>
  </div>

  <div class="two-col">
    <div class="steps-col">
      <p style="font-size:12px;color:#555;line-height:1.7;margin-bottom:6px;">Tap <strong>Payslips</strong> in the bottom bar to view your salary details.</p>
      <p style="font-size:10px;color:#888;line-height:1.7;margin-bottom:14px;">点击底部导航栏的<strong>工资单</strong>查看您的薪资详情。</p>

      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <div class="step-en">View the payslip list</div>
          <div class="step-zh">查看工资单列表</div>
          <div class="step-desc-en">The Payslips page shows all your payslips sorted by month, with the net pay amount displayed for each one.</div>
          <div class="step-desc-zh">工资单页面按月份显示您所有的工资单，每份工资单都显示实发工资金额。</div>
        </div>
      </div>

      <div class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <div class="step-en">Open a payslip</div>
          <div class="step-zh">查看工资单详情</div>
          <div class="step-desc-en">Tap any payslip row to open the full details. You will see a breakdown of your earnings and deductions.</div>
          <div class="step-desc-zh">点击任意工资单行可查看完整详情，包括收入和扣款明细。</div>
        </div>
      </div>

      <div class="step">
        <div class="step-num">3</div>
        <div class="step-body">
          <div class="step-en">Understanding your payslip</div>
          <div class="step-zh">了解您的工资单</div>
          <div class="step-desc-en">Your payslip includes:</div>
          <div class="step-desc-zh">您的工资单包括：</div>
          <ul style="margin-top:6px;padding-left:16px;font-size:10px;color:#555;line-height:1.8;">
            <li><strong>Basic Salary</strong> — Your base monthly pay · <span style="color:#888;">基本工资 — 每月基本薪酬</span></li>
            <li><strong>Allowances</strong> — Additional payments · <span style="color:#888;">津贴 — 额外报酬</span></li>
            <li><strong>CPF Deductions</strong> — Employee &amp; employer CPF · <span style="color:#888;">公积金扣除 — 雇员和雇主公积金</span></li>
            <li><strong>Net Pay</strong> — Amount paid to your bank · <span style="color:#888;">实发工资 — 实际到账金额</span></li>
          </ul>
        </div>
      </div>

      <div class="note">
        <div class="note-icon">📄</div>
        <div class="note-en">Payslips are uploaded by your manager each month. If you notice any discrepancy, please contact HR immediately.</div>
        <div class="note-zh">工资单每月由经理上传。如发现任何差异，请立即联系人力资源部门。</div>
      </div>
    </div>

    <div class="img-col">
      <div>
        <div class="phone-frame"><img src="${img('07-payslips.png')}" /></div>
        <div class="img-label">Payslip list · 工资单列表</div>
      </div>
      <div>
        <div class="phone-frame"><img src="${img('08-payslip-detail-top.png')}" /></div>
        <div class="img-label">Payslip detail · 工资单详情</div>
      </div>
    </div>
  </div>

  <div class="footer"><span class="footer-brand">GLADEN HR</span><span class="footer-text">Employee User Guide · 员工使用指南</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- SECTION 5 — ANNOUNCEMENTS                                   -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="sec-header">
    <div class="sec-num">SECTION 5</div>
    <div class="sec-en">Announcements</div>
    <div class="sec-zh">公告</div>
    <div class="sec-rule"></div>
  </div>

  <div class="two-col">
    <div class="steps-col">
      <p style="font-size:12px;color:#555;line-height:1.7;margin-bottom:6px;">Tap <strong>Announcements</strong> in the bottom bar to read company news and important notices.</p>
      <p style="font-size:10px;color:#888;line-height:1.7;margin-bottom:14px;">点击底部导航栏的<strong>公告</strong>阅读公司新闻和重要通知。</p>

      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <div class="step-en">View announcements list</div>
          <div class="step-zh">查看公告列表</div>
          <div class="step-desc-en">The Announcements page shows all notices posted by management, with the newest at the top. Unread announcements are highlighted.</div>
          <div class="step-desc-zh">公告页面显示管理层发布的所有通知，最新的排在最前。未读公告会有标记。</div>
        </div>
      </div>

      <div class="step">
        <div class="step-num">2</div>
        <div class="step-body">
          <div class="step-en">Open an announcement</div>
          <div class="step-zh">打开公告</div>
          <div class="step-desc-en">Tap any announcement to expand and read the full content. The announcement is automatically marked as read.</div>
          <div class="step-desc-zh">点击任意公告可展开并阅读完整内容。公告将自动标记为已读。</div>
        </div>
      </div>

      <div class="note">
        <div class="note-icon">🔔</div>
        <div class="note-en">You will receive a notification whenever a new announcement is posted. The bell icon at the top of the screen will show a red badge with the count.</div>
        <div class="note-zh">每当发布新公告时，您将收到通知。屏幕顶部的铃铛图标将显示红色徽章及数量。</div>
      </div>

      <br/>

      <!-- Section 6 inline -->
      <div class="sec-header" style="margin-top:6px;">
        <div class="sec-num">SECTION 6</div>
        <div class="sec-en">Notifications</div>
        <div class="sec-zh">通知</div>
        <div class="sec-rule"></div>
      </div>

      <p style="font-size:12px;color:#555;line-height:1.7;margin-bottom:6px;">Tap the 🔔 bell icon in the top-right corner to view all your notifications.</p>
      <p style="font-size:10px;color:#888;line-height:1.7;margin-bottom:12px;">点击右上角的🔔铃铛图标查看所有通知。</p>

      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <div class="step-en">Notifications include</div>
          <div class="step-zh">通知内容包括</div>
          <ul style="margin-top:6px;padding-left:16px;font-size:10px;color:#555;line-height:1.8;">
            <li>Leave approved or rejected · <span style="color:#888;">请假批准或拒绝</span></li>
            <li>New announcements · <span style="color:#888;">新公告</span></li>
            <li>New payslip uploaded · <span style="color:#888;">新工资单上传</span></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="img-col">
      <div>
        <div class="phone-frame"><img src="${img('09-announcements.png')}" /></div>
        <div class="img-label">Announcements · 公告列表</div>
      </div>
      <div>
        <div class="phone-frame"><img src="${img('12-notifications.png')}" /></div>
        <div class="img-label">Notifications · 通知</div>
      </div>
    </div>
  </div>

  <div class="footer"><span class="footer-brand">GLADEN HR</span><span class="footer-text">Employee User Guide · 员工使用指南</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- SECTION 7 — PROFILE + SECTION 8 — SIGN OUT                 -->
<!-- ═══════════════════════════════════════════════════════════ -->
<div class="page">
  <div class="sec-header">
    <div class="sec-num">SECTION 7</div>
    <div class="sec-en">My Profile</div>
    <div class="sec-zh">个人资料</div>
    <div class="sec-rule"></div>
  </div>

  <div class="two-col">
    <div class="steps-col">
      <p style="font-size:12px;color:#555;line-height:1.7;margin-bottom:6px;">Tap <strong>Profile</strong> in the bottom bar to view your personal employment details.</p>
      <p style="font-size:10px;color:#888;line-height:1.7;margin-bottom:14px;">点击底部导航栏的<strong>个人资料</strong>查看您的个人就业信息。</p>

      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <div class="step-en">Your profile shows</div>
          <div class="step-zh">您的资料页显示</div>
          <ul style="margin-top:6px;padding-left:16px;font-size:10px;color:#555;line-height:1.8;">
            <li>Full name &amp; mobile number · <span style="color:#888;">全名和手机号码</span></li>
            <li>Job title &amp; department · <span style="color:#888;">职位和部门</span></li>
            <li>Employment start date · <span style="color:#888;">入职日期</span></li>
            <li>Work schedule (5 or 6 days) · <span style="color:#888;">工作安排（5天或6天）</span></li>
            <li>Employment documents (e.g. Work Permit) · <span style="color:#888;">就业文件（如工作准证）</span></li>
          </ul>
        </div>
      </div>

      <div class="note">
        <div class="note-icon">ℹ️</div>
        <div class="note-en">Your profile is managed by your manager. If any details are incorrect, please contact HR to update them.</div>
        <div class="note-zh">您的个人资料由经理管理。如有任何错误，请联系人力资源部门更新。</div>
      </div>

      <div class="sec-header" style="margin-top:20px;">
        <div class="sec-num">SECTION 8</div>
        <div class="sec-en">Signing Out</div>
        <div class="sec-zh">退出登录</div>
        <div class="sec-rule"></div>
      </div>

      <div class="step">
        <div class="step-num">1</div>
        <div class="step-body">
          <div class="step-en">Tap "Sign Out" in the top-right corner</div>
          <div class="step-zh">点击右上角的"退出登录"</div>
          <div class="step-desc-en">The <strong>Sign Out</strong> button is located in the top header bar on every page. Tap it to securely log out of your account.</div>
          <div class="step-desc-zh"><strong>退出登录</strong>按钮位于每个页面顶部标题栏。点击它可安全退出您的账户。</div>
        </div>
      </div>

      <div class="note" style="margin-top:10px;">
        <div class="note-icon">🔐</div>
        <div class="note-en">Always sign out when using a shared device. Your session will remain active until you sign out or the session expires.</div>
        <div class="note-zh">在使用共享设备时请务必退出登录。您的会话将保持活跃状态，直到您退出登录或会话过期。</div>
      </div>

      <div style="margin-top:24px;background:#f7f8fb;border-radius:10px;padding:14px;border:1px solid #e0e4f0;">
        <div style="font-size:12px;font-weight:700;color:#2b3d6b;margin-bottom:6px;">Need help? · 需要帮助？</div>
        <div style="font-size:11px;color:#555;line-height:1.7;">Contact your manager or HR representative if you experience any issues with the app.</div>
        <div style="font-size:10px;color:#888;margin-top:4px;line-height:1.7;">如果您在使用应用程序时遇到任何问题，请联系您的经理或人力资源代表。</div>
      </div>
    </div>

    <div class="img-col">
      <div>
        <div class="phone-frame"><img src="${img('11-profile.png')}" /></div>
        <div class="img-label">My Profile · 个人资料</div>
      </div>
    </div>
  </div>

  <div class="footer"><span class="footer-brand">GLADEN HR</span><span class="footer-text">Employee User Guide · 员工使用指南</span></div>
</div>

</body>
</html>`;

fs.writeFileSync('/Users/Clarence/gladen-hr/employee-guide.html', html);
console.log('HTML written');

// Generate PDF
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.pdf({
  path: '/Users/Clarence/gladen-hr/Gladen_HR_Employee_Guide.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await browser.close();
console.log('PDF saved: Gladen_HR_Employee_Guide.pdf');
