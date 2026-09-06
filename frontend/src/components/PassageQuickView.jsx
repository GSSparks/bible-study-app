import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ReaderPane from './ReaderPane.jsx';
import StrongsPopup from './StrongsPopup.jsx';
import VersePopup from './VersePopup.jsx';

/** A self-contained, footer-scale wrapper around ReaderPane — the same
 * component Passages uses for both its Bible and commentary panes,
 * reused here so a Study's quick-glance passage/commentary view looks
 * and behaves identically, not a separate, simpler reimplementation.
 *
 * Navigation (chapter ‹›, book browse, Strong's word clicks,
 * cross-reference popups) all stays local to this component — none of
 * it ever leaves the Study page, matching how the footer is meant to
 * work as a self-contained quick reference. Only "ask AI Companion"
 * and "study this phrase" hand off elsewhere, since both fundamentally
 * depend on the StudyAssistant dock, which doesn't exist within
 * Studies at all — those are deep-links out, not local features.
 *
 * `resetKey` (pass the lesson's own id) re-seeds this component's
 * local module/reference state whenever it changes — e.g. the person
 * switches to a different lesson while this same footer tab stays
 * open. This has to be keyed off the lesson's identity, not off
 * initialModule/initialReference themselves: if two different lessons
 * happened to share the same module and reference, watching those
 * values directly would see no change and skip the reset, even though
 * the underlying lesson genuinely changed. Without resetting at all,
 * this component would just keep showing wherever it had last
 * navigated to within the PREVIOUS lesson, since React updates rather
 * than remounts it when only its props change, not its position in
 * the tree.
 */
export default function PassageQuickView({
  initialModule,
  initialReference,
  resetKey,
  allowModuleSwitch = false,
  moduleType = 'BIBLE',
  onFocusNote,
  onAskAiCompanionAbout,
  onAskAiCompanionPhraseStudy,
}) {
  const [module, setModule] = useState(initialModule);
  const [reference, setReference] = useState(initialReference);
  const [modules, setModules] = useState([]);
  const [strongsPopup, setStrongsPopup] = useState(null); // { key, x, y, morph, wordText, module }
  const [versePopup, setVersePopup] = useState(null); // { osisRef, x, y }

  useEffect(() => {
    setModule(initialModule);
    setReference(initialReference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!allowModuleSwitch) return;
    api.listInstalledModules(moduleType).then(setModules).catch(() => {});
  }, [allowModuleSwitch, moduleType]);

  return (
    <div>
      {allowModuleSwitch && (
        <select
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className="mb-2 rounded border border-rule bg-ink px-2 py-1 text-xs text-parchment focus:border-brass"
        >
          {modules.map((m) => (
            <option key={m.name} value={m.name}>
              {m.description || m.name}
            </option>
          ))}
        </select>
      )}

      <ReaderPane
        module={module}
        reference={reference}
        onNavigate={setReference}
        onStrongsClick={(key, event, morph, wordText, mod) =>
          setStrongsPopup({ key, x: event.clientX, y: event.clientY, morph, wordText, module: mod })
        }
        onVerseRefClick={(osisRef, event) => setVersePopup({ osisRef, x: event.clientX, y: event.clientY })}
        onAnnotate={() => onFocusNote?.()}
        onAskAboutPassage={(mod, ref) => onAskAiCompanionAbout?.(mod, ref)}
        onPhraseStudy={(phrase, mod, strongsSequence) => onAskAiCompanionPhraseStudy?.(phrase, mod, strongsSequence)}
      />

      {strongsPopup && (
        <StrongsPopup
          strongsKey={strongsPopup.key}
          morph={strongsPopup.morph}
          wordText={strongsPopup.wordText}
          module={strongsPopup.module}
          x={strongsPopup.x}
          y={strongsPopup.y}
          onClose={() => setStrongsPopup(null)}
          onNavigateKey={(key) => setStrongsPopup((prev) => ({ ...prev, key, morph: undefined }))}
          // onOpenInDictionary/onSearchTopical/onWordStudy deliberately
          // omitted — all three depend on the dictionary tabbed-window
          // and StudyAssistant infrastructure that only exists in
          // Passages. StrongsPopup already hides the corresponding
          // buttons when these aren't provided, so this keeps the
          // footer's popup a quick lookup rather than a dead-end button
          // pointing at machinery that isn't there.
        />
      )}

      {versePopup && (
        <VersePopup
          osisRef={versePopup.osisRef}
          module={module}
          x={versePopup.x}
          y={versePopup.y}
          onClose={() => setVersePopup(null)}
          onOpenInTab={(mod, ref) => {
            // "Open in tab" has no tab system to open into here — the
            // footer only ever shows one passage at a time, so this
            // just navigates THIS component's own local view to the
            // cross-referenced verse, staying inside the footer rather
            // than leaving the Study page.
            setVersePopup(null);
            setModule(mod);
            setReference(ref);
          }}
        />
      )}
    </div>
  );
}