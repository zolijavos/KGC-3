// Tenant Admin típusok

export interface TenantSettings {
  id: string;
  name: string;
  legalName: string;
  taxNumber: string;
  registrationNumber?: string;
  bankAccount: string;
  bankName: string;

  // Contact
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website?: string;

  // Business hours
  businessHours: BusinessHours;

  // Branding
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;

  // Settings
  currency: string;
  timezone: string;
  language: string;
  vatRate: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface FranchiseTenant {
  id: string;
  name: string;
  city: string;
  status: 'active' | 'inactive' | 'suspended';
  ownerName: string;
  ownerEmail: string;
  employeeCount: number;
  monthlyRevenue: number;
  activeRentals: number;
  activeWorksheets: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface FranchiseStats {
  totalTenants: number;
  activeTenants: number;
  totalRevenue: number;
  totalEmployees: number;
  totalRentals: number;
  totalWorksheets: number;
}
