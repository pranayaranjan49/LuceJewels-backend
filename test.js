const dns = require("node:dns").promises;

(async () => {
  try {
    const records = await dns.resolveSrv("_mongodb._tcp.jewelva.rugisej.mongodb.net");
    console.log(records);
  } catch (err) {
    console.error(err);
  }
})();