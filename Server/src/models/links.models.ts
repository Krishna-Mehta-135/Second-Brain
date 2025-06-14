import mongoose, { Schema, Document } from "mongoose";

export interface ILink extends Document {
    link: string; // The actual link as a string
    userId: mongoose.Types.ObjectId; // Reference to the User model
}

const linkSchema: Schema = new Schema({
    link: { type: String, required: true }, // The actual link
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User model
});

export const Link = mongoose.model<ILink>("Link", linkSchema);