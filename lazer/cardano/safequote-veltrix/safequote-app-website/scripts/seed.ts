type SeedStatus = "created" | "updated" | "unchanged" | "skipped";

function logSeed(entity: string, status: SeedStatus, detail: string) {
  console.log(
    JSON.stringify({
      scope: "seed",
      entity,
      status,
      detail,
      timestamp: new Date().toISOString(),
    }),
  );
}

logSeed("seller-demo", "created", "demo seller initialized");
logSeed("user-demo", "created", "demo user initialized");
logSeed(
  "invoice-categories",
  "unchanged",
  "default categories already present",
);
