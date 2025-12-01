const { Client } = require("pg");

const connectionString = "postgresql://sufbotv5:XY5KLYo4ZXgmGXgi@77.90.14.56:5432/sufbotv5?schema=public";

async function testConnection() {
    const client = new Client({
        connectionString,
        ssl: false // SSL tamamen kapalı
    });

    try {
        await client.connect();
        console.log("PostgreSQL bağlantısı başarılı!");

        const result = await client.query("SELECT NOW()");
        console.log("Sorgu sonucu:", result.rows[0]);
    } catch (err) {
        console.error("Bağlantı hatası:", err);
    } finally {
        await client.end();
    }
}

testConnection();
