import mongoose, {Schema, Document, Types} from "mongoose";

export interface Ishare extends Document {
    userId: Types.ObjectId;
    shareLink: string;
    expiry: Date | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}
const shareSchema: Schema = new Schema(
    {
        userId: {type: Schema.Types.ObjectId, ref: "User", required: true},

        shareLink: {type: String, required: true, unique: true},

        expiry: {type: Date, default: null},

        isPublic: {type: Boolean, default: false},
    },
    {timestamps: true}
);

export const Share = mongoose.model<Ishare>("Share", shareSchema);