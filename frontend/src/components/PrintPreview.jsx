// frontend/src/components/PrintPreview.jsx
import React from 'react';
import { DAY_LABELS, LAYOUT } from '../utils/printUtils';

const PAGE_DIMS_PX = {
  letter: { w: 816, h: 1056 },
  a4:     { w: 794, h: 1123 },
};

const PT = 96 / 72;

export default function PrintPreview({ docData, availableFonts }) {
  const { pages, showCover, coverTitle, coverVerseRef, coverVerseText, coverImageUrl, config } = docData;

  const { w, h } = PAGE_DIMS_PX[config.paper] || PAGE_DIMS_PX.letter;
  const pageW = config.orientation === 'landscape' ? h : w;
  const pageH = config.orientation === 'landscape' ? w : h;
  const margin = (config.margin ?? 0.5) * 96;

  const showDayImages = config.showDayImages ?? true;
  const showHebrew = config.showHebrewDates ?? true;
  const showEntries = config.showEntryTitles ?? true;
  const showWeekdays = config.showWeekdayHeaders ?? true;
  const fontColor = config.fontColor || '#555';
  const titleColor = config.titleColor || '#222';

  const fontFamily = config.fontFamily || 'Helvetica, Arial, sans-serif';
  const titleFontFamily = config.titleFontFamily || 'Helvetica, Arial, sans-serif';
  const verseTextFontFamily = config.verseTextFontFamily || 'Helvetica, Arial, sans-serif';
  const verseRefFontFamily = config.verseRefFontFamily || 'Helvetica, Arial, sans-serif';

  return (
    <div className="flex flex-col items-center gap-6 py-4">
    {/* Register all uploaded fonts */}
    {availableFonts?.length > 0 && (
      <style>{availableFonts.map(f => `
        @font-face {
          font-family: '${f.family}';
      src: url('${f.url}');
        }
        `).join('\n')}</style>
    )}

    {/* Cover */}
    {showCover && (
      <div
      className="relative overflow-hidden flex items-center justify-center"
      style={{ width: pageW, height: pageH, backgroundColor: '#1a1a2e' }}
      >
      {coverImageUrl && (
        <img src={coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 flex flex-col items-center text-center px-16">
      <h1 className="text-5xl font-bold text-white tracking-wider">{coverTitle}</h1>
      {coverVerseText && (
        <p className="mt-6 text-base text-gray-200 italic leading-relaxed max-w-[70%]">{coverVerseText}</p>
      )}
      {coverVerseRef && (
        <p className="mt-3 text-sm text-gray-400">{coverVerseRef}</p>
      )}
      </div>
      </div>
    )}

    {/* Month pages */}
    {pages.map((pageMonths, pi) => (
      <div
      key={pi}
      className="overflow-hidden bg-white shadow-lg"
      style={{ width: pageW, height: pageH, padding: margin }}
      >
      <div className="flex flex-col h-full">
      {pageMonths.map((monthData, mi) => (
        <MonthGridPreview
        key={mi}
        data={monthData}
        config={config}
        pageH={pageH}
        margin={margin}
        showDayImages={showDayImages}
        showHebrew={showHebrew}
        showEntries={showEntries}
        showWeekdays={showWeekdays}
        fontFamily={fontFamily}
        titleFontFamily={titleFontFamily}
        verseTextFontFamily={verseTextFontFamily}
        verseRefFontFamily={verseRefFontFamily}
        fontColor={fontColor}
        titleColor={titleColor}
        />
      ))}
      </div>
      </div>
    ))}
    </div>
  );
}

function MonthGridPreview({
  data, config, pageH, margin,
  showDayImages, showHebrew, showEntries, showWeekdays,
  fontFamily, titleFontFamily, verseTextFontFamily, verseRefFontFamily,
  fontColor, titleColor,
}) {
  const rows = [];
  for (let r = 0; r < 5; r++) {
    rows.push(data.cells.slice(r * 7, r * 7 + 7));
  }

  const headerH = data.headerHeight * PT;
  const weekdayH = showWeekdays ? LAYOUT.weekdayH * PT : 0;
  const gridH = pageH - margin * 2 - headerH - LAYOUT.topStripMargin * PT - weekdayH;
  const cellH = gridH / 5;

  const verseSize = LAYOUT.verseImageSize * PT;
  const versePad = LAYOUT.headerPadding * PT;
  const verseFillHeight = config.verseFillHeight || false;

  return (
    <div className="flex flex-col flex-1 min-h-0">

    {/* Header strip */}
    <div
    className="relative overflow-hidden border-b-2 border-gray-700 mb-1.5 flex items-center justify-center"
    style={{ height: headerH }}
    >
    {data.headerBgImageUrl && (
      <>
      <img src={data.headerBgImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${config.overlayOpacity})` }} />
      </>
    )}

    {(data.verseText || data.verseImageUrl) && (
      <div
      className="absolute overflow-hidden"
      style={{
        top: verseFillHeight ? 0 : versePad,
        width: verseSize,
        height: verseFillHeight ? '100%' : verseSize,
        borderRadius: verseFillHeight ? 0 : 4,
        ...(data.verseCorner === 'top-left' ? { left: versePad } : { right: versePad }),
      }}
      >
      {data.verseImageUrl && (
        <img src={data.verseImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black/40" />
      {data.verseText && (
        <span
        className="absolute inset-x-0 top-0 bottom-2.5 flex items-center justify-center px-1 text-center leading-tight break-words"
        style={{
          color: config.verseTextColor || '#fff',
          fontSize: `${(config.verseTextFontSize || 5) * 1.33}px`,
                          fontFamily: verseTextFontFamily,
        }}
        >
        {data.verseText}
        </span>
      )}
      {data.verseRef && (
        <span
        className="absolute bottom-0 inset-x-0 text-center bg-black/50 py-0.5"
        style={{
          color: config.verseRefColor || 'rgba(255,255,255,0.7)',
                         fontSize: `${(config.verseRefFontSize || 4) * 1.33}px`,
                         fontFamily: verseRefFontFamily,
        }}
        >
        {data.verseRef}
        </span>
      )}
      </div>
    )}

    {/* Month title */}
    <span
    className="relative z-10 font-bold"
    style={{
      color: data.headerBgImageUrl ? '#fff' : titleColor,
      fontFamily: titleFontFamily,
      fontSize: `${(config.titleFontSize || 18) * 1.33}px`,
    }}
    >
    {data.monthTitle}
    </span>
    </div>

    {/* Weekday headers */}
    {showWeekdays && (
      <div className="grid grid-cols-7 gap-px bg-gray-300 mb-px">
      {DAY_LABELS.map(d => (
        <div
        key={d}
        className="bg-gray-100 text-center text-micro font-bold py-1"
        style={{ color: fontColor, fontFamily }}
        >
        {d}
        </div>
      ))}
      </div>
    )}

    {/* Grid */}
    <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-gray-300">
    {rows.flat().map((cell, i) => {
      if (cell.day == null) {
        return <div key={i} className="bg-gray-50" />;
      }

      const hasImage = showDayImages && cell.image;
      const maxEntries = cell.isOverflow ? 1 : 2;
      const shown = cell.entries.slice(0, maxEntries);
      const more = cell.entries.length - shown.length;

      return (
        <div key={i} className="relative bg-white overflow-hidden">
        {hasImage && (
          <>
          <img src={cell.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          </>
        )}

        <span
        className="absolute top-0.5 left-1 text-micro font-medium"
        style={{ color: hasImage ? '#fff' : fontColor, fontFamily }}
        >
        {cell.day}
        </span>

        {showEntries && shown.length > 0 && (
          <div className="absolute top-4 left-1 right-1 bottom-3 flex flex-col gap-px overflow-hidden">
          {shown.map(e => {
            const layerSize = (config.layerFontSizes?.[e.layerId] || config.fontSize || 6) * 1.33;
            const layerColor = config.layerFontColors?.[e.layerId] || e.color;
            return (
              <span
              key={e.id}
              className="leading-tight font-medium break-words"
              style={{ color: layerColor, fontFamily, fontSize: `${layerSize}px` }}
              >
              {config.showEntryIcons && e.icon ? `${e.icon} ` : ''}{e.title}
              </span>
            );
          })}
          {more > 0 && (
            <span className="text-[7px] text-gray-400" style={{ fontFamily }}>+{more} more</span>
          )}
          </div>
        )}

        {showHebrew && cell.hebrewDate && (
          <span
          className="absolute bottom-0.5 left-1 right-1 text-[7px]"
          style={{ color: hasImage ? 'rgba(255,255,255,0.7)' : fontColor, fontFamily }}
          >
          {cell.hebrewDate}
          </span>
        )}
        </div>
      );
    })}
    </div>
    </div>
  );
}
