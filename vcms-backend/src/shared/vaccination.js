// Vaccinations provider (APT-10)
// Configurable mock provider for Release 1.0 (Vaccination Module out-of-scope)
export class MockVaccinationStatusProvider {
  constructor(overdueIds = [2, 7]) {
    // Patients 2 (Mittens) and 7 (Simba) have mock overdue rabies/core vaccines for boarding/grooming tests
    this.overduePatientIds = new Set(overdueIds);
  }

  async checkVaccinationStatus(patientId, serviceType) {
    const isBoardingOrGrooming = /boarding|grooming/i.test(serviceType);
    if (!isBoardingOrGrooming) {
      return { isOverdue: false, warning: null };
    }

    if (this.overduePatientIds.has(patientId)) {
      return {
        isOverdue: true,
        vaccineName: 'Core Rabies / DHPP',
        warning: `Notice: Patient #${patientId} has an overdue vaccination (Core Rabies / DHPP) required for ${serviceType}. Staff may proceed with caution.`
      };
    }

    return { isOverdue: false, warning: null };
  }
}

export const vaccinationProvider = new MockVaccinationStatusProvider();
