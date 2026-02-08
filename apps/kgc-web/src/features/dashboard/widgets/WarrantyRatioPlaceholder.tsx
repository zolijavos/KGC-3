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
import { Clock, Info, Shield } from 'lucide-react';

/**
 * WarrantyRatioPlaceholder (Story 35-5)
 *
 * Placeholder widget for warranty vs paid service ratio
 * Will be implemented in Epic 38 (Szerviz Profitabilitás)
 */
export default function WarrantyRatioPlaceholder() {
  return (
    <Card className="warranty-ratio-placeholder opacity-75">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Garanciális arány
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Garanciális vs fizetős arány - Epic 38-ban</p>
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
            <p className="text-xs text-muted-foreground/75 mt-1">Garanciális vs fizetős arány</p>
            <p className="text-xs text-muted-foreground/50 mt-2">Epic 38-ban implementálva</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
