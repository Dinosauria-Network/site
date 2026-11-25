import React from 'react';
import PageHeader from "@/components/PageHeader";
import { pageTitle } from "@/lib/site";
import { buildMesozoicTree, type GeologicalNode } from "@/lib/geologic-time";

export const metadata = {
  title: pageTitle("Mesozoic Era"),
  description:
    "Mesozoic Era chronostratigraphy - Triassic, Jurassic, Cretaceous periods",
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
  const ages: GeologicalNode = buildMesozoicTree();

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
      <PageHeader title="Mesozoic Era">
        <p>
          The "Age of Reptiles" - spanning approximately 180 million years of
          dinosaur evolution.
        </p>
      </PageHeader>

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
