import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";

const damageClasses = [
  { id: 0, name: "Longitudinal Crack", color: "bg-damage-longitudinal", description: "Parallel to road" },
  { id: 1, name: "Transverse Crack", color: "bg-damage-transverse", description: "Perpendicular to road" },
  { id: 2, name: "Alligator Crack", color: "bg-damage-alligator", description: "Pattern cracks" },
  { id: 3, name: "Other Corruption", color: "bg-damage-other", description: "Surface damage" },
  { id: 4, name: "Pothole", color: "bg-damage-pothole", description: "Bowl-shaped holes" },
];

export const DamageClassLegend = () => {
  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Damage Classes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {damageClasses.map((damageClass) => (
            <div key={damageClass.id} className="flex items-center gap-3 text-sm">
              <div className={`w-3 h-3 rounded-full ${damageClass.color}`} />
              <span className="font-medium text-foreground">{damageClass.name}</span>
              <span className="text-muted-foreground text-xs ml-auto">{damageClass.description}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
