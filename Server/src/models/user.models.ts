import mongoose, {Schema, Document, Types} from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
    _id: Types.ObjectId;
    username: string;
    email: string;
    password: string;
    comparePassword(enteredPassword: string): Promise<boolean>;
}

const userSchema: Schema = new Schema({
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
});

// Hash password before saving
userSchema.pre<IUser>("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (error) {
        next(error as mongoose.CallbackError);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
    return bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model<IUser>("User", userSchema);