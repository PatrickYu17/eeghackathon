import { connect } from "net";

const dbUrl = process.env.DATABASE_URL || "postgres://hackathon:hackathon@localhost:5433/hackathon";
const url = new URL(dbUrl);
const host = url.hostname;
const port = Number(url.port) || 5432;

function tryConnect(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect(port, host, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

async function main() {
  console.log(`Waiting for database at ${host}:${port}...`);
  while (!(await tryConnect())) {
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("Database is ready.");
}

main();
