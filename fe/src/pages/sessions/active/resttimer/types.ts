export type RestTimerStatus = "idle" | "running" | "done";

export type RestAfterLoggedSet = {
  shouldStart: boolean;
  restSec: number;
};
