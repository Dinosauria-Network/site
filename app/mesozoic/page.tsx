import React from 'react';

export const metadata = {
  title: "Mesozoic Era - Dinosauria Network",
  description:
    "Mesozoic Era chronostratigraphy - Triassic, Jurassic, Cretaceous periods",
};

type GeologicalNode = {
  name: string;
  type?: "era" | "period" | "epoch" | "age";
  end?: number;
  endText?: string;
  bgColor?: string;
  color?: string;
  contains?: GeologicalNode[];
};

type TableCell = {
  name: string;
  rowSpan: number;
  bgColor?: string;
  color?: string;
  height?: number;
  type?: string;
  end?: number;
  endText?: string;
};

type GeologicTableProps = {
  data: GeologicalNode;
};

type TableRow = (TableCell | null)[];

const COLUMN_COUNT = 5;

export default function MesozoicPage() {
  // Ages with their "End" boundary in Ma — used to compute proportional row heights
  const ages: GeologicalNode = {
    name: "Mesozoic",
    end: 66,
    endText: "66.0 +-0.2",
    type: "era",
    bgColor: "#67C5CA",
    color: "#000",
    contains: [
      {
        name: "Cretaceous",
        type: "period",
        bgColor: "#82cc73",
        contains: [
          {
            name: "Late",
            type: "epoch",
            bgColor: "#abd671",
            color: "#000",
            contains: [
              {
                name: "Maastrichtian",
                type: "age",
                bgColor: "#f9f1a8",
                color: "#000",
                end: 66.0,
                endText: "66.00"
              },
              {
                name: "Campanian",
                type: "age",
                bgColor: "#ebec9e",
                color: "#000",
                end: 72.2,
                endText: "72.2 ±0.2"
              },
              {
                name: "Santonian",
                type: "age",
                bgColor: "#dfe895",
                color: "#000",
                end: 83.6,
                endText: "83.6 ±0.2"
              },
              {
                name: "Coniacian",
                type: "age",
                bgColor: "#d2e38c",
                color: "#000",
                end: 85.7,
                endText: "85.7 ±0.2"
              },
              {
                name: "Turonian",
                type: "age",
                bgColor: "#c5df83",
                color: "#000",
                end: 89.8,
                endText: "89.8 ±0.3"
              },
              {
                name: "Cenomanian",
                type: "age",
                bgColor: "#b8da7a",
                color: "#000",
                end: 93.9,
                endText: "93.9 ±0.2"
              }
            ]
          },
          {
            name: "Early",
            type: "epoch",
            bgColor: "#8fd07b",
            color: "#000",
            contains: [
              {
                name: "Albian",
                type: "age",
                bgColor: "#cee7b1",
                color: "#000",
                end: 100.5,
                endText: "100.5 ±0.1"
              },
              {
                name: "Aptian",
                type: "age",
                bgColor: "#c1e2a8",
                color: "#000",
                end: 113.2,
                endText: "113.2 ±0.3"
              },
              {
                name: "Barremian",
                type: "age",
                bgColor: "#b4de9f",
                color: "#000",
                end: 121.4,
                endText: "121.4 ±0.6"
              },
              {
                name: "Hauterivian",
                type: "age",
                bgColor: "#a7d996",
                color: "#000",
                end: 125.77,
                endText: "125.77"
              },
              {
                name: "Valanginian",
                type: "age",
                bgColor: "#9ad58d",
                color: "#000",
                end: 132.6,
                endText: "132.6 ±0.6"
              },
              {
                name: "Berriasian",
                type: "age",
                bgColor: "#8ed184",
                color: "#000",
                end: 137.05,
                endText: "137.05 ±0.2"
              }
            ]
          }
        ]
      },
      {
        name: "Jurassic",
        type: "period",
        bgColor: "#34B2C9",
        color: "#fff",
        contains: [
          {
            name: "Late",
            type: "epoch",
            bgColor: "#B3E3EE",
            color: "#000",
            contains: [
              {
                name: "Tithonian",
                type: "age",
                bgColor: "#D9F1F7",
                color: "#000",
                end: 143.1,
                endText: "143.1 ±0.6"
              },
              {
                name: "Kimmeridgian",
                type: "age",
                bgColor: "#CCECF4",
                color: "#000",
                end: 149.2,
                endText: "149.2 ±0.7"
              },
              {
                name: "Oxfordian",
                type: "age",
                bgColor: "#BFE7F1",
                color: "#000",
                end: 154.8,
                endText: "154.8 ±0.8"
              }
            ]
          },
          {
            name: "Middle",
            type: "epoch",
            bgColor: "#80CFD8",
            color: "#000",
            contains: [
              {
                name: "Callovian",
                type: "age",
                bgColor: "#BFE7E5",
                color: "#000",
                end: 161.5,
                endText: "161.5 ±1.0"
              },
              {
                name: "Bathonian",
                type: "age",
                bgColor: "#B3E2E3",
                color: "#000",
                end: 165.3,
                endText: "165.3 ±1.1"
              },
              {
                name: "Bajocian",
                type: "age",
                bgColor: "#A6DDE0",
                color: "#000",
                end: 168.2,
                endText: "168.2 ±1.2"
              },
              {
                name: "Aalenian",
                type: "age",
                bgColor: "#9AD9DD",
                color: "#000",
                end: 170.9,
                endText: "170.9 ±0.8"
              }
            ]
          },
          {
            name: "Early",
            type: "epoch",
            bgColor: "#42AED0",
            color: "#000",
            contains: [
              {
                name: "Toarcian",
                type: "age",
                bgColor: "#99CEE3",
                color: "#000",
                end: 174.7,
                endText: "174.7 ±0.8"
              },
              {
                name: "Pliensbachian",
                type: "age",
                bgColor: "#80C5DD",
                color: "#000",
                end: 184.2,
                endText: "184.2 ±0.3"
              },
              {
                name: "Sinemurian",
                type: "age",
                bgColor: "#67BCD8",
                color: "#000",
                end: 192.9,
                endText: "192.9 ±0.3"
              },
              {
                name: "Hettangian",
                type: "age",
                bgColor: "#4EB3D3",
                color: "#000",
                end: 199.5,
                endText: "199.5 ±0.3"
              },
            ]
          }
        ]
      },
      {
        name: "Triassic",
        type: "period",
        bgColor: "#812B92",
        color: "#fff",
        contains: [
          {
            name: "Late",
            type: "epoch",
            bgColor: "#bd8cc3",
            color: "#000",
            contains: [
              {
                name: "Rhaetian",
                type: "age",
                bgColor: "#D6AAD3",
                color: "#000",
                end: 201.4,
                endText: "~201.4 ±0.2"
              },
              {
                name: "Norian",
                type: "age",
                bgColor: "#D6AAD3",
                color: "#000",
                end: 205.7,
                endText: "~205.7"
              },
              {
                name: "Carnian",
                type: "age",
                bgColor: "#C99BCB",
                color: "#000",
                end: 227.3,
                endText: "~227.3"
              }
            ]
          },
          {
            name: "Middle",
            type: "epoch",
            bgColor: "#B168B1",
            color: "#fff",
            contains: [
              {
                name: "Ladinian",
                type: "age",
                bgColor: "#C983BF",
                color: "#fff",
                end: 237,
                endText: "~237"
              },
              {
                name: "Anisian",
                type: "age",
                bgColor: "#BC75B7",
                color: "#fff",
                end: 241.464,
                endText: "241.464 ±0.28"
              }
            ]
          },
          {
            name: "Early",
            type: "epoch",
            bgColor: "#983999",
            color: "#fff",
            contains: [
              {
                name: "Olenekian",
                type: "age",
                bgColor: "#B051A5",
                color: "#fff",
                end: 247,
                endText: "247.0"
              },
              {
                name: "Induan",
                type: "age",
                bgColor: "#A4469F",
                color: "#fff",
                end: 250.8,
                endText: "250.8"
              }
            ]
          }
        ]
      }
    ]
  };

  // Compute duration of each age = end of the next (older) age minus own end.
  // The Mesozoic spans from ~252.17 (base Triassic) to 66.0 (K-Pg).
  // For proportional height, scale duration to pixels: base unit = 4px per Myr
  const PALEOZOIC_BOUNDARY = 251.9;
  const SCALE = 22; // px per million years

  function getRowSpan(node: GeologicalNode): number {
    if (!node.contains?.length) {
      return 1;
    }

    return node.contains.reduce(
      (total, child) => total + getRowSpan(child),
      0
    );
  }

  function buildTableRows(root: GeologicalNode): TableRow[] {
    // Flat list of all ages in order — used to find the next age's end
    const flatAges: GeologicalNode[] = [];
    function collectAges(node: GeologicalNode) {
      if (node.type === "age") flatAges.push(node);
      node.contains?.forEach(collectAges);
    }
    collectAges(root);

    const totalRows = getRowSpan(root);

    const rows: TableRow[] = Array.from(
      { length: totalRows },
      () => Array<TableCell | null>(COLUMN_COUNT).fill(null)
    );

    function traverse(
      node: GeologicalNode,
      depth: number,
      startRow: number,
      parentSiblings?: GeologicalNode[]
    ): void {
      if (depth >= COLUMN_COUNT) return;

      const rowSpan = getRowSpan(node);

      rows[startRow][depth] = {
        name: node.name,
        rowSpan,
        endText: node.type === "age" ? node.endText : undefined,
        type: node.type,
        bgColor: node.bgColor,
        color: node.color
      };

      let currentRow = startRow;

      node.contains?.forEach((child, index, siblings) => {
        let nextEnd: number | undefined = siblings[index + 1]?.end;

        // Last age in an epoch: nextEnd should be first age of the next epoch
        if (child.type === "age" && child.end !== undefined) {
          const flatIndex = flatAges.indexOf(child);
          if (flatIndex >= 0 && flatIndex < flatAges.length - 1) {
            nextEnd = flatAges[flatIndex + 1].end;
          } else if (flatIndex === flatAges.length - 1) {
            // Last age (Induan): subtract from Mesozoic base
            nextEnd = 251.902;
          }
        }

        if (nextEnd === undefined && node.end !== undefined) {
          nextEnd = node.end;
        }

        traverse(child, depth + 1, currentRow, node.contains);

        if (child.type === "age" && child.end !== undefined && nextEnd !== undefined) {
          const cell = rows[currentRow][depth + 1];

          if (cell !== null) {
            cell.height = getAgeHeight(child.end, nextEnd);
          }
        }

        currentRow += getRowSpan(child);
      });
    }

    traverse(root, 0, 0);

    return rows;
  }

  function getAgeHeight(
    currentEnd: number,
    nextEnd: number
  ): number {
    return Number(((nextEnd - currentEnd) * SCALE).toFixed(3));
  }

  const rows: any[] = buildTableRows(ages);

  return (
    <div className="mesozoic-page">
      <header className="page-header">
        <h1>Mesozoic Era</h1>
        <p>
          The "Age of Reptiles" - spanning approximately 180 million years of
          dinosaur evolution.
        </p>
      </header>

      <section className="chronometric-chart" aria-label="International Chronostratigraphic Chart">
        <h2>International Chronostratigraphic Chart (Linear Scale)</h2>
        <figure>
          <table width="100%">
            <thead>
              <tr style={{ backgroundColor: "#7F7F7F" }}>
                <th><span style={{ color: "#FFFFFF" }}>Era</span></th>
                <th><span style={{ color: "#FFFFFF" }}>Period</span></th>
                <th><span style={{ color: "#FFFFFF" }}>Epoch</span></th>
                <th><span style={{ color: "#FFFFFF" }}>Age</span></th>
                <th><span style={{ color: "#FFFFFF" }}>End (Ma)</span></th>
              </tr>
            </thead>
            <tbody className="has-text-align-center">
              {/* Mesozoic upper boundary */}
              <tr style={{ backgroundColor: "#ffe951" }}>
                <td colSpan={4}>Cenozoic</td>
                <td>present</td>
              </tr>
              {rows.map((row, rowIndex) => (
                // const height = row.duration * SCALE;

                <tr key={rowIndex}>
                  {row.map((cell: any, colIndex: number) => {
                    if (!cell) return null;

                    return (
                      <React.Fragment key={colIndex}>
                        <td
                          key={colIndex}
                          rowSpan={cell.rowSpan}
                          style={{
                            backgroundColor: cell.bgColor || "#eee",
                            color: cell.color || "#000",
                            border: "2px groove #ccc",
                            padding: "8px",
                            height: cell.height,
                            boxSizing: "border-box"
                          }}
                        >
                          {cell.name}
                        </td>
                        {cell.type === "age" && (
                          <td
                            rowSpan={cell.rowSpan}
                            style={{
                              backgroundColor: cell.bgColor || "#eee",
                              color: cell.color || "#000",
                              border: "2px groove #ccc",
                              padding: "8px",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {cell.endText}
                          </td>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {/* Mesozoic lower boundary */}
              <tr style={{ backgroundColor: "#97c8a9" }}>
                <td colSpan={4}>Paleozoic boundary</td>
                <td>251.902 ± 0.024</td>
                <td>{(PALEOZOIC_BOUNDARY - 66.0).toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
          <figcaption>
            Row height is proportional to the duration of each age ({SCALE}px per million years).
            Source:{" "}
            <a href="https://stratigraphy.org/chart/?scale=linear" rel="noopener noreferrer" target="_blank">
              International Commission on Stratigraphy (ICS)
            </a>{" "}
            — linear scale geologic time chart showing Mesozoic subdivisions.
          </figcaption>
        </figure>
      </section>
    </div>
  );
}
