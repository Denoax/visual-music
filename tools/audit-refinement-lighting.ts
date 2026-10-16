import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { floorLightGLSL } from "../src/show/floor.ts";
import { heightGLSL, waveState } from "../src/show/waves.ts";
import features from "../analysis/features.json";
import {
  hash32,
  chunkAt,
  chapterMix,
  smooth5,
} from "../core/chunk-wave-exchange.mjs";
import { formationBand, formationFor } from "../core/wave-formations.mjs";
import { decorationFronts } from "../src/show/drivers.ts";
import { globalLightingAt } from "../src/show/floor.ts";
const EMPTY_FORM = [0, 1, 0, 0];
// Birth metadata is selected before float conversion, just as in field.ts.
const formForUpload = (birth: number) =>
  formationFor(birth).map((value: number) => Math.fround(value));
function formationExchangeGate(
  x: number,
  z: number,
  fronts: readonly {
    x: number;
    z: number;
    time: number;
    id: number;
    form: readonly number[];
  }[],
  seconds: number,
) {
  const chunk = chunkAt(x, z);
  let swap = 0;
  for (const front of fronts) {
    const age = seconds - front.time;
    if (age <= 0 || age >= 5.6) continue;
    if (hash32(chunk.cx, chunk.cz, front.id) >= 1374389534) continue;
    const spatial = formationBand(
      chunk.centerX - front.x,
      chunk.centerZ - front.z,
      age,
      front.form,
    );
    const life = smooth5(age / 0.14) * (1 - smooth5((age - 4.2) / 1.4));
    swap = Math.max(swap, spatial * life);
  }
  return chunk.base + (1 - 2 * chunk.base) * swap;
}
const probes = [];
for (const seconds of [
  1, 8, 27, 40.1, 40.5, 41.3, 75.6, 98.2, 126, 160, 179, 204, 215,
]) {
  const state = waveState(seconds, features, false),
    light = globalLightingAt(seconds),
    xy: number[] = [],
    cpu: number[] = [],
    frontForms = state.fronts.map((front) => formForUpload(front.time)),
    drivers = decorationFronts(state.fronts),
    localForms = drivers.map((front) => formForUpload(front.time)),
    gpuDrivers = drivers.map((front, index) => ({
      ...front,
      x: Math.fround(front.x),
      z: Math.fround(front.z),
      time: Math.fround(front.time),
      form: localForms[index],
    }));
  if (drivers.length > 2) throw Error("Decorative driver capacity exceeded");
  const gate = (x: number, z: number, kind: number) =>
    kind === 0
      ? +(
          hash32(Math.floor(x / 1.5 + 0.001), Math.floor(z / 1.5 + 0.001), 0) /
            4294967296 <
          0.06 + 0.3 * smooth5(seconds / 12)
        )
      : kind === 10
        ? +(
            hash32(
              Math.floor(x / 1.5 + 0.001),
              Math.floor(z / 1.5 + 0.001),
              0,
            ) /
              4294967296 <
            0.46
          )
        : formationExchangeGate(x, z, gpuDrivers, Math.fround(seconds));
  for (let ix = -64; ix <= 64; ix++)
    for (let iz = -65; iz <= 65; iz += 3) {
      const x = Math.fround(ix * 1.5),
        z = Math.round((-18 * seconds + iz * 1.5) / 1.5) * 1.5;
      xy.push(x, z);
      const blend = chapterMix(x, z, Math.fround(seconds), light.sectionStart, {
        seed: 13,
      });
      cpu.push(
        gate(x, z, light.previousKind) * (1 - blend) +
          gate(x, z, light.kind) * blend,
      );
    }
  probes.push({
    seconds,
    state,
    light,
    xy,
    cpu,
    drivers,
    frontForms,
    localForms,
    borrow: [0, 0, 0, 0],
  });
  const bz = Math.round((-18 * seconds) / 3) * 3;
  probes.push({
    seconds,
    state,
    light,
    xy,
    drivers,
    frontForms,
    localForms,
    borrow: [0, bz, seconds, 0.65],
    cpu: cpu.map((g, i) => {
      const x = xy[i * 2],
        z = xy[i * 2 + 1],
        selected =
          x % 3 === 0 &&
          z % 3 === 0 &&
          Math.hypot(x, z - bz) <= 16 &&
          hash32(Math.round(x / 3), Math.round(z / 3), 71) % 3 === 0;
      return g * (selected ? 0.35 : 1);
    }),
  });
}
const software = process.argv.includes("--software");
const headed = process.argv.includes("--headed");
const browser = await chromium.launch({
  headless: !headed,
  executablePath:
    "/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  args: [
    "--no-sandbox",
    "--enable-automation",
    ...(headed ? ["--ozone-platform=x11"] : []),
    ...(software
      ? ["--enable-unsafe-swiftshader"]
      : ["--use-gl=angle", "--use-angle=gl"]),
  ],
});
try {
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  const command = await cdp.send("Browser.getBrowserCommandLine");
  const profile = command.arguments
    .find((arg) => arg.startsWith("--user-data-dir="))
    ?.slice(16);
  if (!profile?.startsWith("/tmp/playwright_chromiumdev_profile-"))
    throw Error("Audit browser temporary profile ownership not proven");
  await page.addInitScript("globalThis.__name=(fn)=>fn");
  await page.goto("about:blank");
  const result = await page.evaluate(
    ({ kernel, probes, state, emptyForm }) => {
      const gl = document.createElement("canvas").getContext("webgl2");
      if (!gl)
        throw Error("WebGL2 unavailable for the requested audit backend");
      function compile(type: number, src: string) {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw Error(gl.getShaderInfoLog(s)!);
        return s;
      }
      const p = gl.createProgram()!;
      gl.attachShader(
        p,
        compile(
          gl.VERTEX_SHADER,
          `#version 300 es\nprecision highp float;precision highp int;#define texture2D texture\n${kernel}\nin vec2 point;out vec3 value;void main(){FloorLight f=floorLight(point);value=vec3(f.activation,max(f.emission.x,max(f.emission.y,f.emission.z)),max(f.spill.x,max(f.spill.y,f.spill.z)));gl_Position=vec4(0.);}`.replace(
            "int;#",
            "int;\n#",
          ),
        ),
      );
      gl.attachShader(
        p,
        compile(
          gl.FRAGMENT_SHADER,
          "#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(0.);}",
        ),
      );
      gl.transformFeedbackVaryings(p, ["value"], gl.INTERLEAVED_ATTRIBS);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(p)!);
      gl.useProgram(p);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255]),
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      const loc = (n: string) => gl.getUniformLocation(p, n);
      gl.uniform1f(loc("uBrightness"), 1);
      gl.uniform1f(loc("uLow"), 0.8);
      gl.uniform1f(loc("uAccent"), 1);
      gl.uniform1f(loc("uTime"), state.seconds);
      gl.uniform4fv(
        loc("uPaint[0]"),
        new Float32Array(
          Array.from({ length: 8 }, () => [0, 0, -1000, 0]).flat(),
        ),
      );
      gl.uniform3f(loc("uFlow"), 0.5, 0.75, 1);
      gl.uniform4f(loc("uLighting"), 0, 1, 1, 0.28);
      gl.uniform1ui(loc("uDensityThreshold"), Math.floor(0.28 * 4294967296));
      const fronts = new Float32Array(64);
      for (let i = 0; i < 16; i++) {
        const e = state.fronts[i];
        fronts.set(
          [e?.x ?? 0, e?.z ?? 0, e?.time ?? -1000, e?.strength ?? 0],
          i * 4,
        );
      }
      gl.uniform4fv(loc("uFronts[0]"), fronts);
      gl.bindVertexArray(gl.createVertexArray());
      gl.bindTransformFeedback(
        gl.TRANSFORM_FEEDBACK,
        gl.createTransformFeedback(),
      );
      const input = gl.createBuffer(),
        output = gl.createBuffer(),
        at = gl.getAttribLocation(p, "point");
      const mismatches: any[] = [];
      let count = 0,
        off = 0,
        on = 0,
        error = 0,
        offEmissionMax = 0,
        offSpillMax = 0;
      for (const q of probes) {
        gl.uniform1f(loc("uTime"), q.seconds);
        gl.uniform4fv(loc("uBorrow"), new Float32Array(q.borrow));
        gl.uniform4fv(
          loc("uFronts[0]"),
          new Float32Array(
            Array.from({ length: 16 }, (_, i) => {
              const f = q.state.fronts[i];
              return [f?.x ?? 0, f?.z ?? 0, f?.time ?? -1000, f?.strength ?? 0];
            }).flat(),
          ),
        );
        gl.uniform4fv(
          loc("uFrontForms[0]"),
          new Float32Array(
            Array.from(
              { length: 16 },
              (_, i) => q.frontForms[i] ?? emptyForm,
            ).flat(),
          ),
        );
        gl.uniform4f(loc("uRecipe"), q.light.kind, q.light.phase, 2, 0);
        gl.uniform4f(
          loc("uChapter"),
          q.light.previousKind,
          q.light.previousFamily,
          q.light.sectionStart,
          q.light.sectionEnd,
        );
        const drivers = q.drivers;
        gl.uniform4fv(
          loc("uLocalFronts[0]"),
          new Float32Array(
            Array.from({ length: 2 }, (_, i) => {
              const f = drivers[i];
              return [f?.x ?? 0, f?.z ?? 0, f?.time ?? -1000, f?.strength ?? 0];
            }).flat(),
          ),
        );
        gl.uniform4fv(
          loc("uLocalForms[0]"),
          new Float32Array(
            Array.from(
              { length: 2 },
              (_, i) => q.localForms[i] ?? emptyForm,
            ).flat(),
          ),
        );
        gl.uniform2iv(
          loc("uLocalIds"),
          new Int32Array(
            drivers
              .map((f) => f.id)
              .concat([-1, -1])
              .slice(0, 2),
          ),
        );
        gl.bindBuffer(gl.ARRAY_BUFFER, input);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(q.xy), gl.STREAM_DRAW);
        gl.enableVertexAttribArray(at);
        gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
        const values = new Float32Array(q.cpu.length * 3);
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, output);
        gl.bufferData(
          gl.TRANSFORM_FEEDBACK_BUFFER,
          values.byteLength,
          gl.STREAM_READ,
        );
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, output);
        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, q.cpu.length);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);
        gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, values);
        q.cpu.forEach((c, i) => {
          error = Math.max(error, Math.abs(values[i * 3] - c));
          if (Math.abs(values[i * 3] - c) > 0.00002 && mismatches.length < 12)
            mismatches.push({
              kind: q.light.kind,
              seconds: q.seconds,
              phase: q.light.phase,
              x: q.xy[i * 2],
              z: q.xy[i * 2 + 1],
              cpu: c,
              gpu: values[i * 3],
            });
          if (c === 0) {
            off++;
            offEmissionMax = Math.max(offEmissionMax, values[i * 3 + 1]);
            offSpillMax = Math.max(offSpillMax, values[i * 3 + 2]);
          }
          if (c === 1) on++;
          count++;
        });
      }
      if (gl.getError() !== 0) throw Error("GL audit error");
      return {
        mismatches,
        count,
        off,
        on,
        error,
        offEmissionMax,
        offSpillMax,
        renderer: gl.getParameter(
          gl.getExtension("WEBGL_debug_renderer_info")!.UNMASKED_RENDERER_WEBGL,
        ),
      };
    },
    {
      kernel: heightGLSL + floorLightGLSL,
      emptyForm: EMPTY_FORM,
      probes,
      state: waveState(84, features, false),
    },
  );
  if (
    !software &&
    /swiftshader|llvmpipe|software|lavapipe/i.test(result.renderer)
  )
    throw Error(`Requested hardware audit ran on software: ${result.renderer}`);
  if (
    result.error > 0.00002 ||
    result.offEmissionMax !== 0 ||
    result.offSpillMax !== 0
  )
    throw Error(JSON.stringify(result));
  await writeFile(
    process.argv.find((x) => x.startsWith("--out="))?.slice(6) ||
      "evidence/black-sky-wave-colour/lighting-gpu-audit.json",
    JSON.stringify(
      {
        ...result,
        status: "passed",
        headed,
        temporaryOwnedProfile: true,
        requestedBackend: software
          ? "software-swiftshader"
          : "hardware-angle-gl",
        scope:
          "Actual shared runtime GLSL activation and complete emission/spill at canonical positive/negative near/fine/far identities; event-born formations use matching physical and decorative metadata order; accented rings and strips enabled. Unlit housings and independent neighboring surface strips are not lamp emission. This is GPU/math evidence, not visual/listening approval.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(result);
} finally {
  await browser.close();
}
