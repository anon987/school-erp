import { Document, Image, Page, Polygon, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { NOTO_SANS_FAMILY, registerPdfFonts } from "@/lib/core/pdf/registerFonts";
import type { IdCardTemplateConfig, IdCardOrientation } from "./idCardTemplates";
import { buildIdCardFieldRows, type IdCardFieldRow } from "./idCardFields";
import type { IdCardData, IdCardSettings } from "./types";

registerPdfFonts();

// CR80 (85.6mm x 54mm) in points -- 1mm = 2.83465pt. A real ID card you'd cut out and laminate,
// not an A-series page shrunk down. "Horizontal" is the standard landscape CR80; "vertical" is
// the same card turned 90 degrees (portrait) -- a school-wide choice, not per-template.
const CARD_SIZE_PT = { long: 242.65, short: 153.07 };

function cardDimensions(orientation: IdCardOrientation): { width: number; height: number } {
  return orientation === "vertical" ? { width: CARD_SIZE_PT.short, height: CARD_SIZE_PT.long } : { width: CARD_SIZE_PT.long, height: CARD_SIZE_PT.short };
}

function isSideBySideLayout(layout: IdCardTemplateConfig["layout"]): boolean {
  return layout === "boxed" || layout === "boxed_thin" || layout === "band";
}

function sharedStyles(width: number, height: number) {
  return StyleSheet.create({
    page: { width, height, fontFamily: NOTO_SANS_FAMILY },
    row: { flexDirection: "row", alignItems: "center" },
    fieldRows: { flexDirection: "column", gap: 1 },
    fieldRow: { flexDirection: "row" },
    fieldLabel: { fontSize: 6, fontWeight: 700, color: "#475569", width: 46 },
    fieldValue: { fontSize: 6, flex: 1 },
    name: { fontSize: 9, fontWeight: 700 },
    subtitle: { fontSize: 7, color: "#64748b" },
    schoolName: { fontSize: 7, fontWeight: 700 },
    footer: { position: "absolute", left: 8, right: 8, bottom: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", fontSize: 5.5, color: "#64748b" },
    signatureLine: { borderTopWidth: 1, borderTopColor: "#94a3b8", paddingTop: 1 },
  });
}

/**
 * `compact` shrinks font size and row gap for the "centered" template family (arch/diagonal/
 * wave/photo_badge), where the photo and name/subtitle stack ABOVE the field list in the same
 * column instead of beside it -- there's materially less vertical budget left for rows than the
 * side-by-side family gets, and a card with every optional field turned on (father, mother, roll
 * no., DOB, blood group, contact, address -- 7 rows) genuinely doesn't fit at the side-by-side
 * font size in landscape orientation. React-pdf clips silently on overflow rather than shrinking
 * or scrolling, so this under-sizing has to be deliberate, not left to chance.
 */
function FieldRowsPdf({ rows, s, light, compact }: { rows: IdCardFieldRow[]; s: ReturnType<typeof sharedStyles>; light?: boolean; compact?: boolean }) {
  const textStyle = { fontSize: compact ? 5.3 : 6, ...(light ? { color: "#ffffff" } : {}) };
  return (
    <View style={[compact ? { flexDirection: "column", gap: 0.5 } : s.fieldRows, { width: "100%" }]}>
      {rows.map((r) => (
        <View key={r.label} style={[s.fieldRow, { width: "100%" }]}>
          <Text style={[s.fieldLabel, textStyle, compact ? { width: 38 } : {}]}>{r.label}</Text>
          <Text style={[s.fieldValue, textStyle]}>: {r.value}</Text>
        </View>
      ))}
    </View>
  );
}

function Footer({ academicYearName, s, light }: { academicYearName: string | null; s: ReturnType<typeof sharedStyles>; light?: boolean }) {
  return (
    <View style={s.footer}>
      <Text style={light ? { color: "#ffffff" } : {}}>{academicYearName ? `AY ${academicYearName}` : ""}</Text>
      <Text style={[s.signatureLine, light ? { color: "#ffffff", borderTopColor: "#ffffff" } : {}]}>Signature</Text>
    </View>
  );
}

function PhotoBox({ photoUrl, shape, size, borderColor }: { photoUrl: string | null; shape: "rect" | "circle"; size: number; borderColor: string }) {
  return (
    <View
      style={{
        width: size,
        height: shape === "circle" ? size : size * 1.2,
        borderRadius: shape === "circle" ? size / 2 : 3,
        borderWidth: 1.5,
        borderColor,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {photoUrl ? <Image src={photoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Text style={{ fontSize: 6, color: "#94a3b8" }}>No photo</Text>}
    </View>
  );
}

function SideBySideCardPage({
  data,
  rows,
  schoolName,
  logoUrl,
  template,
  width,
  height,
}: {
  data: IdCardData;
  rows: IdCardFieldRow[];
  schoolName: string;
  logoUrl: string | null;
  template: IdCardTemplateConfig;
  width: number;
  height: number;
}) {
  const s = sharedStyles(width, height);
  const isBand = template.layout === "band";
  const isVertical = height > width;
  const borderWidth = template.layout === "boxed" ? 2 : 1;
  const color = template.primary;

  return (
    <Page size={{ width, height }} style={[s.page, { borderWidth, borderColor: color }]}>
      <View
        style={[
          s.row,
          { gap: 4, paddingVertical: 5, paddingHorizontal: 8 },
          isBand ? { backgroundColor: color } : { borderBottomWidth: 1, borderBottomColor: color },
        ]}
      >
        {logoUrl ? <Image src={logoUrl} style={{ width: 14, height: 14, objectFit: "contain" }} /> : null}
        <Text style={[s.schoolName, isBand ? { color: "#ffffff" } : { color: "#0f172a" }]}>{schoolName}</Text>
      </View>

      <View style={{ flexDirection: isVertical ? "column" : "row", alignItems: isVertical ? "center" : "flex-start", flex: 1, gap: 8, padding: 8 }}>
        <PhotoBox photoUrl={data.photoUrl} shape="rect" size={isVertical ? 72 : 52} borderColor={color} />
        <View style={{ flex: 1, alignItems: isVertical ? "center" : "flex-start", gap: 2 }}>
          <Text style={s.name}>{data.name}</Text>
          <Text style={s.subtitle}>{data.subtitle}</Text>
          <View style={{ marginTop: 3, alignItems: "flex-start" }}>
            <FieldRowsPdf rows={rows} s={s} />
          </View>
        </View>
      </View>

      <Footer academicYearName={data.academicYearName} s={s} />
    </Page>
  );
}

/**
 * "Wave" is deliberately its own function, not another `layout === "wave"` branch in
 * CenteredCardPage: name/subtitle/fields there live INSIDE the colored panel (white text, two
 * non-overlapping flex zones), not floating in independent document flow that happens to cross an
 * absolutely-positioned decorative shape -- that first version rendered dark text over the red
 * panel with no contrast. Arch/diagonal/photo_badge don't have this problem (their text content
 * stays within the white zone), so they keep the simpler shared structure.
 */
function WaveCardPage({
  data,
  rows,
  schoolName,
  logoUrl,
  template,
  width,
  height,
}: {
  data: IdCardData;
  rows: IdCardFieldRow[];
  schoolName: string;
  logoUrl: string | null;
  template: IdCardTemplateConfig;
  width: number;
  height: number;
}) {
  const s = sharedStyles(width, height);
  const { primary } = template;
  const isVertical = height > width;
  const photoSize = Math.min(width, height) * (isVertical ? 0.3 : 0.22);
  const topZoneHeight = height * (isVertical ? 0.44 : 0.4);

  return (
    <Page size={{ width, height }} style={[s.page, { borderWidth: 1, borderColor: "#e2e8f0" }]}>
      <View style={{ height: topZoneHeight, alignItems: "center", paddingTop: 5 }}>
        <View style={[s.row, { gap: 3, justifyContent: "center" }]}>
          {logoUrl ? <Image src={logoUrl} style={{ width: 10, height: 10, objectFit: "contain" }} /> : null}
          <Text style={[s.schoolName, { fontSize: 6 }]}>{schoolName}</Text>
        </View>
        <View style={{ marginTop: 4 }}>
          <PhotoBox photoUrl={data.photoUrl} shape="circle" size={photoSize} borderColor={primary} />
        </View>
      </View>

      <View
        style={{
          flex: 1,
          backgroundColor: primary,
          borderTopLeftRadius: width * 0.5,
          borderTopRightRadius: width * 0.5,
          alignItems: "center",
          paddingTop: 5,
          paddingHorizontal: 10,
        }}
      >
        <Text style={[s.name, { color: "#ffffff", fontSize: 8 }]}>{data.name}</Text>
        <Text style={[s.subtitle, { color: "#ffffff", opacity: 0.85, fontSize: 6 }]}>{data.subtitle}</Text>
        <View style={{ marginTop: 3, alignItems: "flex-start", width: "100%" }}>
          <FieldRowsPdf rows={rows} s={s} light compact />
        </View>
      </View>

      <Footer academicYearName={data.academicYearName} s={s} light />
    </Page>
  );
}

function CenteredCardPage({
  data,
  rows,
  schoolName,
  logoUrl,
  template,
  width,
  height,
}: {
  data: IdCardData;
  rows: IdCardFieldRow[];
  schoolName: string;
  logoUrl: string | null;
  template: IdCardTemplateConfig;
  width: number;
  height: number;
}) {
  const s = sharedStyles(width, height);
  const { layout, primary, secondary } = template;
  const isVertical = height > width;
  const photoSize = Math.min(width, height) * (isVertical ? 0.32 : 0.22);
  const archHeight = height * (isVertical ? 0.34 : 0.3);
  const diagonalMarginTop = isVertical ? height * 0.16 : height * 0.1;

  return (
    <Page size={{ width, height }} style={[s.page, { borderWidth: 1, borderColor: "#e2e8f0" }]}>
      {layout === "arch" ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: archHeight,
            backgroundColor: primary,
            borderBottomLeftRadius: width * 0.5,
            borderBottomRightRadius: width * 0.5,
          }}
        />
      ) : null}
      {layout === "diagonal" ? (
        <Svg width={width} height={height * 0.28} viewBox={`0 0 ${width} ${height * 0.28}`} style={{ position: "absolute", left: 0, top: 0 }}>
          <Polygon points={`0,${height * 0.1} ${width},0 ${width},${height * 0.22} 0,${height * 0.28}`} fill={primary} />
        </Svg>
      ) : null}
      {layout === "photo_badge" ? (
        <>
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, backgroundColor: primary }} />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, backgroundColor: primary }} />
        </>
      ) : null}

      <View style={{ flexDirection: "column", alignItems: "center", flex: 1, paddingTop: 5 }}>
        <View style={[s.row, { gap: 3, justifyContent: "center" }]}>
          {logoUrl ? <Image src={logoUrl} style={{ width: 10, height: 10, objectFit: "contain" }} /> : null}
          <Text style={[s.schoolName, { fontSize: 6 }, layout === "arch" ? { color: "#ffffff" } : {}]}>{schoolName}</Text>
        </View>

        <View style={{ marginTop: layout === "diagonal" ? diagonalMarginTop : 4 }}>
          <PhotoBox photoUrl={data.photoUrl} shape={layout === "diagonal" ? "rect" : "circle"} size={photoSize} borderColor={layout === "arch" ? "#ffffff" : primary} />
        </View>

        <View style={{ marginTop: 3, alignItems: "center" }}>
          <Text style={[s.name, { fontSize: 8 }]}>{data.name}</Text>
          {layout === "arch" ? (
            <Text style={{ marginTop: 2, fontSize: 5.5, fontWeight: 700, color: primary, backgroundColor: secondary, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 8 }}>
              {data.subtitle}
            </Text>
          ) : (
            <Text style={[s.subtitle, { fontSize: 6 }]}>{data.subtitle}</Text>
          )}
        </View>

        <View style={{ marginTop: 3, alignItems: "flex-start", paddingHorizontal: 10, width: "100%" }}>
          <FieldRowsPdf rows={rows} s={s} compact />
        </View>
      </View>

      <Footer academicYearName={data.academicYearName} s={s} />
    </Page>
  );
}

function IdCardPage({
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
  const { width, height } = cardDimensions(settings.orientation);
  const rows = buildIdCardFieldRows(data, settings);
  const Component = isSideBySideLayout(template.layout) ? SideBySideCardPage : template.layout === "wave" ? WaveCardPage : CenteredCardPage;
  return <Component data={data} rows={rows} schoolName={schoolName} logoUrl={logoUrl} template={template} width={width} height={height} />;
}

export async function renderIdCardPdf(
  data: IdCardData,
  settings: IdCardSettings,
  schoolName: string,
  logoUrl: string | null,
  template: IdCardTemplateConfig,
): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <IdCardPage data={data} settings={settings} schoolName={schoolName} logoUrl={logoUrl} template={template} />
    </Document>,
  );
}

/** One PDF, one page per person -- print the batch and cut into cards, not a ZIP of N separate files. */
export async function renderIdCardsBulkPdf(
  dataList: IdCardData[],
  settings: IdCardSettings,
  schoolName: string,
  logoUrl: string | null,
  template: IdCardTemplateConfig,
): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      {dataList.map((data) => (
        <IdCardPage key={data.personId} data={data} settings={settings} schoolName={schoolName} logoUrl={logoUrl} template={template} />
      ))}
    </Document>,
  );
}
