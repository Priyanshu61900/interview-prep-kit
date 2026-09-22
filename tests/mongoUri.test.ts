import { describe, it, expect } from "vitest";
import { findMongoUri } from "@/lib/db";

const REAL = "mongodb+srv://u:p@cluster0.abcd.mongodb.net/prep";

describe("findMongoUri", () => {
  it("prefers an explicit MONGODB_URI", () => {
    expect(findMongoUri({ MONGODB_URI: REAL })).toBe(REAL);
  });

  it("finds the prefixed variable a managed integration injects", () => {
    // Vercel's MongoDB Atlas integration wrote exactly this key.
    expect(findMongoUri({ ATLAS_MONGODB_URI: REAL })).toBe(REAL);
  });

  it("handles any prefix, since the user picks it when linking the store", () => {
    expect(findMongoUri({ MYDB_MONGODB_URI: REAL })).toBe(REAL);
  });

  it("ignores the .env.example placeholder", () => {
    const ph = "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/prep";
    expect(findMongoUri({ MONGODB_URI: ph })).toBeUndefined();
  });

  it("ignores a mongo-ish key that is not a connection string", () => {
    expect(findMongoUri({ MONGODB_REGION: "eu-west-1" })).toBeUndefined();
  });

  it("ignores a connection string under an unrelated key", () => {
    expect(findMongoUri({ SOME_OTHER_URL: REAL })).toBeUndefined();
  });

  it("returns undefined when nothing is configured", () => {
    expect(findMongoUri({})).toBeUndefined();
  });
});
