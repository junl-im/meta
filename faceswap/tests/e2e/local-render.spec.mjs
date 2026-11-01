import {test, expect} from "@playwright/test";
import {statSync} from "node:fs";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const videoFile = fileURLToPath(new URL("../fixtures/source.webm", import.meta.url));
const portraitFile = fileURLToPath(new URL("../fixtures/portrait.png", import.meta.url));

async function loadSyntheticFiles(page) {
  await page.locator("#video-file").setInputFiles(videoFile);
  await page.locator("#face-file").setInputFiles(portraitFile);
  await expect.poll(() => page.locator("#source-video").evaluate((video) => video.videoWidth)).toBeGreaterThan(0);
  await expect.poll(() => page.locator("#reference-image").evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await page.locator("#consent").check();
  await expect(page.locator("#check-button")).toBeEnabled();
  await expect(page.locator("#render-button")).toBeEnabled();
}

test("local input to recorded playable output, with no model download", async ({page}) => {
  const pageErrors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith("http://127.0.0.1:4175/")) externalRequests.push(url);
  });
  await page.goto("/");
  await expect(page.locator("#video-file")).toHaveCount(1);
  await loadSyntheticFiles(page);
  await expect(page.locator("#detect-button")).toBeDisabled();
  await page.locator("#check-button").click();
  await page.locator("#render-button").click();
  await expect(page.locator("#lab-status")).toContainText("로컬 샘플 생성 완료", {timeout: 20000});
  await expect(page.locator("#result-video")).toBeVisible();
  await expect(page.locator("#download-demo")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download-demo").click();
  const output = await downloadPromise;
  const filepath = await output.path();
  expect(statSync(filepath).size).toBeGreaterThan(2000);
  const metadata = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-show_streams", "-show_format", "-of", "json", filepath
  ], {encoding: "utf8"}));
  expect(metadata.streams.some((stream) => stream.codec_type === "video")).toBeTruthy();
  // MediaRecorder WebM output may omit container Duration metadata.
  // Independently derive playback extent from actual encoded video packets.
  const packetInfo = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "packet=pts_time,duration_time", "-of", "json", filepath
  ], {encoding: "utf8"}));
  const measured = Math.max(...(packetInfo.packets || []).map((packet) =>
    Number(packet.pts_time) + (Number(packet.duration_time) || 0)));
  expect(Number.isFinite(measured)).toBeTruthy();
  expect(measured).toBeGreaterThan(1.8);
  expect(measured).toBeLessThan(4.8);
  await expect.poll(() => page.locator("#result-video").evaluate((element) => element.videoWidth))
    .toBeGreaterThan(0);
  // The fixture contains a 440 Hz tone. Assert actual decoded audio signal:
  // a nominal audio track containing silence would not satisfy this test.
  const uiStatus = await page.locator("#lab-status").innerText();
  expect(uiStatus).toContain("오디오 경로 연결");
  expect(metadata.streams.some((stream) => stream.codec_type === "audio")).toBeTruthy();
  const audioPackets = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-select_streams", "a:0",
    "-show_entries", "packet=pts_time,duration_time", "-of", "json", filepath
  ], {encoding: "utf8"}));
  const audioEnd = Math.max(...(audioPackets.packets || []).map((packet) =>
    Number(packet.pts_time) + (Number(packet.duration_time) || 0)));
  expect(audioEnd).toBeGreaterThan(1.8);
  expect(audioEnd).toBeLessThan(4.8);
  const decodedAudio = spawnSync("ffmpeg", [
    "-hide_banner", "-i", filepath, "-map", "0:a:0", "-af", "volumedetect",
    "-f", "null", "-"
  ], {encoding: "utf8"});
  expect(decodedAudio.status).toBe(0);
  const peak = /max_volume:\s*(-?[\d.]+) dB/.exec(decodedAudio.stderr);
  expect(peak).not.toBeNull();
  expect(Number(peak[1])).toBeGreaterThan(-50);
  expect(pageErrors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("reset and revoked rights disable composition without losing source files", async ({page}) => {
  await page.goto("/");
  await expect(page.locator("#video-file")).toHaveCount(1);
  await loadSyntheticFiles(page);
  await page.locator("#consent").uncheck();
  await expect(page.locator("#render-button")).toBeDisabled();
  await page.locator("#consent").check();
  await expect(page.locator("#render-button")).toBeEnabled();
  await page.locator("#reset-button").click();
  await expect(page.locator("#render-button")).toBeDisabled();
  await expect(page.locator("#download-demo")).toBeHidden();
});

test("a second recording can reuse the same local audio source", async ({page}) => {
  await page.goto("/");
  await loadSyntheticFiles(page);
  for (let i = 0; i < 2; i++) {
    await page.locator("#render-button").click();
    await expect(page.locator("#lab-status")).toContainText("로컬 샘플 생성 완료", {timeout: 20000});
    await expect(page.locator("#render-button")).toBeEnabled();
  }
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download-demo").click();
  const output = await downloadPromise;
  const metadata = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-show_streams", "-of", "json", await output.path()
  ], {encoding: "utf8"}));
  expect(metadata.streams.some((stream) => stream.codec_type === "audio")).toBeTruthy();
});
