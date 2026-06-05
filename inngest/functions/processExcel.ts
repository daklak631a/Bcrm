import { inngest } from "../client";

export const processExcelJob = inngest.createFunction(
  { id: "process-excel-upload" },
  { event: "app/excel.uploaded" },
  async ({ event, step }) => {
    const { fileUrl, uploadedBy } = event.data;

    // Bước 1: Parse file Excel
    const rawData = await step.run("download-and-parse-excel", async () => {
      // Tại đây viết logic gọi thư viện xlsx để parse file từ fileUrl
      // Giả lập trả về 10000 khách hàng
      return { totalRows: 10000, rows: [] }; 
    });

    // Bước 2: Chunking (Chia nhỏ dữ liệu) để tránh lỗi Payload Too Large của Database
    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(rawData.totalRows / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      await step.run(`insert-chunk-${i}`, async () => {
        // Thực thi lệnh insert 500 dòng vào bảng Supabase tại đây
        // const chunkData = rawData.rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        // await supabaseAdmin.from('customers').insert(chunkData);
      });
    }

    // Bước 3: Gửi thông báo thành công cho người dùng
    await step.run("send-completion-notification", async () => {
      // Dùng Supabase Server Role để chèn thông báo vào bảng notifications
      // await supabaseAdmin.from('notifications').insert({ user_id: uploadedBy, title: "Xử lý Excel hoàn tất!" })
    });

    return { message: "Hoàn tất xử lý file Excel đa luồng", processedRows: rawData.totalRows };
  }
);
