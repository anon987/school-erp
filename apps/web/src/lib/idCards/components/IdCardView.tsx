import type { IdCardTemplateConfig, IdCardOrientation } from "../idCardTemplates";
import type { IdCardData, IdCardSettings } from "../types";
import { buildIdCardFieldRows } from "../idCardFields";

/**
 * CR80 proportions (85.6mm x 54mm, ~1.585:1) rendered at a fixed on-screen pixel size -- not
 * meant to be pixel-accurate for print (the PDF, idCardPdf.tsx, is what actually gets sized in
 * real mm), just visually card-shaped for on-screen preview. Same shared-render-for-preview-and-
 * output philosophy as receipts/report cards: one component, used by the real card page and the
 * settings gallery's mini previews. Mirrors idCardPdf.tsx's geometry exactly (two structural
 * families -- "side by side" for boxed/boxed_thin/band, "centered" for diagonal/wave/arch/
 * photo_badge -- so the two renderers never visually diverge).
 */
export function IdCardView({
  data,
  settings,
  schoolName,
  logoUrl,
  template,
}: {
  data: IdCardData;
  settings: IdCardSettings;
  schoolName: string;
  logoUrl: string | null;
  template: IdCardTemplateConfig;
}) {
  const orientation: IdCardOrientation = settings.orientation;
  const isVertical = orientation === "vertical";
  const width = isVertical ? 214 : 340;
  const height = isVertical ? 340 : 214;
  const rows = buildIdCardFieldRows(data, settings);
  const isSideBySide = template.layout === "boxed" || template.layout === "boxed_thin" || template.layout === "band";

  return (
    <div className="overflow-hidden bg-white text-[#0f172a]" style={{ width, height, position: "relative", border: "1px solid #e2e8f0" }}>
      {isSideBySide ? (
        <SideBySideCard data={data} rows={rows} schoolName={schoolName} logoUrl={logoUrl} template={template} isVertical={isVertical} />
      ) : template.layout === "wave" ? (
        <WaveCard data={data} rows={rows} schoolName={schoolName} logoUrl={logoUrl} template={template} width={width} height={height} />
      ) : (
        <CenteredCard data={data} rows={rows} schoolName={schoolName} logoUrl={logoUrl} template={template} width={width} height={height} />
      )}
    </div>
  );
}

/**
 * "Wave" is its own component, not another branch in CenteredCard: name/subtitle/fields live
 * INSIDE the colored panel (white text, two non-overlapping flex zones), not floating in
 * independent flow that happens to cross an absolutely-positioned decorative shape -- that first
 * version rendered dark text over the red panel with no contrast. Mirrors idCardPdf.tsx's
 * WaveCardPage exactly.
 */
function WaveCard({
  data,
  rows,
  schoolName,
  logoUrl,
  template,
  width,
  height,
}: {
  data: IdCardData;
  rows: { label: string; value: string }[];
  schoolName: string;
  logoUrl: string | null;
  template: IdCardTemplateConfig;
  width: number;
  height: number;
}) {
  const isVertical = height > width;
  const photoSize = Math.min(width, height) * (isVertical ? 0.3 : 0.22);
  const topZoneHeight = height * (isVertical ? 0.44 : 0.4);

  return (
    <div className="flex h-full flex-col">
      <div style={{ height: topZoneHeight }} className="flex flex-col items-center gap-1 pt-1">
        <div className="flex items-center justify-center gap-1">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-3 w-3 object-contain" />
          ) : null}
          <span className="truncate text-[7px] font-semibold">{schoolName}</span>
        </div>
        <PhotoBox photoUrl={data.photoUrl} shape="circle" size={photoSize} borderColor={template.primary} />
      </div>

      <div
        className="relative flex flex-1 flex-col items-center px-3 pt-1"
        style={{ backgroundColor: template.primary, borderTopLeftRadius: width * 0.5, borderTopRightRadius: width * 0.5 }}
      >
        <span className="truncate text-[9px] font-bold text-white">{data.name}</span>
        <span className="truncate text-[7px] text-white/85">{data.subtitle}</span>
        <div className="mt-1 w-full text-left">
          <FieldRows rows={rows} light compact />
        </div>
        <Footer academicYearName={data.academicYearName} light />
      </div>
    </div>
  );
}

