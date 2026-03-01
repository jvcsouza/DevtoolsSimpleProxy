import type { RuntimePort } from "@core/ports/runtime.port";
import { createChromeRuntimeAdapter } from "./chrome.runtime";
import { createLocalRuntimeAdapter } from "./local.runtime";

export function createRuntime(): RuntimePort {
  const isChrome =
    typeof chrome !== "undefined" &&
    !!chrome.storage?.local &&
    !!chrome.declarativeNetRequest &&
    !!chrome.tabs;

  return isChrome ? createChromeRuntimeAdapter() : createLocalRuntimeAdapter();
}