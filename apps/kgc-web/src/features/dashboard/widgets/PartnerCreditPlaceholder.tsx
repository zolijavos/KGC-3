import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kgc/ui';
import { Clock, CreditCard, Info } from 'lucide-react';

/**
 * Check if partner credit feature is enabled via environment variable
 * VITE_FEATURE_PARTNER_CREDIT_ENABLED=true enables the feature
 */
const isFeatureEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    // Check for Vite environment variable
    const envValue = import.meta.env?.VITE_FEATURE_PARTNER_CREDIT_ENABLED;
    return envValue === 'true' || envValue === true;
  }
  return false;
};

/**
 * PartnerCreditPlaceholder (Story 35-6)
 *
 * Placeholder widget for partner credit limit management
 * Will be implemented when feature flag FEATURE_PARTNER_CREDIT_ENABLED is true
 */
export default function PartnerCreditPlaceholder() {
  const featureEnabled = isFeatureEnabled();

  // When feature is enabled, show actual content (future implementation)
  if (featureEnabled) {
    return (
      <Card className="partner-credit-widget">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Partner hitelkeret
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Feature enabled - implementáció folyamatban
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Placeholder when feature is disabled
  return (
    <Card className="partner-credit-placeholder opacity-75">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Partner hitelkeret
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Partner hitelkeret kezelés - későbbi epic-ben</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 space-y-3">
          <Clock className="h-12 w-12 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Hamarosan...</p>
            <p className="text-xs text-muted-foreground/75 mt-1">Partner hitelkeret kezelés</p>
            <p className="text-xs text-muted-foreground/50 mt-2">
              Feature flag: PARTNER_CREDIT_ENABLED
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
