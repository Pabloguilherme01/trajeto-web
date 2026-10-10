declare module "*?named-roads" {
  const snapshot: {
    retrievedAt: string;
    roads: Array<{ id: number; name: string; kind: string; points: number[][] }>;
  };
  export default snapshot;
}
