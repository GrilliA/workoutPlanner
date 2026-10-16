const MUSCLE_LABELS_IT: Record<string, string> = {
  abdominals: "Addominali",
  abductors: "Abduttori",
  adductors: "Adduttori",
  biceps: "Bicipiti",
  calves: "Polpacci",
  chest: "Petto",
  forearms: "Avambracci",
  glutes: "Glutei",
  hamstrings: "Femorali",
  lats: "Dorsali",
  "lower back": "Lombari",
  "middle back": "Dorsali medi",
  neck: "Collo",
  quadriceps: "Quadricipiti",
  shoulders: "Spalle",
  traps: "Trapezi",
  triceps: "Tricipiti",
};

const EQUIPMENT_LABELS_IT: Record<string, string> = {
  barbell: "Bilanciere",
  dumbbell: "Manubri",
  cable: "Cavi",
  machine: "Macchina",
  "body only": "Corpo libero",
  kettlebells: "Kettlebell",
  bands: "Elastici",
  "e-z curl bar": "Bilanciere EZ",
  "exercise ball": "Palla",
  "medicine ball": "Medicine ball",
  "foam roll": "Foam roller",
  other: "Altro",
};

function labelFor(value: string | null | undefined, map: Record<string, string>): string | null {
  if (!value) {
    return null;
  }

  return map[value.toLowerCase()] ?? value;
}

export function muscleLabelIt(value: string | null | undefined): string | null {
  return labelFor(value, MUSCLE_LABELS_IT);
}

export function equipmentLabelIt(value: string | null | undefined): string | null {
  return labelFor(value, EQUIPMENT_LABELS_IT);
}

export function catalogDisplayName(exercise: { name: string; nameIt?: string | null }): string {
  const italian = exercise.nameIt?.trim();
  return italian && italian.length > 0 ? italian : exercise.name;
}
