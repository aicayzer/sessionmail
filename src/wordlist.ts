const WORDS = [
  "brave", "calm", "swift", "quiet", "bold", "keen", "lucky", "sharp", "bright", "gentle",
  "steady", "eager", "plain", "solid", "rapid", "sunny", "stark", "loyal", "clever", "sturdy",
  "amber", "coral", "cedar", "ember", "frost", "moss", "slate", "storm", "tidal", "willow",
  "north", "east", "south", "west", "high", "low", "deep", "wide", "long", "short",
];

const ANIMALS = [
  "fox", "owl", "wolf", "hare", "lynx", "crow", "otter", "heron", "badger", "raven",
  "falcon", "beetle", "sparrow", "marten", "seal", "gecko", "moth", "wren", "vole", "tern",
  "ibis", "newt", "shrike", "stoat", "swift", "kite", "loon", "auk", "mink", "puffin",
  "gull", "finch", "grouse", "hawk", "jay", "lark", "quail", "robin", "swan", "teal",
];

export function generateCode(exists: (code: string) => boolean): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const suffix = Math.floor(Math.random() * 100);
    const code = `${word}-${animal}-${suffix}`;
    if (!exists(code)) return code;
  }
  throw new Error("Could not generate a unique pairing code after 100 attempts");
}
