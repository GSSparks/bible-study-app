// frontend/src/utils/printUtils.js
import { HDate } from '@hebcal/core';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
'July','August','September','October','November','December',
];

const HEB_MONTH_NAMES = [
  'Tishrei','Cheshvan','Kislev','Tevet','Shevat','Adar',
'Nisan','Iyar','Sivan','Tamuz','Av','Elul',
];
const HEB_MONTH_NAMES_LEAP = [
  'Tishrei','Cheshvan','Kislev','Tevet','Shevat','Adar I','Adar II',
'Nisan','Iyar','Sivan','Tamuz','Av','Elul',
];

export function getHebMonthName(month, hebYear) {
  const isLeap = new HDate(1, 1, hebYear).isLeapYear();
  const names = isLeap ? HEB_MONTH_NAMES_LEAP : HEB_MONTH_NAMES;
  return names[month - 1] || String(month);
}

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export { MONTH_NAMES, HEB_MONTH_NAMES, DAY_LABELS };

// ─── Layout constants (points) ───────────────────────────────────────────────
export const LAYOUT = {
  verseImageSize: 110,
  headerPadding: 8,
  weekdayH: 20,
  weekdayMargin: 1,
  topStripMargin: 6,
};

export function getHeaderHeight(hasVerse) {
  if (hasVerse) {
    return LAYOUT.verseImageSize + LAYOUT.headerPadding * 2;
  }
  return 48;
}

// ─── Grid helpers ────────────────────────────────────────────────────────────
export async function urlToBase64(url) {
  if (!url) return null;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]); // strip "data:image/...;base64,"
    reader.readAsDataURL(blob);
  });
}

async function hydrateImages(docData) {
  const { pages, coverImageUrl, config } = docData;
  const urls = new Set();

  if (coverImageUrl) urls.add(coverImageUrl);
  for (const pageMonths of pages) {
    for (const m of pageMonths) {
      if (m.headerBgImageUrl) urls.add(m.headerBgImageUrl);
      if (m.verseImageUrl) urls.add(m.verseImageUrl);
      for (const cell of m.cells) {
        if (cell.image) urls.add(cell.image);
      }
    }
  }

  const cache = {};
  await Promise.all(
    [...urls].map(async (url) => { cache[url] = await urlToBase64(url); })
  );

  // Mutate in place (or return a deep clone with replacements)
  if (coverImageUrl) docData.coverImageUrl = cache[coverImageUrl];
  for (const pageMonths of pages) {
    for (const m of pageMonths) {
      if (m.headerBgImageUrl) m.headerBgImageUrl = cache[m.headerBgImageUrl];
      if (m.verseImageUrl) m.verseImageUrl = cache[m.verseImageUrl];
      for (const cell of m.cells) {
        if (cell.image) cell.image = cache[cell.image];
      }
    }
  }

  return docData;
}

export function getGridInfo(system, year, month, hebYear) {
  if (system === 'gregorian') {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    return { firstDay, daysInMonth };
  }
  if (system === 'julian') {
    const gregDate = new Date(year, month - 1, 14);
    const firstDay = gregDate.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    return { firstDay, daysInMonth };
  }
  if (system === 'hebrew') {
    const hebDate = new HDate(1, month, hebYear);
    const greg = hebDate.greg();
    const firstDay = greg.getDay();
    const daysInMonth = hebDate.daysInMonth();
    return { firstDay, daysInMonth };
  }
  return { firstDay: 0, daysInMonth: 30 };
}

export function getDisplayDay(e, system, year, month, hebYear) {
  if (!e.day) return null;
  const gregDate = new Date(e.year, e.month - 1, e.day);

  if (system === 'gregorian') return e.day;

  if (system === 'julian') {
    const julianDate = new Date(gregDate);
    julianDate.setDate(julianDate.getDate() - 13);
    if (julianDate.getFullYear() === year && julianDate.getMonth() + 1 === month) {
      return julianDate.getDate();
    }
    return null;
  }

  if (system === 'hebrew') {
    const hd = new HDate(gregDate);
    if (hd.getFullYear() === hebYear && hd.getMonth() === month) {
      return hd.getDate();
    }
    return null;
  }

  return null;
}

