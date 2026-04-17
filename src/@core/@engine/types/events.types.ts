export enum ProjectEvent {
  Started = 'project.started',
  Ended = 'project.ended',
}

export enum BlockEvent {
  Started = 'block.started',
  Ended = 'block.ended',
  Failed = 'block.failed',
  Retrying = 'block.retrying',
  Skipped = 'block.skipped',
  Waiting = 'block.waiting',
  Error = 'block.error',
}
