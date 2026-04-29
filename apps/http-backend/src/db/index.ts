import { prisma } from "@repo/db";

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log(`Postgres DB connected`);
    } catch (error) {
        console.log(`Failed to connect to postgres`);
        throw error;
    }
}

export default connectDB;
