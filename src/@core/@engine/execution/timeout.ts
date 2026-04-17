export async function timeout<T>(ms: number, task: () => Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout
  return Promise.race<T>([
    task(),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Timeout')), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}
