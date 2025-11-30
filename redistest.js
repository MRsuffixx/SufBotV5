const Redis = require("ioredis");

const redis = new Redis({
    host: "77.90.14.56",
    port: 6379,
    password: "ZXCjqKbU0bfPOF0ZPDrDKRJrTZe9ondc", // Şifre yoksa sil
    db: 0,
    tls: false // SSL kullanmıyorsan false kalsın
});

async function test() {
    try {
        await redis.ping();
        console.log("Redis bağlantısı başarılı!");
    } catch (err) {
        console.error("Redis bağlantı hatası:", err);
    } finally {
        redis.disconnect();
    }
}

test();
