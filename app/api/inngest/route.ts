import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { processExcelJob } from "../../../inngest/functions/processExcel";

// Expose API endpoint cho Inngest Worker gọi vào Next.js.
// signingKey xác thực mọi request đến /api/inngest — bắt buộc ở production
// để endpoint không thể bị gọi/giả mạo bởi bên thứ ba.
export const { GET, POST, PUT } = serve({
  client: inngest,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  functions: [
    processExcelJob,
  ],
});
