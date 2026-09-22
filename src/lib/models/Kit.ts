import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Kit, KitMeta } from "@/types/kit";

export interface CachedResearch {
  companyName: string;
  aboutText: string;
  hiringText: string;
  hiringProcessNotes: string;
  pagesUsed: string[];
}

export interface KitDoc extends Document {
  ownerId: mongoose.Types.ObjectId;
  title: string;
  status: "generating" | "ready" | "failed" | "partial";
  generationError: string | null;
  jd: string;
  companyUrl: string;
  daysRequested: number;
  contentHash: string;
  research: CachedResearch | null;
  kit: Kit | null;
  meta: KitMeta;
  warnings: { step: string; message: string }[];
  createdAt: Date;
  updatedAt: Date;
}

// meta uses Schema.Types.Mixed (not Mongoose Map) so it round-trips as a
// plain object — a real Map instance serializes to "{}" under JSON.stringify,
// which is exactly what every API response needs to send this back as.
const kitSchema = new Schema<KitDoc>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    status: { type: String, enum: ["generating", "ready", "failed", "partial"], default: "generating" },
    generationError: { type: String, default: null },
    jd: { type: String, required: true },
    companyUrl: { type: String, required: true },
    daysRequested: { type: Number, required: true },
    contentHash: { type: String, required: true, index: true },
    research: { type: Schema.Types.Mixed, default: null },
    kit: { type: Schema.Types.Mixed, default: null },
    meta: { type: Schema.Types.Mixed, default: () => ({ question_meta: {}, flashcard_meta: {}, brief_meta: null, schedule_meta: null, skipped_sources: [], practice_attempts: [] }) },
    warnings: { type: [{ step: String, message: String }], default: [] },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

kitSchema.index({ ownerId: 1, contentHash: 1 });

export const KitModel: Model<KitDoc> = mongoose.models.Kit || mongoose.model<KitDoc>("Kit", kitSchema);
