import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { processExcelJob } from "../../../inngest/functions/processExcel";

// Expose API endpoint cho Inngest Worker gọi vào Next.js
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processExcelJob,
  ],
});