export function getOverlappingGregorianMonths(start, end) {
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

// ─── Single-month data builder ───────────────────────────────────────────────

export function buildPrintData({
  calSystem, year, month, hebYear,
  config, layers, entries, hebrewDates, dayImages,
}) {
  const activeLayers = layers.filter(l => config.layerIds?.includes(l.id));
  const activeLayerIds = new Set(activeLayers.map(l => l.id));
  const layerMap = Object.fromEntries(layers.map(l => [l.id, l]));

  const { firstDay, daysInMonth } = getGridInfo(calSystem, year, month, hebYear);

  const entriesByDay = {};
  for (const e of entries) {
    const displayDay = getDisplayDay(e, calSystem, year, month, hebYear);
    if (displayDay == null) continue;
    if (!activeLayerIds.has(e.layerId)) continue;
    (entriesByDay[displayDay] ??= []).push({
      id: e.id,
      title: e.title,
      icon: e.icon || '',
      color: layerMap[e.layerId]?.color || '#888',
      layerId: e.layerId,
    });
  }

  const cells = [];
  for (let i = 0; i < 35; i++) {
    const dayNum = i - firstDay + 1;
    if (dayNum >= 1 && dayNum <= daysInMonth) {
      const dayEntries = (entriesByDay[dayNum] || []).sort(
        (a, b) => a.title.localeCompare(b.title)
      );
      const gregDay = toGregorianDay(calSystem, dayNum, year, month, hebYear);
      const imageKey = gregDay
      ? `${gregDay.year}-${String(gregDay.month).padStart(2, '0')}-${String(gregDay.day).padStart(2, '0')}`
      : null;

      cells.push({
        day: dayNum,
        entries: dayEntries,
        hebrewDate: hebrewDates?.[dayNum] || null,
        image: (dayImages && imageKey && dayImages[imageKey]) || null,
                 isOverflow: i >= 28,
      });
    } else {
      cells.push({ day: null, entries: [], hebrewDate: null, image: null, isOverflow: false });
    }
  }

  // Month title
  let monthTitle;
  if (calSystem === 'hebrew') {
    monthTitle = `${getHebMonthName(month, hebYear)} ${hebYear}`;
  } else {
    monthTitle = `${MONTH_NAMES[month - 1]} ${year}`;
  }

  // Per-month settings
  const ms = config.monthSettings?.[String(month)] || {};
  const headerBgImageUrl = ms.headerBgImageUrl || null;
  const verseImageUrl = ms.verseImageUrl || null;
  const verseRef = ms.verseRef || '';
  const verseText = ms.verseText || '';
  const verseCorner = ms.verseCorner || 'top-right';
  const hasVerse = !!(verseText || verseImageUrl);
  const headerHeight = getHeaderHeight(hasVerse);

  return {
    cells,
    monthTitle,
    headerBgImageUrl,
    headerHeight,
    verseImageUrl,
    verseRef,
    verseText,
    verseCorner,
    weekdayHeaders: config.showWeekdayHeaders ? DAY_LABELS : null,
    activeLayers,
    config,
    calSystem,
    year,
    month,
    hebYear,
  };
}

// ─── Full document data builder ──────────────────────────────────────────────

export function buildPrintDocument({
  calSystem, year, hebYear, config, layers,
  entriesByMonth, hebrewDatesByMonth, dayImagesByMonth,
  coverImageUrl, selectedMonths,
}) {
  const months = selectedMonths || [1];

  const monthData = months.map(m => {
    const key = `${year}-${m}`;
    return buildPrintData({
      calSystem, year, month: m, hebYear,
      config, layers,
      entries: entriesByMonth[key] || [],
      hebrewDates: hebrewDatesByMonth[key] || null,
      dayImages: dayImagesByMonth[key] || null,
    });
  });

  const pages = monthData.map(m => [m]);

  return {
    pages,
    showCover: !!(config.coverTitle || config.coverVerseRef || coverImageUrl),
    coverTitle: config.coverTitle || String(year),
    coverVerseRef: config.coverVerseRef || null,
    coverVerseText: config.coverVerseText || null,
    coverImageUrl: coverImageUrl || null,
    config,
  };
}

// ─── Gregorian conversion ────────────────────────────────────────────────────

function toGregorianDay(system, day, year, month, hebYear) {
  if (system === 'gregorian') {
    return { year, month, day };
  }
  if (system === 'julian') {
    const gregDate = new Date(year, month - 1, day + 13);
    return { year: gregDate.getFullYear(), month: gregDate.getMonth() + 1, day: gregDate.getDate() };
  }
  if (system === 'hebrew') {
    const hd = new HDate(day, month, hebYear);
    const greg = hd.greg();
    return { year: greg.getFullYear(), month: greg.getMonth() + 1, day: greg.getDate() };
  }
  return null;
}
