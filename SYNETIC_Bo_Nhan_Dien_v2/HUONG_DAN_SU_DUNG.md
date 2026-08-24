# SYNETIC — BỘ NHẬN DIỆN THƯƠNG HIỆU

**Logo:** dải ruy-băng uốn thành chữ **S**, chuyển sắc Emerald → Jade Teal → Ocean Blue, chiếc lá ở đỉnh, ba nút kết nối ở chân.
**Khẩu hiệu chính thức:** *Kiến tạo giá trị vượt trội*
**Tầm nhìn:** *Mở lối phồn vinh* — dùng trong báo cáo, **không đặt cạnh logo**.

---

## 1. CÁCH CẬP NHẬT THÔNG TIN (địa chỉ, điện thoại, tên người…)

Toàn bộ chữ trên ấn phẩm được lấy từ **một file duy nhất**:

```
90_FILE_NGUON/noi_dung.json
```

Mở bằng Notepad hoặc bất kỳ trình soạn thảo nào, sửa các mục:

| Mục | Nội dung |
|---|---|
| `tap_doan` | Tên pháp nhân, địa chỉ, điện thoại, hotline, email, website, MST, năm thành lập |
| `nguoi_dai_dien` | Họ tên, chức danh, di động, email trên danh thiếp và thẻ nhân viên |
| `cong_ty_thanh_vien` | Tên, pháp nhân và khẩu hiệu riêng của 5 công ty |
| `san_pham_nutrition` | Mã, tên, dòng sản phẩm, khối lượng, số TCCS trên bao bì và tem nhãn |
| `bang_mau` | Mã màu HEX nếu cần hiệu chỉnh |

Sửa xong, gửi lại file cho tôi — toàn bộ ảnh sẽ được dựng lại với thông tin mới, **không phải sửa tay từng file**.

**Cách 2 — tự sửa trực tiếp:** mọi ấn phẩm đều có file `.svg`. Mở bằng Adobe Illustrator, Inkscape (miễn phí) hoặc Figma, click vào chữ và gõ lại. Chữ trong SVG là chữ thật, không phải ảnh.

---

## 2. CẤU TRÚC THƯ MỤC

### `00_BANG_TONG_HOP` — 9 bảng tổng hợp khổ A3 ngang, PNG 300 dpi (3508 px)
| File | Nội dung |
|---|---|
| Bang_01_Nhan_dien_cot_loi | Logo · Biến thể · Vùng an toàn · Từ khoá · Bộ màu · Kiểu chữ · Kiến trúc thương hiệu |
| Bang_02_Van_phong_pham | Danh thiếp · Phong bì · Tiêu đề thư · Giấy viết thư · Bìa hợp đồng · Bìa hồ sơ · Thẻ nhân viên |
| Bang_03_Bien_hieu_khong_gian | Biển ngoại thất · Biển lễ tân · Biển chỉ dẫn · Standee · Hoạ tiết |
| Bang_04_Nutrition_bao_bi | Logo · Màu · Biểu tượng · Bao bì · Tem nhãn |
| Bang_05_Logistics | Logo · Bảng màu · Xe tải · Biển kho · Nhãn vận chuyển |
| Bang_06_Capital | Logo · Bộ màu · Biển bảng · Bìa báo cáo · Nhãn tài liệu |
| Bang_07_Website_Fanpage | Desktop · Mobile · Fanpage · Nguyên tắc số |
| Bang_08_Mau_slide | 8 mẫu slide · Nguyên tắc dựng slide · Bảng màu slide |
| Bang_09_Vet_Farm | Synetic Vet: nhãn thuốc, hộp vắc-xin, đồng phục · Synetic Farm: biển cổng, biển an toàn sinh học, thẻ theo dõi đàn |

> Mỗi bảng có cả `.svg` (vector, sửa được) và `.png` (in ngay).

### `00_CO_BAN`
Cẩm nang nhận diện (Word + PDF, 15 trang) · Bộ màu · Kiểu chữ · Từ khoá · Kiến trúc thương hiệu · Hoạ tiết.

