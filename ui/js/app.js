/**
 * Application Bootstrap & Event Wiring
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Khởi tạo Biến Toàn Cục từ LocalStorage
  initGlobals();

  // 2. Nạp dữ liệu Test Cases mẫu nếu textarea Body đang trống
  const bodyEditor = document.getElementById('bodyPayloads');
  if (bodyEditor && (!bodyEditor.value || bodyEditor.value.trim() === '')) {
    if (window.DEFAULT_TEST_CASES && Array.isArray(window.DEFAULT_TEST_CASES)) {
      bodyEditor.value = JSON.stringify(window.DEFAULT_TEST_CASES, null, 2);
    }
  }

  // 3. Cập nhật số lượng header/param và test case
  updateCounts();
  updatePayloadCount();

  // 4. Lắng nghe phím tắt tiện lợi (Ctrl+Enter để gửi test, Esc để đóng modal)
  document.addEventListener('keydown', (e) => {
    // Ctrl + Enter hoặc Cmd + Enter để chạy test
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal && activeModal.id === 'curlModal') {
        handleImportCurl();
      } else if (!activeModal) {
        runBatchTest();
      }
    }

    // Phím Escape để đóng mọi modal đang mở
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
  });

  // 5. Đóng modal khi click vào vùng nền mờ bên ngoài
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
});
