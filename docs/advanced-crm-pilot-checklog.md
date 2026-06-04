# Checklog triển khai luồng CRM nâng cao B2B

Mục tiêu là kiểm thử lõi điều phối luồng B2B: công việc đơn giản, dự án, đề xuất, báo cáo, yêu cầu hỗ trợ, hạn mức, phê duyệt nhiều cấp và không gian xử lý sau phê duyệt mà không làm thay đổi hệ thống CRM hiện hữu.

## Nguyên tắc không phá vỡ CRM nền

- [x] CRM hiện hữu vẫn là nguồn dữ liệu gốc cho khách hàng, cơ hội bán, sản phẩm, khoản vay, tiền gửi và tương tác.
- [x] Luồng nâng cao chỉ được kích hoạt theo điều kiện từ cơ hội B2B: có dự án, có hạn mức, hoặc cần phê duyệt nhiều cấp.
- [x] Không thêm migration vào hệ thống production.
- [x] Có dữ liệu thử nghiệm riêng để chạy trên môi trường độc lập.
- [x] Giao diện dùng dữ liệu mẫu có cấu trúc để thử logic trước khi nối dữ liệu thật.
- [x] Lõi thiết kế là `Workflow Instance`; dự án chỉ là một loại luồng có thêm Kanban, Gantt, Timeline, thành viên, mốc nghiệm thu và nhật ký.

## Việc đã triển khai

