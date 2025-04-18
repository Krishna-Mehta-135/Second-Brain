import mongoose, { Schema, Document } from "mongoose";

export interface ITag extends Document {
    name: string; // The name of the tag
}

const tagSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true }, // Unique tag names
});

export const Tag = mongoose.model<ITag>("Tag", tagSchema);