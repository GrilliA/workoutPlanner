type ExerciseNames = {
  name: string;
  nameIt?: string | null;
  nameEn?: string | null;
};

export function exerciseHeading(exercise: ExerciseNames): string {
  const italian = exercise.nameIt?.trim();
  return italian && italian.length > 0 ? italian : exercise.name;
}

export function exerciseEnglishLine(exercise: ExerciseNames): string | null {
  const heading = exerciseHeading(exercise);
  const english = exercise.nameEn?.trim();
  if (!english || english === heading) {
    return null;
  }

  return english;
}