- [x] Thêm màn hình `/advanced-workflow-pilot`.
- [x] Thêm navigation `Luồng B2B Nâng Cao` trong sidebar.
- [x] Thiết kế màn hình đáp ứng tốt trên máy tính và điện thoại.
- [x] Thêm danh sách luồng bên trái: chọn một luồng sẽ mở đúng không gian xử lý của luồng đó.
- [x] Tách màn hình chi tiết thành 2 lớp: `Tuyến xử lý` và `Không gian làm việc`, tránh dồn toàn bộ nội dung vào cùng một màn hình.
- [x] Bỏ khối hướng dẫn tổng quan và form tạo luồng mẫu khỏi màn hình pilot để tập trung vào hồ sơ đang xử lý.
- [x] Chuyển danh sách chọn dự án từ cột trái sang thanh chọn gọn phía trên để mở rộng toàn bộ chiều ngang cho workspace.
- [x] Thêm thanh điều hướng sticky trong workspace: Gantt và Kanban của giai đoạn đang chọn.
- [x] Các mục trên thanh điều hướng scroll tới đúng section nội dung phía dưới thay vì chỉ đổi tab trong một khung.
- [x] Ẩn các section hậu kiểm `Tuyến bàn giao`, `Người tham gia`, `Nhật ký` khỏi workspace chính vì cán bộ thường không cần xem.
- [x] Thanh điều hướng sticky trong workspace chính chỉ còn nội dung cán bộ cần xử lý thường xuyên: `Gantt` và `Kanban của giai đoạn`.
- [x] Comment được tách khỏi panel chi tiết nhỏ và hiển thị ở khu vực rộng dưới Kanban, theo đúng giai đoạn và task đang chọn.
- [x] Khu vực trao đổi có danh sách task trong giai đoạn, số comment từng task, luồng comment lớn và ô nhập riêng để theo dõi vướng mắc/kết quả xử lý.
- [x] Chi tiết công việc Kanban chuyển xuống dưới bảng Kanban, không còn panel dọc nhỏ bên phải.
- [x] Trao đổi công việc nằm ngang cạnh chi tiết task trong cùng khung dưới Kanban; danh sách comment có scrollbar khi nội dung dài.
- [x] Checklist trong chi tiết task được đưa lên trên cùng để người làm/duyệt nhìn thấy ngay trước phần phân công.
- [x] Các nhóm người trong task Kanban chuyển thành khối đóng/mở: người giám sát, người tham gia và người phê duyệt.
- [x] Không cho `Chuyển tiếp` task nếu thiếu người làm, người giám sát, người tham gia hoặc người phê duyệt.
- [x] Đổi cấu trúc workspace: Gantt là trục giai đoạn cha, Kanban là công việc con thuộc giai đoạn đang chọn.
- [x] Thêm panel tạo luồng mẫu với loại luồng, hướng luồng, cấp bắt đầu và cấp đích.
- [x] Thêm tìm kiếm theo luồng, khách hàng, mã luồng, người khởi tạo và loại luồng.
- [x] Thêm lọc theo hướng luồng: Bottom-Up, Top-Down, Hybrid.
- [x] Hiển thị tuyến xử lý tự dựng theo cơ cấu tổ chức.
- [x] Cho phép bấm từng bước trong tuyến để xem người xử lý, cấp xử lý, hạn xử lý và nội dung bước.
- [x] Cho phép cấu hình bước xử lý trong tuyến: tên bước, người xử lý, đơn vị, cấp xử lý, hạn, trạng thái, điều kiện tiếp nhận/bàn giao.
- [x] Cho phép chèn bước xử lý mới sau bước hiện tại trong tuyến.
- [x] Thêm Kanban nội bộ theo từng luồng.
- [x] Cho phép thêm công việc Kanban trong phiên thử nghiệm.
- [x] Cho phép chọn card Kanban, thêm checklist, tick checklist và chuyển card sang trạng thái kế tiếp/lùi trạng thái.
- [x] Mỗi card Kanban có liên kết tới giai đoạn Gantt, người làm, người giám sát, người tham gia, hạn xử lý, ưu tiên, trạng thái, checklist và comment.
- [x] Mỗi card Kanban có người khởi tạo riêng; task mới lấy người khởi tạo từ workflow hiện tại.
- [x] Người giám sát, người tham gia và người phê duyệt của task Kanban đều dùng dạng chip, có ô tìm kiếm, nút `+ Thêm`, thêm được nhiều người và xoá được từng người.
- [x] Thẻ Kanban hiển thị trực tiếp người tạo, người đang làm, người giám sát, người tham gia, người phê duyệt, hạn, trạng thái, tiến độ checklist và số comment.
- [x] Checklist task Kanban dùng 2 lớp xác nhận: người làm tick `Làm xong`, người phê duyệt tick `Đã duyệt`.
- [x] Task tự chuyển sang `Chờ duyệt` khi người làm tick đủ checklist và tự chuyển sang `Hoàn thành` khi checklist được phê duyệt đủ.
- [x] Kanban chỉ hiển thị công việc của giai đoạn Gantt đang chọn, không còn là bảng rời khỏi tiến độ dự án.
- [x] Thêm Gantt theo từng luồng.
- [x] Thêm Gantt động: bấm từng giai đoạn để xem cấu hình thời gian, người làm, người tiếp nhận và bàn giao.
- [x] Cho phép bấm ô tuần trong Gantt để đổi tuần bắt đầu của giai đoạn.
- [x] Cho phép thêm giai đoạn Gantt mới trong phiên thử nghiệm.
- [x] Cho phép cấu hình giai đoạn Gantt: tên, tuần bắt đầu, độ dài, tiến độ, trạng thái, người làm, người tiếp nhận, tuyến bàn giao và nghiệm thu.
- [x] Gantt hiển thị số công việc Kanban hoàn thành/tổng công việc ngay trên từng giai đoạn.
- [x] Thêm checklist, việc cần làm, comment giai đoạn và điều kiện nghiệm thu trong từng giai đoạn Gantt.
- [x] Cho phép thêm việc cần làm, thêm checklist, tick checklist và gửi comment trong từng giai đoạn Gantt.
- [x] Giai đoạn Gantt có timeline con, cho phép thêm mốc nhỏ và cập nhật người phụ trách, hạn, trạng thái từng mốc.
- [x] Trạng thái Gantt, timeline con, Kanban, checklist, comment và template được lưu cục bộ trong trình duyệt cho phiên pilot.
- [x] Khi refresh trang pilot, hệ thống khôi phục lại cấu hình thử nghiệm đã chỉnh thay vì mất toàn bộ dữ liệu demo.
- [x] Thêm thanh trạng thái lưu cục bộ và nút reset dữ liệu pilot để quay về bộ mẫu ban đầu khi cần thử lại.
- [x] Thêm adapter lưu pilot riêng: ưu tiên Supabase pilot qua `NEXT_PUBLIC_PILOT_SUPABASE_URL`/`NEXT_PUBLIC_PILOT_SUPABASE_ANON_KEY`, fallback localStorage nếu chưa cấu hình.
- [x] Adapter pilot từ chối dùng URL trùng Supabase production để tránh ghi nhầm hệ thống hiện hữu.
- [x] Thêm bảng `pilot_crm.pilot_state_snapshots` để lưu snapshot UI pilot theo user khi bật Supabase pilot riêng.
- [x] Thanh trạng thái workspace hiển thị đang lưu bằng `Supabase pilot riêng` hay `localStorage`.
- [x] Thêm hành động theo giai đoạn: Bàn giao, Trình duyệt, Tiếp nhận, Trả lại.
- [x] Thêm Timeline theo từng luồng.
- [x] Thêm Thành viên theo từng luồng.
- [x] Thêm Nhật ký theo từng luồng.
- [x] Bỏ nút rời `Bán hàng dự án` ngoài toolbar bán hàng.
- [x] Đưa `Dự án` vào đúng modal `Ghi nhận bán hàng` trong trường `Nhóm bán hàng`.
- [x] Khi chọn `Dự án`, form yêu cầu tên dự án, hướng triển khai, cấp bắt đầu, cấp phê duyệt cao nhất và thành viên giai đoạn đầu.
- [x] `Hướng triển khai` trong form dự án được ẩn khỏi UI và mặc định là cấp dưới đề xuất đi lên.
- [x] `Thành viên giai đoạn đầu` chuyển sang dạng `+ Thêm`, tìm kiếm từ danh sách người dùng/profile, thêm nhiều người và xoá được.
- [x] Từ chi tiết khách hàng, nút `Tạo dự án` mở lại modal `Ghi nhận bán hàng` với khách hàng được chọn sẵn, không đi thẳng vào workspace.
- [x] Sau khi tạo dự án từ bán hàng, workspace pilot tự sinh luồng dự án, tuyến trình duyệt, giai đoạn đầu, Kanban card đầu tiên, checklist và người giám sát.
- [x] Trước đây có khối `Template dự án` trong workspace; hiện đã tách khỏi workspace chính để tránh làm chật màn hình xử lý.
- [x] Tách `Template dự án` thành page riêng `/advanced-workflow-pilot/templates`, workspace chính chỉ tập trung xử lý dự án.
- [x] Thêm navigation `Template Dự Án` trong sidebar và nút `Quản trị template` từ workspace.
- [x] Nâng `Template dự án` thành thư viện biểu mẫu: mỗi mẫu có loại dự án, hướng triển khai, version, người tạo, ngày cập nhật và trạng thái duyệt.
- [x] Template có trạng thái vòng đời rõ ràng: nháp, chờ Admin LV2, chờ Admin LV1, đã xuất bản và bị trả lại.
- [x] Thêm preview chi tiết template trước khi áp: từng giai đoạn, người phụ trách, người tiếp nhận, bàn giao tới, điều kiện nghiệm thu, timeline con và checklist mẫu.
- [x] Chỉ template đã được cả Admin LV2 và Admin LV1 duyệt mới được áp vào dự án mẫu.
- [x] Mô phỏng vai trò thao tác trong cổng duyệt template: user thường không duyệt, Admin LV2 chỉ duyệt bước LV2, Admin LV1 chỉ xuất bản sau khi LV2 đã duyệt.
- [x] Cổng duyệt template có ghi chú duyệt hoặc lý do trả lại để lưu vết quyết định.
- [x] Áp template sẽ sinh lại các giai đoạn Gantt, người phụ trách, người tiếp nhận, tuyến bàn giao và điều kiện nghiệm thu theo mẫu.
- [x] Cho phép đề xuất template mới từ cấu hình Gantt/Kanban hiện tại của dự án.
- [x] Template đề xuất phải qua luồng duyệt Admin LV2 và Admin LV1 trước khi được dùng làm mẫu chung.
- [x] Áp template sinh cả giai đoạn Gantt, timeline con, task Kanban và checklist mẫu theo từng giai đoạn.
- [x] Cho phép cập nhật template từ cấu hình dự án hiện tại; khi cập nhật sẽ tăng version và reset trạng thái duyệt LV2/LV1 để bắt buộc duyệt lại.
- [x] Gantt hiển thị số timeline con của từng giai đoạn ngay trên dòng phase để thấy cấu trúc mốc nhỏ trước khi mở cấu hình.
- [x] Gantt chuyển sang layout tràn ngang có scroll, không ép co làm vỡ màn hình.
- [x] Cấu hình giai đoạn nằm dưới Gantt thay vì panel nhỏ bên phải.
- [x] Timeline con hiển thị trực tiếp dưới thanh Gantt của giai đoạn; hover vào mốc con hiện tóm tắt người phụ trách, hạn và trạng thái.
- [x] Cấu hình giai đoạn chuyển thành các thanh đóng/mở: thông tin giai đoạn, bàn giao/nghiệm thu và timeline con.
- [x] Bấm một mốc timeline con trên Gantt sẽ mở đúng mốc đó trong phần cấu hình timeline, không bung toàn bộ cấu hình dài.
- [x] Tạo SQL thử nghiệm `docs/advanced-crm-pilot-migration.sql`.

