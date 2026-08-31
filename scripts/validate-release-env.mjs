import { validateReleaseEnvironment } from "./release-environment.mjs";

const target = process.argv[2];
const errors = validateReleaseEnvironment(target);

if (errors.length > 0) {
  console.error(`Release environment check failed for ${target ?? "unknown target"}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Release environment check passed for ${target}. No secret values were printed.`);
}
