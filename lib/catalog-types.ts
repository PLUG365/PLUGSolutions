export type Solution = {
  schemaVersion: 1;
  slug: string;
  title: string;
  maker: {
    displayName: string;
    xHandle: string;
    xUrl: string;
  };
  description: string;
  type: string;
  categories: string[];
  tags: string[];
  distributionUrl: string;
  sourceUrl: string | null;
  instructionsUrl: string | null;
  license: string;
  cost: string;
  premiumRequired: boolean | null;
  setupTime: string;
  prerequisites: string[];
  thumbnail: string | null;
  publishedAt: string;
  updatedAt: string;
};

export type ReactionCounts = Record<
  string,
  {
    interested: number;
    tried: number;
    adopted: number;
  }
>;
