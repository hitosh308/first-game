export function initializeMonetization() {
  return {
    isEnabled: false,
    purchase: async () => {
      throw new Error("Monetization disabled");
    }
  };
}
