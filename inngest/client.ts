import { Inngest } from "inngest";

// Khởi tạo client để giao tiếp với hệ thống Background Jobs.
// eventKey: bắt buộc khi gửi event ở production (Inngest Cloud).
export const inngest = new Inngest({
  id: "bcrm-app",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