## Dữ liệu thử nghiệm đã bao phủ

- [x] `pilot_crm.accounts`: khách hàng doanh nghiệp nền.
- [x] `pilot_crm.contacts`: đầu mối khách hàng.
- [x] `pilot_crm.deals`: cơ hội bán hàng và điều kiện kích hoạt nâng cao.
- [x] `pilot_crm.credit_profiles`: hạn mức, công nợ, điều khoản thanh toán.
- [x] `pilot_crm.advanced_workspaces`: hồ sơ nâng cao gắn với khách hàng/cơ hội bán.
- [x] `pilot_crm.workspace_participants`: bảng quyền theo người tham gia hồ sơ.
- [x] `pilot_crm.workflow_instances` và `pilot_crm.workflow_steps`: phê duyệt nhiều cấp.
- [x] `pilot_crm.work_items` và `pilot_crm.work_item_dependencies`: công việc, mốc tiến độ, phụ thuộc.
- [x] `pilot_crm.event_log`: lịch sử thay đổi nội bộ.
- [x] `pilot_crm.search_documents`: dữ liệu phục vụ tìm kiếm nhanh.
- [x] `pilot_crm.dashboard_rollups`: dữ liệu phục vụ báo cáo nhanh.
- [x] `pilot_crm.notification_outbox`: hàng chờ thông báo.
- [x] `pilot_crm.integration_inbox` và `pilot_crm.integration_outbox`: cổng dữ liệu vào/ra.
- [x] `pilot_crm.audit_logs`: nhật ký xử lý theo hồ sơ.
- [x] `pilot_crm.admin_members`: vai trò Admin LV1/LV2 cho cổng duyệt template pilot.
- [x] `pilot_crm.project_templates`: thư viện biểu mẫu dự án theo loại, hướng triển khai, version và trạng thái xuất bản.
- [x] `pilot_crm.project_template_versions`: version template để mỗi lần cập nhật phải duyệt lại.
- [x] `pilot_crm.project_template_phases`: giai đoạn Gantt mẫu của từng version template.
- [x] `pilot_crm.project_template_phase_timeline`: timeline cấp con của từng giai đoạn mẫu.
- [x] `pilot_crm.project_template_checklists`: checklist mẫu có 2 lớp xác nhận người làm/người duyệt.
- [x] `pilot_crm.template_approval_logs`: lịch sử đề xuất, cập nhật, duyệt LV2, duyệt LV1, trả lại và áp template.
- [x] `pilot_crm.pilot_state_snapshots`: snapshot cấu hình thử nghiệm theo user để đồng bộ UI pilot khi có Supabase riêng.
- [x] Index chính cho hồ sơ, người tham gia, hạn xử lý, tìm kiếm và nhật ký.
- [x] Index template cho lọc trạng thái/category, version, phase order, timeline/checklist order và approval log.
- [x] Phân quyền đọc cơ bản dựa trên người tham gia hồ sơ.
- [x] RLS template cho phép user đọc template đã xuất bản, Admin LV1/LV2 đọc template đang duyệt.
- [x] RPC pilot `propose_project_template` để đề xuất template mới từ cấu hình dự án.
- [x] RPC pilot `update_project_template` để cập nhật template, tăng version và đưa về chờ Admin LV2 duyệt lại.
- [x] RPC pilot `approve_project_template` để Admin LV2 duyệt sang LV1 và Admin LV1 xuất bản template.
- [x] RPC pilot `return_project_template` để Admin LV1/LV2 trả lại template kèm lý do.
- [x] RPC pilot `apply_project_template_to_workspace` để áp template đã xuất bản thành Gantt phase, timeline con và checklist trong workspace.

