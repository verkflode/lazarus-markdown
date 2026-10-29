/**
 * KaTeX CSS with every font embedded as a data URI, so exported HTML/PDF is
 * truly self-contained — no CDN fetch, works offline. Loaded lazily (dynamic
 * import from main.js) because the inlined fonts are a few hundred KB.
 */
import katexCssRaw from 'katex/dist/katex.min.css?raw';
import KaTeX_AMS_Regular from 'katex/dist/fonts/KaTeX_AMS-Regular.woff2?inline';
import KaTeX_Caligraphic_Bold from 'katex/dist/fonts/KaTeX_Caligraphic-Bold.woff2?inline';
import KaTeX_Caligraphic_Regular from 'katex/dist/fonts/KaTeX_Caligraphic-Regular.woff2?inline';
import KaTeX_Fraktur_Bold from 'katex/dist/fonts/KaTeX_Fraktur-Bold.woff2?inline';
import KaTeX_Fraktur_Regular from 'katex/dist/fonts/KaTeX_Fraktur-Regular.woff2?inline';
import KaTeX_Main_Bold from 'katex/dist/fonts/KaTeX_Main-Bold.woff2?inline';
import KaTeX_Main_BoldItalic from 'katex/dist/fonts/KaTeX_Main-BoldItalic.woff2?inline';
import KaTeX_Main_Italic from 'katex/dist/fonts/KaTeX_Main-Italic.woff2?inline';
import KaTeX_Main_Regular from 'katex/dist/fonts/KaTeX_Main-Regular.woff2?inline';
import KaTeX_Math_BoldItalic from 'katex/dist/fonts/KaTeX_Math-BoldItalic.woff2?inline';
import KaTeX_Math_Italic from 'katex/dist/fonts/KaTeX_Math-Italic.woff2?inline';
import KaTeX_SansSerif_Bold from 'katex/dist/fonts/KaTeX_SansSerif-Bold.woff2?inline';
import KaTeX_SansSerif_Italic from 'katex/dist/fonts/KaTeX_SansSerif-Italic.woff2?inline';
import KaTeX_SansSerif_Regular from 'katex/dist/fonts/KaTeX_SansSerif-Regular.woff2?inline';
import KaTeX_Script_Regular from 'katex/dist/fonts/KaTeX_Script-Regular.woff2?inline';
import KaTeX_Size1_Regular from 'katex/dist/fonts/KaTeX_Size1-Regular.woff2?inline';
import KaTeX_Size2_Regular from 'katex/dist/fonts/KaTeX_Size2-Regular.woff2?inline';
import KaTeX_Size3_Regular from 'katex/dist/fonts/KaTeX_Size3-Regular.woff2?inline';
import KaTeX_Size4_Regular from 'katex/dist/fonts/KaTeX_Size4-Regular.woff2?inline';
import KaTeX_Typewriter_Regular from 'katex/dist/fonts/KaTeX_Typewriter-Regular.woff2?inline';

// font file stem (no extension) -> data URI
const FONT_URIS = {
  'KaTeX_AMS-Regular': KaTeX_AMS_Regular,
  'KaTeX_Caligraphic-Bold': KaTeX_Caligraphic_Bold,
  'KaTeX_Caligraphic-Regular': KaTeX_Caligraphic_Regular,
  'KaTeX_Fraktur-Bold': KaTeX_Fraktur_Bold,
  'KaTeX_Fraktur-Regular': KaTeX_Fraktur_Regular,
  'KaTeX_Main-Bold': KaTeX_Main_Bold,
  'KaTeX_Main-BoldItalic': KaTeX_Main_BoldItalic,
  'KaTeX_Main-Italic': KaTeX_Main_Italic,
  'KaTeX_Main-Regular': KaTeX_Main_Regular,
  'KaTeX_Math-BoldItalic': KaTeX_Math_BoldItalic,
  'KaTeX_Math-Italic': KaTeX_Math_Italic,
  'KaTeX_SansSerif-Bold': KaTeX_SansSerif_Bold,
  'KaTeX_SansSerif-Italic': KaTeX_SansSerif_Italic,
  'KaTeX_SansSerif-Regular': KaTeX_SansSerif_Regular,
  'KaTeX_Script-Regular': KaTeX_Script_Regular,
  'KaTeX_Size1-Regular': KaTeX_Size1_Regular,
  'KaTeX_Size2-Regular': KaTeX_Size2_Regular,
  'KaTeX_Size3-Regular': KaTeX_Size3_Regular,
  'KaTeX_Size4-Regular': KaTeX_Size4_Regular,
  'KaTeX_Typewriter-Regular': KaTeX_Typewriter_Regular,
};

/** Replace every url(fonts/…) reference in a CSS string with its data URI. */
export function inlineFontUrls(css) {
  return css.replace(/url\((['"]?)fonts\/([^)'"]+)\1\)/g, (match, _quote, file) => {
    const stem = file.replace(/\.(woff2|woff|ttf)$/, '');
    return `url(${FONT_URIS[stem] ?? match})`;
  });
}

/** KaTeX stylesheet with all url(fonts/…) references replaced by data URIs. */
export function katexCssInlined() {
  return inlineFontUrls(katexCssRaw);
}