### `01_LOGO` — ảnh rời từng biến thể
Logo chính · Logo ngang không khẩu hiệu · Logo dọc · Đơn sắc tối · Đơn sắc sáng · Biểu tượng · App icon (nền sáng & tối) · Vùng an toàn · 5 logo thành viên.

### `02_VAN_PHONG_PHAM`
Danh thiếp 2 mặt · Phong bì DL · Tiêu đề thư A4 · Giấy viết thư A4 · Bìa hợp đồng · Bìa hồ sơ · Thẻ nhân viên · Giấy viết thư Word · bộ riêng cho 5 công ty.

### `03_THUYET_TRINH`
`Synetic_Mau_Slide_Thuyet_Trinh.pptx` — 8 slide: bìa · agenda · tổng quan · biểu đồ · hệ sinh thái · ngắt phần · nội dung + hình · cảm ơn.

### `04_SO_HOA`
Website HTML chạy được · ảnh chụp desktop & mobile · ảnh bìa Fanpage · ảnh đại diện.

### `05_HOP_DONG`
Hợp đồng nguyên tắc mua bán (Word + PDF), 10 điều. **Cần pháp chế rà soát trước khi dùng.**

### `06_BIEN_HIEU` · `07_BAO_BI_NUTRITION` · `08_LOGISTICS` · `09_CAPITAL` · `10_VET` · `11_FARM`
Ảnh rời từng hạng mục ứng dụng của cả năm công ty thành viên, in riêng được.

**Synetic Vet:** nhãn chai thuốc thú y 110 × 70 mm · hộp vắc-xin · đồng phục kỹ thuật.
**Synetic Farm:** biển cổng trang trại · biển an toàn sinh học · thẻ theo dõi đàn.

---

## 3. QUY CÁCH FILE

| Định dạng | Dùng để |
|---|---|
| **SVG** | File gốc vector — gửi nhà in, phóng to vô hạn, sửa chữ được |
| **PNG** | Xem nhanh, chèn Word/PowerPoint, đăng mạng xã hội |
| **PDF** | Gửi nhà in trực tiếp (các hạng mục chính đều có) |

**Luôn gửi nhà in file SVG hoặc PDF.** PNG chỉ dùng cho màn hình.

## 4. BỘ MÀU

| Tên | HEX | Ý nghĩa |
|---|---|---|
| Emerald | `#0F6B50` | Tăng trưởng · Bền vững |
| Jade Teal | `#1FA38A` | Cân bằng · Hài hoà |
| Ocean Blue | `#1F5FAF` | Tin cậy · Chuyên nghiệp |
| Prosperity Gold | `#C9A24B` | Thịnh vượng · Giá trị |
| Charcoal | `#2B2B2B` | Vững chắc · Hiện đại |
| Ivory | `#F7F5EF` | Tinh tế · Tối giản |

## 5. KIỂU CHỮ
**Montserrat** (tiêu đề) · **Inter** (nội dung) — cả hai miễn phí trên Google Fonts, hỗ trợ đầy đủ dấu tiếng Việt. Cài cho toàn bộ máy trạm trước khi mở file PPTX/DOCX.

---

## 6. VIỆC CẦN LÀM TRƯỚC KHI CÔNG BỐ
1. Tra cứu nhãn hiệu **SYNETIC** (cả phần chữ và phần hình) tại Cục Sở hữu trí tuệ và WIPO — Nhóm Nice **05, 29, 30, 31, 35, 36, 39, 44**.
2. **Nộp đơn trước khi công bố ra ngoài** để giữ ngày ưu tiên.
3. Tra cứu tên doanh nghiệp tại dangkykinhdoanh.gov.vn (Điều 41 Luật Doanh nghiệp 2020).
4. Giữ tên miền: synetic.vn · synetic.com.vn · syneticgroup.vn.
5. **SYNETIC thuộc nhóm tên ghép "syn-" rất đông ở nước ngoài** — tra cứu quốc tế song song, mở rộng **Nhóm 12, 35, 42**.
