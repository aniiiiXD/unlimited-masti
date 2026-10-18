import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";

// The harness has no model-accessible shell or sandbox file tools. This
// lightweight virtual filesystem only satisfies Eve's session runtime.
export const environment = JustBashSandbox.environment();

export default defineSandbox(() => environment.open());
