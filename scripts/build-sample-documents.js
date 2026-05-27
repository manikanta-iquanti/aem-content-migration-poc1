"use strict";

/**
 * Generates Meridian-style sample .docx and .pdf under data/sample-documents/.
 * Run: node scripts/build-sample-documents.js
 */

const path = require("node:path");
const fs = require("fs-extra");
const { PDFDocument, StandardFonts } = require("pdf-lib");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  WidthType,
  LevelFormat,
  AlignmentType,
} = require("docx");

const OUT_DIR = path.join(__dirname, "..", "data", "sample-documents");

function metaTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([a, b]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun(a)] })],
            }),
            new TableCell({
              width: { size: 72, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun(b)] })],
            }),
          ],
        })
    ),
  });
}

function lisbonDoc() {
  const metaRows = [
    ["Slug", "lisbon-tram-notes"],
    ["Title", "Lisbon from the Number 28"],
    ["Eyebrow", "City · Lisbon, Portugal"],
    [
      "Dek",
      "Yellow carriages, impossible hills, and the small kindness of strangers who point you toward the right stop.",
    ],
    ["Author", "João Ferreira"],
    ["Published", "May 2, 2026"],
    ["Read time", "8 min read"],
    [
      "Hero image URL",
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1600&q=80",
    ],
    ["Hero image alt", "Historic yellow tram climbing a steep Lisbon street"],
    ["Tags", "Trams, Azulejos, Hills, Pastéis de nata"],
  ];

  const body = [
    new Paragraph({
      children: [
        new TextRun(
          "Lisbon teaches you to love the climb. The number 28 groans up toward Graça with tourists hanging from the poles and locals rolling their eyes with the affection of people who have seen this scene ten thousand times and still secretly enjoy it."
        ),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("Before you board")],
    }),
    new Paragraph({
      children: [
        new TextRun(
          "Have coins ready if you pay on board, keep your bag in front of you, and do not block the doors — the driver will remind you with a look that could stop traffic."
        ),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "A tram in Lisbon is a moving argument between courtesy and chaos.",
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("Three stops worth the sway")],
    }),
    new Paragraph({
      text: "Miradouro da Senhora do Monte — wind, tiles, and the whole city at your feet.",
      bullet: { level: 0 },
    }),
    new Paragraph({
      text: "Alfama before noon — laundry lines, cats, and the smell of grilled sardines rehearsing for lunch.",
      bullet: { level: 0 },
    }),
    new Paragraph({
      text: "Estrela for the basilica garden, where the 28 exhales for a moment before diving back downhill.",
      bullet: { level: 0 },
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("Pastéis and pacing")],
    }),
    new Paragraph({
      children: [
        new TextRun(
          "Do not sprint from Belém to Baixa in one afternoon. Lisbon rewards slow ankles and frequent espresso."
        ),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun(
          "CALLOUT:Small kindness|Learn five words of Portuguese before you go — obrigado, por favor, desculpe — and watch doors open that maps never marked."
        ),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("By the numbers")],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph("9")],
            }),
            new TableCell({
              children: [new Paragraph("Tram rides taken")],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph("3")],
            }),
            new TableCell({
              children: [new Paragraph("Miradouros visited")],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("Leaving")],
    }),
    new Paragraph({
      children: [
        new TextRun(
          "I stepped off at Cais do Sodré with sore calves and a pocket of pastel crumbs. The city stayed in my ears long after — steel on steel, a bell, someone laughing uphill."
        ),
      ],
    }),
  ];

  return new Document({
    sections: [{ children: [metaTable(metaRows), ...body] }],
  });
}

