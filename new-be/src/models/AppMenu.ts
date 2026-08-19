import mongoose, { Document, Schema } from "mongoose";

export interface IAppMenu extends Document {
  code: string;
  name: string;
  division: string;
  description?: string;
  targetUrl: string;
  defaultPath: string;
  allowedRoles: string[];
  isActive: boolean;
}

const AppMenuSchema = new Schema<IAppMenu>(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    division: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    targetUrl: { type: String, required: true, trim: true },
    defaultPath: { type: String, default: "/", trim: true },
    allowedRoles: [{ type: String, trim: true, lowercase: true }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IAppMenu>("AppMenu", AppMenuSchema, "app_menus");