## Điều chỉnh UI workspace 02/06/2026

- [x] Bỏ khối giới thiệu workspace và nút quản trị template khỏi màn hình làm việc của cán bộ.
- [x] Bỏ thanh reset dữ liệu pilot khỏi workspace; chuyển reset sang trang quản trị template/admin.
- [x] Thêm chọn template ngay trong modal tạo dự án từ ghi nhận bán hàng.
- [x] Khi chọn template lúc tạo dự án, workspace sinh sẵn phase Gantt, timeline con, Kanban card và checklist theo template.
- [x] Thu nhỏ thanh chọn dự án để dành thêm không gian cho Gantt/Kanban.
- [x] Thu nhỏ header tên dự án và chuyển tiêu đề mục con sang chữ đậm màu xanh lục bảo.

## Việc tiếp theo

- [ ] Tạo môi trường dữ liệu riêng để thử nghiệm.
- [ ] Áp thủ công `docs/advanced-crm-pilot-migration.sql` vào môi trường thử nghiệm.
- [ ] Nạp dữ liệu khách hàng, cơ hội bán và hồ sơ tương ứng với giao diện.
- [ ] Thêm biến môi trường riêng nếu cần nối song song.
- [ ] Tạo route đọc hồ sơ từ môi trường thử nghiệm.
- [ ] Lưu các thao tác local hiện tại vào bảng pilot: bước xử lý, card Kanban, giai đoạn Gantt, checklist, comment và hành động bàn giao/trả lại.
- [ ] Tạo RPC `activate_advanced_workspace_from_deal`.
- [ ] Tạo RPC `approve_workflow_step`.
- [ ] Tạo tác vụ nền cập nhật tìm kiếm và báo cáo.
- [ ] Tạo tác vụ nền gửi thông báo.
- [ ] Tạo cổng kết nối thử nghiệm cho dữ liệu vào/ra.
- [ ] Chạy kiểm thử tải với các mốc 1.000, 2.000 và 4.000 người dùng giả lập.

## Tiêu chí đạt

- [ ] Luồng CRM chuẩn vẫn hoạt động độc lập.
- [ ] Cơ hội B2B có điều kiện kích hoạt tạo được hồ sơ nâng cao.
- [ ] Hạn mức thuộc khách hàng, dự án thuộc cơ hội bán/hợp đồng.
- [ ] Người dùng chỉ xem được hồ sơ mình tham gia.
- [ ] Tìm kiếm/bộ lọc không quét trực tiếp bảng công việc lớn.
- [ ] Báo cáo không tính toán trực tiếp từ bảng công việc mỗi lần mở.
- [ ] Hệ thống ngoài không ghi thẳng vào dữ liệu CRM lõi, chỉ đi qua lớp kiểm soát.
- [ ] Nhật ký ghi đủ người thao tác, hành động, đối tượng, trạng thái trước/sau và mã yêu cầu.
- [ ] Không có mojibake trong nội dung tiếng Việt.
