
import fs from "fs";
const stats = fs.statSync("smartstock.db");
console.log("Database size:", stats.size, "bytes");
