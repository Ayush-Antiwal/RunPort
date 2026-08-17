declare module 'tree-kill' {
  function kill(pid: number, signal?: string | number, callback?: (err?: Error) => void): void;
  export = kill;
}
