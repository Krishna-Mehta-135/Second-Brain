import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const connectionInstance = mongoose.connect(`${process.env.MONGO_URL}`)
        console.log(`Mongo Db connected at port ${process.env.PORT}`);
    } catch (error) {
        console.log(`Failed to connect to mongodb`);
        throw error
    }
}

export default connectDB