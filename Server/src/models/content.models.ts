import mongoose, {Schema, Document} from "mongoose";

export interface IContent extends Document {
    title: string;
    link: string;
    type: string; //enum values will be in te schema
    tags: mongoose.Types.ObjectId[];
    userId: mongoose.Types.ObjectId;
}

const contentSchema: Schema = new Schema({
    title: {type: String, required: true},
    link: {type: String, required: true},
    type: {type: String, enum: ["article", "video", "image", "docs", "tweet"], required: true}, 
    tags: [{type: mongoose.Schema.Types.ObjectId, ref: "Tag"}], // References to Tag model
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true}, // Reference to User model
});

export const Content = mongoose.model<IContent>("Content", contentSchema);
