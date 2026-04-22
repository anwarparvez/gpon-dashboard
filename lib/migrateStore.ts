let progress = {
  total: 0,
  processed: 0,
  updated: 0,
  running: false
};

export function setProgress(data: Partial<typeof progress>) {
  progress = { ...progress, ...data };
}

export function getProgress() {
  return progress;
}