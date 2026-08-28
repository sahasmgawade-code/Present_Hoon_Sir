import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useSelectedBatch } from '../hooks/useSelectedBatch.js';
import AttendancePie from '../components/AttendancePie.jsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { todayIST } from '../utils/date.js';
const PHS_BRAND = {
  bg: [35, 79, 56],       // #234F38 forestDark
  gold: [184, 132, 46],   // #B8842E brick/gold
  cream: [239, 238, 230], // #EFEEE6 paper
};
function drawPhsLogoMark(doc, x, y, size) {
  const s = size / 140; // scale factor from the 140x140 Logo.jsx viewBox
  doc.setFillColor(...PHS_BRAND.bg);
  doc.roundedRect(x, y, size, size, size * 0.2, size * 0.2, 'F');
  doc.setFillColor(...PHS_BRAND.gold);
  doc.rect(x + 16 * s, y + 16 * s, 9 * s, 9 * s, 'F');
  doc.rect(x + 30 * s, y + 16 * s, 9 * s, 9 * s, 'F');
  doc.rect(x + 16 * s, y + 30 * s, 9 * s, 9 * s, 'F');
  doc.setDrawColor(...PHS_BRAND.cream);
  doc.setLineWidth(Math.max(size * 0.09, 0.6));
  doc.setLineCap('round');
  doc.setLineJoin('round');
  doc.line(x + 24 * s, y + 80 * s, x + 52 * s, y + 108 * s);
  doc.line(x + 52 * s, y + 108 * s, x + 118 * s, y + 34 * s);
}
function addPhsHeader(doc, reportTitle, subtitleLines = []) {
  const logoSize = 12;
  const logoX = 14;
  const logoY = 10;
  drawPhsLogoMark(doc, logoX, logoY, logoSize);
  const textX = logoX + logoSize + 4;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(35, 79, 56);
  doc.text('Present Hoon Sir!', textX, logoY + 5.5);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 110);
  doc.text('PHS-AMS - Attendance Management System', textX, logoY + 10.5);
  doc.setDrawColor(220, 218, 205);
  doc.setLineWidth(0.4);
  doc.line(14, logoY + logoSize + 4, 196, logoY + logoSize + 4);
  let cursorY = logoY + logoSize + 13;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(20, 20, 18);
  doc.text(reportTitle, 14, cursorY);
  cursorY += 7;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 55);
  subtitleLines.forEach((line) => {
    doc.text(line, 14, cursorY);
    cursorY += 6;
  });
  return cursorY + 2; // Y position where table content should start
}
function addPhsFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 218, 205);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 110);
    doc.text('Report created by Present Hoon Sir! - Attendance Management System', 14, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }
}
function StudentRow({ s, batchName, expandedId, onToggle, detail, loadingDetail }) {
  const isOpen = expandedId === s.studentId;
  const absentDates = detail ? detail.history.filter((h) => h.status === 'absent').map((h) => h.date) : [];
  function downloadStudentPdf() {
    if (!detail) return;
    const doc = new jsPDF();
    const startY = addPhsHeader(
      doc,
      `Attendance Report — ${detail.student.firstName} ${detail.student.lastName}`,
      [
        `URN: ${detail.student.urn}`,
        `Batch: ${batchName}`,
        `Present: ${detail.presentCount} / ${detail.totalWorkingDays}  (${detail.percentage}%)`,
      ]
    );
    autoTable(doc, {
      startY,
      head: [['Date', 'Status', 'Method']],
      body: detail.history.map((h) => [h.date, h.status, h.method || '-']),
    });
    addPhsFooter(doc);
    doc.save(`${detail.student.urn}-attendance.pdf`);
  }
  return (
    <div>
      <div className="p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{s.firstName} {s.lastName}</span>
            <span className="font-mono text-xs text-ink/50">{s.urn}</span>
          </div>
          <div className="text-xs text-ink/50 mt-1">
            {s.presentCount} / {s.totalWorkingDays} days present
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`font-mono text-sm font-semibold ${s.percentage < 75 ? 'text-brick' : 'text-forest'}`}>
            {s.percentage}%
          </span>
          <button
            onClick={() => onToggle(s.studentId)}
            className="px-3 py-1.5 text-sm font-medium rounded border border-rule text-ink/70 hover:bg-ink/5 transition-colors"
          >
            {isOpen ? 'Hide' : 'View'}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="px-4 pb-4">
          {loadingDetail ? (
            <p className="text-sm text-ink/50 font-mono">Loading…</p>
          ) : detail ? (
            <div className="bg-paper border border-rule rounded p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <AttendancePie percentage={detail.percentage} size={100} />
                  <div className="text-sm text-ink/60">
                    <p>{detail.student.email || 'No email'}</p>
                    <p>{detail.student.phone || 'No phone'}</p>
                  </div>
                </div>
                <button
                  onClick={downloadStudentPdf}
                  className="px-3 py-1.5 text-sm font-medium rounded glass-btn bg-forestGlass text-white hover:bg-forestGlass/70 transition-colors"
                >
                  Download PDF
                </button>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-2">
                  Absent Dates ({absentDates.length})
                </p>
                {absentDates.length === 0 ? (
                  <p className="text-xs text-ink/40">No absences recorded.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {absentDates.map((d) => (
                      <span key={d} className="font-mono text-xs bg-brick/10 text-brick rounded px-2 py-0.5">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-brick">Could not load details.</p>
          )}
        </div>
      )}
    </div>
  );
}
function CollapsibleSection({ title, colorClass, count, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-2"
      >
        <h2 className={`font-display text-xl ${colorClass}`}>{title} ({count})</h2>
        <span className="text-ink/40 text-sm font-mono">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {open && children}
    </div>
  );
}
function DownloadDropdown({ label, onPdf, onExcel, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="glass-btn bg-forestGlass text-white rounded px-5 py-2 font-medium hover:bg-forestGlass/70 transition-colors disabled:opacity-60 flex items-center gap-2"
      >
        {label}
        <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-card border border-rule rounded shadow-lg z-10 overflow-hidden">
          <button
            onClick={() => { setOpen(false); onPdf(); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-ink/5 transition-colors"
          >
            Download as PDF
          </button>
          <button
            onClick={() => { setOpen(false); onExcel(); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-ink/5 transition-colors"
          >
            Download as Excel
          </button>
        </div>
      )}
    </div>
  );
}
export default function Reports() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useSelectedBatch();
  const [report, setReport] = useState(null);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeDownloading, setRangeDownloading] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    api.listBatches()
      .then((data) => {
        setBatches(data.batches);
        const stillValid = data.batches.some((b) => b.id === batchId);
        if (!stillValid) {
          setBatchId(data.batches.length > 0 ? data.batches[0].id : null);
        }
        if (data.batches.length === 0) setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);
  const loadReport = useCallback(async (id) => {
    setLoading(true);
    setError('');
    setExpandedId(null);
    setDetailCache({});
    try {
      const [reportData, todayData] = await Promise.all([
        api.getBatchReport(id),
        api.getAttendanceForDate(id, todayIST()),
      ]);
      setReport(reportData);
      setToday(todayData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (batchId) loadReport(batchId);
  }, [batchId, loadReport]);
  async function handleToggle(studentId) {
    if (expandedId === studentId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(studentId);
    if (!detailCache[studentId]) {
      setLoadingDetailId(studentId);
      try {
        const data = await api.getStudentReport(studentId);
        setDetailCache((prev) => ({ ...prev, [studentId]: data }));
      } catch (err) {
        setDetailCache((prev) => ({ ...prev, [studentId]: null }));
      } finally {
        setLoadingDetailId(null);
      }
    }
  }
  function buildPdf(reportData, batchName, subtitle) {
    const doc = new jsPDF();
    const headerEndY = addPhsHeader(doc, `Attendance Report — ${batchName}`, [
      subtitle,
      `Total working days: ${reportData.totalWorkingDays}`,
    ]);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 18);
    doc.text(`Defaulters (below 75%)`, 14, headerEndY);
    autoTable(doc, {
      startY: headerEndY + 4,
      head: [['URN', 'Name', 'Present', 'Total', '%']],
      body: reportData.defaulters.map((s) => [
        s.urn, `${s.firstName} ${s.lastName}`, s.presentCount, s.totalWorkingDays, `${s.percentage}%`,
      ]),
      headStyles: { fillColor: [166, 67, 47] },
    });
    const afterDefaulters = doc.lastAutoTable.finalY + 10;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 18);
    doc.text(`Good Standing (75% and above)`, 14, afterDefaulters);
    autoTable(doc, {
      startY: afterDefaulters + 4,
      head: [['URN', 'Name', 'Present', 'Total', '%']],
      body: reportData.goodStanding.map((s) => [
        s.urn, `${s.firstName} ${s.lastName}`, s.presentCount, s.totalWorkingDays, `${s.percentage}%`,
      ]),
      headStyles: { fillColor: [47, 111, 79] },
    });
    addPhsFooter(doc);
    return doc;
  }
  function downloadBatchPdf() {
    if (!report) return;
    const batchName = batches.find((b) => b.id === batchId)?.name || 'Batch';
    const doc = buildPdf(report, batchName, 'Full record (all time)');
    doc.save(`${batchName}-attendance-report-full.pdf`);
  }
  async function downloadRangePdf() {
    if (!rangeStart || !rangeEnd) {
      setRangeError('Pick both a start and end date.');
      return;
    }
    if (rangeStart > rangeEnd) {
      setRangeError('Start date must be before end date.');
      return;
    }
    setRangeError('');
    setRangeDownloading(true);
    try {
      const batchName = batches.find((b) => b.id === batchId)?.name || 'Batch';
      const rangeData = await api.getBatchReport(batchId, { startDate: rangeStart, endDate: rangeEnd });
      const doc = buildPdf(rangeData, batchName, `Custom range: ${rangeStart} to ${rangeEnd}`);
      doc.save(`${batchName}-attendance-report-${rangeStart}-to-${rangeEnd}.pdf`);
    } catch (err) {
      setRangeError(err.message || 'Could not generate report.');
    } finally {
      setRangeDownloading(false);
    }
  }
function buildExcelWorkbook(matrixData) {
    const { dates, students } = matrixData;
    const header = ['URN', 'Name', ...dates, 'Attendance (%)'];
    const rows = students.map((s) => {
      const dateCells = dates.map((d) => {
        const status = s.statuses[d];
        if (status === 'present') return 'P';
        if (status === 'absent') return 'A';
        return '-';
      });
      return [s.urn, `${s.firstName} ${s.lastName}`, ...dateCells, s.percentage];
    });
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 22 },
      ...dates.map(() => ({ wch: 11 })),
      { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    return workbook;
  }
  async function downloadBatchExcel() {
    if (!report) return;
    const batchName = batches.find((b) => b.id === batchId)?.name || 'Batch';
    try {
      const matrixData = await api.getBatchMatrix(batchId);
      const workbook = buildExcelWorkbook(matrixData);
      XLSX.writeFile(workbook, `${batchName}-attendance-report-full.xlsx`);
    } catch (err) {
      setError(err.message || 'Could not generate Excel report.');
    }
  }
  async function downloadRangeExcel() {
    if (!rangeStart || !rangeEnd) {
      setRangeError('Pick both a start and end date.');
      return;
    }
    if (rangeStart > rangeEnd) {
      setRangeError('Start date must be before end date.');
      return;
    }
    setRangeError('');
    setRangeDownloading(true);
    try {
      const batchName = batches.find((b) => b.id === batchId)?.name || 'Batch';
      const matrixData = await api.getBatchMatrix(batchId, { startDate: rangeStart, endDate: rangeEnd });
      const workbook = buildExcelWorkbook(matrixData);
      XLSX.writeFile(workbook, `${batchName}-attendance-report-${rangeStart}-to-${rangeEnd}.xlsx`);
    } catch (err) {
      setRangeError(err.message || 'Could not generate report.');
    } finally {
      setRangeDownloading(false);
    }
  }
  const absentToday = today?.students.filter((s) => s.status === 'absent') ?? [];
  const attendanceMarkedToday = today?.students.some((s) => s.method) ?? false;
  const overallStats = report ? [...report.goodStanding, ...report.defaulters] : [];
  function matchesSearch(s) {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    return fullName.includes(q) || s.urn.toLowerCase().includes(q);
  }
  const filteredDefaulters = report ? report.defaulters.filter(matchesSearch) : [];
  const filteredGoodStanding = report ? report.goodStanding.filter(matchesSearch) : [];
  const overallAvg =
    overallStats.length > 0
      ? Math.round((overallStats.reduce((sum, s) => sum + s.percentage, 0) / overallStats.length) * 10) / 10
      : null;
  if (batches.length === 0 && !loading) {
    return (
      <div className="text-center py-24">
        <p className="font-display text-2xl text-ink/70 mb-2">No batches yet</p>
        <p className="text-sm text-ink/50">Create a batch to see reports.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-600">Reports</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={batchId ?? ''}
            onChange={(e) => setBatchId(Number(e.target.value))}
            className="border border-rule rounded px-3 py-2 bg-card font-medium"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <DownloadDropdown
            label="Download Whole Batch"
            onPdf={downloadBatchPdf}
            onExcel={downloadBatchExcel}
            disabled={!report}
          />
        </div>
      </div>
      {error && <p className="text-brick font-medium">{error}</p>}
      {loading ? (
        <p className="text-ink/50 font-mono text-sm">Loading…</p>
      ) : report ? (
        <>
          {today && today.students.length > 0 && !attendanceMarkedToday && (
            <div className="bg-brick/10 border border-brick rounded-lg p-5 flex items-center justify-between flex-wrap gap-3">
              <p className="font-display text-lg font-600 text-brick">
                Attendance Not Marked for Today
              </p>
              <button
                onClick={() => navigate('/generate-qr')}
                className="px-4 py-2 text-sm font-medium rounded glass-btn bg-brickGlass text-white hover:bg-brickGlass/90 transition-colors"
              >
                Mark Attendance →
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-rule rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">Overall Attendance</p>
              <p className="font-display text-4xl font-600 text-ink">
                {overallAvg !== null ? `${overallAvg}%` : '—'}
              </p>
            </div>
            <div className="bg-card border border-rule rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">Working Days Recorded</p>
              <p className="font-display text-4xl font-600 text-ink">{report.totalWorkingDays}</p>
            </div>
            <div className="bg-card border border-rule rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-1">Absent Today (Count) </p>
              <p className="font-display text-4xl font-600 text-brick">{absentToday.length}</p>
            </div>
          </div>
          {attendanceMarkedToday && (
            <div className="bg-card border border-rule rounded-lg p-5">
              <p className="text-xs font-mono uppercase tracking-wide text-ink/50 mb-3">Absent Students Today</p>
              {absentToday.length === 0 ? (
                <p className="text-sm text-ink/50">Nobody absent today — full house.</p>
              ) : (
                <ul className="divide-y divide-rule">
                  {absentToday.map((s) => (
                    <li key={s.student_id} className="py-2 flex items-center justify-between">
                      <span className="font-medium">{s.first_name} {s.last_name}</span>
                      <span className="font-mono text-xs text-ink/50">{s.urn}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="bg-card border border-rule rounded-lg p-5 space-y-3">
            <p className="text-xs font-mono uppercase tracking-wide text-ink/50">Download Custom Date Range</p>
            <div className="bg-card border border-rule rounded-lg p-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or URN…"
              className="w-full border border-rule rounded px-3 py-2 bg-paper font-medium focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="date"
                value={rangeStart}
                max={todayIST()}
                onChange={(e) => setRangeStart(e.target.value)}
                className="border border-rule rounded px-3 py-2 bg-paper font-medium"
              />
              <span className="text-ink/40 text-sm">to</span>
              <input
                type="date"
                value={rangeEnd}
                max={todayIST()}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="border border-rule rounded px-3 py-2 bg-paper font-medium"
              />
              <DownloadDropdown
                label={rangeDownloading ? 'Generating…' : 'Download Range'}
                onPdf={downloadRangePdf}
                onExcel={downloadRangeExcel}
                disabled={rangeDownloading}
              />
            </div>
            {rangeError && <p className="text-sm text-brick font-medium">{rangeError}</p>}
          </div>
          <CollapsibleSection
            title="Defaulters (below 75%)"
            colorClass="text-brick"
            count={filteredDefaulters.length}
            defaultOpen={true}
          >
            {filteredDefaulters.length === 0 ? (
              <div className="bg-card border border-rule rounded-lg p-6 text-center text-sm text-ink/50">
                {searchQuery ? 'No matching students.' : 'No defaulters — everyone is above 75%.'}
              </div>
            ) : (
              <div className="bg-card border border-rule rounded-lg divide-y divide-rule overflow-hidden">
                {filteredDefaulters.map((s) => (
                  <StudentRow
                    key={s.studentId}
                    s={s}
                    batchName={batches.find((b) => b.id === batchId)?.name}
                    expandedId={expandedId}
                    onToggle={handleToggle}
                    detail={detailCache[s.studentId]}
                    loadingDetail={loadingDetailId === s.studentId}
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>
          <CollapsibleSection
            title="Good Standing (75% and above)"
            colorClass="text-forest"
            count={filteredGoodStanding.length}
            defaultOpen={false}
          >
            {filteredGoodStanding.length === 0 ? (
              <div className="bg-card border border-rule rounded-lg p-6 text-center text-sm text-ink/50">
                {searchQuery ? 'No matching students.' : 'No students in good standing yet.'}
              </div>
            ) : (
              <div className="bg-card border border-rule rounded-lg divide-y divide-rule overflow-hidden">
                {filteredGoodStanding.map((s) => (
                  <StudentRow
                    key={s.studentId}
                    s={s}
                    batchName={batches.find((b) => b.id === batchId)?.name}
                    expandedId={expandedId}
                    onToggle={handleToggle}
                    detail={detailCache[s.studentId]}
                    loadingDetail={loadingDetailId === s.studentId}
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>
        </>
      ) : null}
    </div>
  );
}