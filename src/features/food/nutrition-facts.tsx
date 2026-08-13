import type { NutritionFacts as NutritionFactsData } from "./food.types";

const facts: Array<{
  key: keyof NutritionFactsData;
  label: string;
  unit: string;
}> = [
  { key: "calories", label: "Energi", unit: "kkal" },
  { key: "proteinGrams", label: "Protein", unit: "g" },
  { key: "carbsGrams", label: "Karbohidrat", unit: "g" },
  { key: "fatGrams", label: "Lemak", unit: "g" },
  { key: "fiberGrams", label: "Serat", unit: "g" },
];

export function NutritionFacts({ nutrition }: { nutrition: NutritionFactsData }) {
  return (
    <dl className="nutrition-facts" aria-label="Informasi gizi per porsi">
      {facts.map((fact) => (
        <div key={fact.key}>
          <dt>{fact.label}</dt>
          <dd>
            {nutrition[fact.key]} {fact.unit}
          </dd>
        </div>
      ))}
    </dl>
  );
}
