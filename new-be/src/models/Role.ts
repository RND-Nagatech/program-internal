import mongoose, { Document, Schema } from "mongoose";

export interface IRole extends Document {
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

const RoleSchema = new Schema<IRole>(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IRole>("Role", RoleSchema, "roles");
