// Wrapper for google.script.run
export const gas = {
  call: <T>(functionName: string, ...args: any[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      // Check if we are running inside Google Apps Script
      if (typeof window !== 'undefined' && (window as any).google && (window as any).google.script) {
        (window as any).google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          [functionName](...args);
      } else {
        // Mock data for local development
        console.log(`[MOCK GAS] Calling ${functionName} with args:`, args);
        
        setTimeout(() => {
          if (functionName === 'getCurrentUser') {
            resolve({ email: 'local@dev.com', name: 'Local Dev', role: 'ADMIN_LEVEL_1' } as any);
          } else if (functionName === 'getAppData') {
            resolve({
              user: { email: 'local@dev.com', name: 'Local Dev', role: 'ADMIN_LEVEL_1' },
              customers: [{ "ID": "1", "Tên khách hàng": "Nguyễn Văn A" }],
              accounts: [],
              interactions: []
            } as any);
          } else {
            resolve({ success: true, message: 'Mock response' } as any);
          }
        }, 500);
      }
    });
  }
};
