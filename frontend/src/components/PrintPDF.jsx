// frontend/src/components/PrintPDF.jsx
import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer';
import { DAY_LABELS, LAYOUT } from '../utils/printUtils';

// ─── Page dimensions (points, 1in = 72pt) ────────────────────────────────────
const PAGE_DIMS = {
  letter: { w: 612, h: 792 },
  a4:     { w: 595, h: 842 },
};

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles({ paper, orientation, margin, config }) {
  const { w, h } = PAGE_DIMS[paper] || PAGE_DIMS.letter;
  const pageW = orientation === 'landscape' ? h : w;
  const pageH = orientation === 'landscape' ? w : h;

  const cellW = (pageW - margin * 2) / 7;

  const fontFamily = config.fontFamily || 'Helvetica';
  const titleFontFamily = config.titleFontFamily || 'Helvetica';
  const verseTextFontFamily = config.verseTextFontFamily || 'Helvetica';
  const verseRefFontFamily = config.verseRefFontFamily || 'Helvetica';
  const fontSize = config.fontSize || 6;
  const fontColor = config.fontColor || '#555';
  const titleColor = config.titleColor || '#222';

  return StyleSheet.create({
    page: {
      width: pageW,
      height: pageH,
      padding: margin,
      backgroundColor: '#fff',
    },

    // ── Cover ──
    coverPage: {
      width: pageW,
      height: pageH,
      backgroundColor: '#1a1a2e',
      justifyContent: 'center',
      alignItems: 'center',
    },
    coverTitle: {
      fontSize: 48,
      color: '#fff',
      fontFamily: 'Helvetica-Bold',
      letterSpacing: 2,
      textAlign: 'center',
    },
    coverVerse: {
      fontSize: 14,
      color: '#e0e0e0',
      fontFamily: 'Times-Italic',
      marginTop: 24,
      maxWidth: pageW * 0.7,
      textAlign: 'center',
      lineHeight: 1.6,
    },
    coverRef: {
      fontSize: 11,
      color: '#aaa',
      marginTop: 12,
    },

    // ── Header strip ──
    topStrip: {
      position: 'relative',
      overflow: 'hidden',
      borderBottomWidth: 2,
      borderBottomColor: '#333',
      marginBottom: LAYOUT.topStripMargin,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topStripBg: {
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
    },
    topStripOverlay: {
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
    },
    verseInHeader: {
      position: 'absolute',
      top: LAYOUT.headerPadding,
      width: LAYOUT.verseImageSize,
      height: LAYOUT.verseImageSize,
      overflow: 'hidden',
      borderRadius: 4,
    },
    verseInHeaderFill: {
      top: 0,
      height: '100%',
      borderRadius: 0,
    },
    verseInHeaderLeft: { left: LAYOUT.headerPadding },
    verseInHeaderRight: { right: LAYOUT.headerPadding },
    verseImg: {
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
    },
    verseText: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 10,
      textAlign: 'center',
      padding: 4,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    verseRef: {
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    monthTitle: {
      fontSize: config.titleFontSize || 18,
      fontFamily: titleFontFamily,
      fontWeight: '700',
      color: titleColor,
      position: 'relative',
      zIndex: 1,
    },
    monthTitleOnImage: {
      color: '#fff',
    },

    // ── Weekday row ──
    weekdayRow: {
      flexDirection: 'row',
      height: LAYOUT.weekdayH,
      marginBottom: LAYOUT.weekdayMargin,
    },
    weekdayCell: {
      width: cellW,
      textAlign: 'center',
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: fontColor,
      backgroundColor: '#f0f0f0',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // ── Grid cell base ──
    cell: {
      width: cellW,
      position: 'relative',
      overflow: 'hidden',
      borderRightWidth: 0.5,
      borderBottomWidth: 0.5,
      borderRightColor: '#ccc',
      borderBottomColor: '#ccc',
    },
    cellEmpty: {
      backgroundColor: '#f7f7f7',
    },
    cellBgImage: {
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
    },
    cellOverlay: {
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    dayNum: {
      position: 'absolute',
      top: 2, left: 3,
      fontSize: 8,
      color: fontColor,
      fontFamily,
      fontWeight: '500',
    },
    dayNumOnImage: {
      color: '#fff',
    },
    entryContainer: {
      position: 'absolute',
      top: 12, left: 3, right: 3, bottom: 10,
      flexDirection: 'column',
      gap: 1,
    },
    entryMore: {
      fontSize: fontSize - 1,
      color: '#999',
    },
    hebrewDate: {
      position: 'absolute',
      bottom: 2, left: 3, right: 3,
      fontSize,
      color: fontColor,
      fontFamily,
      textAlign: 'left',
    },
    hebrewDateOnImage: {
      color: 'rgba(255,255,255,0.8)',
    },
  });
}

// ─── Month grid ───────────────────────────────────────────────────────────────
function MonthGrid({ data, styles, pageH, margin, showDayImages, showHebrew, showEntries, showIcons, config }) {
  const rows = [];
  for (let r = 0; r < 5; r++) {
    rows.push(data.cells.slice(r * 7, r * 7 + 7));
  }

  const headerH = data.headerHeight;
  const showWeekdays = !!data.weekdayHeaders;
  const weekdayTotal = showWeekdays ? LAYOUT.weekdayH + LAYOUT.weekdayMargin : 0;
  const gridH = pageH - margin * 2 - headerH - LAYOUT.topStripMargin - weekdayTotal;
  const cellH = gridH / 5;

  const fontFamily = config.fontFamily || 'Helvetica';
  const verseTextFontFamily = config.verseTextFontFamily || 'Helvetica';
  const verseRefFontFamily = config.verseRefFontFamily || 'Helvetica';
  const verseFillHeight = config.verseFillHeight || false;

  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>

    <View style={[styles.topStrip, { height: headerH }]}>
    {data.headerBgImageUrl && (
      <>
      <Image src={data.headerBgImageUrl} style={styles.topStripBg} resizeMode="cover" />
      <View style={[styles.topStripOverlay, { backgroundColor: `rgba(0,0,0,${config.overlayOpacity})` }]} />
      </>
    )}

    {(data.verseText || data.verseImageUrl) && (
      <View style={[
        styles.verseInHeader,
        verseFillHeight && styles.verseInHeaderFill,
        data.verseCorner === 'top-left' ? styles.verseInHeaderLeft : styles.verseInHeaderRight,
      ]}>
      {data.verseImageUrl && (
        <Image src={data.verseImageUrl} style={styles.verseImg} resizeMode="cover" />
      )}
      {data.verseText ? (
        <Text style={[styles.verseText, {
          fontSize: config.verseTextFontSize || 5,
          color: config.verseTextColor || '#fff',
          fontFamily: verseTextFontFamily,
        }]}>
        {data.verseText}
        </Text>
      ) : null}
      {data.verseRef ? (
        <Text style={[styles.verseRef, {
          fontSize: config.verseRefFontSize || 4,
          color: config.verseRefColor || 'rgba(255,255,255,0.7)',
                        fontFamily: verseRefFontFamily,
        }]}>
        {data.verseRef}
        </Text>
      ) : null}
      </View>
    )}

    <Text style={[styles.monthTitle, { fontSize: config.titleFontSize || 18 }, data.headerBgImageUrl && styles.monthTitleOnImage]}>
    {data.monthTitle}
    </Text>
    </View>

    {showWeekdays && (
      <View style={styles.weekdayRow}>
      {DAY_LABELS.map(d => (
        <Text key={d} style={styles.weekdayCell}>{d}</Text>
      ))}
      </View>
    )}

    {rows.map((row, ri) => (
      <View key={ri} style={{ flexDirection: 'row', height: cellH }}>
      {row.map((cell, ci) => {
        if (cell.day == null) {
          return <View key={ci} style={[styles.cell, styles.cellEmpty, { height: cellH }]} />;
        }
        const hasImage = showDayImages && cell.image;
        const maxEntries = cell.isOverflow ? 1 : 2;
        const shown = cell.entries.slice(0, maxEntries);
        const more = cell.entries.length - shown.length;

        return (
          <View key={ci} style={[styles.cell, { height: cellH }]}>
          {hasImage && (
            <>
            <Image src={cell.image} style={styles.cellBgImage} resizeMode="cover" />
            <View style={styles.cellOverlay} />
            </>
          )}
          <Text style={[styles.dayNum, hasImage && styles.dayNumOnImage]}>
          {cell.day}
          </Text>
          {showEntries && shown.length > 0 && (
            <View style={styles.entryContainer}>
            {shown.map(e => {
              const layerSize = config.layerFontSizes?.[e.layerId] || config.fontSize || 6;
              const layerColor = config.layerFontColors?.[e.layerId] || e.color;
              return (
                <Text
                key={e.id}
                style={{ fontSize: layerSize, fontFamily, lineHeight: 1.3, fontWeight: '500', color: layerColor }}
                >
                {showIcons && e.icon ? `${e.icon} ` : ''}{e.title}
                </Text>
              );
            })}
            {more > 0 && (
              <Text style={styles.entryMore}>+{more} more</Text>
            )}
            </View>
          )}
          {showHebrew && cell.hebrewDate && (
            <Text style={[styles.hebrewDate, hasImage && styles.hebrewDateOnImage]}>
            {cell.hebrewDate}
            </Text>
          )}
          </View>
        );
      })}
      </View>
    ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PrintPDF({ docData }) {
  const { pages, showCover, coverTitle, coverVerseRef, coverVerseText, coverImageUrl, config } = docData;

  const margin = (config.margin ?? 0.5) * 72;
  const showDayImages = config.showDayImages ?? true;
  const showHebrew = config.showHebrewDates ?? true;
  const showEntries = config.showEntryTitles ?? true;
  const showEntryIcons = config.showEntryIcons ?? true;

  const { w, h } = PAGE_DIMS[config.paper] || PAGE_DIMS.letter;
  const pageW = config.orientation === 'landscape' ? h : w;
  const pageH = config.orientation === 'landscape' ? w : h;

  const styles = makeStyles({
    paper: config.paper,
    orientation: config.orientation,
    margin,
    config,
  });

  const pageSize = [pageW, pageH];

  return (
    <Document>
    {showCover && (
      <Page size={pageSize} style={styles.coverPage}>
      {coverImageUrl && (
        <Image src={coverImageUrl} style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
        }} resizeMode="cover" />
      )}
      <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <Text style={styles.coverTitle}>{coverTitle}</Text>
      {coverVerseText ? <Text style={styles.coverVerse}>{coverVerseText}</Text> : null}
      {coverVerseRef ? <Text style={styles.coverRef}>{coverVerseRef}</Text> : null}
      </Page>
    )}

    {pages.map((pageMonths, pi) => (
      <Page key={pi} size={pageSize} style={styles.page}>
      {pageMonths.map((monthData, mi) => (
        <View key={mi} style={{ flex: 1, flexDirection: 'column' }}>
        <MonthGrid
        data={monthData}
        styles={styles}
        pageH={pageH}
        margin={margin}
        showDayImages={showDayImages}
        showHebrew={showHebrew}
        showEntries={showEntries}
        showIcons={showEntryIcons}
        config={config}
        />
        </View>
      ))}
      </Page>
    ))}
    </Document>
  );
}
