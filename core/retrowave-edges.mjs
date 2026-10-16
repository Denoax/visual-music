/** Derive the coarse quad strokes from the supplied baker's validated two-triangle
 * cell order. Mid-cell fine strokes can fade in without bright density changes
 * during LOD handover; original positions/normals/diagonal masks stay intact. */
export function coarseQuadMask(original, nx, nz) {
  if (
    nx % 2 !== 1 ||
    nz % 2 !== 1 ||
    original.length !== (nx - 1) * (nz - 1) * 18
  )
    throw Error("Unexpected baked quad topology");
  const result = new Float32Array(original.length);
  for (let z = 0; z < nz - 1; z++)
    for (let x = 0; x < nx - 1; x++) {
      const at = (z * (nx - 1) + x) * 18;
      for (let v = 0; v < 3; v++)
        for (let c = 0; c < 3; c++) {
          if (
            original[at + v * 3 + c] !== [0, 1, 1][c] ||
            original[at + 9 + v * 3 + c] !== [1, 1, 0][c]
          )
            throw Error("Unexpected diagonal mask");
          result[at + v * 3 + c] = [0, +(z % 2 === 0), +(x % 2 === 0)][c];
          result[at + 9 + v * 3 + c] = [
            +((z + 1) % 2 === 0),
            +((x + 1) % 2 === 0),
            0,
          ][c];
        }
    }
  return result;
}
