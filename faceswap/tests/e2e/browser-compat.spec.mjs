import {test, expect} from "@playwright/test";
import {fileURLToPath} from "node:url";
import {statSync} from "node:fs";
import {execFileSync} from "node:child_process";

const videoFile = fileURLToPath(new URL("../fixtures/source.webm", import.meta.url));
const portraitFile = fileURLToPath(new URL("../fixtures/portrait.png", import.meta.url));

test("cross-browser shell, capabilities, help, and privacy work without network uploads", async ({page}) => {
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith("http://127.0.0.1:4175/")) externalRequests.push(url);
  });
  await page.goto("/");
  await expect(page.locator("#setup-title")).toHaveText("영상과 얼굴 준비");
  await expect(page.locator("#render-button")).toBeDisabled();
  await expect(page.locator("#detect-button")).toBeDisabled();
  await expect(page.locator("#webgpu")).not.toHaveText("검사 중", {timeout: 12000});
  await expect(page.locator("#wasm")).not.toHaveText("검사 중");
  await page.locator("#help-button").click();
  await expect(page.locator("#help-dialog")).toBeVisible();
  await page.locator("#help-dialog [data-close]").click();
  await expect(page.locator("#help-dialog")).toBeHidden();
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.viewportHeight + 3);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 3);
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("cross-browser local input gates recording and reset according to actual decode support", async ({page}) => {
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith("http://127.0.0.1:4175/")) externalRequests.push(url);
  });
  await page.goto("/");
  await page.locator("#video-file").setInputFiles(videoFile);
  await page.locator("#face-file").setInputFiles(portraitFile);
  await expect.poll(() => page.locator("#reference-image").evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect.poll(() => page.locator("#source-video").evaluate((video) =>
    video.readyState >= HTMLMediaElement.HAVE_METADATA || Boolean(video.error)), {timeout: 12000})
    .toBeTruthy();
  await page.locator("#consent").check();
  const decoded = await page.locator("#source-video").evaluate((video) =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0);
  const errored = await page.locator("#source-video").evaluate((video) => Boolean(video.error));
  if (errored) {
    await expect(page.locator("#check-button")).toBeDisabled();
    await expect(page.locator("#render-button")).toBeDisabled();
    await expect(page.locator("#video-detail")).toContainText("재생하지 못했어");
  } else {
    await expect(page.locator("#check-button")).toBeEnabled();
    await page.locator("#check-button").click();
    if (!decoded) await expect(page.locator("#render-button")).toBeDisabled();
  }
  // Only the optional model button may fetch a remote SDK; it stays disabled.
  await expect(page.locator("#detect-button")).toBeDisabled();
  await page.locator("#consent").uncheck();
  await expect(page.locator("#render-button")).toBeDisabled();
  await page.locator("#consent").check();
  await page.locator("#reset-button").click();
  await expect(page.locator("#render-button")).toBeDisabled();
  await expect(page.locator("#download-demo")).toBeHidden();
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("record when this engine exposes a usable media path; otherwise explain the limitation", async ({page}, testInfo) => {
  test.setTimeout(35000);
  await page.goto("/");
  await page.locator("#video-file").setInputFiles(videoFile);
  await page.locator("#face-file").setInputFiles(portraitFile);
  await page.locator("#source-video").evaluate((video) => {
    // The visible preview uses metadata preload; encourage decoding for QA.
    video.preload = "auto";
    video.load();
  });
  await expect.poll(() => page.locator("#reference-image").evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect.poll(() => page.locator("#source-video").evaluate((video) =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || Boolean(video.error)), {timeout: 14000})
    .toBeTruthy();
  await page.locator("#consent").check();
  const mayRecord = await page.locator("#render-button").isEnabled();
  if (!mayRecord) {
    const details = await page.locator("#video-detail").innerText();
    const limitation = await page.locator("#recording-support").innerText();
    console.log(`ENGINE_COMPAT ${testInfo.project.name}: recording unavailable; video=${details}; api=${limitation || "media decode not ready"}`);
    await expect(page.locator("#render-button")).toBeDisabled();
    return;
  }
  await page.locator("#render-button").click();
  await expect(page.locator("#lab-status")).toContainText("로컬 샘플 생성 완료", {timeout: 20000});
  await expect(page.locator("#download-demo")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download-demo").click();
  const file = await downloadPromise;
  const filepath = await file.path();
  expect(statSync(filepath).size).toBeGreaterThan(2000);
  const report = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-show_streams", "-of", "json", filepath
  ], {encoding: "utf8"}));
  expect(report.streams.some((stream) => stream.codec_type === "video")).toBeTruthy();
  console.log(`ENGINE_COMPAT ${testInfo.project.name}: local 3s export completed; video stream validated`);
});