function vietnamDoc() {
  const metaRows = [
    ["Slug", "vietnam-central-coast-train"],
    ["Title", "Slow Train on Vietnam's Central Coast"],
    ["Eyebrow", "Rail · Da Nang to Hue, Vietnam"],
    [
      "Dek",
      "Sea on one side, jungle on the other, and a dining car that believes deeply in instant noodles.",
    ],
    ["Author", "Lan Pham"],
    ["Published", "April 18, 2026"],
    ["Read time", "9 min read"],
    [
      "Hero image URL",
      "https://images.unsplash.com/photo-1528127269322-539801943592?w=1600&q=80",
    ],
    ["Hero image alt", "Train window view along a tropical coastline"],
    ["Tags", "Trains, Coast, Vietnam, Slow travel"],
  ];

  const numberingConfig = {
    config: [
      {
        reference: "ol-default",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.START,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 },
              },
            },
          },
        ],
      },
    ],
  };

  const body = [
    new Paragraph({
      children: [
        new TextRun(
          "The reunification express is not the bullet train. It is vinyl seats, sliding windows that actually open, and a corridor that smells faintly of jasmine tea and diesel."
        ),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("Why sit on the sea side")],
    }),
    new Paragraph({
      children: [
        new TextRun(
          "Between Da Nang and Hue the line hugs the Hai Van pass in glimpses — turquoise chop, fishing boats like commas, then tunnels cool as a cellar."
        ),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("What to bring on board")],
    }),
    new Paragraph({
      text: "A light jacket — air conditioning oscillates between arctic and broken.",
      bullet: { level: 0 },
    }),
    new Paragraph({
      text: "Snacks you actually want; the cart is optimistic but limited.",
      bullet: { level: 0 },
    }),
    new Paragraph({
      text: "A fully charged phone and downloaded maps — tunnels are long storytellers.",
      bullet: { level: 0 },
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("A loose afternoon in Hue")],
    }),
    new Paragraph({
      numbering: { reference: "ol-default", level: 0 },
      children: [new TextRun("Walk the perimeter of the citadel walls at golden hour.")],
    }),
    new Paragraph({
      numbering: { reference: "ol-default", level: 0 },
      children: [new TextRun("Eat bun bo Hue somewhere plastic stools outnumber menus.")],
    }),
    new Paragraph({
      numbering: { reference: "ol-default", level: 0 },
      children: [new TextRun("End at a cafe overlooking the Perfume River with nothing urgent to do.")],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "The best seat is the one where you stop checking the time.",
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun(
          "CALLOUT:Etiquette note|Offer snacks across the aisle once; refusal is polite, acceptance is friendship."
        ),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("Leaving")],
    }),
    new Paragraph({
      children: [
        new TextRun(
          "Hue's station smells of rain on concrete. I stepped onto the platform with creased tickets and the sense that the coast had been narrated to me in the kindest slow voice."
        ),
      ],
    }),
  ];

  return new Document({
    numbering: numberingConfig,
    sections: [{ children: [metaTable(metaRows), ...body] }],
  });
}

async function writePdfSample(destPath) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const lines = [
    "Slug: copenhagen-harbour-walk",
    "Title: Copenhagen Harbour at Blue Hour",
    "Eyebrow: City · Copenhagen, Denmark",
    "Dek: Bikes, bridges, and the polite rebellion of eating ice cream while the wind insists you should not.",
    "Author: Ingrid Sørensen",
    "Published: March 9, 2026",
    "Read time: 7 min read",
    "Hero image URL: https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=1600&q=80",
    "Hero image alt: Nyhavn canal houses at dusk",
    "Tags: Cycling, Harbour, Nordic light, Hygge",
    "---",
    "Copenhagen is a city that trusts you with a bicycle and a scarf and then adds wind until you learn humility.",
    "",
    "## Bridges and shortcuts",
    "Cross the Inner Harbour on foot or pedal — the bridges are arguments settled in steel. Stop halfway for no reason except that everyone else is doing the same.",
    "",
    "## What to eat outside",
    "- A paper cone of tiny fried fish from a harbour stall.",
    "- Soft ice in a waffle cone, even when the weather disagrees.",
    "- A rye sandwich small enough to eat while walking toward the opera house.",
    "",
    "## A small ritual",
    "> The water here is a calendar — it tells you when to go home.",
    "",
    "CALLOUT:Pack light|The wind invents new directions hourly. Layers beat cleverness.",
    "",
    "## Leaving",
    "I rolled my bike back to the rack with cold ears and a pocket of receipts that smelled faintly of cardamom. The harbour lights doubled themselves in the water and refused to choose which version was real.",
  ];

  let page = pdfDoc.addPage([612, 792]);
  let y = 750;
  const lh = 11;
  const margin = 48;
  const size = 9;
  const maxW = 510;

  function newPage() {
    page = pdfDoc.addPage([612, 792]);
    y = 750;
  }

  for (const raw of lines) {
    if (raw === "") {
      y -= lh * 0.4;
      if (y < 48) newPage();
      continue;
    }
    let rest = raw;
    while (rest.length > 0) {
      if (y < 48) newPage();
      let n = rest.length;
      if (n > 92) {
        const slice = rest.slice(0, 92);
        const sp = slice.lastIndexOf(" ");
        n = sp > 55 ? sp + 1 : 92;
      }
      const chunk = rest.slice(0, n).trimEnd();
      rest = rest.slice(n).trimStart();
      page.drawText(chunk, { x: margin, y, size, font, maxWidth: maxW });
      y -= lh;
    }
  }

  const bytes = await pdfDoc.save();
  await fs.writeFile(destPath, bytes);
}

async function main() {
  await fs.ensureDir(OUT_DIR);
  const d1 = lisbonDoc();
  const d2 = vietnamDoc();
  await fs.writeFile(
    path.join(OUT_DIR, "lisbon-tram-notes.docx"),
    await Packer.toBuffer(d1)
  );
  await fs.writeFile(
    path.join(OUT_DIR, "vietnam-central-coast-train.docx"),
    await Packer.toBuffer(d2)
  );
  await writePdfSample(path.join(OUT_DIR, "copenhagen-harbour-walk.pdf"));
  console.log(`Wrote sample documents to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
