import { ensureOrganisation } from "./reference";

ensureOrganisation()
  .then(() => {
    console.log("MeterVault organisation is ready.");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