function Footer({ academicYearName, light }: { academicYearName: string | null; light?: boolean }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between px-2 pb-1 text-[8px] ${light ? "text-white/90" : "text-[#64748b]"}`}>
      <span>{academicYearName ? `AY ${academicYearName}` : ""}</span>
      <span className={`border-t pt-0.5 ${light ? "border-white/70" : "border-[#94a3b8]"}`}>Signature</span>
    </div>
  );
}

/** `compact` matches idCardPdf.tsx's FieldRowsPdf -- the "centered" template family stacks photo
 * and name/subtitle above the field list instead of beside it, leaving less room for rows than
 * the side-by-side family, so a card with every optional field on needs a smaller size to avoid
 * being clipped by the fixed-size card container. */
function FieldRows({ rows, light, compact }: { rows: { label: string; value: string }[]; light?: boolean; compact?: boolean }) {
  return (
    <div className={`flex flex-col leading-tight ${compact ? "gap-px text-[6px]" : "gap-0.5 text-[7px]"}`}>
      {rows.map((r) => (
        <div key={r.label} className="flex gap-1">
          <span className={`shrink-0 font-medium ${compact ? "w-11" : "w-14"} ${light ? "text-white" : "text-[#475569]"}`}>{r.label}</span>
          <span className={`min-w-0 flex-1 truncate font-figures ${light ? "text-white" : ""}`}>: {r.value}</span>
        </div>
      ))}
    </div>
  );
}

function PhotoBox({ photoUrl, shape, size, borderColor }: { photoUrl: string | null; shape: "rect" | "circle"; size: number; borderColor: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden bg-[#f1f5f9]"
      style={{ width: size, height: shape === "circle" ? size : size * 1.2, borderRadius: shape === "circle" ? "9999px" : 4, border: `2px solid ${borderColor}` }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-[8px] text-[#94a3b8]">No photo</span>
      )}
    </div>
  );
}

function SideBySideCard({
  data,
  rows,
  schoolName,
  logoUrl,
  template,
  isVertical,
}: {
  data: IdCardData;
  rows: { label: string; value: string }[];
  schoolName: string;
  logoUrl: string | null;
  template: IdCardTemplateConfig;
  isVertical: boolean;
}) {
  const isBand = template.layout === "band";
  const borderWidth = template.layout === "boxed" ? 2 : 1;
  const color = template.primary;

  return (
    <div className="flex h-full flex-col" style={{ border: `${borderWidth}px solid ${color}` }}>
      <div
        className="flex items-center gap-2 px-2 py-1.5"
        style={isBand ? { backgroundColor: color, color: "#ffffff" } : { borderBottom: `1px solid ${color}` }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-5 w-5 object-contain" />
        ) : null}
        <span className="truncate text-[9px] font-semibold">{schoolName}</span>
      </div>

      <div className={`flex flex-1 gap-2 p-2 ${isVertical ? "flex-col items-center text-center" : ""}`}>
        <PhotoBox photoUrl={data.photoUrl} shape="rect" size={isVertical ? 72 : 52} borderColor={color} />
        <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${isVertical ? "items-center" : ""}`}>
          <span className="truncate text-[10px] font-semibold">{data.name}</span>
          <span className="truncate text-[8px] text-[#64748b]">{data.subtitle}</span>
          <div className={isVertical ? "mt-1 w-full text-left" : "mt-1"}>
            <FieldRows rows={rows} />
          </div>
        </div>
      </div>

      <div className="relative h-4">
        <Footer academicYearName={data.academicYearName} />
      </div>
    </div>
  );
}

function CenteredCard({
  data,
  rows,
  schoolName,
  logoUrl,
  template,
  width,
  height,
}: {
  data: IdCardData;
  rows: { label: string; value: string }[];
  schoolName: string;
  logoUrl: string | null;
  template: IdCardTemplateConfig;
  width: number;
  height: number;
}) {
  const { layout, primary, secondary } = template;
  const isVertical = height > width;
  const photoSize = Math.min(width, height) * (isVertical ? 0.32 : 0.22);
  const archHeight = height * (isVertical ? 0.34 : 0.3);
  const diagonalMarginTop = isVertical ? height * 0.16 : height * 0.1;

  return (
    <div className="relative flex h-full flex-col items-center">
      {layout === "arch" ? (
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: archHeight, backgroundColor: primary, borderBottomLeftRadius: width * 0.5, borderBottomRightRadius: width * 0.5 }}
        />
      ) : null}
      {layout === "diagonal" ? (
        <svg className="absolute inset-x-0 top-0" width={width} height={height * 0.28} viewBox={`0 0 ${width} ${height * 0.28}`} preserveAspectRatio="none">
          <polygon points={`0,${height * 0.1} ${width},0 ${width},${height * 0.22} 0,${height * 0.28}`} fill={primary} />
        </svg>
      ) : null}
      {layout === "photo_badge" ? (
        <>
          <div className="absolute inset-x-0 top-0" style={{ height: 4, backgroundColor: primary }} />
          <div className="absolute inset-x-0 bottom-0" style={{ height: 4, backgroundColor: primary }} />
        </>
      ) : null}

      <div className={`z-10 flex w-full items-center justify-center gap-1 px-2 pt-1 ${layout === "arch" ? "text-white" : ""}`}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-3.5 w-3.5 object-contain" />
        ) : null}
        <span className="truncate text-[7px] font-semibold">{schoolName}</span>
      </div>

      <div className="z-10 mt-1 flex items-center justify-center" style={layout === "diagonal" ? { marginTop: diagonalMarginTop } : undefined}>
        <PhotoBox photoUrl={data.photoUrl} shape={layout === "diagonal" ? "rect" : "circle"} size={photoSize} borderColor={layout === "arch" ? "#ffffff" : primary} />
      </div>

      <div className="z-10 mt-1 flex flex-col items-center px-2">
        <span className="truncate text-[9px] font-bold">{data.name}</span>
        {layout === "arch" ? (
          <span className="mt-0.5 rounded-full px-2 py-0.5 text-[6px] font-medium text-white" style={{ backgroundColor: secondary, color: primary }}>
            {data.subtitle}
          </span>
        ) : (
          <span className="truncate text-[7px] text-[#64748b]">{data.subtitle}</span>
        )}
      </div>

      <div className="z-10 mt-1 w-full flex-1 overflow-hidden px-3">
        <FieldRows rows={rows} compact />
      </div>

      <div className="relative z-10 h-4 w-full">
        <Footer academicYearName={data.academicYearName} />
      </div>
    </div>
  );
}
