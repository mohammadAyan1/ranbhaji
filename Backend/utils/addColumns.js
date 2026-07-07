import { sequelize } from "../models/index.js";

const run = async () => {
    try {
        await sequelize.query("ALTER TABLE products ADD COLUMN hindi_name VARCHAR(100) NULL;");
        console.log("Added hindi_name to products");
    } catch(err) {
        console.log("hindi_name might already exist: ", err.message);
    }
    
    try {
        await sequelize.query("ALTER TABLE products ADD COLUMN image_url VARCHAR(255) NULL;");
        console.log("Added image_url to products");
    } catch(err) {
        console.log("image_url might already exist: ", err.message);
    }

    process.exit(0);
};

run();
