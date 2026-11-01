import {test, expect} from "@playwright/test";
import {statSync} from "node:fs";
import {execFileSync} from "node:child_process";
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
  const duration = Number(metadata.format?.duration);
  expect(duration).toBeGreaterThan(1.8);
  expect(duration).toBeLessThan(4.8);
  const uiStatus = await page.locator("#lab-status").innerText();
  if (uiStatus.includes("오디오 트랙 포함")) {
    expect(metadata.streams.some((stream) => stream.codec_type === "audio")).toBeTruthy();
  }
  expect(pageErrors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("reset and revoked rights disable composition without losing source files", async ({page}) => {
  await page.goto("/");
  await loadSyntheticFiles(page);
  await page.locator("#consent").uncheck();
  await expect(page.locator("#render-button")).toBeDisabled();
  await page.locator("#consent").check();
  await expect(page.locator("#render-button")).toBeEnabled();
  await page.locator("#reset-button").click();
  await expect(page.locator("#render-button")).toBeDisabled();
  await expect(page.locator("#download-demo")).toBeHidden();
});
