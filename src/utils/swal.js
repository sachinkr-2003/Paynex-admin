import Swal from 'sweetalert2';

/**
 * PAYNEX Strict-Square Dark Terminal SweetAlert2 Theme
 */
export const PaynexSwal = Swal.mixin({
  background: '#121722',
  color: '#f1f5f9',
  customClass: {
    popup: 'paynex-swal-popup',
    title: 'paynex-swal-title',
    htmlContainer: 'paynex-swal-content',
    confirmButton: 'paynex-swal-confirm-btn',
    cancelButton: 'paynex-swal-cancel-btn',
    actions: 'paynex-swal-actions',
  },
  buttonsStyling: false,
  reverseButtons: true,
});

/**
 * Toast notification mixin (top-right alert)
 */
export const PaynexToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#121722',
  color: '#f1f5f9',
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  },
});

// Quick Helpers
export const showSuccessAlert = (title, text = '') => {
  return PaynexSwal.fire({
    icon: 'success',
    title: `<span style="font-size:18px; font-weight:800; color:#10b981;">${title}</span>`,
    html: `<span style="font-size:13.5px; color:#94a3b8;">${text}</span>`,
    confirmButtonText: 'ACKNOWLEDGE',
    iconColor: '#10b981',
  });
};

export const showErrorAlert = (title, text = '') => {
  return PaynexSwal.fire({
    icon: 'error',
    title: `<span style="font-size:18px; font-weight:800; color:#ef4444;">${title}</span>`,
    html: `<span style="font-size:13.5px; color:#94a3b8;">${text}</span>`,
    confirmButtonText: 'CLOSE',
    iconColor: '#ef4444',
  });
};

export const showWarningAlert = (title, text = '') => {
  return PaynexSwal.fire({
    icon: 'warning',
    title: `<span style="font-size:18px; font-weight:800; color:#f59e0b;">${title}</span>`,
    html: `<span style="font-size:13.5px; color:#94a3b8;">${text}</span>`,
    confirmButtonText: 'UNDERSTOOD',
    iconColor: '#f59e0b',
  });
};

export const showConfirmDialog = async (title, text = '', confirmText = 'PROCEED', cancelText = 'CANCEL') => {
  const result = await PaynexSwal.fire({
    icon: 'question',
    title: `<span style="font-size:18px; font-weight:800; color:#f1f5f9;">${title}</span>`,
    html: `<span style="font-size:13.5px; color:#94a3b8;">${text}</span>`,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    iconColor: '#f59e0b',
  });
  return result.isConfirmed;
};

export const showToast = (title, icon = 'success') => {
  PaynexToast.fire({
    icon,
    title: `<span style="font-size:13px; font-weight:600; color:#f1f5f9;">${title}</span>`,
  });
};

export default PaynexSwal;
