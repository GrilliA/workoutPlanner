import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readStoredAppMode, saveAppMode, type AppModeStorage } from "./appModeStorage";

const storageWith = (values: Record<string, string>) => {
  const writes: Array<[string, string]> = [];
  const storage: AppModeStorage = {
    getItemAsync: async (key) => values[key] ?? null,
    setItemAsync: async (key, value) => {
      writes.push([key, value]);
    },
  };
  return { storage, writes };
};

const failingStorage: AppModeStorage = {
  getItemAsync: async () => {
    throw new Error("Keychain non disponibile");
  },
  setItemAsync: async () => {
    throw new Error("Keychain non disponibile");
  },
};

describe("readStoredAppMode", () => {
  it("reads the mode saved for that user", async () => {
    const { storage } = storageWith({ "traccia.appMode.3": "nutrition", "traccia.appMode.4": "training" });
    assert.equal(await readStoredAppMode(storage, 3), "nutrition");
    assert.equal(await readStoredAppMode(storage, 4), "training");
  });

  it("starts in training with nothing saved for that user", async () => {
    const { storage } = storageWith({ "traccia.appMode.3": "nutrition" });
    assert.equal(await readStoredAppMode(storage, 9), "training");
  });

  it("starts in training with an unknown saved value", async () => {
    const { storage } = storageWith({ "traccia.appMode.3": "unknown" });
    assert.equal(await readStoredAppMode(storage, 3), "training");
  });

  it("starts in training when reading fails", async () => {
    assert.equal(await readStoredAppMode(failingStorage, 3), "training");
  });
});

describe("saveAppMode", () => {
  it("writes the mode under the user's key", async () => {
    const { storage, writes } = storageWith({});
    await saveAppMode(storage, 3, "nutrition");
    assert.deepEqual(writes, [["traccia.appMode.3", "nutrition"]]);
  });

  it("does not throw when writing fails", async () => {
    await assert.doesNotReject(saveAppMode(failingStorage, 3, "training"));
  });
});
