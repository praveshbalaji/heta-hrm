import { HETA_LOGO_DATA_URL } from "./hetaLogoBase64";
/**
 * HETA-HRM Clean Print & PDF Generator
 * Opens a dedicated print window with A4 Landscape / Portrait formatting,
 * strictly supporting 3 attendance options: PRESENT, ABSENT, HOLIDAY (green, red, blue).
 */

export function printOverallReport({ startDate, endDate, days, matrix, role = 'STUDENT' }) {
  const printWindow = window.open('', '_blank', 'width=1300,height=900');
  if (!printWindow) {
    alert('Please allow popups to download/print the complete PDF report.');
    return;
  }

  // Calculate totals
  const totalStudents = matrix.length;
  let grandPresent = 0;
  let grandAbsent = 0;
  let grandHoliday = 0;

  matrix.forEach(row => {
    grandPresent += row.presentCount || 0;
    grandAbsent += row.absentCount || 0;
    grandHoliday += row.holidayCount || 0;
  });

  const totalMarked = grandPresent + grandAbsent;
  const overallRate = totalMarked > 0 ? ((grandPresent / totalMarked) * 100).toFixed(1) : 0;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HETA-HRM Overall Attendance Register (${startDate} to ${endDate})</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0;
      padding: 10px;
      color: #000;
      background: #fff;
      font-size: 10px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #127171;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      height: 56px;
      width: auto;
      object-fit: contain;
    }
    .title h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #111;
      letter-spacing: 0.5px;
    }
    .title p {
      margin: 2px 0 0;
      font-size: 11px;
      color: #555;
    }
    .meta-box {
      text-align: right;
      font-size: 10px;
      color: #444;
    }
    .meta-box strong { color: #000; }
    .kpi-bar {
      display: flex;
      gap: 15px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 11px;
    }
    .kpi-bar div { font-weight: 600; }
    .kpi-bar span { color: #0e6234; font-weight: 800; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
    }
    th, td {
      border: 1px solid #475569;
      padding: 4px 3px;
      text-align: center;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }
    .text-left { text-align: left; }
    .name-col { min-width: 130px; font-weight: 600; }
    .badge-p { background: #dcfce7; color: #15803d; font-weight: bold; }
    .badge-a { background: #fee2e2; color: #b91c1c; font-weight: bold; }
    .badge-h { background: #dbeafe; color: #1d4ed8; font-weight: bold; }
    .weekend { background: #f1f5f9; color: #94a3b8; }
    .footer-signs {
      display: flex;
      justify-content: space-between;
      margin-top: 35px;
      padding: 0 30px;
    }
    .sign-box {
      text-align: center;
      border-top: 1px solid #000;
      padding-top: 4px;
      width: 160px;
      font-size: 10px;
      font-weight: 600;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${HETA_LOGO_DATA_URL}" alt="HETA Logo" class="brand-logo" />
      <div class="title">
        <h1 style="color:#127171;">HETA HIGHER EDUCATION & TRAINING ACADEMY</h1>
        <p>Comprehensive Attendance Register • 3-Option System: PRESENT, ABSENT, HOLIDAY</p>
      </div>
    </div>
    <div class="meta-box">
      <div><strong>Date Range:</strong> ${startDate} to ${endDate}</div>
      <div><strong>Category:</strong> ${role === 'STUDENT' ? 'Students Register' : 'Staff Register'}</div>
      <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="kpi-bar">
    <div>Total Enrolled: <span>${totalStudents}</span></div>
    <div>Total Days in Range: <span>${days.length}</span></div>
    <div>Total Present: <span style="color:#15803d">${grandPresent}</span></div>
    <div>Total Absent: <span style="color:#b91c1c">${grandAbsent}</span></div>
    <div>Holiday / Approved Leave: <span style="color:#1d4ed8">${grandHoliday}</span></div>
    <div>Overall Attendance Rate: <span style="color:#b89028">${overallRate}%</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="text-left name-col" style="padding-left:6px">Name & ID</th>
        <th class="text-left" style="min-width:80px">Batch</th>
        ${days.map(d => `<th style="${d.isWeekend ? 'background:#e2e8f0;color:#64748b' : ''}">${d.day}<br><span style="font-size:8px;font-weight:400">${d.weekday}</span></th>`).join('')}
        <th style="background:#dcfce7;color:#15803d">P</th>
        <th style="background:#fee2e2;color:#b91c1c">A</th>
        <th style="background:#dbeafe;color:#1d4ed8">H</th>
        <th style="background:#fef9c3;color:#854d0e">Rate</th>
      </tr>
    </thead>
    <tbody>
      ${matrix.map(row => {
        const m = row.member || row || {};
        return `<tr>
          <td class="text-left name-col" style="padding-left:6px">
            <strong>${m.name || 'Member'}</strong> <span style="font-size:8px;color:#64748b">(${m.code || ''})</span>
          </td>
          <td class="text-left">${m.batch || 'Batch-2026-A'}</td>
          ${days.map(d => {
            const dayInfo = row.days ? row.days[d.date] : (row.records ? row.records[d.date] : null);
            const st = typeof dayInfo === 'string' ? dayInfo : (dayInfo ? dayInfo.status : '-');
            if (st === 'PRESENT') return '<td class="badge-p">P</td>';
            if (st === 'ABSENT') return '<td class="badge-a">A</td>';
            if (st === 'HOLIDAY') return '<td class="badge-h">H</td>';
            if (d.isWeekend) return '<td class="badge-h">H</td>';
            return '<td>-</td>';
          }).join('')}
          <td style="font-weight:bold;color:#15803d">${row.presentCount || 0}</td>
          <td style="font-weight:bold;color:#b91c1c">${row.absentCount || 0}</td>
          <td style="font-weight:bold;color:#1d4ed8">${row.holidayCount || 0}</td>
          <td style="font-weight:bold;color:#854d0e">${row.attendanceRate}%</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="footer-signs">
    <div class="sign-box">Faculty / Trainer Signature</div>
    <div class="sign-box">Academic Coordinator</div>
    <div class="sign-box">Principal / Director</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printIndividualReport({ member, stats, history, startDate, endDate }) {
  const printWindow = window.open('', '_blank', 'width=1100,height=900');
  if (!printWindow) {
    alert('Please allow popups to download/print the complete PDF report.');
    return;
  }

  const isBelow75 = (stats.attendanceRate || 0) < 75;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HETA-HRM Report - ${member.name} (${startDate} to ${endDate})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      margin: 0;
      padding: 12px;
      color: #000;
      background: #fff;
      font-size: 11px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #127171;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      height: 58px;
      width: auto;
      object-fit: contain;
    }
    .title h1 {
      margin: 0;
      font-size: 19px;
      font-weight: 800;
      color: #111;
    }
    .title p {
      margin: 2px 0 0;
      font-size: 12px;
      color: #555;
    }
    .profile-card {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .profile-info div { margin-bottom: 4px; font-size: 11.5px; }
    .profile-info strong { color: #000; }
    .rate-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fff;
      border: 2px solid ${isBelow75 ? '#ef4444' : '#10b981'};
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .rate-val {
      font-size: 26px;
      font-weight: 800;
      color: ${isBelow75 ? '#dc2626' : '#15803d'};
    }
    .rate-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
    }
    .kpi-card span { display: block; font-size: 10px; color: #64748b; }
    .kpi-card strong { font-size: 16px; display: block; margin-top: 2px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #94a3b8;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
    }
    .badge-present { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-absent { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-holiday { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
    .badge-weekend { background: #f1f5f9; color: #64748b; }
    .footer-signs {
      display: flex;
      justify-content: space-between;
      margin-top: 45px;
      padding: 0 40px;
    }
    .sign-box {
      text-align: center;
      border-top: 1px solid #000;
      padding-top: 4px;
      width: 180px;
      font-size: 11px;
      font-weight: 600;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="title">
        <h1>HETA HIGHER EDUCATION & TRAINING ACADEMY</h1>
        <p>Individual Student Attendance & Progress Report</p>
      </div>
    </div>
    <div style="text-align:right; font-size:10px; color:#555">
      <div><strong>Date Range:</strong> ${startDate} to ${endDate}</div>
      <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="profile-card">
    <div class="profile-info">
      <div><strong>Student Name:</strong> ${member.name}</div>
      <div><strong>Roll Code:</strong> ${member.code} &nbsp;|&nbsp; <strong>Role:</strong> ${member.role}</div>
      <div><strong>Course:</strong> ${member.course || 'Python Programming'} &nbsp;|&nbsp; <strong>Batch:</strong> ${member.batch || 'Batch-2026-A'}</div>
      <div><strong>Parent / Guardian:</strong> ${member.parentName || 'Parent'} &nbsp;|&nbsp; <strong>Phone:</strong> ${member.parentPhone || 'Not set'}</div>
      <div><strong>Parent Email:</strong> ${member.parentEmail || 'Not set'}</div>
    </div>
    <div class="rate-box">
      <div class="rate-val">${stats.attendanceRate}%</div>
      <div class="rate-label">Attendance Rate</div>
      <div style="font-size:10px;font-weight:bold;margin-top:4px;color:${isBelow75 ? '#dc2626' : '#15803d'}">
        ${isBelow75 ? '⚠️ Below 75% Threshold' : '✓ Good Standing'}
      </div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <span>Total Working Days</span>
      <strong>${stats.presentDays + stats.absentDays}</strong>
    </div>
    <div class="kpi-card">
      <span>Days Present</span>
      <strong style="color:#15803d">${stats.presentDays}</strong>
    </div>
    <div class="kpi-card">
      <span>Days Absent</span>
      <strong style="color:#b91c1c">${stats.absentDays}</strong>
    </div>
    <div class="kpi-card">
      <span>Holiday / Approved Leave</span>
      <strong style="color:#1d4ed8">${stats.holidayDays || 0}</strong>
    </div>
  </div>

  <h3 style="margin:12px 0 6px; font-size:13px; color:#0f172a">Daily Attendance Record Log</h3>
  <table>
    <thead>
      <tr>
        <th style="width:110px">Date</th>
        <th style="width:70px">Day</th>
        <th style="width:130px">Attendance Status</th>
        <th style="width:90px">In Time</th>
        <th style="width:90px">Out Time</th>
        <th>Remarks / Session Notes</th>
      </tr>
    </thead>
    <tbody>
      ${history.map(h => {
        let badgeClass = 'badge-weekend';
        let label = h.status;
        if (h.status === 'PRESENT') { badgeClass = 'badge-present'; label = '✓ PRESENT'; }
        else if (h.status === 'ABSENT') { badgeClass = 'badge-absent'; label = '✕ ABSENT'; }
        else if (h.status === 'HOLIDAY') { badgeClass = 'badge-holiday'; label = '✦ HOLIDAY'; }
        else if (h.isWeekend) { badgeClass = 'badge-holiday'; label = '✦ HOLIDAY'; }

        return `<tr>
          <td><strong>${h.date}</strong></td>
          <td>${h.weekday}</td>
          <td><span class="badge ${badgeClass}">${label}</span></td>
          <td>${h.inTime || '-'}</td>
          <td>${h.outTime || '-'}</td>
          <td>${h.notes || '-'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="footer-signs">
    <div class="sign-box">Faculty / Trainer Signature</div>
    <div class="sign-box">Parent / Guardian Signature</div>
    <div class="sign-box">Principal / Director</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
